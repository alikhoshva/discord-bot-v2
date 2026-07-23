// commands/music/queue.js
import { SlashCommandBuilder } from 'discord.js';
import { buildQueueEmbed } from '../../utils/embeds.js';
import { buildQueueControls } from '../../utils/components.js';
import { validateVoicePermissions } from '../../utils/voiceGuard.js';
import { sendTemporaryReply } from '../../services/messageService.js';

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

async function execute(interaction, client) {
  const voiceState = await validateVoicePermissions(interaction, client, {
    requirePlayer: true,
    requirePlaying: true,
  });
  if (!voiceState) return;

  const { player } = voiceState;
  const requestedPage = interaction.options.getInteger('page') || 1;
  const itemsPerPage = 5;
  const totalPages = Math.ceil(player.queue.size / itemsPerPage) || 1;
  const currentPage = Math.min(Math.max(requestedPage, 1), totalPages);

  const embed = buildQueueEmbed(player, currentPage, itemsPerPage);
  const row = buildQueueControls(currentPage, totalPages);

  return sendTemporaryReply(interaction, { embeds: [embed], components: [row] }, 60000);
}

export default {
  data: data,
  execute: execute,
};
