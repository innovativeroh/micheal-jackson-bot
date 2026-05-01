const BANNED = ['remix', 'slowed', 'reverb', 'lofi', 'cover', 'mashup', 'dj', 'edit', 'nightcore', 'version'];

function isOfficialSong(title) {
  const lower = title.toLowerCase();
  return !BANNED.some(kw => lower.includes(kw));
}

function filterResults(results) {
  return results.filter(r => isOfficialSong(r.title));
}

module.exports = { isOfficialSong, filterResults };
