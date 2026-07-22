// commands/music/dj.js
import { SlashCommandBuilder } from 'discord.js';
import { generateDJPlaylist } from '../../services/geminiService.js';
import { validateVoicePermissions } from '../../utils/voiceGuard.js';
import { buildAIDJEmbed } from '../../utils/embeds.js';

const data = new SlashCommandBuilder()
  .setName('dj')
  .setDescription('Creates a playlist using Gemini based on your prompt')
  .addStringOption((option) =>
    option
      .setName('prompt')
      .setDescription('The theme or vibe for the playlist')
      .setRequired(true),
  );

async function execute(interaction, client) {
  await interaction.deferReply();

  const voiceState = await validateVoicePermissions(interaction, client);
  if (!voiceState) return;

  const { channel } = voiceState;
  const query = interaction.options.getString('prompt');

  let playlist;
  try {
    playlist = await generateDJPlaylist(query);
  } catch (error) {
    console.error('Error generating playlist via AI:', error);
    return interaction.editReply('There was an error generating the playlist from the AI.');
  }

  const player = client.manager.players.create({
    guildId: interaction.guild.id,
    voiceChannelId: channel.id,
    textChannelId: interaction.channel.id,
    autoPlay: false,
  });

  await player.connect();

  console.log('Searching for all tracks in parallel...');
  const searchPromises = playlist.map((song) =>
    client.manager.search({
      query: song,
      requester: interaction.user.id,
    }),
  );

  const searchResults = await Promise.all(searchPromises);

  const tracks = searchResults
    .map((res) => {
      if (!res || !res.tracks?.length || res.loadType === 'empty' || res.loadType === 'error') {
        if (res?.error) console.warn(`Error loading a track: ${res.error}`);
        return null;
      }
      const track = res.tracks[0];
      if (track) track.requester = interaction.user.id;
      return track;
    })
    .filter((track) => track !== null);

  if (!tracks.length) {
    return interaction.editReply('Could not find any usable tracks for your playlist.');
  }

  const isNowPlaying = !player.playing && !player.current;
  player.queue.add(tracks);

  if (!player.playing) {
    await player.play();
  }

  const embed = buildAIDJEmbed(query, tracks, interaction.user.id);
  await interaction.editReply({ embeds: [embed] });

  if (isNowPlaying) {
    setTimeout(() => interaction.deleteReply().catch(() => {}), 5000);
  }
}

export default {
  data: data,
  execute: execute,
};
