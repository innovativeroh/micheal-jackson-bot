const { disconnect, isConnected } = require('../player/player');

module.exports = async function stop(message) {
  if (!isConnected()) {
    return message.reply('Nothing is playing.');
  }
  disconnect();
  message.reply('⏹️ Stopped and disconnected.');
};
