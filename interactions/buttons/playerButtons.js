// interactions/buttons/playerButtons.js
import { MessageFlags } from 'discord.js';
import { buildStatusEmbed, buildNowPlayingEmbed, buildQueueEmbed } from '../../utils/embeds.js';
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
        if (typeof player.resume === 'function') await player.resume();
        else await player.pause(false);
      } else {
        await player.pause(true);
      }

      const updatedRow = buildPlayerControls(player);
      const updatedEmbed = player.current ? buildNowPlayingEmbed(player, player.current) : null;

      if (interaction.message?.editable && updatedEmbed) {
        await interaction.update({ embeds: [updatedEmbed], components: [updatedRow] });
      } else if (interaction.message?.editable) {
        await interaction.update({ components: [updatedRow] });
      } else {
        await interaction.reply({
          content: isPaused ? '▶️ Resumed playback.' : '⏸️ Paused playback.',
          flags: MessageFlags.Ephemeral,
        });
      }
      break;
    }

    case 'music_skip': {
      if (!player.current && player.queue.size === 0) {
        return interaction.reply({
          content: 'No track available to skip!',
          flags: MessageFlags.Ephemeral,
        });
      }
      const skippedTitle = player.current?.title || 'Track';
      await player.skip();

      const embed = buildStatusEmbed({
        title: '⏭️ Skipped Track',
        description: `Skipped: **${skippedTitle}**`,
        type: 'info',
      });
      await sendTemporaryReply(interaction, { embeds: [embed] }, 5000);
      break;
    }

    case 'music_stop': {
      await cleanupLastNowPlaying(player);
      player.queue.clear();
      if (typeof player.destroy === 'function') {
        await player.destroy();
      } else {
        await player.stop();
      }

      const embed = buildStatusEmbed({
        title: '⏹️ Playback Stopped',
        description: 'Cleared queue and disconnected from channel.',
        type: 'danger',
      });
      await sendTemporaryReply(interaction, { embeds: [embed] }, 5000);
      break;
    }

    case 'music_queue': {
      const itemsPerPage = 5;
      const totalPages = Math.ceil(player.queue.size / itemsPerPage) || 1;
      const embed = buildQueueEmbed(player, 1, itemsPerPage);
      const row = buildQueueControls(1, totalPages);
      await interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
      break;
    }

    case 'music_loop': {
      const currentLoop = player.loop || player.repeat || false;
      const newLoopState = !currentLoop;
      player.loop = newLoopState;
      if (typeof player.setLoop === 'function') {
        player.setLoop(newLoopState);
      }

      const updatedRow = buildPlayerControls(player);
      const updatedEmbed = player.current ? buildNowPlayingEmbed(player, player.current) : null;

      if (interaction.message?.editable && updatedEmbed) {
        await interaction.update({ embeds: [updatedEmbed], components: [updatedRow] });
      } else if (interaction.message?.editable) {
        await interaction.update({ components: [updatedRow] });
      } else {
        await interaction.reply({
          content: newLoopState ? '🔁 Loop mode **enabled**.' : '➡️ Loop mode **disabled**.',
          flags: MessageFlags.Ephemeral,
        });
      }
      break;
    }
  }
}
