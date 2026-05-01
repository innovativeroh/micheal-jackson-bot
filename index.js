require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { execFileSync } = require('child_process');

// Startup dependency checks
try {
  execFileSync('yt-dlp', ['--version'], { stdio: 'ignore' });
} catch {
  console.error('❌ yt-dlp not found. Install: brew install yt-dlp');
  process.exit(1);
}

try {
  execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
} catch {
  console.error('❌ ffmpeg not found. Install: brew install ffmpeg');
  process.exit(1);
}

const PREFIX = process.env.PREFIX || '!';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  const parts = interaction.customId.split('|');
  const action = parts[0];

  // Playback control buttons (no session needed)
  if (action === 'ctrl') {
    const { stopCurrent, disconnect, isConnected } = require('./player/player');
    const dir = parts[1];

    if (dir === 'next') {
      if (!isConnected()) return interaction.reply({ content: 'Nothing is playing.', ephemeral: true });
      stopCurrent();
      return interaction.update({ components: [] }).catch(() => {});
    }

    if (dir === 'stop') {
      disconnect();
      return interaction.update({ embeds: [], components: [], content: '⏹️ Stopped.' }).catch(() => {});
    }

    if (dir === 'prev') {
      const { popForPrev } = require('./player/history');
      const { prepend, isEmpty } = require('./player/queue');
      const { joinChannel } = require('./player/player');
      const prev = popForPrev();
      if (!prev) return interaction.reply({ content: '⏮️ No previous track.', ephemeral: true });
      const voiceChannel = interaction.member?.voice?.channel;
      if (!isConnected() && voiceChannel) joinChannel(voiceChannel);
      prepend(prev);
      stopCurrent();
      return interaction.update({ components: [] }).catch(() => {});
    }
    return;
  }

  // Picker session buttons
  const sessionId = parts[1];
  const extra = parts[2];
  const sessions = require('./player/sessions');
  const session = sessions.get(sessionId);

  if (!session) {
    return interaction.reply({ content: '⏰ Selection expired. Use `!play` again.', ephemeral: true });
  }

  if (action === 'nav') {
    if (extra === 'next') session.page++;
    else if (extra === 'prev' && session.page > 0) session.page--;
    const { buildComponents, buildEmbed } = require('./commands/play');
    const { pageResults, start, songRow, navRow } = buildComponents(session);
    const embed = buildEmbed(session, pageResults, start);
    return interaction.update({ embeds: [embed], components: [songRow, navRow] });
  }

  if (action === 'pick') {
    const index = parseInt(extra, 10);
    const result = session.results[index];
    if (!result) return interaction.reply({ content: '❌ Invalid selection.', ephemeral: true });

    sessions.delete(sessionId);

    const voiceChannel = interaction.member?.voice?.channel;
    if (!voiceChannel) {
      return interaction.reply({ content: '⚠️ Please join a voice channel first.', ephemeral: true });
    }

    const { enqueue, isEmpty, dequeue } = require('./player/queue');
    const { joinChannel, playTrack, isConnected } = require('./player/player');

    const wasEmpty = isEmpty();
    const item = {
      title: result.title,
      url: result.webpage_url,
      requestedBy: interaction.user.username,
      textChannel: interaction.channel,
    };
    enqueue(item);

    await interaction.update({ embeds: [], components: [], content: `✅ Selected: **${result.title}**` });

    if (wasEmpty) {
      if (!isConnected()) joinChannel(voiceChannel);
      playTrack(dequeue(), interaction.channel);
    } else {
      interaction.channel.send(`➕ Added to queue: **${result.title}**`);
    }
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const [command, ...args] = message.content.slice(PREFIX.length).trim().split(/\s+/);

  try {
    switch (command.toLowerCase()) {
      case 'play':
        await require('./commands/play')(message, args);
        break;
      case 'skip':
      case 'next':
        await require('./commands/skip')(message);
        break;
      case 'prev': {
        const { popForPrev } = require('./player/history');
        const { prepend } = require('./player/queue');
        const { stopCurrent, isConnected } = require('./player/player');
        const prev = popForPrev();
        if (!prev) return message.reply('⏮️ No previous track.');
        if (!isConnected()) return message.reply('Nothing is playing.');
        prepend(prev);
        stopCurrent();
        message.reply('⏮️ Going back...');
        break;
      }
      case 'stop':
        await require('./commands/stop')(message);
        break;
      case 'queue':
        await require('./commands/queue')(message);
        break;
    }
  } catch (err) {
    console.error(`Command error [${command}]:`, err);
    message.reply('⚠️ Something went wrong. Check the logs.').catch(() => {});
  }
});

client.login(process.env.DISCORD_TOKEN);
