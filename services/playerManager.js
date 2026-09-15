// services/playerManager.js
import { Manager, Connectors } from 'moonlink.js';
import config from '../config.js';
import logger from '../utils/logger.js';
import { buildNowPlayingEmbed, buildStatusEmbed } from '../utils/embeds.js';
import { buildPlayerControls } from '../utils/components.js';
import { sendTemporaryMessage } from './messageService.js';

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
      logger.error(`Failed to fetch text channel ${channelId}:`, error);
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

/**
 * Initialize Moonlink Audio Manager and attach event listeners to Discord client.
 * @param {object} client Discord client instance
 * @returns {Manager} Initialized Moonlink manager instance
 */
export function initPlayerManager(client) {
  const manager = new Manager({
    nodes: [
      {
        host: config.lavalink.host,
        port: config.lavalink.port,
        password: config.lavalink.password,
        secure: config.lavalink.secure,
      },
    ],
    options: {
      defaultPlayer: { autoPlay: false },
    },
  });

  manager.use(new Connectors.DiscordJs(), client);

  // Node connection events
  manager.on('nodeConnect', (node) => {
    logger.info(`Node ${node.identifier} connected`);
  });

  manager.on('nodeDisconnect', (node) => {
    logger.info(`Node ${node.identifier} disconnected`);
  });

  manager.on('nodeError', (node, error) => {
    logger.error(`Node ${node.identifier} encountered an error:`, error);
  });

  // Track playback events
  manager.on('trackStart', async (player, track) => {
    if (!player.queueHistory) {
      player.queueHistory = [];
    }
    player.queueHistory.unshift({
      title: track.title,
      author: track.author || track.artist || 'Unknown Artist',
      uri: track.uri,
      duration: track.duration || 0,
      requester: track.requester || null,
      playedAt: Date.now(),
    });
    if (player.queueHistory.length > 100) {
      player.queueHistory.pop();
    }

    const channel = await getTextChannel(client, player.textChannelId);
    if (channel) {
      await cleanupLastNowPlaying(player);
      const embed = buildNowPlayingEmbed(player, track);
      const rows = buildPlayerControls(player);
      player.lastNowPlayingMessage = await channel.send({
        embeds: [embed],
        components: Array.isArray(rows) ? rows : [rows],
      });
    }
    if (player.idleTimeout) {
      clearTimeout(player.idleTimeout);
      player.idleTimeout = null;
    }
  });

  manager.on('trackEnd', (player, track) => {
    logger.info(`Track ended: ${track.title}`);
    if (player.queue.size === 0) {
      startIdleTimer(player, client);
    }
  });

  manager.on('queueEnd', (player) => {
    startIdleTimer(player, client);
  });

  manager.on('trackException', async (player, track, exception) => {
    logger.warn(`Track exception for "${track?.title}":`, exception?.message || exception);

    const isYouTube = track && (
      track.sourceName === 'youtube' ||
      track.uri?.includes('youtube.com') ||
      track.uri?.includes('youtu.be')
    );

    if (isYouTube && !track._scFallbackAttempted) {
      try {
        const cleanTitle = (track.title || '')
          .replace(/\s*\(Official (Music )?Video\)/gi, '')
          .replace(/\s*\[Official (Music )?Video\]/gi, '')
          .replace(/\s*\(Audio\)/gi, '')
          .replace(/\s*\[Audio\]/gi, '')
          .replace(/\s*\(4K Remaster\)/gi, '')
          .replace(/\s*\| 4K/gi, '')
          .replace(/\s*- Topic$/i, '')
          .trim();
        const author = track.author && !track.author.toLowerCase().includes('topic') ? track.author : '';
        const query = `${cleanTitle} ${author}`.trim();

        logger.info(`YouTube playback blocked for "${track.title}". Attempting SoundCloud fallback: "${query}"`);

        const scResult = await client.manager.search({
          query,
          source: 'soundcloud',
          requester: track.requester,
        });

        if (scResult?.tracks?.length > 0) {
          const fallbackTrack = scResult.tracks[0];
          fallbackTrack.requester = track.requester;
          fallbackTrack._scFallbackAttempted = true;

          player.queue.unshift(fallbackTrack);
          await player.play();

          const channel = await getTextChannel(client, player.textChannelId);
          if (channel) {
            await sendTemporaryMessage(
              channel,
              { content: `YouTube blocked playback of **${track.title}**. Automatically switched to SoundCloud version!` },
              10000,
            );
          }
          return;
        }
      } catch (err) {
        logger.error(`Error during SoundCloud fallback for "${track?.title}":`, err);
      }
    }
  });

  manager.on('playerDestroy', async (player) => {
    await cleanupLastNowPlaying(player);
  });

  return manager;
}

/**
 * Start 30-second idle countdown before destroying an inactive player.
 * @param {object} player Moonlink player instance
 * @param {object} client Discord client instance
 */
export async function startIdleTimer(player, client) {
  if (player.idleTimeout) return;

  await cleanupLastNowPlaying(player);

  player.idleTimeout = setTimeout(async () => {
    const activePlayer = client.manager?.players?.get(player.guildId);
    if (!activePlayer) return;

    if (!activePlayer.playing && activePlayer.queue.size === 0) {
      await activePlayer.destroy();
      await cleanupLastNowPlaying(activePlayer);
    }
  }, 30000);

  if (player.idleTimeout && typeof player.idleTimeout.unref === 'function') {
    player.idleTimeout.unref();
  }
}
