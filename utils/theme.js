// utils/theme.js

export const Colors = {
  BRAND: '#6C5CE7',      // Primary purple theme for music player
  SUCCESS: '#2ECC71',    // Green for track/playlist additions
  WARNING: '#F1C40F',    // Gold for idle timers and warnings
  DANGER: '#E74C3C',     // Red for stop/errors
  AI_DJ: '#FD79A8',      // Pink gradient vibe for AI DJ
  INFO: '#0099FF',       // Blue for general info
};

/**
 * Format duration from milliseconds to HH:MM:SS or MM:SS string.
 * @param {number} ms Duration in milliseconds
 * @returns {string} Formatted duration string
 */
export function formatDuration(ms) {
  if (!ms || isNaN(ms) || ms === Infinity) return 'Live Stream';
  const totalSeconds = Math.floor(ms / 1000);
  const seconds = Math.floor(totalSeconds % 60);
  const minutes = Math.floor((totalSeconds / 60) % 60);
  const hours = Math.floor(totalSeconds / 3600);

  const formattedSeconds = seconds.toString().padStart(2, '0');
  const formattedMinutes = minutes.toString().padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${formattedMinutes}:${formattedSeconds}`;
  }
  return `${minutes}:${formattedSeconds}`;
}

/**
 * Create a visual progress bar string for Discord embeds.
 * @param {number} currentMs Current playback position in ms
 * @param {number} totalMs Total track duration in ms
 * @param {number} size Number of bar segments
 * @returns {string} Formatted progress bar string with timestamp
 */
export function createProgressBar(currentMs = 0, totalMs = 0, size = 14) {
  if (!totalMs || isNaN(totalMs) || totalMs === Infinity) {
    return '🔴 `LIVE STREAM`';
  }

  const current = Math.min(Math.max(currentMs, 0), totalMs);
  const progress = Math.round((size * current) / totalMs);
  const emptyProgress = size - progress;

  const progressText = '═'.repeat(Math.max(0, progress));
  const emptyProgressText = '─'.repeat(Math.max(0, emptyProgress));

  const bar = `[${progressText}🔘${emptyProgressText}]`;
  const currentStr = formatDuration(current);
  const totalStr = formatDuration(totalMs);

  return `${bar} \`${currentStr} / ${totalStr}\``;
}
