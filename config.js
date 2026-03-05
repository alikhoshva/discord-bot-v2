import 'dotenv/config'; // This must be first


// In config.js (as an ES Module)
export default {
    guildId: process.env.GUILD_ID,
    clientId: process.env.CLIENT_ID,
    token: process.env.DISCORD_BOT_TOKEN,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
    prefix: "!",
    lavalink: {
        host: process.env.LAVALINK_HOST || "192.168.1.249",
        port: parseInt(process.env.LAVALINK_PORT) || 2333,
        password: process.env.LAVALINK_PASSWORD || "youshallnotpass",
        secure: process.env.LAVALINK_SECURE === 'true'
    }
};
