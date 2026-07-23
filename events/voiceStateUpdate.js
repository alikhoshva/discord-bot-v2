// events/voiceStateUpdate.js
import { Events } from 'discord.js';
import logger from '../utils/logger.js';
import { cleanupLastNowPlaying } from '../services/playerManager.js';

export default {
    name: Events.VoiceStateUpdate,

    async execute(oldState, newState, client) {
        // Check if the update concerns the bot itself
        if (newState.member.id !== client.user.id) return;

        // If the bot was in a channel but is no longer in one (disconnected)
        if (oldState.channelId && !newState.channelId) {
            logger.info(`Bot was disconnected from voice channel in guild ${oldState.guild.name} (${oldState.guild.id})`);
            const player = client.manager?.players?.get(oldState.guild.id);
            if (player) {
                try {
                    if (player.idleTimeout) {
                        clearTimeout(player.idleTimeout);
                        player.idleTimeout = null;
                    }
                    await cleanupLastNowPlaying(player);
                    await player.destroy();
                    logger.info(`Successfully cleaned up and destroyed the player for guild ${oldState.guild.name}`);
                } catch (error) {
                    logger.error(`Error destroying player on voice state disconnect for guild ${oldState.guild.name}:`, error);
                }
            }
        }
    }
};
