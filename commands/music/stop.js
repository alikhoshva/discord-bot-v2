// commands/stop.js
import { EmbedBuilder, SlashCommandBuilder, MessageFlags } from 'discord.js';

const data = new SlashCommandBuilder()
  .setName('stop')
  .setDescription('Stop playback and clear the queue');

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

  // Step 4: Clear queue and destroy/stop player
  player.queue.clear();

  if (typeof player.destroy === 'function') {
    await player.destroy();
  } else {
    await player.stop();
  }

  // Step 5: Send confirmation embed
  const embed = new EmbedBuilder()
    .setTitle('⏹️ Playback Stopped')
    .setDescription('Cleared the queue and disconnected from the voice channel.')
    .setColor('#0099ff');

  return interaction.reply({ embeds: [embed] });
}

export default {
  data: data,
  execute: execute,
};
