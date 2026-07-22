// interactions/buttons/queuePagination.js
import { buildQueueEmbed } from '../../utils/embeds.js';
import { buildQueueControls } from '../../utils/components.js';

/**
 * Handle queue pagination and refresh button interactions.
 * @param {object} interaction Discord button interaction
 * @param {object} player Active Moonlink player
 */
export async function handleQueuePagination(interaction, player) {
  const customId = interaction.customId;
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
}
