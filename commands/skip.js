const { stopCurrent, isConnected } = require('../player/player');

module.exports = async function skip(message) {
  if (!isConnected()) {
    return message.reply('Nothing is playing.');
  }
  stopCurrent();
  message.reply('⏭️ Skipped.');
};
