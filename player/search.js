const { execFile } = require('child_process');
const { promisify } = require('util');
const { filterResults } = require('../utils/filter');

const execFileAsync = promisify(execFile);

async function _ytdlpSearch(query) {
  let stdout;
  try {
    ({ stdout } = await execFileAsync('yt-dlp', [query, '--dump-json'], {
      timeout: 30000,
      maxBuffer: 10 * 1024 * 1024,
    }));
  } catch (err) {
    console.error('yt-dlp search failed:', err.message);
    return [];
  }
  return stdout
    .trim()
    .split('\n')
    .filter(Boolean)
    .map(line => { try { return JSON.parse(line); } catch { return null; } })
    .filter(Boolean);
}

async function search(artist) {
  const results = await _ytdlpSearch(`ytsearch5:${artist} official song`);
  const filtered = filterResults(results);
  return filtered.length > 0 ? filtered[0] : null;
}

async function searchMultiple(artist, count = 10) {
  const results = await _ytdlpSearch(`ytsearch${count}:${artist} official song`);
  return filterResults(results);
}

module.exports = { search, searchMultiple };
