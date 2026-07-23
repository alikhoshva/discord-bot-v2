// commands/music/history.js
import { SlashCommandBuilder } from 'discord.js';
import { buildHistoryEmbed } from '../../utils/embeds.js';
import { validateVoicePermissions } from '../../utils/voiceGuard.js';
import { sendTemporaryReply } from '../../services/messageService.js';

const data = new SlashCommandBuilder()
  .setName('history')
  .setDescription('Show tracks played in the current session')
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
  });
  if (!voiceState) return;

  const { player } = voiceState;
  const history = player.queueHistory || [];
  const requestedPage = interaction.options.getInteger('page') || 1;
  const itemsPerPage = 5;
  const totalPages = Math.ceil(history.length / itemsPerPage) || 1;
  const currentPage = Math.min(Math.max(requestedPage, 1), totalPages);

  const embed = buildHistoryEmbed(player, currentPage, itemsPerPage);

  return sendTemporaryReply(interaction, { embeds: [embed] }, 60000);
}

export default {
  data: data,
  execute: execute,
};
