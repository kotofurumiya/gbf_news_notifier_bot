const axios = require('axios');
const { JSDOM } = require('jsdom');
const EventEmitter = require('events').EventEmitter;

const { timeout } = require('./timer');

// partial.phpで3記事ずつ取得できる
// partial.php?p=2 とかで2ページ目取得できる
const OFFICIAL_NEWS_URL = 'https://granbluefantasy.jp/news/partial.php';

class OfficialNewsWatcher extends EventEmitter {
  constructor() {
    super();

    this._oldArticleUrls = [];
    this._timerId = null;
  }

  // 最新limit個の記事を拾いに行く
  // partial.phpの作り上、最大3個
  async _getTopArticles(limit = 3) {
    // GETで普通にページを取得する
    const dom = await axios.get(OFFICIAL_NEWS_URL, { responseType: 'text' })
                           .then((response) => {
                              // レスポンスコードがOK（200番台）でないならエラーをthrow
                              const responseIsOk = response.status >= 200 && response.status <= 299;
                              if(!responseIsOk) {
                                throw new Error(`Bad response code: ${response ? response.status : 'none'}`);
                              }

                              // そうでなければDOMを返す
                              return new JSDOM(response.data);
                            });

    const topArticleList = [];

    // 各記事要素からタイトルとURLを抜き出して一覧に追加
    const topArticlesElements = Array.from(dom.window.document.querySelectorAll('article')).slice(0, limit);
    for(const article of topArticlesElements) {
      const anchor = article.querySelector('a');
      const url = anchor.href;
      const title = anchor.textContent;

      if(url && title) {
        topArticleList.push({ title, url });
      }
    }

    // 何も取得できなかったときはreject扱い
    if(topArticleList.length === 0) {
      return Promise.reject('No article found.');
    }

    return topArticleList;
  }

  async startWatch(options = {}) {
    if(this._timerId) {
      return Promise.resolve();
    }

    const minInterval = 15 * 1000;
    const intervalMs = Math.max('intervalMs' in options ? options.intervalMs : 10 * 60 * 1000, minInterval);

    // 読み込み済みURLリストを初期化
    // 取れるまでリトライ繰り返す
    while(true) {
      try {
        this._oldArticleUrls = (await this._getTopArticles()).map((article) => article.url);
        break;
      } catch(e) {
        console.warn(`Cannot get top articles. Retrying after ${intervalMs}ms...`, e);
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