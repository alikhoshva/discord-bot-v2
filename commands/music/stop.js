// commands/music/stop.js
import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { buildStatusEmbed } from '../../utils/embeds.js';

const data = new SlashCommandBuilder()
  .setName('stop')
  .setDescription('Stop playback and clear the queue');

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

  return interaction.reply({ embeds: [embed] });
}

export default {
  data: data,
  execute: execute,
};
