// utils/playerHelpers.js

/**
 * Safely fetch a text channel by ID using client cache or API fetch fallback.
 * @param {object} client Discord client instance
 * @param {string} channelId Discord channel ID
 * @returns {Promise<object|null>} Discord channel or null if fetch fails
 */
export async function getTextChannel(client, channelId) {
  if (!channelId) return null;
  let channel = client.channels.cache.get(channelId);
  if (!channel) {
    try {
      channel = await client.channels.fetch(channelId);
    } catch (error) {
      console.error(`Failed to fetch text channel ${channelId}:`, error);
      return null;
    }
  }
  return channel;
}

/**
 * Delete previous Now Playing message associated with a player if present.
 * @param {object} player Moonlink player instance
 */
export async function cleanupLastNowPlaying(player) {
  if (!player) return;
  if (player.lastNowPlayingMessage && typeof player.lastNowPlayingMessage.delete === 'function') {
    player.lastNowPlayingMessage.delete().catch(() => {});
    player.lastNowPlayingMessage = null;
  }
}
