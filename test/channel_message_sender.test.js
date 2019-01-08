const { ChannelMessageSender } = require('../lib/channel_message_sender');
const Discord = require("discord.js");
const config = require('../config');

const discordClient = new Discord.Client();

// discordにログイン成功時
discordClient.on('ready', () => {
  console.log('Connected to Discord successfully!');

  // サーバのことをguildというらしい
  const guildMap = discordClient.guilds;

  for(const guild of guildMap.values()) {
    // 設定の該当チャンネルを探す
    const channel = guild.channels.find((info) => info.name === config.discord.targetChannelName);
    if(channel) {
      const sender = new ChannelMessageSender(channel);
      sender.send(`てすとてすと。てすとだよ〜〜`)
          .then((message) => console.log(`Sent message.`))
          .catch((error) => console.error(error));
    }
  }

  discordClient.destroy();
});

// discordにログイン
discordClient.login(config.discord.token);