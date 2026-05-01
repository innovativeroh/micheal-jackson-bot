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
      maxBuffer: 10 * 1024 * 1024,
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
