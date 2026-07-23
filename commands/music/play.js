// commands/music/play.js
import { SlashCommandBuilder } from 'discord.js';
import { buildTrackAddedEmbed, buildPlaylistAddedEmbed } from '../../utils/embeds.js';
import { validateVoicePermissions } from '../../utils/voiceGuard.js';
import { sendTemporaryReply } from '../../services/messageService.js';

const data = new SlashCommandBuilder()
  .setName('play')
  .setDescription('Plays songs & playlists from YouTube, Spotify, or a search query')
  .addStringOption((option) =>
    option
      .setName('song')
      .setDescription('A song name, search query, or a YouTube/Spotify link (song or playlist)')
      .setRequired(true)
      .setAutocomplete(true),
  );

async function execute(interaction, client) {
  await interaction.deferReply();

  // Step 1: Validate voice permissions and channel match
  const voiceState = await validateVoicePermissions(interaction, client);
  if (!voiceState) return;

  const { channel } = voiceState;
  const query = interaction.options.getString('song');

  // Step 2: Create player & connect
  const player = client.manager.players.create({
    guildId: interaction.guild.id,
    voiceChannelId: channel.id,
    textChannelId: interaction.channel.id,
    autoPlay: false,
  });

  await player.connect();

  // Step 3: Search track
  const searchResult = await client.manager.search({
    query: query,
    requester: interaction.user.id,
  });

  if (!searchResult || !searchResult.tracks || !searchResult.tracks.length) {
    return interaction.editReply('No results found for your query.');
  }

  searchResult.tracks.forEach((t) => {
    if (!t.requester) t.requester = interaction.user.id;
  });

  // Step 4: Add to queue & format response
  const isNowPlaying = !player.playing && !player.current;
  let embed;

  if (searchResult.loadType === 'playlist') {
    player.queue.add(searchResult.tracks);
    embed = buildPlaylistAddedEmbed(
      searchResult.playlistInfo,
      searchResult.tracks,
      query,
      interaction.user.id,
    );
  } else if (searchResult.loadType === 'search' || searchResult.loadType === 'track') {
    const track = searchResult.tracks[0];
    player.queue.add(track);
    embed = buildTrackAddedEmbed(
      track,
      player.queue.size,
      isNowPlaying,
      interaction.user.id,
    );
  } else if (searchResult.loadType === 'empty') {
    return interaction.editReply('No matches found for your query!');
  } else if (searchResult.loadType === 'error') {
    return interaction.editReply(`An error occurred while loading the track: ${searchResult.error || 'Unknown error'}`);
  }

  if (embed) {
    if (isNowPlaying) {
      await interaction.deleteReply().catch(() => {});
    } else {
      await sendTemporaryReply(interaction, { embeds: [embed] }, 10000);
    }
  }

  if (!player.playing) {
    await player.play();
  }
}

export default {
  data: data,
  execute: execute,
};
