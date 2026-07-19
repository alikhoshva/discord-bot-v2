// events/interactionCreate.js
import { Events, MessageFlags } from 'discord.js';
import config from './../config.js';

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
                        if (interaction.responded) return;
                        const suggestions = await getYoutubeSuggestions(focusedValue);
                        if (!interaction.responded) {
                            await interaction.respond(suggestions);
                        }
                    } catch (apiError) {
                        console.error('Error during debounced API call:', apiError.message || apiError);
                        if (!interaction.responded) {
                            await interaction.respond([]).catch(() => {});
                        }
                    } finally {
                        autocompleteDebounce.delete(userId);
                    }
                }, DEBOUNCE_DELAY);

                autocompleteDebounce.set(userId, newTimer);

            } catch (error) {
                console.error('Error in autocomplete handler:', error.message || error);
                if (!interaction.responded) {
                    await interaction.respond([]).catch(() => {});
                }
            }
            return; // Stop execution here
        }
    }
};

async function getYoutubeSuggestions(query) {
    try {
        const url = new URL('https://www.googleapis.com/youtube/v3/search');
        url.searchParams.append('part', 'snippet');
        url.searchParams.append('q', query);
        url.searchParams.append('type', 'video');
        url.searchParams.append('maxResults', '10');
        url.searchParams.append('key', config.YOUTUBE_API_KEY);

        const res = await fetch(url.toString());
        if (!res.ok) {
            const errText = await res.text();
            console.error(`YouTube API returned status ${res.status}: ${errText}`);
            return [];
        }

        const data = await res.json();
        if (!data?.items) {
            return [];
        }

        // Format the results for Discord's respond() method
        return data.items.map((item) => {
            const title = item.snippet.title;
            const videoUrl = `https://www.youtube.com/watch?v=${item.id.videoId}`;

            return {
                // 'name' is what the user *sees* (max 100 chars)
                name: title.length > 100 ? title.substring(0, 97) + '...' : title,

                // 'value' is what's sent to your 'play' command
                value: videoUrl,
            };
        });
    } catch (error) {
        console.error('Error fetching YouTube suggestions:', error.message);
        return [];
    }
}
