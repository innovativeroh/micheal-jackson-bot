📄 Product Requirements Document (PRD)
🎵 Discord YouTube Music Bot (Official Songs Only)
1. 📌 Overview

Build a Discord music bot that plays songs from YouTube based on user input.

Initial Version:
Plays a hardcoded YouTube playlist
Updated Version (Core Feature):
Accepts an artist name as input
Automatically finds and plays:
Official songs only
Avoids:
Remixes
Fan edits
Slowed/reverb versions
Covers
2. 🎯 Goals
Simple, reliable music playback bot
Clean audio streaming from YouTube
Accurate filtering for official songs
Minimal commands, easy UX
3. 👤 Target Users
Discord server users
Small communities (friends, dev groups, your Techsolace server)
4. ⚙️ Core Features
4.1 Hardcoded Playlist Playback
Command: !playlist
Behavior:
Joins user's voice channel
Plays predefined YouTube playlist
Auto-plays next song
4.2 Artist-Based Playback (Primary Feature)
Command:
!play <artist name>
Example:
!play Arijit Singh
Behavior:

Bot searches YouTube for:

"<artist name> official songs"
Filters results using:
Title keywords
Channel verification
Metadata
Plays top valid result
5. 🔍 Filtering Logic (VERY IMPORTANT)

Claude must implement strict filtering rules:

✅ Allow:
Official music videos
Artist’s official channel uploads
Label channels (e.g., T-Series, Sony Music India, etc.)
❌ Reject if title contains:
remix
slowed
reverb
lofi
cover
mashup
dj
edit
version
nightcore
✅ Prefer:
Titles containing:
"Official Video"
"Official Song"
"Music Video"
6. 🔁 Queue System
Maintain a queue of songs
Auto-play next when current ends
Commands:
!skip → skip current track
!stop → stop & clear queue
!queue → show current queue
7. 🔊 Voice Handling
Bot joins the user's voice channel automatically
Leaves when:
!stop is used
Idle for X minutes (configurable)
8. 🧠 Tech Stack Requirements

Claude should implement using:

Backend:
Node.js
Libraries:
discord.js
@discordjs/voice
yt-dlp OR ytdl-core (yt-dlp preferred for reliability)
Optional: YouTube Data API (for better filtering)
9. 📡 Search Strategy

Claude must implement one of these approaches:

Option A (Preferred):

Use YouTube Data API v3

Search videos by artist
Filter by:
channel
video title
relevance
Option B:

Use yt-dlp search:

ytsearch5:<artist name> official songs

Then filter results programmatically.

10. ⚠️ Edge Cases

Artist not found → send message:

❌ No official songs found for "<artist>"

No voice channel:

⚠️ Please join a voice channel first
Empty queue:
Auto disconnect
11. 🔐 Config
Token stored in .env
Optional:
Prefix customization
Default volume
12. 🧪 Success Criteria
Bot plays correct official songs 90%+ of the time
No remix/slowed tracks played
Stable playback with no crashes
13. 🚀 Future Enhancements (Optional)
Playlist by artist
Autoplay similar songs
Spotify integration
UI buttons (Discord interactions)
14. 🧾 Deliverables Expected from Claude

Claude should generate:

Full working bot code
Modular structure:
commands/
utils/
player/
Setup instructions
.env.example
Clear run steps
💡 Extra Instruction for Claude

Add this at the end when you paste:

Focus on clean, production-ready code. Avoid deprecated Discord APIs. Ensure audio playback is stable and low-latency. Implement strong filtering logic to avoid non-official songs.