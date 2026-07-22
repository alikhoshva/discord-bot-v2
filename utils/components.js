// utils/components.js
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

/**
 * Build interactive control buttons for the music player.
 * @param {object} player Moonlink player instance
 * @returns {ActionRowBuilder} Discord action row containing player control buttons
 */
export function buildPlayerControls(player) {
  const isPaused = player?.paused || false;
  const isLooping = player?.loop || player?.repeat || false;

  const pauseResumeButton = new ButtonBuilder()
    .setCustomId('music_pause_resume')
    .setLabel(isPaused ? 'Resume' : 'Pause')
    .setEmoji(isPaused ? '▶️' : '⏸️')
    .setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Primary);

  const skipButton = new ButtonBuilder()
    .setCustomId('music_skip')
    .setLabel('Skip')
    .setEmoji('⏭️')
    .setStyle(ButtonStyle.Secondary);

  const stopButton = new ButtonBuilder()
    .setCustomId('music_stop')
    .setLabel('Stop')
    .setEmoji('⏹️')
    .setStyle(ButtonStyle.Danger);

  const queueButton = new ButtonBuilder()
    .setCustomId('music_queue')
    .setLabel('Queue')
    .setEmoji('📜')
    .setStyle(ButtonStyle.Secondary);

  const loopButton = new ButtonBuilder()
    .setCustomId('music_loop')
    .setLabel(isLooping ? 'Loop: ON' : 'Loop: OFF')
    .setEmoji('🔁')
    .setStyle(isLooping ? ButtonStyle.Success : ButtonStyle.Secondary);

  return new ActionRowBuilder().addComponents(
    pauseResumeButton,
    skipButton,
    stopButton,
    queueButton,
    loopButton,
  );
}
