const { OfficialNewsWatcher } = require('../lib/official_news_watcher');

const watcher = new OfficialNewsWatcher();

watcher.on('fetcharticles', (articleList) => {
  for(const article of articleList) {
    console.log('Fetch article:', article.title, article.url);
  }
});

watcher.on('newarticle', (article) => {
  console.log('New article!', article.title, article.url);
});

watcher.startWatch({ intervalMs: 15 * 1000})
    .then(() => console.log('Watch start!'))
    .catch((e) => console.error(e));