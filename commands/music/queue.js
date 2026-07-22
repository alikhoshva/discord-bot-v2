// commands/music/queue.js
import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { buildQueueEmbed } from '../../utils/embeds.js';

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
  const player = client.manager.players.get(interaction.guild.id);

  if (!player) {
    return interaction.reply({
      content: 'There is nothing playing in this server!',
      flags: MessageFlags.Ephemeral,
    });
  }

  if (!player.current && player.queue.size === 0) {
    return interaction.reply({
      content: 'There are no tracks in the queue!',
      flags: MessageFlags.Ephemeral,
    });
  }

  const requestedPage = interaction.options.getInteger('page') || 1;
  const embed = buildQueueEmbed(player, requestedPage);

  return interaction.reply({ embeds: [embed] });
}

export default {
  data: data,
  execute: execute,
};
