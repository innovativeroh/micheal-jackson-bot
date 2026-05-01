const { search } = require('../player/search');
const { enqueue, isEmpty, dequeue } = require('../player/queue');
const { joinChannel, playTrack, isConnected } = require('../player/player');

module.exports = async function play(message, args) {
  const artist = args.join(' ').trim();
  if (!artist) {
    return message.reply('Usage: `!play <artist name>`');
  }

  const voiceChannel = message.member?.voice?.channel;
  if (!voiceChannel) {
    return message.reply('⚠️ Please join a voice channel first');
  }

  await message.reply(`🔍 Searching for official songs by **${artist}**...`);

  const result = await search(artist);
  if (!result) {
    return message.channel.send(`❌ No official songs found for "${artist}"`);
  }

  const wasEmpty = isEmpty();
  enqueue({
    title: result.title,
    url: result.webpage_url,
    requestedBy: message.author.username,
    textChannel: message.channel,
  });

  if (wasEmpty) {
    if (!isConnected()) joinChannel(voiceChannel);
    const item = dequeue();
    playTrack(item.url, message.channel);
    message.channel.send(`▶️ Now playing: **${result.title}**`);
  } else {
    message.channel.send(`➕ Added to queue: **${result.title}**`);
  }
};
