// interactions/autocomplete/playAutocomplete.js
import { getYoutubeSuggestions } from '../../services/youtubeService.js';

const autocompleteDebounce = new Map();
const DEBOUNCE_DELAY = 300;
const MIN_QUERY_LENGTH = 3;

/**
 * Handle slash command autocomplete for the play command.
 * @param {object} interaction Discord autocomplete interaction
 */
export async function handlePlayAutocomplete(interaction) {
  if (interaction.commandName !== 'play') return;

  const userId = interaction.user.id;

  try {
    const focusedValue = interaction.options.getFocused();

    if (focusedValue.length < MIN_QUERY_LENGTH) {
      return await interaction.respond([]);
    }

    if (autocompleteDebounce.has(userId)) {
      clearTimeout(autocompleteDebounce.get(userId));
    }

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
}
