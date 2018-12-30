const puppeteer = require('puppeteer');
const EventEmitter = require('events').EventEmitter;

const OFFICIAL_NEWS_URL = 'https://granbluefantasy.jp/news/';

class OfficialNewsWatcher extends EventEmitter {
  constructor() {
    super();

    // Linux向けではno-sandboxがないと動かない場合がある
    this._browserPromise = puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox']});
    this._oldArticleUrls = [];
    this._timerId = null;
  }

  // 最新limit個の記事を拾いに行く
  // 遅延ローディングの関係で最大3個ぐらいしか拾えないので注意
  async _getTopArticles(limit = 5) {
    const page = await (await this._browserPromise).newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto(OFFICIAL_NEWS_URL, { waitUntil : 'domcontentloaded' });

    const topArticleList = [];

    // 各記事要素からタイトルとURLを抜き出して一覧に追加
    const topArticleHandlers = (await page.$$('#news article, .news-container')).slice(0, limit);
    for(const handler of topArticleHandlers) {
      const anchorHandler = await handler.$('a');
      const url = await anchorHandler.getProperty('href').then((href) => href.jsonValue());
      const title = await anchorHandler.getProperty('innerText').then((innerText) => innerText.jsonValue());
      topArticleList.push({ title, url });
    }

    return page.close().then(() => topArticleList);
  }

  async startWatch(options = {}) {
    const intervalMs = 'intervalMs' in options ? options.intervalMs : 60 * 1000;

    // 読み込み済みURLリストを初期化
    this._oldArticleUrls = (await this._getTopArticles()).map((article) => article.url);

    // タイマーでインターバルごとに読みに行く
    // 更新があったら通知
    this._timerId = setInterval(async () => {
      console.info('Trying to fetch articles.');

      const topArticles = await this._getTopArticles();
      const newArticles = topArticles.filter((article) => !this._oldArticleUrls.includes(article.url));

      for(const article of newArticles) {
        this.emit('newarticle', article);
      }

      this._oldArticleUrls = topArticles.map((article) => article.url);

      console.info(`${newArticles.length} new articles found.`);
    }, intervalMs);
  }

  async endWatch() {
    if(this._timerId) {
      clearInterval(this._timerId);
    }

    return this._browserPromise.then((b) => b.close());
  }
}

module.exports = {
  OfficialNewsWatcher
};