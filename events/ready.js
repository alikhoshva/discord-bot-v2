// events/ready.js
import { Events } from 'discord.js';
import logger from '../utils/logger.js';

export default {
  name: Events.ClientReady,
  once: true,

  execute(client) {
    logger.info(`Logged in as ${client.user.tag}`);
    logger.info('Moonlink Manager initialized');
  },
};

