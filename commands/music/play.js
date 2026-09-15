// commands/music/play.js
import { SlashCommandBuilder } from 'discord.js';
import { buildTrackAddedEmbed, buildPlaylistAddedEmbed } from '../../utils/embeds.js';
import { validateVoicePermissions } from '../../utils/voiceGuard.js';
import { sendTemporaryReply } from '../../services/messageService.js';
import { isSpotifyUrl, resolveSpotify } from '../../services/spotifyResolver.js';
import logger from '../../utils/logger.js';

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

  // Step 3: Check for Spotify links and resolve via custom embed scraper
  if (isSpotifyUrl(query)) {
    const spotifyData = await resolveSpotify(query);
    if (!spotifyData) {
      return interaction.editReply('Could not resolve Spotify link. Please ensure the link is valid and publicly accessible.');
    }

    if (spotifyData.type === 'track') {
      let searchResult = await client.manager.search({
        query: spotifyData.searchQuery,
        requester: interaction.user.id,
      });

      if (!searchResult || !searchResult.tracks || !searchResult.tracks.length) {
        logger.info(`YouTube search returned no matches for Spotify track "${spotifyData.title}". Trying SoundCloud fallback...`);
        searchResult = await client.manager.search({
          query: spotifyData.searchQuery,
          source: 'soundcloud',
          requester: interaction.user.id,
        });
      }

      if (!searchResult || !searchResult.tracks || !searchResult.tracks.length) {
        return interaction.editReply(`No audio matches found for "${spotifyData.title}".`);
      }

      const track = searchResult.tracks[0];
      track.requester = interaction.user.id;

      const isNowPlaying = !player.playing && !player.current;
      player.queue.add(track);

      const embed = buildTrackAddedEmbed(
        track,
        player.queue.size,
        isNowPlaying,
        interaction.user.id,
      );

      if (isNowPlaying) {
        await interaction.deleteReply().catch(() => {});
      } else {
        await sendTemporaryReply(interaction, { embeds: [embed] }, 10000);
      }

      if (!player.playing) {
        await player.play();
      }
      return;
    }

    if (spotifyData.type === 'playlist' || spotifyData.type === 'album') {
      if (!spotifyData.tracks || !spotifyData.tracks.length) {
        return interaction.editReply('This Spotify playlist/album has no playable tracks.');
      }

      // 1. Immediately search and queue track 1 so playback starts with minimal delay
      const firstSpotifyTrack = spotifyData.tracks[0];
      let firstResult = await client.manager.search({
        query: firstSpotifyTrack.searchQuery,
        requester: interaction.user.id,
      });

      if (!firstResult || !firstResult.tracks || !firstResult.tracks.length) {
        firstResult = await client.manager.search({
          query: firstSpotifyTrack.searchQuery,
          source: 'soundcloud',
          requester: interaction.user.id,
        });
      }

      if (!firstResult || !firstResult.tracks || !firstResult.tracks.length) {
        return interaction.editReply(`Could not find a match for "${firstSpotifyTrack.title}".`);
      }

      const firstTrack = firstResult.tracks[0];
      firstTrack.requester = interaction.user.id;
      player.queue.add(firstTrack);

      if (!player.playing) {
        await player.play();
      }

      // 2. Build and send playlist confirmation embed
      const playlistInfo = { name: spotifyData.title };
      const embed = buildPlaylistAddedEmbed(
        playlistInfo,
        spotifyData.tracks,
        query,
        interaction.user.id,
      );
      await sendTemporaryReply(interaction, { embeds: [embed] }, 10000);

      // 3. Queue remaining tracks asynchronously in the background
      const remainingTracks = spotifyData.tracks.slice(1);
      (async () => {
        for (const t of remainingTracks) {
          try {
            let res = await client.manager.search({
              query: t.searchQuery,
              requester: interaction.user.id,
            });
            if (!res || !res.tracks || !res.tracks.length) {
              res = await client.manager.search({
                query: t.searchQuery,
                source: 'soundcloud',
                requester: interaction.user.id,
              });
            }
            if (res && res.tracks && res.tracks.length > 0) {
              const matched = res.tracks[0];
              matched.requester = interaction.user.id;
              player.queue.add(matched);
            }
          } catch (err) {
            logger.warn(`Failed to resolve Spotify track "${t.title}":`, err);
          }
        }
      })().catch((err) => logger.error('Error queuing remaining Spotify playlist tracks:', err));

      return;
    }
  }

  // Step 4: Search standard track (YouTube URL or query string)
  // Strip any redundant prefix so Moonlink doesn't double-prefix ytsearch:
  const cleanQuery = query.replace(/^(ytsearch|ytmsearch|scsearch):/i, '').trim();
  const isUrl = /^https?:\/\//i.test(cleanQuery);

  let searchResult = await client.manager.search({
    query: cleanQuery,
    requester: interaction.user.id,
  });

  // If standard YouTube query search returned empty or error, fallback to SoundCloud
  if (!isUrl && (!searchResult || !searchResult.tracks || !searchResult.tracks.length || searchResult.loadType === 'empty' || searchResult.loadType === 'error')) {
    logger.info(`YouTube search returned no results for "${cleanQuery}". Trying SoundCloud fallback...`);
    searchResult = await client.manager.search({
      query: cleanQuery,
      source: 'soundcloud',
      requester: interaction.user.id,
    });
  }

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
