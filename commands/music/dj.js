// commands/music/dj.js
import { SlashCommandBuilder } from 'discord.js';
import logger from '../../utils/logger.js';
import { generateDJPlaylist } from '../../services/geminiService.js';
import { validateVoicePermissions } from '../../utils/voiceGuard.js';
import { buildAIDJEmbed } from '../../utils/embeds.js';
import { sendTemporaryReply } from '../../services/messageService.js';

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
    logger.error('Error generating playlist via AI:', error);
    return interaction.editReply('There was an error generating the playlist from the AI.');
  }

  const player = client.manager.players.create({
    guildId: interaction.guild.id,
    voiceChannelId: channel.id,
    textChannelId: interaction.channel.id,
    autoPlay: false,
  });

  await player.connect();

  // Step 1: Find and start the first available track immediately
  logger.info(`Resolving initial track for DJ vibe: "${query}"...`);
  let firstTrack = null;
  let firstTrackIndex = -1;

  for (let i = 0; i < playlist.length; i++) {
    const song = playlist[i];
    let res = await client.manager.search({
      query: song,
      requester: interaction.user.id,
    });
    if (!res || !res.tracks?.length || res.loadType === 'empty' || res.loadType === 'error') {
      res = await client.manager.search({
        query: song,
        source: 'soundcloud',
        requester: interaction.user.id,
      });
    }
    if (res?.tracks?.length) {
      firstTrack = res.tracks[0];
      firstTrack.requester = interaction.user.id;
      firstTrackIndex = i;
      break;
    }
  }

  if (!firstTrack) {
    return interaction.editReply('Could not find any usable tracks for your playlist.');
  }

  const isNowPlaying = !player.playing && !player.current;
  player.queue.add(firstTrack);

  if (!player.playing) {
    await player.play();
  }

  // Step 2: Build and send playlist confirmation embed
  // Synthesize full playlist track list for the embed summary
  const summaryTracks = playlist.map((songName, idx) => {
    if (idx === firstTrackIndex) return firstTrack;
    return { title: songName, duration: 180000, requester: interaction.user.id, uri: '#' };
  });
  const embed = buildAIDJEmbed(query, summaryTracks, interaction.user.id);

  if (isNowPlaying) {
    await interaction.deleteReply().catch(() => {});
  } else {
    await sendTemporaryReply(interaction, { embeds: [embed] }, 10000);
  }

  // Step 3: Resolve remaining tracks sequentially in the background with humanized throttling
  const remainingSongs = playlist.filter((_, idx) => idx !== firstTrackIndex);
  (async () => {
    for (const song of remainingSongs) {
      // 1200ms - 1600ms jitter delay to prevent YouTube rate-limiting
      await new Promise((r) => setTimeout(r, 1200 + Math.floor(Math.random() * 400)));

      const activePlayer = client.manager?.players?.get(interaction.guild.id);
      if (!activePlayer) break;

      try {
        let res = await client.manager.search({
          query: song,
          requester: interaction.user.id,
        });

        if (!res || !res.tracks?.length || res.loadType === 'empty' || res.loadType === 'error') {
          res = await client.manager.search({
            query: song,
            source: 'soundcloud',
            requester: interaction.user.id,
          });
        }

        if (res?.tracks?.length) {
          const track = res.tracks[0];
          track.requester = interaction.user.id;
          activePlayer.queue.add(track);

          if (!activePlayer.playing && !activePlayer.current) {
            await activePlayer.play();
          }
        }
      } catch (err) {
        logger.warn(`Failed to resolve DJ track "${song}":`, err);
      }
    }
  })().catch((err) => logger.error('Error queuing remaining DJ tracks:', err));
}

export default {
  data: data,
  execute: execute,
};
