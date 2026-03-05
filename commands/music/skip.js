// commands/skip.js
import { SlashCommandBuilder } from 'discord.js';

const data = new SlashCommandBuilder()
  .setName('skip')
  .setDescription('Skip the current song')
  .addIntegerOption(
    (option) =>
      option
        .setName('number')
        .setDescription('Number to skip')
        .setRequired(false)
        .setMinValue(1)
  );

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

  if (!player.current) {
    return interaction.reply({
      content: 'There is nothing playing right now!',
      ephemeral: true,
    });
  }

  const amount = interaction.options.getInteger('number')||1;

  const size = player.queue.size+1;

  if(amount>size){
    return interaction.reply(`Error: Skipped too many, dumbass. Only ${size} songs available.`);
  }
  
  for(let i =0; i<amount-1; i++){
    player.queue.remove(0)
  }
  await player.skip()

  interaction.reply(`Skipped: **${amount}**`);
}

export default {
  data: data,
  execute: execute,
};
