# 🤖 AGENTS.md - Developer & Agent Architecture Guide

This document provides essential instructions, architectural guidelines, and codebase conventions for AI agents and human developers working on **discord-bot-v2**.

---

## 📐 Architecture & Technology Stack

- **Runtime & Module System**: Node.js using **Native ES Modules** (`"type": "module"` in `package.json`).
- **Discord Framework**: [Discord.js v14](https://discord.js.org/).
- **Audio Driver**: [Moonlink.js v5](https://github.com/moonlinkjs/moonlink.js) connected to a [NodeLink](https://github.com/performanc/nodelink) / Lavalink node.
- **AI Integration**: [@google/genai](https://www.npmjs.com/package/@google/genai) SDK (`gemini-2.5-flash` or configurable via `GEMINI_MODEL`).
- **Healthcheck & Lifecycle**: Internal HTTP server on port 8080 (`/health`), idle disconnect timer (30s timeout), graceful SIGTERM/SIGINT shutdown handling.

---

## 📁 Repository Overview

```
discord-bot-v2/
├── index.js                    # Entry point: Client init, Moonlink setup, dynamic loaders, health server
├── config.js                   # Centralized env vars export (dotenv loaded first)
├── deploy-commands.js          # REST script for registering guild slash commands
├── commands/
│   ├── music/
│   │   ├── play.js             # Play track/playlist with search or URL
│   │   ├── dj.js               # Gemini-powered AI DJ playlist generator
│   │   ├── skip.js             # Skip current track
│   │   ├── stop.js             # Stop playback, clear queue, disconnect
│   │   └── queue.js            # View active queue embed
│   └── utility/
│       └── ping.js             # Bot latency & websocket ping command
├── events/
│   ├── interactionCreate.js    # Routes ChatInput, Buttons (music_*), and Autocomplete (YouTube API)
│   ├── voiceStateUpdate.js     # Handles voice state events / disconnect cleanup
│   ├── messageCreate.js        # Legacy prefix message handling (if enabled)
│   └── ready.js                # Bot startup logging & status setting
└── utils/
    ├── theme.js                # Centralized color palette & time/progress formatting utilities
    ├── embeds.js               # Embed generator functions for Now Playing, Queue, Status, AI DJ
    └── components.js          # ActionRow and Button component builders for player controls
```

---

## 🚨 Critical Coding Conventions & Guidelines

### 1. Native ES Module Patterns
- Use standard `import` / `export default` syntax.
- When computing paths relative to the current file (replacing `__dirname`), use `fileURLToPath` and `pathToFileURL` from `node:url` and `node:path`.
  ```javascript
  import { fileURLToPath, pathToFileURL } from 'node:url';
  import path from 'node:path';
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  ```

### 2. Discord.js v14 Standards
- **Ephemeral Flags**: ALWAYS use `flags: MessageFlags.Ephemeral` imported from `discord.js`. Do **not** use the legacy `{ ephemeral: true }` option.
  ```javascript
  import { MessageFlags } from 'discord.js';
  await interaction.reply({ content: 'Secret message', flags: MessageFlags.Ephemeral });
  ```
- **Deferred Replies**: For asynchronous commands that fetch data from external APIs (Gemini AI, YouTube search, Moonlink), call `await interaction.deferReply()` immediately and update later using `interaction.editReply()`.
- **Interaction Error Handling**: Always check if the interaction has already been deferred or replied to before sending error feedback:
  ```javascript
  if (interaction.replied || interaction.deferred) {
    await interaction.followUp(errorOptions);
  } else {
    await interaction.reply(errorOptions);
  }
  ```

### 3. Design System & Theme Guidelines
- **Colors**: Never hardcode hex colors in embeds. Import colors from `utils/theme.js`:
  ```javascript
  import { Colors } from '../utils/theme.js';
  // Colors: BRAND (#6C5CE7), SUCCESS (#2ECC71), WARNING (#F1C40F), DANGER (#E74C3C), AI_DJ (#FD79A8), INFO (#0099FF)
  ```
- **Embeds & Progress Bars**: Use `buildNowPlayingEmbed`, `buildQueueEmbed`, `buildAIDJEmbed`, or `buildStatusEmbed` from `utils/embeds.js`. Use `createProgressBar(currentMs, totalMs)` for playback timeline indicators.

### 4. Moonlink.js Audio Player Handling
- Access the active player via `client.manager.players.get(guildId)`.
- Ensure users are in a voice channel (`interaction.member.voice.channel`) and in the *same* voice channel as the bot before allowing playback or control operations.
- When queue becomes empty or playback ends, the bot triggers `startIdleTimer(player)` in `index.js`, setting a 30-second timeout before destroying the player. Always clear `player.idleTimeout` when a new track starts.

### 5. Gemini AI Integration (`commands/music/dj.js`)
- Initialize `GoogleGenAI` with `config.GEMINI_API_KEY`.
- Always set `generationConfig: { responseMimeType: 'application/json' }` to ensure structured JSON output.
- Instruct the system prompt explicitly to output a raw JSON array of `"Song Name by Artist"` strings.

---

## 🛠️ Step-by-Step Extension Guide

### Adding a New Slash Command
1. Create a file in `commands/<category>/<command_name>.js`.
2. Export `data` (an instance of `SlashCommandBuilder`) and `execute(interaction, client)`.
   ```javascript
   import { SlashCommandBuilder } from 'discord.js';

   export default {
     data: new SlashCommandBuilder()
       .setName('mycommand')
       .setDescription('Command description'),
     async execute(interaction, client) {
       // Command logic here
     },
   };
   ```
3. Register the new command with Discord by running:
   ```bash
   node deploy-commands.js
   ```

### Adding an Event Handler
1. Create a file in `events/<event_name>.js`.
2. Export `name`, `once` (boolean), and `execute(..., client)`.
   ```javascript
   import { Events } from 'discord.js';

   export default {
     name: Events.ClientReady,
     once: true,
     execute(client) {
       console.log(`Logged in as ${client.user.tag}`);
     },
   };
   ```

---

## 🧪 Verification & Deployment Commands

- **Deploy Slash Commands**: `node deploy-commands.js`
- **Run Bot Locally**: `node index.js`
- **Run with Docker Compose**: `docker compose up -d`
- **Check Health Endpoints**: `curl http://localhost:8080/health`
