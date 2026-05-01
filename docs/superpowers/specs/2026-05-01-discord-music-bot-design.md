# Discord YouTube Music Bot — Design Spec
**Date:** 2026-05-01

## Overview

Node.js Discord bot for Techsolace server. Plays official YouTube songs by artist name. No YouTube Data API key required. Single-server deployment, runs locally.

---

## Goals

- Accept `!play <artist>` command and stream audio in voice channel
- Filter out remixes, covers, slowed/reverb, fan edits — play official songs only
- Maintain a queue with skip/stop/view commands
- Auto-disconnect after 5 minutes of idle

---

## Out of Scope (for now)

- `!playlist` command
- YouTube Data API v3
- Multi-server support
- Spotify integration
- UI buttons / Discord interactions

---

## Architecture

```
discord-bot/
├── index.js              # Bot entry point, message event listener, command router
├── commands/
│   ├── play.js           # !play <artist> handler
│   ├── skip.js           # !skip handler
│   ├── stop.js           # !stop handler
│   └── queue.js          # !queue handler
├── player/
│   ├── search.js         # yt-dlp search + result selection
│   ├── queue.js          # Queue state (array + enqueue/dequeue ops)
│   └── player.js         # Audio stream management, voice connection, idle timer
├── utils/
│   └── filter.js         # Title keyword filtering rules
├── .env                  # DISCORD_TOKEN, PREFIX (default: !), IDLE_TIMEOUT_MS
└── .env.example
```

---

## Data Flow

1. User types `!play Arijit Singh` in text channel
2. `index.js` routes to `commands/play.js`
3. `play.js` calls `search.js` with artist name
4. `search.js` runs: `yt-dlp "ytsearch5:Arijit Singh official song" --dump-json --no-playlist`
5. `filter.js` evaluates each result title — rejects banned keywords, prefers official keywords
6. First passing result URL returned to `play.js`
7. If queue empty → `player.js` streams immediately via `@discordjs/voice`
8. If queue has items → append to queue, confirm in chat
9. On track end → `player.js` dequeues next → plays automatically
10. Idle timer resets on each track start; fires disconnect + queue clear after 5 min silence

---

## Filtering Logic (filter.js)

**Reject** if title (lowercased) contains any of:
```
remix, slowed, reverb, lofi, cover, mashup, dj, edit, nightcore, version
```

**Prefer** (score boost, not hard requirement) if title contains any of:
```
official video, official song, music video
```

**Search query format:** `ytsearch5:<artist> official song`

Results are evaluated in order; first passing result is used.

---

## Queue System (player/queue.js)

Queue is a simple in-memory array: `[{ title, url, requestedBy }]`

- Single global queue (single server)
- `enqueue(item)` — push to end
- `dequeue()` — shift from front
- `clear()` — empty array
- `getAll()` — return copy for display

---

## Commands

| Command | Behavior |
|---|---|
| `!play <artist>` | Search → filter → enqueue or play immediately |
| `!skip` | Stop current track, play next in queue |
| `!stop` | Stop playback, clear queue, disconnect bot |
| `!queue` | Display current queue in chat |

---

## Voice Handling (player/player.js)

- On play: join user's current voice channel
- On stop/queue empty: disconnect
- Idle timer: 5 min (`IDLE_TIMEOUT_MS=300000` in `.env`) → disconnect + clear queue
- Timer resets on each new track

---

## Error Handling

| Scenario | Bot response |
|---|---|
| User not in voice channel | `⚠️ Please join a voice channel first` |
| No results pass filter | `❌ No official songs found for "<artist>"` |
| yt-dlp not installed | Startup check logs error, bot exits with instructions |
| Track stream error | Skip to next in queue, log error |

---

## Tech Stack

| Dependency | Purpose |
|---|---|
| `discord.js` v14 | Discord API, message events |
| `@discordjs/voice` | Voice connection + audio player |
| `yt-dlp` (system binary) | YouTube search + audio stream URL extraction |
| `@discordjs/opus` | Audio encoding |
| `ffmpeg` (system binary) | Audio transcoding for voice |
| `dotenv` | Env var loading |

---

## Config (.env)

```
DISCORD_TOKEN=your_token_here
PREFIX=!
IDLE_TIMEOUT_MS=300000
```

---

## Success Criteria

- Bot plays correct official songs 90%+ of the time
- No remix/slowed/cover tracks played
- Stable playback, no crashes on normal use
- Queue auto-advances correctly
- Auto-disconnects after idle period
