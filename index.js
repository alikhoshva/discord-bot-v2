import { Client, Collection, GatewayIntentBits } from 'discord.js';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import config from './config.js';
import { initPlayerManager } from './services/playerManager.js';

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });

// Global error guards
process.on('unhandledRejection', (reason) => {
	console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
	console.error('Uncaught Exception:', error);
});

// Internal healthcheck endpoint for Docker Compose
const HEALTH_PORT = process.env.HEALTH_PORT || 8080;
const healthServer = http.createServer((req, res) => {
	if (req.url === '/health') {
		if (client.isReady()) {
			res.writeHead(200, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify({ status: 'ok', ping: client.ws.ping }));
		} else {
			res.writeHead(503, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify({ status: 'starting' }));
		}
	} else {
		res.writeHead(404);
		res.end();
	}
}).listen(HEALTH_PORT, '0.0.0.0', () => {
	console.log(`Healthcheck server listening on port ${HEALTH_PORT}`);
});

// Graceful shutdown logic for Docker containers
const gracefulShutdown = async (signal) => {
	console.log(`Received ${signal}. Shutting down bot gracefully...`);
	try {
		healthServer.close();
		if (client.manager?.players) {
			for (const player of client.manager.players.values()) {
				await player.destroy().catch(() => {});
			}
		}
		client.destroy();
	} catch (err) {
		console.error('Error during graceful shutdown:', err);
	}
	process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Initialize Moonlink Audio Manager
client.manager = initPlayerManager(client);

// Dynamic Command Loader
client.commands = new Collection();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));

	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const fileURL = pathToFileURL(filePath);

		const commandModule = await import(fileURL);
		const command = commandModule.default;

		if (command && 'data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

// Dynamic Event Loader
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith('.js'));

for (const file of eventFiles) {
	const relativeFilePath = `./events/${file}`;
	const eventModule = await import(relativeFilePath);

	const event = eventModule.default;
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args, client));
	} else {
		client.on(event.name, (...args) => event.execute(...args, client));
	}
}

client.login(config.token);
