// commands/music/stop.js
import { SlashCommandBuilder } from 'discord.js';
import { buildStatusEmbed } from '../../utils/embeds.js';
import { validateVoicePermissions } from '../../utils/voiceGuard.js';
import { cleanupLastNowPlaying } from '../../services/playerManager.js';
import { sendTemporaryReply } from '../../services/messageService.js';

const data = new SlashCommandBuilder()
  .setName('stop')
  .setDescription('Stop playback and clear the queue');

async function execute(interaction, client) {
  const voiceState = await validateVoicePermissions(interaction, client, { requirePlayer: true });
  if (!voiceState) return;

  const { player } = voiceState;

  await cleanupLastNowPlaying(player);
  player.queue.clear();

  if (typeof player.destroy === 'function') {
    await player.destroy();
  } else {
    await player.stop();
  }

  const embed = buildStatusEmbed({
    title: '⏹️ Playback Stopped',
    description: 'Cleared the queue and disconnected from the voice channel.',
    type: 'danger',
  });

  return sendTemporaryReply(interaction, { embeds: [embed] }, 5000);
}

export default {
  data: data,
  execute: execute,
};
