const { execFile } = require('child_process');
const { promisify } = require('util');
const { filterResults } = require('../utils/filter');

const execFileAsync = promisify(execFile);

// --flat-playlist skips full metadata fetch — much faster for search
async function _ytdlpSearch(query) {
  let stdout;
  try {
    ({ stdout } = await execFileAsync(
      'yt-dlp',
      [query, '--flat-playlist', '--dump-json'],
      { timeout: 15000, maxBuffer: 5 * 1024 * 1024 }
    ));
  } catch (err) {
    console.error('yt-dlp search failed:', err.message);
    return [];
  }
  return stdout
    .trim()
    .split('\n')
    .filter(Boolean)
    .map(line => {
      try {
        const r = JSON.parse(line);
        // flat-playlist gives id + title; construct webpage_url from id
        return {
          title: r.title,
          webpage_url: r.webpage_url || `https://www.youtube.com/watch?v=${r.id}`,
        };
      } catch { return null; }
    })
    .filter(Boolean);
}

async function search(artist) {
  const results = await _ytdlpSearch(`ytsearch5:${artist} official audio`);
  const filtered = filterResults(results);
  return filtered.length > 0 ? filtered[0] : null;
}

async function searchMultiple(artist, count = 8) {
  const results = await _ytdlpSearch(`ytsearch${count}:${artist} official audio`);
  return filterResults(results);
}

module.exports = { search, searchMultiple };
