// commands/music/skip.js
import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { buildStatusEmbed } from '../../utils/embeds.js';
import { validateVoicePermissions } from '../../utils/voiceGuard.js';
import { sendTemporaryReply } from '../../services/messageService.js';

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
  const voiceState = await validateVoicePermissions(interaction, client, {
    requirePlayer: true,
    requirePlaying: true,
  });
  if (!voiceState) return;

  const { player } = voiceState;
  const amount = interaction.options.getInteger('number') || 1;
  const totalAvailable = player.queue.size + 1;

  if (amount > totalAvailable) {
    return sendTemporaryReply(
      interaction,
      `Cannot skip **${amount}** tracks. Only **${totalAvailable}** track(s) available.`,
      10000,
    );
  }

  const skippedTrackTitle = player.current.title;

  if (amount > 1) {
    player.queue.removeRange(0, amount - 1);
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

  return sendTemporaryReply(interaction, { embeds: [embed] }, 10000);
}

export default {
  data: data,
  execute: execute,
};
