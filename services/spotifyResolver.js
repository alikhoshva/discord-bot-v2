// services/spotifyResolver.js
import config from '../config.js';
import logger from '../utils/logger.js';

const SPOTIFY_URL_REGEX = /(?:https?:\/\/open\.spotify\.com\/(?:[a-z]{2,4}-[a-z]{2,4}\/)?|spotify:)(track|playlist|album)[:/]([a-zA-Z0-9]+)/;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache
const spotifyCache = new Map();

/**
 * Check if a given string contains a supported Spotify link or URI.
 * @param {string} input Input string to check
 * @returns {boolean} True if input contains a Spotify URL or URI
 */
export function isSpotifyUrl(input) {
  if (!input || typeof input !== 'string') return false;
  return SPOTIFY_URL_REGEX.test(input.trim());
}

/**
 * Parse a Spotify URL or URI into its resource type and ID.
 * @param {string} input Input URL or URI string
 * @returns {{ type: 'track' | 'playlist' | 'album', id: string } | null}
 */
export function parseSpotifyUrl(input) {
  if (!input || typeof input !== 'string') return null;
  const match = input.trim().match(SPOTIFY_URL_REGEX);
  if (!match) return null;
  return {
    type: match[1],
    id: match[2],
  };
}

/**
 * Clear the in-memory Spotify resolution cache (useful for testing).
 */
export function clearSpotifyCache() {
  spotifyCache.clear();
}

/**
 * Resolve Spotify track, album, or playlist metadata via Spotify's public embed interface.
 * Requires zero API credentials or Spotify Premium.
 *
 * @param {string} input Spotify URL or URI
 * @param {number} [playlistLimit] Maximum tracks to return for playlist/album (defaults to config.spotifyPlaylistLimit)
 * @returns {Promise<{
 *   type: 'track' | 'playlist' | 'album',
 *   title: string,
 *   artist?: string,
 *   searchQuery?: string,
 *   duration?: number,
 *   thumbnail?: string | null,
 *   trackCount?: number,
 *   tracks?: Array<{ title: string, artist: string, searchQuery: string, duration?: number }>
 * } | null>}
 */
export async function resolveSpotify(input, playlistLimit = config.spotifyPlaylistLimit || 20) {
  const parsed = parseSpotifyUrl(input);
  if (!parsed) return null;

  const { type, id } = parsed;
  const cacheKey = `${type}:${id}`;
  const cached = spotifyCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const embedUrl = `https://open.spotify.com/embed/${type}/${id}`;
    const response = await fetch(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      logger.warn(`Failed to fetch Spotify embed for ${type}/${id}: HTTP ${response.status}`);
      return null;
    }

    const html = await response.text();
    let result = null;

    // Primary Extraction: Extract JSON from Next.js payload
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/);
    if (nextDataMatch) {
      try {
        const parsedJson = JSON.parse(nextDataMatch[1]);
        const entity = parsedJson?.props?.pageProps?.state?.data?.entity;

        if (entity) {
          if (type === 'track') {
            const title = entity.name || entity.title || 'Unknown Track';
            const artists = entity.artists?.map((a) => a.name).filter(Boolean) || [];
            const artist = artists.join(', ') || 'Unknown Artist';
            const searchQuery = artists.length > 0 ? `${title} ${artists[0]}` : title;
            const thumbnail = entity.visualIdentity?.image?.[0]?.url || null;

            result = {
              type: 'track',
              title,
              artist,
              searchQuery,
              duration: entity.duration || 0,
              thumbnail,
            };
          } else if (type === 'playlist' || type === 'album') {
            const title = entity.name || entity.title || (type === 'album' ? 'Unknown Album' : 'Unknown Playlist');
            const rawTracks = entity.trackList || [];
            const totalCount = rawTracks.length;
            const limitedTracks = rawTracks.slice(0, playlistLimit);

            const tracks = limitedTracks.map((t) => {
              const trackTitle = t.title || 'Unknown Track';
              const trackArtist = t.subtitle || '';
              const searchQuery = trackArtist ? `${trackTitle} ${trackArtist}` : trackTitle;

              return {
                title: trackTitle,
                artist: trackArtist,
                searchQuery,
                duration: t.duration || 0,
              };
            });

            const thumbnail = entity.visualIdentity?.image?.[0]?.url || null;

            result = {
              type,
              title,
              trackCount: totalCount,
              tracks,
              thumbnail,
            };
          }
        }
      } catch (parseError) {
        logger.warn(`Error parsing __NEXT_DATA__ JSON for Spotify ${type}/${id}:`, parseError);
      }
    }

    // Fallback: If __NEXT_DATA__ is absent or changed, use oEmbed API for single tracks
    if (!result && type === 'track') {
      const oEmbedUrl = `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${id}`;
      try {
        const oEmbedRes = await fetch(oEmbedUrl);
        if (oEmbedRes.ok) {
          const oEmbedData = await oEmbedRes.json();
          if (oEmbedData?.title) {
            result = {
              type: 'track',
              title: oEmbedData.title,
              artist: '',
              searchQuery: oEmbedData.title,
              duration: 0,
              thumbnail: oEmbedData.thumbnail_url || null,
            };
          }
        }
      } catch (oEmbedErr) {
        logger.warn(`Fallback oEmbed failed for Spotify track ${id}:`, oEmbedErr);
      }
    }

    if (result) {
      // Maintain cache size within bounds
      if (spotifyCache.size > 200) {
        const now = Date.now();
        for (const [key, value] of spotifyCache.entries()) {
          if (now - value.timestamp > CACHE_TTL_MS) {
            spotifyCache.delete(key);
          }
        }
      }
      spotifyCache.set(cacheKey, { timestamp: Date.now(), data: result });
    }

    return result;
  } catch (error) {
    logger.error(`Unexpected error resolving Spotify ${type}/${id}:`, error);
    return null;
  }
}
