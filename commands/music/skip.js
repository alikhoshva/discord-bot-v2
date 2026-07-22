// commands/music/skip.js
import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { buildStatusEmbed } from '../../utils/embeds.js';

const data = new SlashCommandBuilder()
  .setName('skip')
  .setDescription('Skip the current song')
  .addIntegerOption((option) =>
    option
      .setName('number')
      .setDescription('Number of songs to skip')
      .setRequired(false)
      .setMinValue(1),
  );

async function execute(interaction, client) {
  const player = client.manager.players.get(interaction.guild.id);

  if (!player) {
    return interaction.reply({
      content: 'There is nothing playing in this server!',
      flags: MessageFlags.Ephemeral,
    });
  }

  if (interaction.member.voice.channel?.id !== player.voiceChannelId) {
    return interaction.reply({
      content: 'You need to be in the same voice channel as the bot to use this command!',
      flags: MessageFlags.Ephemeral,
    });
  }

  if (!player.current) {
    return interaction.reply({
      content: 'There is nothing playing right now!',
      flags: MessageFlags.Ephemeral,
    });
  }

  const amount = interaction.options.getInteger('number') || 1;
  const totalAvailable = player.queue.size + 1;

  if (amount > totalAvailable) {
    return interaction.reply({
      content: `Cannot skip **${amount}** tracks. Only **${totalAvailable}** track(s) available.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const skippedTrackTitle = player.current.title;

  if (amount > 1) {
    if (typeof player.queue.removeRange === 'function') {
      player.queue.removeRange(0, amount - 1);
    } else {
      for (let i = 0; i < amount - 1; i++) {
        player.queue.remove(0);
      }
    }
  }

  await player.skip();

  const description = amount === 1
    ? `Skipped: **[${skippedTrackTitle}](${player.current?.uri || '#'})**`
    : `Skipped **${amount}** tracks.`;

  const embed = buildStatusEmbed({
    title: '⏭️ Skipped Track',
    description: description,
    type: 'info',
  });

  const reply = await interaction.reply({ embeds: [embed], fetchReply: true });
  setTimeout(() => {
    interaction.deleteReply().catch(() => {});
  }, 5000);
  return reply;
}

export default {
  data: data,
  execute: execute,
};
