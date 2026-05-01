# Discord Music Bot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Node.js Discord bot that searches YouTube via yt-dlp and plays official songs only, with a queue system and auto-disconnect.

**Architecture:** Command router in `index.js` dispatches to command handlers in `commands/`. Pure logic (filtering, queue state) lives in `utils/` and `player/queue.js`. Audio streaming and voice connection managed by `player/player.js`. yt-dlp is invoked as a child process — for search (JSON dump) and for streaming (piped audio).

**Tech Stack:** Node.js, discord.js v14, @discordjs/voice, @discordjs/opus, yt-dlp (system binary), ffmpeg (system binary), dotenv, Jest

---

## File Map

| File | Responsibility |
|---|---|
| `index.js` | Bot entry point, startup checks, command router |
| `commands/play.js` | `!play <artist>` handler |
| `commands/skip.js` | `!skip` handler |
| `commands/stop.js` | `!stop` handler |
| `commands/queue.js` | `!queue` handler |
| `player/search.js` | yt-dlp search + result parsing |
| `player/queue.js` | In-memory queue state (enqueue/dequeue/clear/getAll/isEmpty) |
| `player/player.js` | Voice connection, audio stream, idle timer |
| `utils/filter.js` | Title keyword filtering rules |
| `tests/filter.test.js` | Jest unit tests for filter.js |
| `tests/queue.test.js` | Jest unit tests for player/queue.js |
| `.env` | DISCORD_TOKEN, PREFIX, IDLE_TIMEOUT_MS |
| `.env.example` | Template with placeholder values |
| `package.json` | Dependencies and scripts |

---

## Task 1: Project Setup

**Files:**
- Create: `package.json`
- Create: `.env.example`
- Create: `.env`

- [ ] **Step 1: Initialize package.json**

```bash
cd /Users/rohanpuri/Desktop/Projects/Discord-Bot
npm init -y
```

- [ ] **Step 2: Install dependencies**

```bash
npm install discord.js @discordjs/voice @discordjs/opus dotenv
npm install --save-dev jest
```

If `@discordjs/opus` fails to build (requires Xcode CLI tools), use fallback:
```bash
npm install opusscript
```

- [ ] **Step 3: Update package.json with scripts and jest config**

Replace the contents of `package.json` with:

```json
{
  "name": "discord-music-bot",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "test": "jest --testPathPattern=tests/"
  },
  "jest": {
    "testEnvironment": "node"
  },
  "dependencies": {
    "@discordjs/opus": "^0.9.0",
    "@discordjs/voice": "^0.17.0",
    "discord.js": "^14.0.0",
    "dotenv": "^16.0.0"
  },
  "devDependencies": {
    "jest": "^29.0.0"
  }
}
```

- [ ] **Step 4: Create .env.example**

```
DISCORD_TOKEN=your_discord_bot_token_here
PREFIX=!
IDLE_TIMEOUT_MS=300000
```

- [ ] **Step 5: Create .env**

Copy `.env.example` to `.env` and fill in your actual Discord bot token.

```bash
cp .env.example .env
```

- [ ] **Step 6: Create folder structure**

```bash
mkdir -p commands player utils tests
```

- [ ] **Step 7: Verify yt-dlp and ffmpeg are installed**

```bash
yt-dlp --version
ffmpeg -version
```

Expected: version strings printed. If missing:
- yt-dlp: `brew install yt-dlp` (Mac)
- ffmpeg: `brew install ffmpeg` (Mac)

- [ ] **Step 8: Commit**

```bash
git init
echo "node_modules/" > .gitignore
echo ".env" >> .gitignore
git add package.json package-lock.json .env.example .gitignore
git commit -m "chore: project setup with dependencies"
```

---

## Task 2: Filtering Logic (TDD)

**Files:**
- Create: `utils/filter.js`
- Create: `tests/filter.test.js`

- [ ] **Step 1: Write the failing tests**

Create `tests/filter.test.js`:

