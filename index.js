const { OfficialNewsWatcher } = require('./lib/official_news_watcher');
const { ChannelMessageSender } = require('./lib/channel_message_sender');
const Discord = require("discord.js");
const config = require('./config');

const newsWatcher = new OfficialNewsWatcher();
const discordClient = new Discord.Client();

// discordにログイン成功時
discordClient.on('ready', () => {
  console.log('Connected to Discord successfully!');

  // サーバのことをguildというらしい
  const guildMap = discordClient.guilds;

  // 新記事を検知したとき
  newsWatcher.on('newarticle', (article) => {
    for(const guild of guildMap.values()) {
      // 設定の該当チャンネルを探す
      const channel = guild.channels.find((info) => info.name === config.discord.targetChannelName);

      // 該当チャンネルがあればメッセージを送る
      if(channel) {
        const sender = new ChannelMessageSender(channel);
        sender.send(`新しいニュースが投稿されました！\n${article.title}\n${article.url}`)
            .then((message) => console.log(`Sent article ${article.title}.`))
            .catch((error) => console.error(error));
      }
    }
  });

  // 監視開始
  newsWatcher.startWatch({ intervalMs: config.network.checkIntervalMs })
             .then(() => console.log('Start watching...'))
             .catch((e) => {
                 console.error('Error', e);
                 process.exit(1);
             });
});

// WebSocketエラー時の処理
// 再接続は勝手にしてくれる
discordClient.on('error', (error) => {
  console.error(error);
});

// discordにログイン
discordClient.login(config.discord.token);