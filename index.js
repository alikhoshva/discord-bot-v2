import { Client, Collection, Events, GatewayIntentBits, MessageFlags } from 'discord.js';
import { Manager, Connectors } from 'moonlink.js';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import config from './config.js';
import { buildNowPlayingEmbed, buildStatusEmbed } from './utils/embeds.js';
import { buildPlayerControls } from './utils/components.js';

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

client.manager = new Manager({
	nodes: [
		{
			host: config.lavalink.host,
			port: config.lavalink.port,
			password: config.lavalink.password,
			secure: config.lavalink.secure,
		},
	],
	options: {
		defaultPlayer: { autoPlay: false },
	},
});

client.manager.use(new Connectors.DiscordJs(), client);

// Node connection events
client.manager.on('nodeConnect', (node) => {
	console.log(`Node ${node.identifier} connected`);
});

client.manager.on('nodeDisconnect', (node) => {
	console.log(`Node ${node.identifier} disconnected`);
});

client.manager.on('nodeError', (node, error) => {
	console.error(`Node ${node.identifier} encountered an error:`, error);
});

// Playback events
client.manager.on('trackStart', async (player, track) => {
	let channel = client.channels.cache.get(player.textChannelId);
	if (!channel) {
		try {
			channel = await client.channels.fetch(player.textChannelId);
		} catch (error) {
			console.error(`Failed to fetch text channel: ${error}`);
		}
	}
	if (channel) {
		if (player.lastNowPlayingMessage && typeof player.lastNowPlayingMessage.delete === 'function') {
			player.lastNowPlayingMessage.delete().catch(() => {});
		}
		const embed = buildNowPlayingEmbed(player, track);
		const row = buildPlayerControls(player);
		player.lastNowPlayingMessage = await channel.send({ embeds: [embed], components: [row] });
	}
	if (player.idleTimeout) {
		clearTimeout(player.idleTimeout);
		player.idleTimeout = null;
	}
});

client.manager.on('trackEnd', (player, track) => {
	console.log(`Track ended: ${track.title}`);

	if (player.queue.size === 0) {
		startIdleTimer(player);
	}
});

client.manager.on('queueEnd', (player) => {
	startIdleTimer(player);
});

async function startIdleTimer(player) {
	if (player.idleTimeout) return;

	let channel = client.channels.cache.get(player.textChannelId);
	if (!channel) {
		try {
			channel = await client.channels.fetch(player.textChannelId);
		} catch (error) {
			console.error(`Failed to fetch text channel: ${error}`);
		}
	}
	if (channel) {
		const warningEmbed = buildStatusEmbed({
			title: '⏸️ Playback Idle',
			description: 'Playback stopped. Disconnecting in 30 seconds if no new tracks are added.',
			type: 'warning',
		});
		channel.send({ embeds: [warningEmbed] }).then((msg) => {
			setTimeout(() => msg.delete().catch(() => {}), 5000);
		}).catch(() => {});
	}

	player.idleTimeout = setTimeout(async () => {
		const activePlayer = client.manager.players.get(player.guildId);
		if (!activePlayer) return;

		if (!activePlayer.playing && activePlayer.queue.size === 0) {
			await activePlayer.destroy();
			let textChannel = client.channels.cache.get(activePlayer.textChannelId);
			if (!textChannel) {
				try {
					textChannel = await client.channels.fetch(activePlayer.textChannelId);
				} catch (error) {
					console.error(`Failed to fetch text channel: ${error}`);
				}
			}
			if (textChannel) {
				const disconnectEmbed = buildStatusEmbed({
					title: '🔌 Disconnected',
					description: 'Disconnected from voice channel due to inactivity.',
					type: 'danger',
				});
				textChannel.send({ embeds: [disconnectEmbed] }).then((msg) => {
					setTimeout(() => msg.delete().catch(() => {}), 5000);
				}).catch(() => {});
			}
		}
	}, 30000);
}

client.commands = new Collection();

import { fileURLToPath, pathToFileURL } from 'node:url';

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
