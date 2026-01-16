const axios = require('axios');
const { loadConfig } = require('../config');

// Load config to get server IP
const config = loadConfig();

const tools = {
    get_server_status: async () => {
        try {
            const response = await axios.get(`https://api.mcsrvstat.us/2/${config.serverIp}`);
            const data = response.data;

            if (!data.online) {
                return { status: "offline" };
            }

            return {
                status: "online",
                players: {
                    online: data.players.online,
                    max: data.players.max,
                    list: data.players.list || []
                },
                version: data.version,
                motd: data.motd.clean.join('\n')
            };
        } catch (error) {
            console.error("Error fetching server status for AI:", error);
            return { error: "Failed to fetch server status" };
        }
    }
};

const toolDefinitions = [
    {
        name: "get_server_status",
        description: "Get the current status of the Minecraft server, including player count and list.",
    }
];

module.exports = { tools, toolDefinitions };
