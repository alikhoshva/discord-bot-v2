// services/playerManager.js
import { Manager, Connectors } from 'moonlink.js';
import config from '../config.js';
import { buildNowPlayingEmbed, buildStatusEmbed } from '../utils/embeds.js';
import { buildPlayerControls } from '../utils/components.js';
import { getTextChannel, cleanupLastNowPlaying } from '../utils/playerHelpers.js';

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
    console.log(`Node ${node.identifier} connected`);
  });

  manager.on('nodeDisconnect', (node) => {
    console.log(`Node ${node.identifier} disconnected`);
  });

  manager.on('nodeError', (node, error) => {
    console.error(`Node ${node.identifier} encountered an error:`, error);
  });

  // Track playback events
  manager.on('trackStart', async (player, track) => {
    const channel = await getTextChannel(client, player.textChannelId);
    if (channel) {
      await cleanupLastNowPlaying(player);
      const embed = buildNowPlayingEmbed(player, track);
      const row = buildPlayerControls(player);
      player.lastNowPlayingMessage = await channel.send({ embeds: [embed], components: [row] });
    }
    if (player.idleTimeout) {
      clearTimeout(player.idleTimeout);
      player.idleTimeout = null;
    }
  });

  manager.on('trackEnd', (player, track) => {
    console.log(`Track ended: ${track.title}`);
    if (player.queue.size === 0) {
      startIdleTimer(player, client);
    }
  });

  manager.on('queueEnd', (player) => {
    startIdleTimer(player, client);
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

  const channel = await getTextChannel(client, player.textChannelId);
  if (channel) {
    const warningEmbed = buildStatusEmbed({
      title: '⏸️ Playback Idle',
      description: 'Playback stopped. Disconnecting in 30 seconds if no new tracks are added.',
      type: 'warning',
    });
    channel.send({ embeds: [warningEmbed] }).then((msg) => {
      setTimeout(() => msg.delete().catch(() => {}), 5000);
    }).catch(() => {});
  }

  player.idleTimeout = setTimeout(async () => {
    const activePlayer = client.manager?.players?.get(player.guildId);
    if (!activePlayer) return;

    if (!activePlayer.playing && activePlayer.queue.size === 0) {
      await activePlayer.destroy();
      const textChannel = await getTextChannel(client, activePlayer.textChannelId);
      if (textChannel) {
        const disconnectEmbed = buildStatusEmbed({
          title: '🔌 Disconnected',
          description: 'Disconnected from voice channel due to inactivity.',
          type: 'danger',
        });
        textChannel.send({ embeds: [disconnectEmbed] }).then((msg) => {
          setTimeout(() => msg.delete().catch(() => {}), 5000);
        }).catch(() => {});
      }
    }
  }, 30000);
}
