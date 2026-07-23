// events/ready.js
import { Events } from 'discord.js'; // <-- 1. Import Events
import logger from '../utils/logger.js';

export default {
    name: Events.ClientReady, // <-- 2. Change this from 'ready'
    once: true,
    
    execute(client) {
        logger.info(`Logged in as ${client.user.tag}`);

        // Initialize the Moonlink Manager with the bot's user ID

        logger.info('Moonlink Manager initialized');
    }
};
