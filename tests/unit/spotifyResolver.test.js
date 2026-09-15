// tests/unit/spotifyResolver.test.js
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  isSpotifyUrl,
  parseSpotifyUrl,
  resolveSpotify,
  clearSpotifyCache,
} from '../../services/spotifyResolver.js';

describe('Spotify Resolver Service Tests', () => {
  let originalFetch;

  beforeEach(() => {
    clearSpotifyCache();
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    clearSpotifyCache();
  });

  describe('isSpotifyUrl()', () => {
    it('should identify valid Spotify track URLs and URIs', () => {
      assert.strictEqual(isSpotifyUrl('https://open.spotify.com/track/2RePzySZcb2TFkBkmQsGo1'), true);
      assert.strictEqual(isSpotifyUrl('https://open.spotify.com/intl-es/track/2RePzySZcb2TFkBkmQsGo1?si=123'), true);
      assert.strictEqual(isSpotifyUrl('spotify:track:2RePzySZcb2TFkBkmQsGo1'), true);
    });

    it('should identify valid Spotify playlist and album URLs', () => {
      assert.strictEqual(isSpotifyUrl('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M'), true);
      assert.strictEqual(isSpotifyUrl('https://open.spotify.com/album/4aawyAB9vmqN3uQ7FjRGTy'), true);
      assert.strictEqual(isSpotifyUrl('spotify:playlist:37i9dQZF1DXcBWIGoYBM5M'), true);
      assert.strictEqual(isSpotifyUrl('spotify:album:4aawyAB9vmqN3uQ7FjRGTy'), true);
    });

    it('should return false for non-Spotify inputs', () => {
      assert.strictEqual(isSpotifyUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), false);
      assert.strictEqual(isSpotifyUrl('Rick Astley Never Gonna Give You Up'), false);
      assert.strictEqual(isSpotifyUrl(''), false);
      assert.strictEqual(isSpotifyUrl(null), false);
    });
  });

  describe('parseSpotifyUrl()', () => {
    it('should parse type and ID from open.spotify.com URLs', () => {
      const parsedTrack = parseSpotifyUrl('https://open.spotify.com/track/2RePzySZcb2TFkBkmQsGo1?si=abc');
      assert.deepStrictEqual(parsedTrack, { type: 'track', id: '2RePzySZcb2TFkBkmQsGo1' });

      const parsedPlaylist = parseSpotifyUrl('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M');
      assert.deepStrictEqual(parsedPlaylist, { type: 'playlist', id: '37i9dQZF1DXcBWIGoYBM5M' });
    });

    it('should parse type and ID from Spotify URIs', () => {
      const parsedAlbum = parseSpotifyUrl('spotify:album:4aawyAB9vmqN3uQ7FjRGTy');
      assert.deepStrictEqual(parsedAlbum, { type: 'album', id: '4aawyAB9vmqN3uQ7FjRGTy' });
    });

    it('should return null for invalid inputs', () => {
      assert.strictEqual(parseSpotifyUrl('https://google.com'), null);
      assert.strictEqual(parseSpotifyUrl('not a url'), null);
    });
  });

  describe('resolveSpotify()', () => {
    it('should resolve single track metadata from Next.js payload', async () => {
      const mockHtml = `
        <html>
          <body>
            <script id="__NEXT_DATA__" type="application/json">
              {
                "props": {
                  "pageProps": {
                    "state": {
                      "data": {
                        "entity": {
                          "type": "track",
                          "title": "Flares of the Blazing Sun",
                          "artists": [{ "name": "HOYO-MiX" }, { "name": "YMIR" }],
                          "duration": 213691,
                          "visualIdentity": {
                            "image": [{ "url": "https://image-cdn.spotify.com/sample.jpg" }]
                          }
                        }
                      }
                    }
                  }
                }
              }
            </script>
          </body>
        </html>
      `;

      globalThis.fetch = async () => ({
        ok: true,
        text: async () => mockHtml,
      });

      const track = await resolveSpotify('https://open.spotify.com/track/2RePzySZcb2TFkBkmQsGo1');

      assert.ok(track);
      assert.strictEqual(track.type, 'track');
      assert.strictEqual(track.title, 'Flares of the Blazing Sun');
      assert.strictEqual(track.artist, 'HOYO-MiX, YMIR');
      assert.strictEqual(track.searchQuery, 'Flares of the Blazing Sun HOYO-MiX');
      assert.strictEqual(track.duration, 213691);
      assert.strictEqual(track.thumbnail, 'https://image-cdn.spotify.com/sample.jpg');
    });

    it('should resolve playlist metadata and cap track count to limit', async () => {
      const mockTracks = Array.from({ length: 30 }, (_, i) => ({
        title: `Song ${i + 1}`,
        subtitle: `Artist ${i + 1}`,
        duration: 180000,
      }));

      const mockHtml = `
        <html>
          <body>
            <script id="__NEXT_DATA__" type="application/json">
              {
                "props": {
                  "pageProps": {
                    "state": {
                      "data": {
                        "entity": {
                          "type": "playlist",
                          "title": "Workout Hits",
                          "trackList": ${JSON.stringify(mockTracks)},
                          "visualIdentity": {
                            "image": [{ "url": "https://image-cdn.spotify.com/playlist.jpg" }]
                          }
                        }
                      }
                    }
                  }
                }
              }
            </script>
          </body>
        </html>
      `;

      globalThis.fetch = async () => ({
        ok: true,
        text: async () => mockHtml,
      });

      // Pass limit of 20
      const playlist = await resolveSpotify('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M', 20);

      assert.ok(playlist);
      assert.strictEqual(playlist.type, 'playlist');
      assert.strictEqual(playlist.title, 'Workout Hits');
      assert.strictEqual(playlist.trackCount, 30);
      assert.strictEqual(playlist.tracks.length, 20);
      assert.strictEqual(playlist.tracks[0].title, 'Song 1');
      assert.strictEqual(playlist.tracks[0].artist, 'Artist 1');
      assert.strictEqual(playlist.tracks[0].searchQuery, 'Song 1 Artist 1');
    });

    it('should use in-memory cache for repeated lookups', async () => {
      let fetchCount = 0;
      globalThis.fetch = async () => {
        fetchCount++;
        return {
          ok: true,
          text: async () => `
            <script id="__NEXT_DATA__" type="application/json">
              { "props": { "pageProps": { "state": { "data": { "entity": { "type": "track", "title": "Cached Song" } } } } } }
            </script>
          `,
        };
      };

      const res1 = await resolveSpotify('https://open.spotify.com/track/cache123');
      const res2 = await resolveSpotify('https://open.spotify.com/track/cache123');

      assert.strictEqual(fetchCount, 1);
      assert.deepStrictEqual(res1, res2);
    });

    it('should return null when fetch fails with non-200 status', async () => {
      globalThis.fetch = async () => ({
        ok: false,
        status: 404,
      });

      const res = await resolveSpotify('https://open.spotify.com/track/notfound');
      assert.strictEqual(res, null);
    });
  });
});
