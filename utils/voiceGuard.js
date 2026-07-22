// utils/voiceGuard.js
import { MessageFlags } from 'discord.js';

/**
 * Validate user voice state and player connection consistency.
 * @param {object} interaction Discord interaction object
 * @param {object} client Discord client object
 * @param {object} options Options object { requirePlaying, requirePlayer }
 * @returns {Promise<{channel: object, player: object | null} | null>} Returns state object if valid, null if validation failed (and reply sent)
 */
export async function validateVoicePermissions(interaction, client, options = {}) {
  const { requirePlaying = false, requirePlayer = false } = options;

  // Step 1: Check if user is in a voice channel
  const channel = interaction.member?.voice?.channel;
  if (!channel) {
    const content = 'You need to join a voice channel first!';
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content, flags: MessageFlags.Ephemeral });
    } else {
      await interaction.reply({ content, flags: MessageFlags.Ephemeral });
    }
    return null;
  }

  // Step 2: Check active player
  const player = client.manager?.players?.get(interaction.guild.id) || null;

  if (requirePlayer && !player) {
    const content = 'There is nothing playing in this server!';
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content, flags: MessageFlags.Ephemeral });
    } else {
      await interaction.reply({ content, flags: MessageFlags.Ephemeral });
    }
    return null;
  }

  // Step 3: Check if bot is in another voice channel
  if (player && player.voiceChannelId && channel.id !== player.voiceChannelId) {
    const content = 'You need to be in the same voice channel as the bot to use this command!';
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content, flags: MessageFlags.Ephemeral });
    } else {
      await interaction.reply({ content, flags: MessageFlags.Ephemeral });
    }
    return null;
  }

  // Step 4: Check if playback is active if required
  if (requirePlaying && (!player || (!player.current && player.queue.size === 0))) {
    const content = 'There is nothing currently playing in this server!';
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content, flags: MessageFlags.Ephemeral });
    } else {
      await interaction.reply({ content, flags: MessageFlags.Ephemeral });
    }
    return null;
  }

  return { channel, player };
}
