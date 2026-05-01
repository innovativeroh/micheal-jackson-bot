const { getAll } = require('../player/queue');

module.exports = async function queue(message) {
  const items = getAll();
  if (items.length === 0) {
    return message.reply('Queue is empty.');
  }

  const list = items
    .map((item, i) => `${i + 1}. **${item.title}** — requested by ${item.requestedBy}`)
    .join('\n');

  message.reply(`🎵 Current queue:\n${list}`);
};
