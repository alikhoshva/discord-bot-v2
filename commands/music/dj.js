// commands/dj.js
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { GoogleGenAI } from '@google/genai';
import config from '../../config.js';

const ai = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });

const systemPrompt = `You are a high-quality music playlist assistant.
Your ONLY task is to generate a list of 10 songs based on the user's prompt (which will be a theme, vibe, or genre).
You must find 10 **distinct** and **highly relevant** songs that fit the theme.

Your entire response MUST be a single, valid JSON array.
Each element in the array MUST be a string in the format: "Song Name by Artist".

Example of a valid response:
[
  "Bohemian Rhapsody by Queen",
  "Stairway to Heaven by Led Zeppelin",
  "Hotel California by Eagles"
]

***ABSOLUTELY DO NOT*** include any commentary, explanatory text, titles, markdown quotes, or any other non-JSON characters outside of the array. The response must start with '[' and end with ']'.`;

const data = new SlashCommandBuilder()
  .setName('dj') // Command name
  .setDescription('Creates a playlist using Gemini based on your prompt') // Command description
  .addStringOption(
    (option) =>
      option
        .setName('prompt') // Option name
        .setDescription('The theme or vibe for the playlist') // Option description
        .setRequired(true), // Make the option required
  );

async function execute(interaction, client) {
  // We defer the reply because searching for a song can take time.
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
  const query = interaction.options.getString('prompt');
  let playlist;

  try {
    console.log(`Generating playlist for: "${query}"...`);

    const randomSeed = Math.floor(Math.random() * 1000000);

    const response = await ai.models.generateContent({
      model: config.GEMINI_MODEL,
      contents: `Seed: ${randomSeed} | User Vibe: ${query}`,
      config: {
        systemInstruction: systemPrompt,
      },
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.9,
        topP: 0.95,
      },
    });

    const rawText = response.text;
    playlist = JSON.parse(rawText);
    if (!Array.isArray(playlist)) {
      throw new Error('AI response is not a valid JSON array');
    }
  } catch (error) {
    console.error('Error generating content:', error);
    return interaction.editReply('There was an error generating the playlist from the AI.');
  }

  // Step 3: Create a player for the guild.
  const player = client.manager.players.create({
    guildId: interaction.guild.id,
    voiceChannelId: channel.id,
    textChannelId: interaction.channel.id,
    autoPlay: false,
  });

  // Step 4: Connect to the voice channel.
  await player.connect();

  // Step 5: Search for all tracks in parallel
  console.log('Searching for all tracks in parallel...');

  const searchPromises = playlist.map((song) =>
    client.manager.search({
      query: song,
      requester: interaction.user.id,
    }),
  );

  const searchResults = await Promise.all(searchPromises);

  // Step 6: Filter out bad results & attach requester to tracks
  const tracks = searchResults
    .map((res) => {
      if (!res || !res.tracks.length || res.loadType === 'empty' || res.loadType === 'error') {
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

  // Step 7: Add all found tracks to the queue
  player.queue.add(tracks);

  // Step 8: Start the player if it's not already playing
  if (!player.playing) {
    await player.play();
  }

  // Step 9: Send rich embed confirmation
  const sampleList = tracks
    .slice(0, 5)
    .map((t, i) => `${i + 1}. [${t.title}](${t.uri})`)
    .join('\n');

  const embed = new EmbedBuilder()
    .setTitle('🎧 AI DJ Playlist Generated')
    .setDescription(`**Vibe:** "${query}"\nAdded **${tracks.length}** tracks to the queue.`)
    .addFields(
      { name: 'Tracks Preview', value: sampleList + (tracks.length > 5 ? '\n*...and more in `/queue`*' : '') },
      { name: 'Requested By', value: `<@${interaction.user.id}>`, inline: true },
    )
    .setColor('#0099ff');

  await interaction.editReply({ embeds: [embed] });
}

export default {
  data: data,
  execute: execute,
};
