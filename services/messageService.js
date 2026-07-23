// services/messageService.js
import logger from '../utils/logger.js';

/**
 * Send or edit an interaction reply and automatically schedule its deletion.
 * @param {object} interaction Discord interaction object
 * @param {object|string} payload Message payload object or content string
 * @param {number} durationMs Time in ms before auto-deleting message (default 5000ms)
 * @returns {Promise<object|null>} The sent message object or interaction response
 */
export async function sendTemporaryReply(interaction, payload, durationMs = 5000) {
  if (!interaction) return null;

  const messageOptions = typeof payload === 'string' ? { content: payload } : payload;
  let reply;

  try {
    if (interaction.replied || interaction.deferred) {
      reply = await interaction.editReply(messageOptions);
    } else {
      reply = await interaction.reply({ ...messageOptions, fetchReply: true });
    }
  } catch (error) {
    logger.error('Error sending temporary reply:', error);
    return null;
  }

  setTimeout(() => {
    interaction.deleteReply().catch(() => {});
  }, durationMs);

  return reply;
}

