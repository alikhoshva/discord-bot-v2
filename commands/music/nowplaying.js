// commands/music/nowplaying.js
import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { buildNowPlayingEmbed } from '../../utils/embeds.js';
import { buildPlayerControls } from '../../utils/components.js';
import { cleanupLastNowPlaying } from '../../services/playerManager.js';

export default {
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Displays the currently playing song with visual progress'),
  async execute(interaction, client) {
    const player = client.manager?.players?.get(interaction.guild.id);
    if (!player || !player.current) {
      return interaction.reply({
        content: 'There is nothing currently playing in this server!',
        flags: MessageFlags.Ephemeral,
      });
    }

    await cleanupLastNowPlaying(player);

    const embed = buildNowPlayingEmbed(player, player.current);
    const row = buildPlayerControls(player);
    const replyMsg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
    player.lastNowPlayingMessage = replyMsg;
  },
};
