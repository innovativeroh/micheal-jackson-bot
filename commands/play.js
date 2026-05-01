const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const crypto = require('crypto');
const { searchMultiple } = require('../player/search');
const { enqueue, isEmpty, dequeue } = require('../player/queue');
const { joinChannel, playTrack, isConnected } = require('../player/player');
const sessions = require('../player/sessions');

function buildComponents(session) {
  const { results, page, id } = session;
  const start = page * 5;
  const pageResults = results.slice(start, start + 5);

  const songRow = new ActionRowBuilder().addComponents(
    pageResults.map((_, i) =>
      new ButtonBuilder()
        .setCustomId(`pick|${id}|${start + i}`)
        .setLabel(String(start + i + 1))
        .setStyle(ButtonStyle.Primary)
    )
  );

  const navRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`nav|${id}|prev`)
      .setLabel('◀️ Prev')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId(`nav|${id}|next`)
      .setLabel('Next ▶️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(start + 5 >= results.length)
  );

  return { pageResults, start, songRow, navRow };
}

function buildEmbed(session, pageResults, start) {
  const totalPages = Math.ceil(session.results.length / 5);
  return new EmbedBuilder()
    .setTitle(`🎵 Pick a song for "${session.artist}"`)
    .setDescription(pageResults.map((r, i) => `**${start + i + 1}.** ${r.title}`).join('\n'))
    .setFooter({ text: `Page ${session.page + 1}/${totalPages} · Click a number to play` })
    .setColor(0x1db954);
}

module.exports = async function play(message, args) {
  const artist = args.join(' ').trim();
  if (!artist) return message.reply('Usage: `!play <artist name>`');

  const voiceChannel = message.member?.voice?.channel;
  if (!voiceChannel) return message.reply('⚠️ Please join a voice channel first');

  await message.reply(`🔍 Searching for **${artist}**...`);

  const results = await searchMultiple(artist, 10);
  if (!results.length) return message.channel.send(`❌ No official songs found for "${artist}"`);

  const id = crypto.randomBytes(4).toString('hex');
  const session = { id, results, page: 0, artist, voiceChannel };
  sessions.set(id, session);

  const { pageResults, start, songRow, navRow } = buildComponents(session);
  const embed = buildEmbed(session, pageResults, start);
  await message.channel.send({ embeds: [embed], components: [songRow, navRow] });
};

module.exports.buildComponents = buildComponents;
module.exports.buildEmbed = buildEmbed;
