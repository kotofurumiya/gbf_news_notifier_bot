const { OfficialNewsWatcher } = require('./lib/official_news_watcher');
const Discord = require("discord.js");
const config = require('./config');

const newsWatcher = new OfficialNewsWatcher();
const discordClient = new Discord.Client();

// discordにログイン成功時
discordClient.on('ready', () => {
  console.log('Connected to Discord successfully!');

  const guildMap = discordClient.guilds;

  // 新記事を検知したとき
  newsWatcher.on('newarticle', (article) => {
    for(const guild of guildMap.values()) {
      // 該当チャンネルで発言する
      const channel = guild.channels.find((info) => info.name === config.discord.targetChannelName);
      if(channel) {
        channel.send(`新しいニュースが投稿されました！\n${article.title}\n${article.url}`);
      }
    }
  });

  // 監視開始
  newsWatcher.startWatch({ intervalMs: config.network.checkIntervalMs })
             .then(() => console.log('Start watching...'));
});

// discordにログイン
discordClient.login(config.discord.token);