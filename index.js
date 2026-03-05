
import { Client, Collection, Events, GatewayIntentBits, MessageFlags } from 'discord.js';
import { Manager, Connectors } from 'moonlink.js';
import fs from 'node:fs';
import path from 'node:path';
import config from './config.js';

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });

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
        defaultPlayer: { autoPlay: true }
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
client.manager.on('trackStart', (player, track) => {
	// Send a message when a track starts playing
	const channel = client.channels.cache.get(player.textChannelId);
	if (channel) {
		channel.send(`Now playing: **${track.title}**`);
	}
});

client.manager.on('trackEnd', (player, track) => {
	console.log(`Track ended: ${track.title}`);
});

client.manager.on('queueEnd', (player) => {
	// Send a message when the queue ends
	const channel = client.channels.cache.get(player.textChannelId);
	if (channel) {
		channel.send('Queue ended. Disconnecting in 30 seconds if no new tracks are added.');
	}

	// Disconnect after a delay if no new tracks are added
	// This helps save resources when the bot is not in use
	setTimeout(async () => {
		if (!player.playing && player.queue.size === 0) {
			await player.destroy();
			if (channel) {
				channel.send('Disconnected due to inactivity.');
			}
		}
	}, 30000); // 30 seconds
});


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
