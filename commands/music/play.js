// commands/play.js
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

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

// Helper function to format duration in MS to HH:MM:SS
function formatDuration(ms) {
  if (!ms || isNaN(ms) || ms === Infinity) return 'Live Stream';
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor(ms / (1000 * 60 * 60));

  return `${hours ? `${hours}:` : ''}${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

async function execute(interaction, client) {
  // We defer the reply because searching for a song can take time.
  // This prevents the interaction from "failing"
  await interaction.deferReply();

  // Step 1: Check if the user is in a voice channel.
  const { channel } = interaction.member.voice;
  if (!channel) {
    return interaction.editReply('You need to join a voice channel first!');
  }

  // Check if the bot is already playing/connected in another voice channel
  const existingPlayer = client.manager.players.get(interaction.guild.id);
  if (existingPlayer && existingPlayer.voiceChannelId && channel.id !== existingPlayer.voiceChannelId) {
    return interaction.editReply('You need to be in the same voice channel as the bot to use this command!');
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
  if (!searchResult || !searchResult.tracks || !searchResult.tracks.length) {
    return interaction.editReply('No results found for your query.');
  }

  // Ensure requester is set on each track
  searchResult.tracks.forEach((t) => {
    if (!t.requester) t.requester = interaction.user.id;
  });

  // Step 7: Process the results.
  switch (searchResult.loadType) {
    case 'playlist': {
      player.queue.add(searchResult.tracks);

      const playlistEmbed = new EmbedBuilder()
        .setTitle('Added Playlist to Queue')
        .setDescription(`**[${searchResult.playlistInfo.name}](${query})**`)
        .addFields(
          { name: 'Tracks Added', value: `${searchResult.tracks.length}`, inline: true },
          { name: 'Requested By', value: `<@${interaction.user.id}>`, inline: true },
        )
        .setColor('#0099ff');

      const firstTrack = searchResult.tracks[0];
      if (firstTrack?.artworkUrl || firstTrack?.thumbnail) {
        playlistEmbed.setThumbnail(firstTrack.artworkUrl || firstTrack.thumbnail);
      }

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

      const trackEmbed = new EmbedBuilder()
        .setTitle(isNowPlaying ? 'Now Playing' : 'Added to Queue')
        .setDescription(`**[${track.title}](${track.uri})**`)
        .addFields(
          { name: 'Duration', value: `\`${formatDuration(track.duration)}\``, inline: true },
          { name: 'Requested By', value: `<@${interaction.user.id}>`, inline: true },
        )
        .setColor('#0099ff');

      if (!isNowPlaying) {
        trackEmbed.addFields({ name: 'Position in Queue', value: `${player.queue.size}`, inline: true });
      }

      if (track.artworkUrl || track.thumbnail) {
        trackEmbed.setThumbnail(track.artworkUrl || track.thumbnail);
      }

      await interaction.editReply({ embeds: [trackEmbed] });

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
