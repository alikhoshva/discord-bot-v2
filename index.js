
import { Client, Collection, Events, GatewayIntentBits, MessageFlags } from 'discord.js';
import { Manager, Connectors } from 'moonlink.js';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import config from './config.js';

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
	// Configure the Lavalink nodes to connect to
	nodes: [
		{
			host: config.lavalink.host,         // The hostname of your Lavalink server
			port: config.lavalink.port,         // The port your Lavalink server is running on
			password: config.lavalink.password, // The password for your Lavalink server
			secure: config.lavalink.secure,     // Whether to use SSL/TLS for the connection
		},
	],
	options: {
        defaultPlayer: { autoPlay: false }
    }

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
	// Send a message when a track starts playing
	let channel = client.channels.cache.get(player.textChannelId);
	if (!channel) {
		try {
			channel = await client.channels.fetch(player.textChannelId);
		} catch (error) {
			console.error(`Failed to fetch text channel: ${error}`);
		}
	}
	if (channel) {
		channel.send(`Now playing: **${track.title}**`);
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
    // Prevent multiple timers from running at the same time
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
        channel.send('Playback stopped. Disconnecting in 30 seconds if no new tracks are added.');
    }

    // Attach the timeout to the player object so we can clear it later
    player.idleTimeout = setTimeout(async () => {
        // Check if the player is still in the manager
        const activePlayer = client.manager.players.get(player.guildId);
        if (!activePlayer) return;

        // Double check that it's still idle before destroying
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
                textChannel.send('Disconnected due to inactivity.');
            }
        }
    }, 30000); // 30 seconds
}


client.commands = new Collection();

import { fileURLToPath, pathToFileURL } from 'node:url'; // <-- Import this

// 1. Get the current file's path
const __filename = fileURLToPath(import.meta.url);

// 2. Get the directory name from the file's path
const __dirname = path.dirname(__filename);
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));

	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const fileURL = pathToFileURL(filePath); // 1. Convert path to URL

		const commandModule = await import(fileURL); // 2. Use await import()
		const command = commandModule.default; // 3. Access the 'default' export

		// Set a new item in the Collection...
		if (command && 'data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

// Register each event handler
for (const file of eventFiles) {
	const relativeFilePath = `./events/${file}`;
	const eventModule = await import(relativeFilePath);

	const event = eventModule.default;
	if (event.once) {
		// For events that should only trigger once
		client.once(event.name, (...args) => event.execute(...args, client));
	} else {
		// For events that can trigger multiple times
		client.on(event.name, (...args) => event.execute(...args, client));
	}
}


// Log in to Discord with your client's token
client.login(config.token);
