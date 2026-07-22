# 🎵 Discord Bot v2 - AI-Powered Discord Music Bot

A feature-rich, modular Discord music bot built with **Discord.js v14**, **Moonlink.js**, **NodeLink / Lavalink**, and powered by **Google Gemini AI** for AI-generated DJ playlists.

---

## ✨ Features

- 🎧 **High-Quality Audio Streaming**: Powered by **Moonlink.js** and **NodeLink** (Spotify, YouTube, and direct stream support).
- 🤖 **AI DJ (`/dj`)**: Powered by Google's **Gemini AI**, generating custom 10-track themed playlists based on any vibe, mood, or prompt (e.g., *"late night lofi study session"*).
- 🔍 **Interactive Search & Autocomplete**: Real-time YouTube search suggestions directly in Discord's slash command menu.
- 🎛️ **Interactive Controls**: Dynamic buttons on "Now Playing" embeds for Pause/Resume, Skip, Stop/Clear, Queue viewing, and Loop toggling.
- 📊 **Rich UI Theme**: Custom branded embeds featuring active progress bars, track metadata, thumbnails, and color-coded status alerts.
- ⏱️ **Auto-Deleting Status Messages**: Built-in temporary message service to keep chat channels clean.
- ⚡ **Automated Inactivity Disconnect**: Automatically disconnects after 30 seconds of idle queue to preserve server resources.
- 🐳 **Production-Ready Docker Setup**: Includes a complete `docker-compose.yaml` stack with health monitoring and resource limits.

---

## 🛠️ Tech Stack

- **Runtime**: Node.js (Native ES Modules)
- **Discord Library**: [Discord.js v14](https://discord.js.org/)
- **Audio Engine**: [Moonlink.js v5](https://github.com/moonlinkjs/moonlink.js) + [NodeLink](https://github.com/performanc/nodelink)
- **AI Integration**: [@google/genai](https://www.npmjs.com/package/@google/genai) (Google Gemini API)
- **Deployment**: Docker & Docker Compose

---

## 🚀 Quick Start

### 1. Prerequisites

- **Node.js** v18 or higher
- **npm** v9 or higher
- A **Discord Bot Token** & Application Client ID ([Discord Developer Portal](https://discord.com/developers/applications))
- A **Google Gemini API Key** ([Google AI Studio](https://aistudio.google.com/))
- A **YouTube Data API Key** (optional, for autocomplete suggestions)
- A running **NodeLink** or **Lavalink** node

### 2. Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/discord-bot-v2.git
   cd discord-bot-v2
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the project root:
   ```env
   # Discord Configuration
   DISCORD_BOT_TOKEN=your_discord_bot_token
   CLIENT_ID=your_discord_client_id
   GUILD_ID=your_testing_guild_id

   # AI & External APIs
   GEMINI_API_KEY=your_gemini_api_key
   GEMINI_MODEL=gemini-2.5-flash
   YOUTUBE_API_KEY=your_youtube_api_key

   # NodeLink / Lavalink Connection
   LAVALINK_HOST=127.0.0.1
   LAVALINK_PORT=2333
   LAVALINK_PASSWORD=youshallnotpass
   LAVALINK_SECURE=false

   # Spotify Credentials (Optional, configured in NodeLink)
   SPOTIFY_CLIENT_ID=your_spotify_client_id
   SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
   ```

4. **Register Slash Commands**:
   Deploy slash commands to your test server:
   ```bash
   node deploy-commands.js
   ```

5. **Start the Bot**:
   ```bash
   node index.js
   ```

---

## 🐳 Docker Deployment

Run the bot along with NodeLink audio service with Docker Compose:

```bash
# Start all services in detached mode
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

---

## 📌 Slash Commands Reference

| Command | Options | Description |
| :--- | :--- | :--- |
| `/play` | `query` (required) | Play a song or playlist by URL or search terms (supports YouTube autocomplete). |
| `/dj` | `prompt` (required) | Generate a custom 10-track AI playlist using Gemini AI. |
| `/skip` | `number` (optional) | Skip the current playing track or multiple tracks. |
| `/stop` | None | Stop playback, clear the queue, and leave the voice channel. |
| `/queue` | `page` (optional) | View current playing track and queued songs with page navigation. |
| `/nowplaying` | None | Display currently playing track with visual progress bar and controls. |
| `/ping` | None | Check bot latency and API status. |

---

## 📁 Repository Structure

```
discord-bot-v2/
├── commands/            # Slash command definitions grouped by folder
│   ├── music/           # Music playback & AI DJ commands (play, dj, skip, stop, queue, nowplaying)
│   └── utility/         # General utility commands (ping)
├── services/            # Business logic & external API integration services
│   ├── messageService.js# Auto-deleting temporary message helper
│   ├── youtubeService.js# YouTube search suggestions & API integration
│   ├── geminiService.js # Google Gemini AI playlist generator
│   └── playerManager.js # Moonlink manager setup & audio lifecycle events
├── interactions/        # Sub-interaction logic handlers
│   ├── buttons/         # Button click handlers (player controls, queue pagination)
│   └── autocomplete/    # Slash command autocomplete handlers
├── events/              # Discord event routers (interactionCreate, ready, voiceStateUpdate)
├── utils/               # Design system, guard functions, and UI helpers
│   ├── voiceGuard.js    # Voice channel permission validation
│   ├── playerHelpers.js # Text channel fetching & embed cleanup helpers
│   ├── theme.js         # Color palette & formatting helpers
│   ├── embeds.js        # Rich Discord Embed templates
│   └── components.js    # Interactive button rows & player UI
├── config.js            # Centralized environment & configuration loader
├── deploy-commands.js   # Script to deploy slash commands to Discord API
├── index.js             # Main entry point (Client setup, health server)
├── Dockerfile           # Docker container configuration
└── compose.yaml         # Docker Compose stack definition (Bot + NodeLink)
```

---

## 📄 License

This project is licensed under the [ISC License](LICENSE).
