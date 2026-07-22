// commands/music/play.js
import { SlashCommandBuilder } from 'discord.js';
import { buildTrackAddedEmbed, buildPlaylistAddedEmbed } from '../../utils/embeds.js';

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

  // Step 1: Check if the user is in a voice channel
  const { channel } = interaction.member.voice;
  if (!channel) {
    return interaction.editReply('You need to join a voice channel first!');
  }

  // Check if the bot is already playing/connected in another voice channel
  const existingPlayer = client.manager.players.get(interaction.guild.id);
  if (existingPlayer && existingPlayer.voiceChannelId && channel.id !== existingPlayer.voiceChannelId) {
    return interaction.editReply('You need to be in the same voice channel as the bot to use this command!');
  }

  // Step 2: Get the search query
  const query = interaction.options.getString('song');

  // Step 3: Create player
  const player = client.manager.players.create({
    guildId: interaction.guild.id,
    voiceChannelId: channel.id,
    textChannelId: interaction.channel.id,
    autoPlay: false,
  });

  // Step 4: Connect to voice channel
  await player.connect();

  // Step 5: Search track
  const searchResult = await client.manager.search({
    query: query,
    requester: interaction.user.id,
  });

  if (!searchResult || !searchResult.tracks || !searchResult.tracks.length) {
    return interaction.editReply('No results found for your query.');
  }

  // Ensure requester is set on each track
  searchResult.tracks.forEach((t) => {
    if (!t.requester) t.requester = interaction.user.id;
  });

  // Step 6: Process results using unified embed builders
  switch (searchResult.loadType) {
    case 'playlist': {
      player.queue.add(searchResult.tracks);

      const playlistEmbed = buildPlaylistAddedEmbed(
        searchResult.playlistInfo,
        searchResult.tracks,
        query,
        interaction.user.id,
      );

      await interaction.editReply({ embeds: [playlistEmbed] });

      if (!player.playing) {
        await player.play();
      }
      break;
    }

    case 'search':
    case 'track': {
      const track = searchResult.tracks[0];
      const isNowPlaying = !player.playing && !player.current;

      player.queue.add(track);

      const trackEmbed = buildTrackAddedEmbed(
        track,
        player.queue.size,
        isNowPlaying,
        interaction.user.id,
      );

      await interaction.editReply({ embeds: [trackEmbed] });

      if (isNowPlaying) {
        setTimeout(() => interaction.deleteReply().catch(() => {}), 5000);
      }

      if (!player.playing) {
        await player.play();
      }
      break;
    }

    case 'empty':
      await interaction.editReply('No matches found for your query!');
      break;

    case 'error':
      await interaction.editReply(`An error occurred while loading the track: ${searchResult.error || 'Unknown error'}`);
      break;
  }
}

export default {
  data: data,
  execute: execute,
};
