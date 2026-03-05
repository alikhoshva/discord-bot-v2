// commands/stop.js
import { SlashCommandBuilder } from 'discord.js';

const data = new SlashCommandBuilder()
  .setName('stop')
  .setDescription('Stop playback and clear the queue');

async function execute(interaction, client) {
  const player = client.manager.players.get(interaction.guild.id);

  if (!player) {
    return interaction.reply({
      content: 'There is nothing playing in this server!',
      ephemeral: true,
    });
  }

  if (interaction.member.voice.channel?.id !== player.voiceChannelId) {
    return interaction.reply({
      content:
        'You need to be in the same voice channel as the bot to use this command!',
      ephemeral: true,
    });
  }

  await player.stop(); // Stops the current track.
  player.queue.clear(); // Clears all tracks from the queue.

  interaction.reply('Stopped playback and cleared the queue.');
}

export default {
  data: data,
  execute: execute,
};
