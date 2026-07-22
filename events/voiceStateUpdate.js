// events/voiceStateUpdate.js
import { Events } from 'discord.js';

export default {
    name: Events.VoiceStateUpdate,

    async execute(oldState, newState, client) {
        // Check if the update concerns the bot itself
        if (newState.member.id !== client.user.id) return;

        // If the bot was in a channel but is no longer in one (disconnected)
        if (oldState.channelId && !newState.channelId) {
            console.log(`Bot was disconnected from voice channel in guild ${oldState.guild.name} (${oldState.guild.id})`);
            const player = client.manager.players.get(oldState.guild.id);
            if (player) {
                try {
                    // If there was an idle timer running, clear it
                    if (player.idleTimeout) {
                        clearTimeout(player.idleTimeout);
                        player.idleTimeout = null;
                    }
                    if (player.lastNowPlayingMessage && typeof player.lastNowPlayingMessage.delete === 'function') {
                        player.lastNowPlayingMessage.delete().catch(() => {});
                        player.lastNowPlayingMessage = null;
                    }
                    await player.destroy();
                    console.log(`Successfully cleaned up and destroyed the player for guild ${oldState.guild.name}`);
                } catch (error) {
                    console.error(`Error destroying player on voice state disconnect:`, error);
                }
            }
        }
    }
};
