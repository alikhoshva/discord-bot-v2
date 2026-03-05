// commands/dj.js
import { SlashCommandBuilder } from 'discord.js';
import { GoogleGenAI } from "@google/genai";
import config from "../../config.js"

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
    // This prevents the interaction from "failing"
    await interaction.deferReply();

    // Step 1: Check if the user is in a voice channel.
    const { channel } = interaction.member.voice;
    if (!channel) {
        return interaction.editReply('You need to join a voice channel first!');
    }

    // Step 2: Get the search query from the command's *options*.
    const query = interaction.options.getString('prompt');
    let playlist;

    try {
        console.log(`Generating playlist for: "${query}"...`);

        const response = await ai.models.generateContent({
            model: "gemini-3.1-flash-lite-preview",
            contents: query,
            config: {
                systemInstruction: systemPrompt
            },
            generationConfig: {
                responseMimeType: "application/json"
            }
        });

        // 3. UPDATED: We now parse the JSON string, we don't .split()
        const rawText = response.text;
        playlist = JSON.parse(rawText);

    } catch (error) {
        console.error("Error generating content:", error);
        return interaction.editReply('There was an error generating the playlist from the AI.');
    }
    // Step 3: Create a player for the guild.
    const player = client.manager.players.create({
        guildId: interaction.guild.id,
        voiceChannelId: channel.id,
        textChannelId: interaction.channel.id,
        autoPlay: true,
    });

    // Step 4: Connect to the voice channel.
    await player.connect();

    // Step 5: Search for all tracks in parallel
    console.log("Searching for all 10 tracks in parallel...");

    // Create an array of search promises (don't "await" them yet)
    const searchPromises = playlist.map(song =>
        client.manager.search({
            query: song,
            requester: interaction.user.id,
        })
    );

    // Now, wait for ALL searches to complete
    const searchResults = await Promise.all(searchPromises);

    // Step 6: Filter out any bad results and get the first track from each good result
    const tracks = searchResults
        .map(res => {
            // Check for errors, no results, or wrong load type
            if (!res || !res.tracks.length || res.loadType === 'empty' || res.loadType === 'error') {
                if (res.error) console.warn(`Error loading a track: ${res.error}`);
                return null; // Mark this as a failed search
            }
            // Return the best match (the first track)
            return res.tracks[0];
        })
        .filter(track => track !== null); // Filter out all the nulls (failed searches)

    // Check if we found any tracks at all
    if (!tracks.length) {
        return interaction.editReply('Could not find any usable tracks for your playlist.');
    }

    // Step 7: Add all found tracks to the queue in one go
    player.queue.add(tracks);

    // Step 8: Start the player *once* if it's not already playing
    if (!player.playing) {
        await player.play();
    }

    // Final reply
    await interaction.editReply({
        content: `Added **${tracks.length}** generated songs to the queue.`,
    });

}

export default {
    data: data,
    execute: execute,
};
