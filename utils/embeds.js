// utils/embeds.js
import { EmbedBuilder } from 'discord.js';
import { Colors, formatDuration, createProgressBar } from './theme.js';

/**
 * Build Now Playing rich embed card.
 * @param {object} player Moonlink player object
 * @param {object} track Current track object
 * @returns {EmbedBuilder}
 */
export function buildNowPlayingEmbed(player, track) {
  const artwork = track.artworkUrl || track.thumbnail || null;
  const requester = track.requester ? `<@${track.requester}>` : 'Unknown';
  const author = track.author || track.artist || 'Unknown Artist';
  const totalDuration = track.duration || 0;
  const isPaused = player.paused || false;

  let title = 'Now Playing';
  let color = Colors.BRAND;

  if (isPaused) {
    title = 'Playback Paused';
    color = Colors.WARNING;
  }

  const fields = [
    { name: 'Artist / Channel', value: author, inline: true },
    { name: 'Duration', value: formatDuration(totalDuration), inline: true },
    { name: 'Requested By', value: requester, inline: true },
  ];

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(`**[${track.title}](${track.uri})**`)
    .setColor(color)
    .addFields(fields);

  if (artwork) {
    embed.setThumbnail(artwork);
  }

  if (player.queue?.size > 0) {
    const nextTrack = player.queue.tracks[0];
    const nextTitle = nextTrack.title.length > 40 ? `${nextTrack.title.slice(0, 37)}...` : nextTrack.title;
    embed.setFooter({
      text: `Next Up: ${nextTitle} • ${player.queue.size} track(s) remaining`,
    });
  } else {
    embed.setFooter({
      text: 'Queue Empty • Add tracks with /play',
    });
  }

  return embed;
}

/**
 * Build Queue rich embed card.
 * @param {object} player Moonlink player object
 * @param {number} page Page number
 * @param {number} itemsPerPage Items per page
 * @returns {EmbedBuilder}
 */
export function buildQueueEmbed(player, page = 1, itemsPerPage = 5) {
  const totalTracks = player.queue.size;
  const totalPages = Math.ceil(totalTracks / itemsPerPage) || 1;
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const isLooping = player.loop || player.repeat || false;

  const embed = new EmbedBuilder()
    .setTitle('Current Music Queue')
    .setColor(Colors.BRAND);

  if (player.current) {
    const requester = player.current.requester ? ` • <@${player.current.requester}>` : '';
    const currentTitle = player.current.title.length > 55
      ? `${player.current.title.slice(0, 52)}...`
      : player.current.title;

    embed.setDescription(
      `**Now Playing:**\n[${currentTitle}](${player.current.uri}) \`[${formatDuration(player.current.duration)}]\`${requester}`,
    );
  } else {
    embed.setDescription('*Nothing is currently playing.*');
  }

  if (totalTracks > 0) {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const pageTracks = player.queue.tracks.slice(startIndex, startIndex + itemsPerPage);

    const tracksList = pageTracks.map((track, index) => {
      const globalIndex = startIndex + index + 1;
      const requester = track.requester ? ` • <@${track.requester}>` : '';
      const title = track.title.length > 45 ? `${track.title.slice(0, 42)}...` : track.title;
      return `**${globalIndex}.** [${title}](${track.uri}) \`[${formatDuration(track.duration)}]\`${requester}`;
    });

    let fieldValue = tracksList.join('\n');
    if (fieldValue.length > 1024) {
      fieldValue = fieldValue.substring(0, 1020) + '...';
    }

    embed.addFields({
      name: `Up Next (Page ${currentPage}/${totalPages}):`,
      value: fieldValue,
    });

    const totalDurationMs = (player.current?.duration || 0) + player.queue.duration;
    const loopStatus = isLooping ? ' • Loop: ON' : '';
    embed.setFooter({
      text: `Page ${currentPage}/${totalPages} • ${totalTracks} track(s) in queue • Total: ${formatDuration(totalDurationMs)}${loopStatus}`,
    });
  } else {
    embed.addFields({
      name: 'Up Next:',
      value: '*No tracks in queue. Add more using `/play`!*',
    });
  }

  return embed;
}

