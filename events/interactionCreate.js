// events/interactionCreate.js
import { google } from 'googleapis';
import { Events } from 'discord.js'; // <-- 1. Import Events
import config from './../config.js';

const youtube = google.youtube({
    version: 'v3',
    auth: config.YOUTUBE_API_KEY,
});

const autocompleteDebounce = new Map();
const DEBOUNCE_DELAY = 300;
const MIN_QUERY_LENGTH = 3;

// Combine 'name' and 'execute' into one object and export it as the default
export default {
    name: Events.InteractionCreate,

    async execute(interaction, client) {
        const userId = interaction.user.id;
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.execute(interaction, client);
            } catch (error) {
                console.error(error);

                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({
                        content: 'There was an error while executing this command!',
                        flags: MessageFlags.Ephemeral,
                    });
                } else {
                    await interaction.reply({
                        content: 'There was an error while executing this command!',
                        flags: MessageFlags.Ephemeral,
                    });
                }
            }
            return; // Stop execution here
        }
        if (interaction.isAutocomplete()) {

            // Only run for the 'play' command's 'song' option
            if (interaction.commandName !== 'play') return;

            try {
                // Get what the user is currently typing
                const focusedValue = interaction.options.getFocused();

                // If they haven't typed anything, send no suggestions
                if (focusedValue.length < MIN_QUERY_LENGTH) {
                    return await interaction.respond([]);
                }

                if (autocompleteDebounce.has(userId)) {
                    clearTimeout(autocompleteDebounce.get(userId));
                }

                // 2. Set a *new* timer.
                const newTimer = setTimeout(async () => {
                    try {
                        // This code runs *only* when the 500ms pause is over
                        const suggestions = await getYoutubeSuggestions(focusedValue);
                        await interaction.respond(suggestions);
                    } catch (apiError) {
                        console.error('Error during debounced API call:', apiError);
                        await interaction.respond([]);
                    } finally {
                        // Once we're done, remove the timer from the Map
                        autocompleteDebounce.delete(userId);
                    }
                }, DEBOUNCE_DELAY);

                // 3. Store the new timer
                autocompleteDebounce.set(userId, newTimer);

            } catch (error) {
                console.error('Error in autocomplete handler:', error);
                await interaction.respond([]); // Send empty on error
            }
            return; // Stop execution here
        }
    }
};

async function getYoutubeSuggestions(query) {
    try {
        const response = await youtube.search.list({
            part: 'snippet',
            q: query,
            type: 'video',
            maxResults: 10, // You can change this, but Discord shows a max of 25
        });

        if (!response.data.items) {
            return [];
        }

        // Format the results for Discord's respond() method
        return response.data.items.map((item) => {
            const title = item.snippet.title;
            const url = `https://www.youtube.com/watch?v=${item.id.videoId}`;

            return {
                // 'name' is what the user *sees* (max 100 chars)
                name: title.length > 100 ? title.substring(0, 97) + '...' : title,

                // 'value' is what's sent to your 'play' command
                value: url,
            };
        });
    } catch (error) {
        console.error('Error fetching YouTube suggestions:', error.message);
        return [];
    }
}
