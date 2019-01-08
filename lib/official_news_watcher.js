const puppeteer = require('puppeteer');
const EventEmitter = require('events').EventEmitter;

const { timeout } = require('./timer');

// partial.phpで3記事ずつ取得できる
// partial.php?p=2 とかで2ページ目取得できる
const OFFICIAL_NEWS_URL = 'https://granbluefantasy.jp/news/partial.php';

class OfficialNewsWatcher extends EventEmitter {
  constructor() {
    super();

    // Linux向けではno-sandboxがないと動かない場合がある
    this._browserPromise = puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox']});
    this._oldArticleUrls = [];
    this._timerId = null;
  }

  // 最新limit個の記事を拾いに行く
  // partial.phpの作り上、最大3個
  async _getTopArticles(limit = 3) {
    const page = await (await this._browserPromise).newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    try {
      await page.goto(OFFICIAL_NEWS_URL, { waitUntil : 'domcontentloaded' })
                .then((response) => {
                  if(!response || !response.ok()) {
                    throw new Error(`Bad response code: ${response ? response.status() : 'none'}`);
                  }
                });
    } catch(e) {
      return page.close().then(() => Promise.reject(e));
    }

    const topArticleList = [];

    // 各記事要素からタイトルとURLを抜き出して一覧に追加
    const topArticleHandlers = (await page.$$('article')).slice(0, limit);
    for(const handler of topArticleHandlers) {
      const anchorHandler = await handler.$('a');
      const url = await anchorHandler.getProperty('href').then((href) => href.jsonValue());
      const title = await anchorHandler.getProperty('innerText').then((innerText) => innerText.jsonValue());
      topArticleList.push({ title, url });
    }

    // 何も取得できなかったときはreject扱い
    if(topArticleList.length === 0) {
      return page.close().then(() => Promise.reject('No article found.'));
    }

    return page.close().then(() => topArticleList);
  }

  async startWatch(options = {}) {
    if(this._timerId) {
      return Promise.resolve();
    }

    const intervalMs = 'intervalMs' in options ? options.intervalMs : 60 * 1000;

    // 読み込み済みURLリストを初期化
    // 取れるまでリトライ繰り返す
    while(true) {
      try {
        this._oldArticleUrls = (await this._getTopArticles()).map((article) => article.url);
        break;
      } catch(e) {
        console.warn('Cannot get top articles. Retrying...');
        await timeout(intervalMs);
      }
    }

    // タイマーでインターバルごとに読みに行く
    // 更新があったら通知
    this._timerId = setInterval(async () => {
      console.info('Trying to fetch articles.');

      try {
        const topArticles = await this._getTopArticles();
        this.emit('fetcharticles', topArticles);

        // 取得したURLが既読URLになければ新記事として扱う
        const newArticles = topArticles.filter((article) => !this._oldArticleUrls.includes(article.url));

        for(const article of newArticles) {
          this.emit('newarticle', article);
        }

        // 読み込んだ記事を既読URLに追加
        // 追加した分だけ古い既読を削除
        this._oldArticleUrls.push(...topArticles.map((article) => article.url));
        this._oldArticleUrls = this._oldArticleUrls.slice(Math.min(this._oldArticleUrls.length, topArticles.length));

        console.info(`${newArticles.length} new articles found.`);
      } catch(e) {
        console.error('Cannot fetch latest articles.', e);
      }
    }, intervalMs);

    return Promise.resolve();
  }

  async endWatch() {
    if(this._timerId) {
      clearInterval(this._timerId);
    }

    return Promise.resolve();
  }
}

module.exports = {
  OfficialNewsWatcher
};