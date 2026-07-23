// events/interactionCreate.js
import { Events, MessageFlags } from 'discord.js';
import logger from '../utils/logger.js';
import { handlePlayerButtons } from '../interactions/buttons/playerButtons.js';
import { handlePlayAutocomplete } from '../interactions/autocomplete/playAutocomplete.js';

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
        const errorOptions = {
          content: 'There was an error while executing this command!',
          flags: MessageFlags.Ephemeral,
        };

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorOptions);
        } else {
          await interaction.reply(errorOptions);
        }
      }
      return;
    }

    // 2. Handle Player Control & Queue Pagination Buttons
    if (interaction.isButton()) {
      const customId = interaction.customId;
      if (!customId.startsWith('music_')) return;

      const player = client.manager?.players?.get(interaction.guild.id);
      if (!player) {
        return interaction.reply({
          content: 'There is nothing playing in this server!',
          flags: MessageFlags.Ephemeral,
        });
      }

      if (interaction.member?.voice?.channel?.id !== player.voiceChannelId) {
        return interaction.reply({
          content: 'You need to be in the same voice channel as the bot to use controls!',
          flags: MessageFlags.Ephemeral,
        });
      }

      try {
        await handlePlayerButtons(interaction, player);
      } catch (err) {
        logger.error(`Error handling button interaction "${customId}"`, err, {
          guildId: interaction.guildId,
          userId: interaction.user?.id,
          customId,
        });
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: 'An error occurred while executing player controls.',
            flags: MessageFlags.Ephemeral,
          });
        }
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
