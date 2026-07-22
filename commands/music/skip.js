// commands/skip.js
import { EmbedBuilder, SlashCommandBuilder, MessageFlags } from 'discord.js';

const data = new SlashCommandBuilder()
  .setName('skip')
  .setDescription('Skip the current song')
  .addIntegerOption(
    (option) =>
      option
        .setName('number')
        .setDescription('Number of songs to skip')
        .setRequired(false)
        .setMinValue(1),
  );

async function execute(interaction, client) {
  // Step 1: Get the player for this guild
  const player = client.manager.players.get(interaction.guild.id);

  // Step 2: Check if there is an active player
  if (!player) {
    return interaction.reply({
      content: 'There is nothing playing in this server!',
      flags: MessageFlags.Ephemeral,
    });
  }

  // Step 3: Check if user is in the same voice channel
  if (interaction.member.voice.channel?.id !== player.voiceChannelId) {
    return interaction.reply({
      content: 'You need to be in the same voice channel as the bot to use this command!',
      flags: MessageFlags.Ephemeral,
    });
  }

  // Step 4: Check if a track is currently playing
  if (!player.current) {
    return interaction.reply({
      content: 'There is nothing playing right now!',
      flags: MessageFlags.Ephemeral,
    });
  }

  const amount = interaction.options.getInteger('number') || 1;
  const totalAvailable = player.queue.size + 1; // Including currently playing track

  // Step 5: Validate skip amount
  if (amount > totalAvailable) {
    return interaction.reply({
      content: `Cannot skip **${amount}** tracks. Only **${totalAvailable}** track(s) available.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const skippedTrackTitle = player.current.title;

  // Step 6: Remove ahead-queued tracks if skipping multiple
  if (amount > 1) {
    if (typeof player.queue.removeRange === 'function') {
      player.queue.removeRange(0, amount - 1);
    } else {
      for (let i = 0; i < amount - 1; i++) {
        player.queue.remove(0);
      }
    }
  }

  // Step 7: Perform skip
  await player.skip();

  // Step 8: Send confirmation embed
  const embed = new EmbedBuilder()
    .setTitle('⏭️ Skipped Track')
    .setColor('#0099ff');

  if (amount === 1) {
    embed.setDescription(`Skipped: **[${skippedTrackTitle}](${player.current?.uri || '#'})**`);
  } else {
    embed.setDescription(`Skipped **${amount}** tracks.`);
  }

  return interaction.reply({ embeds: [embed] });
}

export default {
  data: data,
  execute: execute,
};
