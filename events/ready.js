// events/ready.js
import { Events } from 'discord.js'; // <-- 1. Import Events

export default {
    name: Events.ClientReady, // <-- 2. Change this from 'ready'
    once: true,
    
    execute(client) {
        console.log(`Logged in as ${client.user.tag}`);

        // Initialize the Moonlink Manager with the bot's user ID

        console.log('Moonlink Manager initialized');
    }
};
