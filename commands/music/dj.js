// commands/music/dj.js
import { SlashCommandBuilder } from 'discord.js';
import { GoogleGenAI } from '@google/genai';
import config from '../../config.js';
import { buildAIDJEmbed } from '../../utils/embeds.js';

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

  const { channel } = interaction.member.voice;
  if (!channel) {
    return interaction.editReply('You need to join a voice channel first!');
  }

  const existingPlayer = client.manager.players.get(interaction.guild.id);
  if (existingPlayer && existingPlayer.voiceChannelId && channel.id !== existingPlayer.voiceChannelId) {
    return interaction.editReply('You need to be in the same voice channel as the bot to use this command!');
  }

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

  player.queue.add(tracks);

  if (!player.playing) {
    await player.play();
  }

  const embed = buildAIDJEmbed(query, tracks, interaction.user.id);
  await interaction.editReply({ embeds: [embed] });
}

export default {
  data: data,
  execute: execute,
};