```javascript
const { isOfficialSong, filterResults } = require('../utils/filter');

describe('isOfficialSong', () => {
  test('accepts plain title', () => {
    expect(isOfficialSong('Tum Hi Ho')).toBe(true);
  });

  test('accepts title with Official Video', () => {
    expect(isOfficialSong('Tum Hi Ho | Official Video | Arijit Singh')).toBe(true);
  });

  test('rejects remix', () => {
    expect(isOfficialSong('Tum Hi Ho Remix')).toBe(false);
  });

  test('rejects slowed', () => {
    expect(isOfficialSong('Tum Hi Ho (Slowed + Reverb)')).toBe(false);
  });

  test('rejects reverb', () => {
    expect(isOfficialSong('Tum Hi Ho reverb')).toBe(false);
  });

  test('rejects lofi', () => {
    expect(isOfficialSong('Lofi Tum Hi Ho')).toBe(false);
  });

  test('rejects cover', () => {
    expect(isOfficialSong('Tum Hi Ho Cover by Someone')).toBe(false);
  });

  test('rejects mashup', () => {
    expect(isOfficialSong('Arijit Singh Mashup 2024')).toBe(false);
  });

  test('rejects nightcore', () => {
    expect(isOfficialSong('Tum Hi Ho Nightcore')).toBe(false);
  });

  test('rejects dj edit', () => {
    expect(isOfficialSong('Tum Hi Ho DJ Edit')).toBe(false);
  });

  test('is case-insensitive', () => {
    expect(isOfficialSong('Tum Hi Ho REMIX')).toBe(false);
    expect(isOfficialSong('TUM HI HO SLOWED')).toBe(false);
  });
});

describe('filterResults', () => {
  test('returns only passing results', () => {
    const results = [
      { title: 'Tum Hi Ho Remix', webpage_url: 'url1' },
      { title: 'Tum Hi Ho | Official Video', webpage_url: 'url2' },
      { title: 'Tum Hi Ho Slowed', webpage_url: 'url3' },
      { title: 'Tum Hi Ho | Official Song', webpage_url: 'url4' },
    ];
    const filtered = filterResults(results);
    expect(filtered).toHaveLength(2);
    expect(filtered[0].webpage_url).toBe('url2');
    expect(filtered[1].webpage_url).toBe('url4');
  });

  test('returns empty array when all rejected', () => {
    const results = [
      { title: 'Remix 1', webpage_url: 'url1' },
      { title: 'Cover Version', webpage_url: 'url2' },
    ];
    expect(filterResults(results)).toHaveLength(0);
  });

  test('returns empty array for empty input', () => {
    expect(filterResults([])).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test
```

Expected: FAIL — `Cannot find module '../utils/filter'`

- [ ] **Step 3: Implement utils/filter.js**

Create `utils/filter.js`:

```javascript
const BANNED = ['remix', 'slowed', 'reverb', 'lofi', 'cover', 'mashup', 'dj', 'edit', 'nightcore', 'version'];

function isOfficialSong(title) {
  const lower = title.toLowerCase();
  return !BANNED.some(kw => lower.includes(kw));
}

function filterResults(results) {
  return results.filter(r => isOfficialSong(r.title));
}

module.exports = { isOfficialSong, filterResults };
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Expected: All 13 tests PASS

- [ ] **Step 5: Commit**

```bash
git add utils/filter.js tests/filter.test.js
git commit -m "feat: add title filtering logic with tests"
```

---

## Task 3: Queue State (TDD)

**Files:**
- Create: `player/queue.js`
- Create: `tests/queue.test.js`

- [ ] **Step 1: Write the failing tests**

Create `tests/queue.test.js`:

```javascript
const queue = require('../player/queue');

beforeEach(() => {
  queue.clear();
});

test('isEmpty returns true on empty queue', () => {
  expect(queue.isEmpty()).toBe(true);
});

test('enqueue adds item', () => {
  queue.enqueue({ title: 'Song A', url: 'url-a', requestedBy: 'user1' });
  expect(queue.isEmpty()).toBe(false);
  expect(queue.getAll()).toHaveLength(1);
});

