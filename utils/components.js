// utils/components.js
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

/**
 * Build interactive control buttons for the music player.
 * @param {object} player Moonlink player instance
 * @returns {ActionRowBuilder[]} Array of Discord action rows containing player control buttons
 */
export function buildPlayerControls(player) {
  const isPaused = player?.paused || false;
  const isLooping = player?.loop === 'track' || player?.loop === 'queue' || player?.loop === true || player?.repeat === true;

  const pauseResumeButton = new ButtonBuilder()
    .setCustomId('music_pause_resume')
    .setLabel(isPaused ? 'Resume' : 'Pause')
    .setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Primary);

  const skipButton = new ButtonBuilder()
    .setCustomId('music_skip')
    .setLabel('Skip')
    .setStyle(ButtonStyle.Secondary);

  const stopButton = new ButtonBuilder()
    .setCustomId('music_stop')
    .setLabel('Stop')
    .setStyle(ButtonStyle.Danger);

  const loopButton = new ButtonBuilder()
    .setCustomId('music_loop')
    .setLabel(isLooping ? 'Loop: ON' : 'Loop: OFF')
    .setStyle(isLooping ? ButtonStyle.Success : ButtonStyle.Secondary);

  const queueButton = new ButtonBuilder()
    .setCustomId('music_queue')
    .setLabel('Queue')
    .setStyle(ButtonStyle.Secondary);

  const historyButton = new ButtonBuilder()
    .setCustomId('music_history')
    .setLabel('History')
    .setStyle(ButtonStyle.Secondary);

  const row1 = new ActionRowBuilder().addComponents(
    pauseResumeButton,
    skipButton,
    stopButton,
    loopButton,
  );

  const row2 = new ActionRowBuilder().addComponents(
    queueButton,
    historyButton,
  );

  return [row1, row2];
}

/**
 * Build pagination & control buttons for the music queue embed.
 * @param {number} currentPage Current page number
 * @param {number} totalPages Total pages available
 * @returns {ActionRowBuilder} Discord action row containing queue navigation buttons
 */
export function buildQueueControls(currentPage = 1, totalPages = 1) {
  const prevButton = new ButtonBuilder()
    .setCustomId(`music_queue_prev_${currentPage}`)
    .setLabel('Previous')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(currentPage <= 1);

  const nextButton = new ButtonBuilder()
    .setCustomId(`music_queue_next_${currentPage}`)
    .setLabel('Next')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(currentPage >= totalPages);

  const refreshButton = new ButtonBuilder()
    .setCustomId('music_queue_refresh')
    .setLabel('Refresh')
    .setStyle(ButtonStyle.Primary);

  return new ActionRowBuilder().addComponents(
    prevButton,
    nextButton,
    refreshButton,
  );
}
