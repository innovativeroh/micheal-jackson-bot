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