/**
 * Build Single Track Added confirmation embed.
 * @param {object} track Added track
 * @param {number} position Queue position
 * @param {boolean} isNowPlaying Whether track is playing immediately
 * @param {string} userId Requester user ID
 * @returns {EmbedBuilder}
 */
export function buildTrackAddedEmbed(track, position, isNowPlaying, userId) {
  const embed = new EmbedBuilder()
    .setTitle(isNowPlaying ? 'Track Starting' : 'Added to Queue')
    .setDescription(`**[${track.title}](${track.uri})**`)
    .setColor(Colors.SUCCESS)
    .addFields(
      { name: 'Duration', value: `\`${formatDuration(track.duration)}\``, inline: true },
      { name: 'Requested By', value: `<@${userId}>`, inline: true },
    );

  if (!isNowPlaying) {
    embed.addFields({ name: 'Position in Queue', value: `#${position}`, inline: true });
  }

  const artwork = track.artworkUrl || track.thumbnail;
  if (artwork) {
    embed.setThumbnail(artwork);
  }

  return embed;
}

/**
 * Build Playlist Added confirmation embed.
 * @param {object} playlistInfo Playlist metadata
 * @param {Array} tracks Array of tracks added
 * @param {string} query Search query or URL
 * @param {string} userId Requester user ID
 * @returns {EmbedBuilder}
 */
export function buildPlaylistAddedEmbed(playlistInfo, tracks, query, userId) {
  const embed = new EmbedBuilder()
    .setTitle('Playlist Added to Queue')
    .setDescription(`**[${playlistInfo?.name || 'Playlist'}](${query})**`)
    .setColor(Colors.SUCCESS)
    .addFields(
      { name: 'Tracks Added', value: `${tracks.length}`, inline: true },
      { name: 'Requested By', value: `<@${userId}>`, inline: true },
    );

  const firstTrack = tracks[0];
  const artwork = firstTrack?.artworkUrl || firstTrack?.thumbnail;
  if (artwork) {
    embed.setThumbnail(artwork);
  }

  return embed;
}

/**
 * Build AI DJ Playlist confirmation embed.
 * @param {string} prompt Prompt theme
 * @param {Array} tracks List of loaded tracks
 * @param {string} userId Requester user ID
 * @returns {EmbedBuilder}
 */
export function buildAIDJEmbed(prompt, tracks, userId) {
  const sampleList = tracks
    .slice(0, 5)
    .map((t, i) => {
      const title = t.title.length > 50 ? `${t.title.slice(0, 47)}...` : t.title;
      return `**${i + 1}.** [${title}](${t.uri})`;
    })
    .join('\n');

  let previewValue = sampleList + (tracks.length > 5 ? '\n*...and more in `/queue`*' : '');
  if (previewValue.length > 1024) {
    previewValue = previewValue.substring(0, 1020) + '...';
  }

  return new EmbedBuilder()
    .setTitle('AI DJ Playlist Generated')
    .setDescription(`**Vibe:** "${prompt}"\nAdded **${tracks.length}** tracks to the queue.`)
    .addFields(
      { name: 'Tracks Preview', value: previewValue },
      { name: 'Requested By', value: `<@${userId}>`, inline: true },
    )
    .setColor(Colors.AI_DJ);
}

/**
 * Build standardized alert or status embed.
 * @param {object} options Options object { title, description, type, footer }
 * @returns {EmbedBuilder}
 */
export function buildStatusEmbed({ title, description, type = 'info', footer }) {
  let color = Colors.INFO;
  if (type === 'success') color = Colors.SUCCESS;
  if (type === 'warning') color = Colors.WARNING;
  if (type === 'danger') color = Colors.DANGER;

  const cleanTitle = typeof title === 'string' ? title.replace(/^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{24C2}-\u{1F251}]\s*/u, '') : title;

  const embed = new EmbedBuilder()
    .setTitle(cleanTitle)
    .setColor(color);

  if (description) embed.setDescription(description);
  if (footer) embed.setFooter({ text: footer });

  return embed;
}
