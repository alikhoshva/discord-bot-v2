import { REST, Routes } from 'discord.js';
import config from './config.js';
import logger from './utils/logger.js';
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Get __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const commands = [];
// Grab all the command folders from the commands directory you created earlier
const foldersPath = join(__dirname, 'commands');
const commandFolders = readdirSync(foldersPath);

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(config.token);

// and deploy your commands!
(async () => {
    try {
        // This loop must be inside the async function to use 'await'
        for (const folder of commandFolders) {
            // Grab all the command files from the commands directory you created earlier
            const commandsPath = join(foldersPath, folder);
            const commandFiles = readdirSync(commandsPath).filter((file) => file.endsWith('.js'));
            
            // Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
            for (const file of commandFiles) {
                const filePath = join(commandsPath, file);
                const fileUrl = pathToFileURL(filePath); // Convert path to file URL for import()

                // Use await import() for ES Modules
                // We check .default for CJS modules (module.exports) or ESM default exports
                // and fall back to the module itself for ESM named exports
                const commandModule = await import(fileUrl);
                const command = commandModule.default || commandModule;

                if (command && 'data' in command && 'execute' in command) {
                    commands.push(command.data.toJSON());
                } else {
                    logger.warn(`The command at ${filePath} is missing a required "data" or "execute" property.`);
                }
            }
        }

        logger.info(`Started refreshing ${commands.length} application (/) commands.`);

        // The put method is used to fully refresh all commands in the guild with the current set
        const data = await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body: commands });

        logger.info(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        // And of course, make sure you catch and log any errors!
        logger.error('Failed to deploy application commands:', error);
    }
})();
