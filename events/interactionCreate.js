// events/interactionCreate.js
import { Events } from 'discord.js';
import logger from '../utils/logger.js';
import { handlePlayerButtons } from '../interactions/buttons/playerButtons.js';
import { handlePlayAutocomplete } from '../interactions/autocomplete/playAutocomplete.js';
import { sendTemporaryReply } from '../services/messageService.js';

export default {
  name: Events.InteractionCreate,

  async execute(interaction, client) {
    // 1. Handle Chat Input Commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      try {
        await command.execute(interaction, client);
      } catch (error) {
        logger.error(`Error executing slash command /${interaction.commandName}`, error, {
          guildId: interaction.guildId,
          userId: interaction.user?.id,
          commandName: interaction.commandName,
        });
        await sendTemporaryReply(
          interaction,
          'There was an error while executing this command!',
          10000,
        );
      }
      return;
    }

    // 2. Handle Player Control & Queue Pagination Buttons
    if (interaction.isButton()) {
      const customId = interaction.customId;
      if (!customId.startsWith('music_')) return;

      const player = client.manager?.players?.get(interaction.guild.id);
      if (!player) {
        return sendTemporaryReply(interaction, 'There is nothing playing in this server!', 10000);
      }

      if (interaction.member?.voice?.channel?.id !== player.voiceChannelId) {
        return sendTemporaryReply(
          interaction,
          'You need to be in the same voice channel as the bot to use controls!',
          10000,
        );
      }

      try {
        await handlePlayerButtons(interaction, player);
      } catch (err) {
        logger.error(`Error handling button interaction "${customId}"`, err, {
          guildId: interaction.guildId,
          userId: interaction.user?.id,
          customId,
        });
        await sendTemporaryReply(
          interaction,
          'An error occurred while executing player controls.',
          10000,
        );
      }
      return;
    }

    // 3. Handle Autocomplete Suggestions
    if (interaction.isAutocomplete()) {
      await handlePlayAutocomplete(interaction);
      return;
    }
  },
};
