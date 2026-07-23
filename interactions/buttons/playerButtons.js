import { MessageFlags } from 'discord.js';
import { buildNowPlayingEmbed, buildQueueEmbed, buildHistoryEmbed } from '../../utils/embeds.js';
import { buildPlayerControls, buildQueueControls } from '../../utils/components.js';
import { cleanupLastNowPlaying } from '../../services/playerManager.js';
import { sendTemporaryReply } from '../../services/messageService.js';

/**
 * Handle player control and queue pagination button interactions.
 * @param {object} interaction Discord button interaction
 * @param {object} player Active Moonlink player
 */
export async function handlePlayerButtons(interaction, player) {
  const customId = interaction.customId;

  // Handle queue pagination and refresh buttons
  if (
    customId.startsWith('music_queue_prev_') ||
    customId.startsWith('music_queue_next_') ||
    customId === 'music_queue_refresh'
  ) {
    const itemsPerPage = 5;
    const totalPages = Math.ceil(player.queue.size / itemsPerPage) || 1;
    let targetPage = 1;

    if (customId.startsWith('music_queue_prev_')) {
      const currentPage = parseInt(customId.replace('music_queue_prev_', ''), 10) || 1;
      targetPage = Math.max(1, currentPage - 1);
    } else if (customId.startsWith('music_queue_next_')) {
      const currentPage = parseInt(customId.replace('music_queue_next_', ''), 10) || 1;
      targetPage = Math.min(totalPages, currentPage + 1);
    }

    const embed = buildQueueEmbed(player, targetPage, itemsPerPage);
    const row = buildQueueControls(targetPage, totalPages);
    await interaction.update({ embeds: [embed], components: [row] });
    return;
  }

  switch (customId) {
    case 'music_pause_resume': {
      const isPaused = player.paused;
      if (isPaused) {
        await player.resume();
      } else {
        await player.pause();
      }

      const updatedRow = buildPlayerControls(player);
      const updatedEmbed = player.current ? buildNowPlayingEmbed(player, player.current) : null;
      const components = Array.isArray(updatedRow) ? updatedRow : [updatedRow];

      if (interaction.message?.editable && updatedEmbed) {
        await interaction.update({ embeds: [updatedEmbed], components });
      } else if (interaction.message?.editable) {
        await interaction.update({ components });
      } else {
        await sendTemporaryReply(
          interaction,
          isPaused ? 'Resumed playback.' : 'Paused playback.',
          10000,
        );
      }
      break;
    }

    case 'music_skip': {
      if (!player.current && player.queue.size === 0) {
        return sendTemporaryReply(interaction, 'No track available to skip!', 10000);
      }
      const skippedTitle = player.current?.title || 'Track';
      await player.skip();

      await sendTemporaryReply(interaction, `Skipped **${skippedTitle}**.`, 10000);
      break;
    }

    case 'music_stop': {
      await cleanupLastNowPlaying(player);
      player.queue.clear();
      await player.destroy();

      await sendTemporaryReply(interaction, 'Playback stopped and queue cleared.', 10000);
      break;
    }

    case 'music_queue': {
      const itemsPerPage = 5;
      const totalPages = Math.ceil(player.queue.size / itemsPerPage) || 1;
      const embed = buildQueueEmbed(player, 1, itemsPerPage);
      const row = buildQueueControls(1, totalPages);
      await sendTemporaryReply(
        interaction,
        { embeds: [embed], components: [row], flags: MessageFlags.Ephemeral },
        60000,
      );
      break;
    }

    case 'music_history': {
      const itemsPerPage = 5;
      const embed = buildHistoryEmbed(player, 1, itemsPerPage);
      await sendTemporaryReply(
        interaction,
        { embeds: [embed], flags: MessageFlags.Ephemeral },
        60000,
      );
      break;
    }

    case 'music_loop': {
      const isCurrentlyLooping =
        player.loop === 'track' || player.loop === 'queue' || player.loop === true || player.repeat === true;
      const targetMode = isCurrentlyLooping ? 'off' : 'track';

      if (typeof player.setLoop === 'function') {
        player.setLoop(targetMode);
      } else {
        player.loop = targetMode;
      }

      const updatedRow = buildPlayerControls(player);
      const updatedEmbed = player.current ? buildNowPlayingEmbed(player, player.current) : null;
      const components = Array.isArray(updatedRow) ? updatedRow : [updatedRow];

      if (interaction.message?.editable && updatedEmbed) {
        await interaction.update({ embeds: [updatedEmbed], components });
      } else if (interaction.message?.editable) {
        await interaction.update({ components });
      } else {
        await sendTemporaryReply(
          interaction,
          targetMode !== 'off' ? 'Loop mode **enabled**.' : 'Loop mode **disabled**.',
          10000,
        );
      }
      break;
    }
  }
}
