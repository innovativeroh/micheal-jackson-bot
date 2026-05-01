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
