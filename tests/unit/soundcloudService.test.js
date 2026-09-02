// tests/unit/soundcloudService.test.js
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  getSoundcloudSuggestions,
  clearSuggestionsCache,
} from '../../services/soundcloudService.js';
import { createMockTrack } from '../mocks/mockMoonlink.js';

describe('SoundCloud Service Tests', () => {
  beforeEach(() => {
    clearSuggestionsCache();
  });

  it('should return empty array when query is less than minimum length', async () => {
    const results = await getSoundcloudSuggestions('ab', {});
    assert.deepStrictEqual(results, []);
  });

  it('should return empty array when query is null or empty', async () => {
    const results = await getSoundcloudSuggestions('', {});
    assert.deepStrictEqual(results, []);
  });

  it('should return empty array when client.manager is missing', async () => {
    const results = await getSoundcloudSuggestions('synthwave', {});
    assert.deepStrictEqual(results, []);
  });

  it('should format SoundCloud search results into Discord autocomplete choices', async () => {
    const mockTracks = [
      createMockTrack({
        title: 'Cyberpunk City',
        author: 'SynthWave Artist',
        uri: 'https://soundcloud.com/artist/cyberpunk-city',
      }),
      createMockTrack({
        title: 'Neon Horizon',
        author: 'Retro Master',
        uri: 'https://soundcloud.com/artist/neon-horizon',
      }),
    ];

    const client = {
      manager: {
        search: async ({ query, source }) => {
          assert.strictEqual(query, 'cyberpunk');
          assert.strictEqual(source, 'soundcloud');
          return {
            loadType: 'search',
            tracks: mockTracks,
          };
        },
      },
    };

    const suggestions = await getSoundcloudSuggestions('cyberpunk', client);

    assert.strictEqual(suggestions.length, 2);
    assert.strictEqual(suggestions[0].name, 'Cyberpunk City - SynthWave Artist');
    assert.strictEqual(suggestions[0].value, 'https://soundcloud.com/artist/cyberpunk-city');
    assert.strictEqual(suggestions[1].name, 'Neon Horizon - Retro Master');
    assert.strictEqual(suggestions[1].value, 'https://soundcloud.com/artist/neon-horizon');
  });

  it('should truncate titles longer than 100 characters', async () => {
    const veryLongTitle = 'A'.repeat(120);
    const mockTracks = [
      createMockTrack({
        title: veryLongTitle,
        author: 'Artist',
        uri: 'https://soundcloud.com/artist/long',
      }),
    ];

    const client = {
      manager: {
        search: async () => ({
          loadType: 'search',
          tracks: mockTracks,
        }),
      },
    };

    const suggestions = await getSoundcloudSuggestions('long title', client);
    assert.strictEqual(suggestions.length, 1);
    assert.ok(suggestions[0].name.length <= 100);
    assert.ok(suggestions[0].name.endsWith('...'));
  });

  it('should serve cached suggestions for identical queries', async () => {
    let callCount = 0;
    const client = {
      manager: {
        search: async () => {
          callCount++;
          return {
            loadType: 'search',
            tracks: [createMockTrack({ title: 'Cached Song', author: 'Cached Artist' })],
          };
        },
      },
    };

    const first = await getSoundcloudSuggestions('cached query', client);
    const second = await getSoundcloudSuggestions('cached query', client);

    assert.strictEqual(callCount, 1);
    assert.deepStrictEqual(first, second);
  });

  it('should handle search errors gracefully and return empty array', async () => {
    const client = {
      manager: {
        search: async () => {
          throw new Error('NodeLink network failure');
        },
      },
    };

    const results = await getSoundcloudSuggestions('error test', client);
    assert.deepStrictEqual(results, []);
  });
});
