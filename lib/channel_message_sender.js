// チャンネルに対してメッセージを送るクラス
// いまはただのラッパーだが、メッセージ再送機能とかつける時のためにクラス化している
class ChannelMessageSender {
  constructor(channel) {
    this._channel = channel;
  }

  async send(content, options = {}) {
    return this._channel.send(content, options);
  }
}

module.exports = {
  ChannelMessageSender
};