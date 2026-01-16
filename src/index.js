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

// Start Dashboard
const dashboard = require('./dashboard/app');
const port = process.env.MANAGEMENT_API_PORT || 3000;

dashboard.listen(port, () => {
  console.log(`Dashboard running on http://localhost:${port}`);
});

client.login(process.env.DISCORD_TOKEN);
