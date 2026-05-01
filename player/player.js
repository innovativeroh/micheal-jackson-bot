const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  StreamType,
  NoSubscriberBehavior,
  VoiceConnectionStatus,
} = require('@discordjs/voice');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { spawn } = require('child_process');

let connection = null;
let audioPlayer = null;
let idleTimer = null;
let currentTextChannel = null;
let intentionalStop = false;
let currentArtist = null;
const recentlyPlayed = new Set();

const IDLE_TIMEOUT = parseInt(process.env.IDLE_TIMEOUT_MS || '300000', 10);

function setArtist(artist) {
  currentArtist = artist;
}

function joinChannel(voiceChannel) {
  if (connection) connection.destroy();
  if (audioPlayer) {
    audioPlayer.removeAllListeners();
    audioPlayer.stop(true);
  }

  connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: voiceChannel.guild.id,
    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
  });

  audioPlayer = createAudioPlayer({
    behaviors: { noSubscriber: NoSubscriberBehavior.Stop },
  });
  audioPlayer.on(AudioPlayerStatus.Idle, _onIdle);
  audioPlayer.on('error', err => {
    console.error('Audio player error:', err.message);
    currentTextChannel?.send(`⚠️ Playback error: ${err.message}`);
  });
  connection.subscribe(audioPlayer);
}

// item = { title, url, requestedBy?, textChannel? }
function playTrack(item, textChannel) {
  if (!audioPlayer) {
    console.error('playTrack called before joinChannel');
    return;
  }

  require('./history').push(item);

  // Track recently played to avoid repeats in auto-play
  recentlyPlayed.add(item.url);
  if (recentlyPlayed.size > 20) {
    recentlyPlayed.delete(recentlyPlayed.values().next().value);
  }

  intentionalStop = false;
  currentTextChannel = textChannel;
  _clearIdleTimer();

  const ytdlp = spawn('yt-dlp', ['-f', 'bestaudio', '--no-playlist', '--cookies-from-browser', 'safari', '-o', '-', item.url], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stderrOutput = '';
  ytdlp.stderr.on('data', chunk => {
    if (stderrOutput.length < 500) stderrOutput += chunk.toString();
  });

  ytdlp.on('close', code => {
    if (code !== 0 && !intentionalStop) {
      console.error('yt-dlp exited with code', code, stderrOutput.slice(0, 200));
      currentTextChannel?.send('⚠️ Could not play that track (unavailable or restricted).');
    }
  });

  ytdlp.on('error', err => {
    console.error('yt-dlp spawn error:', err.message);
    currentTextChannel?.send('⚠️ Could not start playback (yt-dlp unavailable).');
    _onIdle();
  });

  const resource = createAudioResource(ytdlp.stdout, { inputType: StreamType.Arbitrary });
  audioPlayer.play(resource);

  _sendNowPlaying(item.title, textChannel);
}

function _sendNowPlaying(title, textChannel) {
  if (!textChannel) return;
  const embed = new EmbedBuilder()
    .setTitle('▶️ Now Playing')
    .setDescription(`**${title}**`)
    .setColor(0x1db954);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ctrl|prev').setLabel('⏮️ Prev').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ctrl|next').setLabel('⏭️ Next').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ctrl|stop').setLabel('⏹️ Stop').setStyle(ButtonStyle.Danger)
  );

  textChannel.send({ embeds: [embed], components: [row] }).catch(() => {});
}

function _onIdle() {
  const queue = require('./queue');
  if (!queue.isEmpty()) {
    playTrack(queue.dequeue(), currentTextChannel);
  } else if (currentArtist) {
    _autoPlay();
  } else {
    _startIdleTimer();
  }
}

async function _autoPlay() {
  try {
    const { searchMultiple } = require('./search');
    const results = await searchMultiple(currentArtist, 8);
    const next = results.find(r => !recentlyPlayed.has(r.webpage_url));

    if (!next) {
      recentlyPlayed.clear();
      if (results[0]) playTrack({ title: results[0].title, url: results[0].webpage_url }, currentTextChannel);
      else _startIdleTimer();
      return;
    }

    playTrack({ title: next.title, url: next.webpage_url }, currentTextChannel);
  } catch (err) {
    console.error('Auto-play failed:', err.message);
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
  if (audioPlayer) {
    intentionalStop = true;
    audioPlayer.stop();
  }
}

function disconnect() {
  _clearIdleTimer();
  currentArtist = null;
  recentlyPlayed.clear();
  require('./queue').clear();
  currentTextChannel = null;
  if (audioPlayer) {
    intentionalStop = true;
    audioPlayer.removeAllListeners();
    audioPlayer.stop(true);
    audioPlayer = null;
  }
  if (connection) {
    connection.destroy();
    connection = null;
  }
}

function isConnected() {
  return (
    connection !== null &&
    connection.state.status === VoiceConnectionStatus.Ready &&
    audioPlayer !== null
  );
}

module.exports = { joinChannel, playTrack, stopCurrent, disconnect, isConnected, setArtist };
