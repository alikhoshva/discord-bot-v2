// commands/queue.js
import { EmbedBuilder, SlashCommandBuilder, MessageFlags } from 'discord.js';

const data = new SlashCommandBuilder()
  .setName('queue')
  .setDescription('Show the current queue');

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

  // Step 4: Format duration for display (No change needed)
  const formatDuration = (ms) => {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor(ms / (1000 * 60 * 60));

    return `${hours ? `${hours}:` : ''}${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Step 5: Create an embed for the queue (No change needed)
  const embed = new EmbedBuilder()
    .setTitle('Current Queue')
    .setColor('#0099ff');

  // Step 6: Add the current track to the embed (No change needed)
  if (player.current) {
    embed.setDescription(
      `**Now Playing:**\n[${player.current.title}](${player.current.uri}) | \`${formatDuration(player.current.duration)}\``,
    );
  }

  // Step 7: Add the queue tracks to the embed (No change needed)
  if (player.queue.size > 0) {
    const tracks = player.queue.tracks.map((track, index) => {
      return `${index + 1}. [${track.title}](${track.uri}) | \`${formatDuration(track.duration)}\``;
    });

    embed.addFields({
      name: 'Up Next:',
      value: tracks.slice(0, 10).join('\n'),
    });

    // If there are more than 10 tracks, add a note
    if (player.queue.size > 10) {
      embed.addFields({
        name: 'And more...',
        value: `${player.queue.size - 10} more tracks in the queue`,
      });
    }
  }

  // Step 8: Send the embed to the channel
  interaction.reply({ embeds: [embed] });
}

export default {
  data: data,
  execute: execute,
};
