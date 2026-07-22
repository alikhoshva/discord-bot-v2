// commands/queue.js
import { EmbedBuilder, SlashCommandBuilder, MessageFlags } from 'discord.js';

const data = new SlashCommandBuilder()
  .setName('queue')
  .setDescription('Show the current queue')
  .addIntegerOption((option) =>
    option
      .setName('page')
      .setDescription('Page number to view')
      .setRequired(false)
      .setMinValue(1),
  );

function execute(interaction, client) {
  // Step 1: Get the player for this guild
  const player = client.manager.players.get(interaction.guild.id);

  // Step 2: Check if there is a player
  if (!player) {
    return interaction.reply({
      content: 'There is nothing playing in this server!',
      flags: MessageFlags.Ephemeral,
    });
  }

  // Step 3: Check if there are tracks in the queue
  if (!player.current && player.queue.size === 0) {
    return interaction.reply({
      content: 'There are no tracks in the queue!',
      flags: MessageFlags.Ephemeral,
    });
  }

  // Step 4: Format duration for display
  const formatDuration = (ms) => {
    if (!ms || isNaN(ms) || ms === Infinity) return 'Live';
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor(ms / (1000 * 60 * 60));

    return `${hours ? `${hours}:` : ''}${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Step 5: Handle pagination calculations
  const itemsPerPage = 10;
  const totalPages = Math.ceil(player.queue.size / itemsPerPage) || 1;
  const requestedPage = interaction.options.getInteger('page') || 1;
  const page = Math.min(requestedPage, totalPages);

  // Step 6: Create an embed for the queue
  const embed = new EmbedBuilder()
    .setTitle('Current Queue')
    .setColor('#0099ff');

  // Step 7: Add the current track to the embed
  if (player.current) {
    const requester = player.current.requester ? ` | Requested by: <@${player.current.requester}>` : '';
    embed.setDescription(
      `**Now Playing:**\n[${player.current.title}](${player.current.uri}) | \`${formatDuration(player.current.duration)}\`${requester}`,
    );
  }

  // Step 8: Add the queue tracks to the embed
  if (player.queue.size > 0) {
    const startIndex = (page - 1) * itemsPerPage;
    const pageTracks = player.queue.tracks.slice(startIndex, startIndex + itemsPerPage);

    const tracks = pageTracks.map((track, index) => {
      const globalIndex = startIndex + index + 1;
      const requester = track.requester ? ` | <@${track.requester}>` : '';
      return `${globalIndex}. [${track.title}](${track.uri}) | \`${formatDuration(track.duration)}\`${requester}`;
    });

    embed.addFields({
      name: `Up Next (Page ${page}/${totalPages}):`,
      value: tracks.join('\n'),
    });

    // Step 9: Add total queue summary in the footer
    const totalDurationMs = (player.current?.duration || 0) + player.queue.duration;
    embed.setFooter({
      text: `Page ${page}/${totalPages} • ${player.queue.size} track(s) in queue • Total Duration: ${formatDuration(totalDurationMs)}`,
    });
  }

  // Step 10: Send the embed to the channel
  interaction.reply({ embeds: [embed] });
}

export default {
  data: data,
  execute: execute,
};
