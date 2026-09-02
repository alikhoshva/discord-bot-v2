// services/soundcloudService.js
import logger from '../utils/logger.js';

const MIN_QUERY_LENGTH = 3;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL
const suggestionCache = new Map();

/**
 * Fetch track suggestions from SoundCloud via NodeLink/Moonlink with in-memory TTL caching.
 * @param {string} query Search query string
 * @param {object} client Discord client instance (containing moonlink manager)
 * @returns {Promise<Array<{name: string, value: string}>>} Array of autocomplete choices
 */
export async function getSoundcloudSuggestions(query, client) {
  if (!query || query.length < MIN_QUERY_LENGTH) {
    return [];
  }

  const normalizedQuery = query.trim().toLowerCase();
  const cached = suggestionCache.get(normalizedQuery);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    if (!client?.manager) {
      logger.warn('SoundCloud suggestions requested but client.manager is not initialized.');
      return [];
    }

    const searchResult = await client.manager.search({
      query: query.trim(),
      source: 'soundcloud',
    });

    if (!searchResult || !searchResult.tracks || !searchResult.tracks.length) {
      return [];
    }

    const suggestions = searchResult.tracks.slice(0, 15).map((track) => {
      const author = track.author || track.artist || 'SoundCloud';
      const label = `${track.title} - ${author}`;
      const name = label.length > 100 ? label.substring(0, 97) + '...' : label;
      const value = track.uri || track.title;

      return {
        name,
        value: value.length > 100 ? value.substring(0, 100) : value,
      };
    });

    // Cleanup stale entries if cache size exceeds limit
    if (suggestionCache.size > 200) {
      const now = Date.now();
      for (const [key, value] of suggestionCache.entries()) {
        if (now - value.timestamp > CACHE_TTL_MS) {
          suggestionCache.delete(key);
        }
      }
    }

    suggestionCache.set(normalizedQuery, { timestamp: Date.now(), data: suggestions });
    return suggestions;
  } catch (error) {
    logger.error('Error fetching SoundCloud suggestions:', error.message || error);
    return [];
  }
}

/**
 * Clear suggestions cache (useful for testing).
 */
export function clearSuggestionsCache() {
  suggestionCache.clear();
}