test('dequeue removes and returns first item', () => {
  queue.enqueue({ title: 'Song A', url: 'url-a', requestedBy: 'user1' });
  queue.enqueue({ title: 'Song B', url: 'url-b', requestedBy: 'user2' });
  const item = queue.dequeue();
  expect(item.title).toBe('Song A');
  expect(queue.getAll()).toHaveLength(1);
});

test('dequeue returns undefined on empty queue', () => {
  expect(queue.dequeue()).toBeUndefined();
});

test('clear empties the queue', () => {
  queue.enqueue({ title: 'Song A', url: 'url-a', requestedBy: 'user1' });
  queue.enqueue({ title: 'Song B', url: 'url-b', requestedBy: 'user2' });
  queue.clear();
  expect(queue.isEmpty()).toBe(true);
  expect(queue.getAll()).toHaveLength(0);
});

test('getAll returns copy, not reference', () => {
  queue.enqueue({ title: 'Song A', url: 'url-a', requestedBy: 'user1' });
  const all = queue.getAll();
  all.push({ title: 'Fake', url: 'fake', requestedBy: 'nobody' });
  expect(queue.getAll()).toHaveLength(1);
});

test('maintains FIFO order', () => {
  queue.enqueue({ title: 'First', url: 'url-1', requestedBy: 'u1' });
  queue.enqueue({ title: 'Second', url: 'url-2', requestedBy: 'u2' });
  queue.enqueue({ title: 'Third', url: 'url-3', requestedBy: 'u3' });
  expect(queue.dequeue().title).toBe('First');
  expect(queue.dequeue().title).toBe('Second');
  expect(queue.dequeue().title).toBe('Third');
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test
```

Expected: FAIL — `Cannot find module '../player/queue'`

- [ ] **Step 3: Implement player/queue.js**

Create `player/queue.js`:

```javascript
const _queue = [];

function enqueue(item) {
  _queue.push(item);
}

function dequeue() {
  return _queue.shift();
}

function clear() {
  _queue.length = 0;
}

function getAll() {
  return [..._queue];
}

function isEmpty() {
  return _queue.length === 0;
}

module.exports = { enqueue, dequeue, clear, getAll, isEmpty };
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Expected: All 7 queue tests + 13 filter tests PASS (20 total)

- [ ] **Step 5: Commit**

```bash
git add player/queue.js tests/queue.test.js
git commit -m "feat: add in-memory queue with tests"
```

---

## Task 4: YouTube Search

**Files:**
- Create: `player/search.js`

- [ ] **Step 1: Create player/search.js**

```javascript
const { execFile } = require('child_process');
const { promisify } = require('util');
const { filterResults } = require('../utils/filter');

const execFileAsync = promisify(execFile);

async function search(artist) {
  const query = `ytsearch5:${artist} official song`;
  let stdout;

  try {
    ({ stdout } = await execFileAsync('yt-dlp', [query, '--dump-json'], {
      timeout: 30000,
    }));
  } catch (err) {
    console.error('yt-dlp search failed:', err.message);
    return null;
  }

  const results = stdout
    .trim()
    .split('\n')
    .filter(Boolean)
    .map(line => {
      try { return JSON.parse(line); } catch { return null; }
    })
    .filter(Boolean);

  const filtered = filterResults(results);
  return filtered.length > 0 ? filtered[0] : null;
}

module.exports = { search };
```

- [ ] **Step 2: Manual smoke test**

```bash
node -e "
const { search } = require('./player/search');
search('Arijit Singh').then(r => console.log(r ? r.title + ' -> ' + r.webpage_url : 'No results'));
"
```

Expected: prints a song title and YouTube URL (not a remix/cover/slowed track)

- [ ] **Step 3: Commit**

```bash
git add player/search.js
git commit -m "feat: add yt-dlp search with filtering"
```

---

## Task 5: Audio Player and Voice Connection

**Files:**
- Create: `player/player.js`

- [ ] **Step 1: Create player/player.js**

```javascript
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
```

- [ ] **Step 2: Commit**

```bash
git add player/player.js
git commit -m "feat: add voice connection and audio streaming"
```

---

## Task 6: !play Command

**Files:**
- Create: `commands/play.js`

- [ ] **Step 1: Create commands/play.js**

```javascript
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
```

- [ ] **Step 2: Commit**

```bash
git add commands/play.js
git commit -m "feat: add !play command"
```

---

## Task 7: !skip and !stop Commands

**Files:**
- Create: `commands/skip.js`
- Create: `commands/stop.js`

- [ ] **Step 1: Create commands/skip.js**

```javascript
const { stopCurrent, isConnected } = require('../player/player');

module.exports = async function skip(message) {
  if (!isConnected()) {
    return message.reply('Nothing is playing.');
  }
  stopCurrent();
  message.reply('⏭️ Skipped.');
};
```

- [ ] **Step 2: Create commands/stop.js**

```javascript
const { disconnect, isConnected } = require('../player/player');

module.exports = async function stop(message) {
  if (!isConnected()) {
    return message.reply('Nothing is playing.');
  }
  disconnect();
  message.reply('⏹️ Stopped and disconnected.');
};
```

- [ ] **Step 3: Commit**

```bash
git add commands/skip.js commands/stop.js
git commit -m "feat: add !skip and !stop commands"
```

---

## Task 8: !queue Command

**Files:**
- Create: `commands/queue.js`

- [ ] **Step 1: Create commands/queue.js**

```javascript
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
```

- [ ] **Step 2: Commit**

```bash
git add commands/queue.js
git commit -m "feat: add !queue command"
```

---

## Task 9: Bot Entry Point

**Files:**
- Create: `index.js`

- [ ] **Step 1: Create index.js**

```javascript
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
```

- [ ] **Step 2: Verify all tests still pass**

```bash
npm test
```

Expected: 20 tests PASS

- [ ] **Step 3: Commit**

```bash
git add index.js
git commit -m "feat: add bot entry point with startup checks and command router"
```

---

## Task 10: Integration Test

- [ ] **Step 1: Start the bot**

```bash
npm start
```

Expected output:
```
✅ Logged in as YourBot#1234
```

- [ ] **Step 2: Test !play**

In Discord:
1. Join a voice channel
2. Type `!play Arijit Singh`

Expected:
- Bot replies: `🔍 Searching for official songs by **Arijit Singh**...`
- Bot sends: `▶️ Now playing: **<song title>**`
- Bot joins your voice channel and plays audio
- Verify title is NOT a remix/slowed/cover track

- [ ] **Step 3: Test !queue**

While song plays:
1. Type `!play Shreya Ghoshal`
2. Type `!queue`

Expected:
- First play: bot says `➕ Added to queue: **<song>**`
- `!queue` shows 1 queued item with requester name

- [ ] **Step 4: Test !skip**

Type `!skip`

Expected:
- Bot replies `⏭️ Skipped.`
- Next song in queue starts playing automatically
- Bot sends `▶️ Now playing: **<next title>**`

- [ ] **Step 5: Test !stop**

Type `!stop`

Expected:
- Bot replies `⏹️ Stopped and disconnected.`
- Bot leaves voice channel
- Queue is cleared

- [ ] **Step 6: Test error cases**

1. Type `!play Arijit Singh` without being in a voice channel
   - Expected: `⚠️ Please join a voice channel first`

2. Type `!play xyznonexistentartist12345`
   - Expected: `❌ No official songs found for "xyznonexistentartist12345"` (or bot finds something — either is valid)

- [ ] **Step 7: Test idle disconnect**

Temporarily set `IDLE_TIMEOUT_MS=10000` in `.env`, restart bot, play a song, skip it with empty queue. After 10 seconds bot should leave and send `👋 Left voice channel due to inactivity.`

Reset `IDLE_TIMEOUT_MS=300000` after confirming.

- [ ] **Step 8: Final commit**

```bash
git add .
git commit -m "chore: complete integration testing"
```
