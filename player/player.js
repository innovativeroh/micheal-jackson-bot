const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  StreamType,
  NoSubscriberBehavior,
  VoiceConnectionStatus,
} = require('@discordjs/voice');
const { spawn } = require('child_process');

let connection = null;
let audioPlayer = null;
let idleTimer = null;
let currentTextChannel = null;

const IDLE_TIMEOUT = parseInt(process.env.IDLE_TIMEOUT_MS || '300000', 10);

function joinChannel(voiceChannel) {
  // Fix 1: Remove listeners from old audioPlayer before replacing it
  if (audioPlayer) {
    audioPlayer.removeAllListeners();
    audioPlayer.stop(true);
  }
  if (connection) connection.destroy();

  connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: voiceChannel.guild.id,
    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
  });

  // Fix 5: Set NoSubscriberBehavior.Stop on audioPlayer creation
  audioPlayer = createAudioPlayer({
    behaviors: { noSubscriber: NoSubscriberBehavior.Stop },
  });
  audioPlayer.on(AudioPlayerStatus.Idle, _onIdle);
  // Fix 2: Error handler only logs/notifies; does NOT call _onIdle (Idle state fires naturally)
  audioPlayer.on('error', err => {
    console.error('Audio player error:', err.message);
    currentTextChannel?.send(`⚠️ Playback error: ${err.message}`);
  });
  connection.subscribe(audioPlayer);
}

function playTrack(url, textChannel) {
  // Fix 3: Guard against null audioPlayer
  if (!audioPlayer) {
    console.error('playTrack called before joinChannel');
    return;
  }

  currentTextChannel = textChannel;
  _clearIdleTimer();

  // Fix 7: Capture yt-dlp stderr for user feedback
  const ytdlp = spawn('yt-dlp', ['-f', 'bestaudio', '--no-playlist', '-o', '-', url], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stderrOutput = '';
  ytdlp.stderr.on('data', chunk => { stderrOutput += chunk.toString(); });

  ytdlp.on('close', code => {
    if (code !== 0) {
      console.error('yt-dlp exited with code', code, stderrOutput.slice(0, 200));
      currentTextChannel?.send('⚠️ Could not play that track (unavailable or restricted).');
    }
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

// Fix 4: Remove listeners before nulling audioPlayer in disconnect
function disconnect() {
  _clearIdleTimer();
  require('./queue').clear();
  currentTextChannel = null;
  if (audioPlayer) {
    audioPlayer.removeAllListeners();
    audioPlayer.stop(true);
    audioPlayer = null;
  }
  if (connection) {
    connection.destroy();
    connection = null;
  }
}

// Fix 6: Check VoiceConnectionStatus.Ready in isConnected
function isConnected() {
  return (
    connection !== null &&
    connection.state.status === VoiceConnectionStatus.Ready &&
    audioPlayer !== null
  );
}

module.exports = { joinChannel, playTrack, stopCurrent, disconnect, isConnected };
