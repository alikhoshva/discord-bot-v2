// commands/play.js
import { SlashCommandBuilder } from 'discord.js';

const data = new SlashCommandBuilder()
  .setName('play') // Command name
  .setDescription('Plays songs & playlists from YouTube, Spotify, or a search query') // Command description
  .addStringOption(
    (option) =>
      option
        .setName('song') // Option name
        .setDescription('A song name, search query, or a YouTube/Spotify link (song or playlist)') // Option description
        .setRequired(true) // Make the option required
        .setAutocomplete(true),
  );

async function execute(interaction, client) {
  // We defer the reply because searching for a song can take time.
  // This prevents the interaction from "failing"
  await interaction.deferReply();

  // Step 1: Check if the user is in a voice channel.
  const { channel } = interaction.member.voice;
  if (!channel) {
    return interaction.editReply('You need to join a voice channel first!');
  }

  // Step 2: Get the search query from the command's *options*.
  const query = interaction.options.getString('song');

  // Step 3: Create a player for the guild.
  const player = client.manager.players.create({
    guildId: interaction.guild.id,
    voiceChannelId: channel.id,
    textChannelId: interaction.channel.id,
    autoPlay: false,
  });

  // Step 4: Connect to the voice channel.
  await player.connect();

  // Step 5: Search for the requested track.
  const searchResult = await client.manager.search({
    query: query,
    requester: interaction.user.id,
  });


  // Step 6: Handle the search results.
  if (!searchResult.tracks.length) {
    return interaction.editReply('No results found for your query.');
  }

  // Step 7: Process the results.
  switch (searchResult.loadType) {
    case 'playlist':
      player.queue.add(searchResult.tracks);

      await interaction.editReply({
        content: `Added playlist **${searchResult.playlistInfo.name}** with ${searchResult.tracks.length} tracks to the queue.`,
      });

      if (!player.playing) {
        await player.play();
      }
      break;

    case 'search':
    case 'track':
      player.queue.add(searchResult.tracks[0]);

      await interaction.editReply({
        content: `Added **${searchResult.tracks[0].title}** to the queue.`,
      });

      if (!player.playing) {
        await player.play();
      }
      break;

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
