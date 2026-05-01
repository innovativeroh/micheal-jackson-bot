const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  StreamType,
} = require('@discordjs/voice');
const { spawn } = require('child_process');

let connection = null;
let audioPlayer = null;
let idleTimer = null;
let currentTextChannel = null;

const IDLE_TIMEOUT = parseInt(process.env.IDLE_TIMEOUT_MS || '300000', 10);

function joinChannel(voiceChannel) {
  if (connection) connection.destroy();

  connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: voiceChannel.guild.id,
    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
  });

  audioPlayer = createAudioPlayer();
  audioPlayer.on(AudioPlayerStatus.Idle, _onIdle);
  audioPlayer.on('error', err => {
    console.error('Audio player error:', err.message);
    _onIdle();
  });
  connection.subscribe(audioPlayer);
}

function playTrack(url, textChannel) {
  currentTextChannel = textChannel;
  _clearIdleTimer();

  const ytdlp = spawn('yt-dlp', ['-f', 'bestaudio', '--no-playlist', '-o', '-', url], {
    stdio: ['ignore', 'pipe', 'ignore'],
  });

  ytdlp.on('error', err => {
    console.error('yt-dlp stream error:', err.message);
    _onIdle();
  });

  const resource = createAudioResource(ytdlp.stdout, { inputType: StreamType.Arbitrary });
  audioPlayer.play(resource);
}

function _onIdle() {
  const queue = require('./queue');
  if (!queue.isEmpty()) {
    const next = queue.dequeue();
    currentTextChannel?.send(`▶️ Now playing: **${next.title}**`);
    playTrack(next.url, currentTextChannel);
  } else {
    _startIdleTimer();
  }
}

function _startIdleTimer() {
  idleTimer = setTimeout(() => {
    currentTextChannel?.send('👋 Left voice channel due to inactivity.');
    disconnect();
  }, IDLE_TIMEOUT);
}

function _clearIdleTimer() {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
}

function stopCurrent() {
  if (audioPlayer) audioPlayer.stop();
}

function disconnect() {
  _clearIdleTimer();
  require('./queue').clear();
  currentTextChannel = null;
  if (connection) {
    connection.destroy();
    connection = null;
  }
  audioPlayer = null;
}

function isConnected() {
  return connection !== null && audioPlayer !== null;
}

module.exports = { joinChannel, playTrack, stopCurrent, disconnect, isConnected };
