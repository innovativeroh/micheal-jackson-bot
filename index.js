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

  const [action, sessionId, extra] = interaction.customId.split('|');
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
    enqueue({
      title: result.title,
      url: result.webpage_url,
      requestedBy: interaction.user.username,
      textChannel: interaction.channel,
    });

    await interaction.update({ embeds: [], components: [], content: `✅ Selected: **${result.title}**` });

    if (wasEmpty) {
      if (!isConnected()) joinChannel(voiceChannel);
      const item = dequeue();
      playTrack(item.url, interaction.channel);
      interaction.channel.send(`▶️ Now playing: **${result.title}**`);
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
        await require('./commands/skip')(message);
        break;
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
