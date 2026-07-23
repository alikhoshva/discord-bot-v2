// commands/music/nowplaying.js
import { SlashCommandBuilder } from 'discord.js';
import { buildNowPlayingEmbed } from '../../utils/embeds.js';
import { buildPlayerControls } from '../../utils/components.js';
import { cleanupLastNowPlaying } from '../../services/playerManager.js';
import { sendTemporaryReply } from '../../services/messageService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Displays the currently playing song details'),
  async execute(interaction, client) {
    const player = client.manager?.players?.get(interaction.guild.id);
    if (!player || !player.current) {
      return sendTemporaryReply(
        interaction,
        'There is nothing currently playing in this server!',
        10000,
      );
    }

    await cleanupLastNowPlaying(player);

    const embed = buildNowPlayingEmbed(player, player.current);
    const row = buildPlayerControls(player);
    const replyMsg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
    player.lastNowPlayingMessage = replyMsg;
  },
};
