// services/youtubeService.js
import config from '../config.js';

const MIN_QUERY_LENGTH = 3;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL
const suggestionCache = new Map();

/**
 * Fetch video title suggestions from YouTube Data API v3 with in-memory TTL caching.
 * @param {string} query Search query string
 * @returns {Promise<Array<{name: string, value: string}>>} Array of autocomplete choices
 */
export async function getYoutubeSuggestions(query) {
  if (!query || query.length < MIN_QUERY_LENGTH) {
    return [];
  }

  const normalizedQuery = query.trim().toLowerCase();
  const cached = suggestionCache.get(normalizedQuery);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const url = new URL('https://www.googleapis.com/youtube/v3/search');
    url.searchParams.append('part', 'snippet');
    url.searchParams.append('q', query);
    url.searchParams.append('type', 'video');
    url.searchParams.append('maxResults', '10');
    url.searchParams.append('key', config.YOUTUBE_API_KEY);

    const res = await fetch(url.toString());
    if (!res.ok) {
      const errText = await res.text();
      console.error(`YouTube API returned status ${res.status}: ${errText}`);
      return [];
    }

    const data = await res.json();
    if (!data?.items) {
      return [];
    }

    const suggestions = data.items.map((item) => {
      const title = item.snippet.title;
      const videoUrl = `https://www.youtube.com/watch?v=${item.id.videoId}`;

      return {
        name: title.length > 100 ? title.substring(0, 97) + '...' : title,
        value: videoUrl,
      };
    });

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
    console.error('Error fetching YouTube suggestions:', error.message || error);
    return [];
  }
}
