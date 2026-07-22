// commands/utility/ping.js
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

const data = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Replies with bot latency and WebSocket ping');

async function execute(interaction, client) {
  // Step 1: Defer reply and fetch response timestamp
  const sent = await interaction.deferReply({ fetchReply: true });

  // Step 2: Calculate latency
  const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
  const wsPing = client.ws.ping;

  // Step 3: Send embed response
  const embed = new EmbedBuilder()
    .setTitle('🏓 Pong!')
    .addFields(
      { name: 'API Latency', value: `\`${roundtrip}ms\``, inline: true },
      { name: 'WebSocket Ping', value: `\`${wsPing >= 0 ? wsPing : 'N/A'}ms\``, inline: true },
    )
    .setColor('#0099ff');

  await interaction.editReply({ embeds: [embed] });
}

export default {
  data: data,
  execute: execute,
};