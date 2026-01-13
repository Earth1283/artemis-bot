const { Events } = require('discord.js');

module.exports = {
    name: Events.MessageCreate,
    once: false,
    execute: async (message, client) => {
        if (message.author.bot) return;

        const content = message.content.toLowerCase().trim();
        const regex = /^(ip|what is the ip)$/i;

        if (regex.test(content)) {
            const serverIp = client.config.serverIp;
            let response = 'The IP is ' + serverIp; // Fallback

            // Check for custom message
            const msgConfig = client.messages.ip_response;
            if (msgConfig && msgConfig.options && msgConfig.options.length > 0) {
                if (msgConfig.randomly_select) {
                    response = msgConfig.options[Math.floor(Math.random() * msgConfig.options.length)];
                } else {
                    response = msgConfig.options[0]; // First one by default
                }
            }

            // Replace placeholders
            response = response.replace(/{serverIp}/g, serverIp).replace(/{user}/g, message.author.id);

            try {
                await message.reply(response);
            } catch (error) {
                console.error('Failed to reply to IP query', error);
            }
        }
    },
};
