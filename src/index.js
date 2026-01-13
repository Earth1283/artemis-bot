require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { loadHandlers } = require('./structures/Handler');
const { loadConfig, loadMessages } = require('./config');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

client.commands = new Collection();
client.config = loadConfig();
client.messages = loadMessages();

// Load Handlers
loadHandlers(client);

client.login(process.env.DISCORD_TOKEN);
