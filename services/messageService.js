// services/messageService.js
import logger from '../utils/logger.js';

/**
 * Send or edit an interaction reply and automatically schedule its deletion.
 * @param {object} interaction Discord interaction object
 * @param {object|string} payload Message payload object or content string
 * @param {number} durationMs Time in ms before auto-deleting message (default 5000ms)
 * @returns {Promise<object|null>} The sent message object or interaction response
 */
export async function sendTemporaryReply(interaction, payload, durationMs = 10000) {
  if (!interaction) return null;

  const messageOptions = typeof payload === 'string' ? { content: payload } : payload;
  let reply;

  try {
    if (interaction.replied || interaction.deferred) {
      reply = await interaction.editReply(messageOptions);
    } else {
      await interaction.reply(messageOptions);
      reply = await interaction.fetchReply();
    }
  } catch (error) {
    logger.error('Error sending temporary reply:', error);
    return null;
  }

  const timer = setTimeout(() => {
    interaction.deleteReply().catch(() => {});
  }, durationMs);

  if (timer && typeof timer.unref === 'function') {
    timer.unref();
  }

  return reply;
}

/**
 * Send a message to a text channel and automatically schedule its deletion.
 * @param {object} channel Discord channel object
 * @param {object|string} payload Message payload object or content string
 * @param {number} durationMs Time in ms before auto-deleting message (default 10000ms)
 * @returns {Promise<object|null>} The sent message object or null on failure
 */
export async function sendTemporaryMessage(channel, payload, durationMs = 10000) {
  if (!channel || typeof channel.send !== 'function') return null;

  const messageOptions = typeof payload === 'string' ? { content: payload } : payload;
  let message;

  try {
    message = await channel.send(messageOptions);
  } catch (error) {
    logger.error('Error sending temporary channel message:', error);
    return null;
  }

  const timer = setTimeout(() => {
    message.delete().catch(() => {});
  }, durationMs);

  if (timer && typeof timer.unref === 'function') {
    timer.unref();
  }

  return message;
}

