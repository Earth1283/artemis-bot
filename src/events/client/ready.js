const { Events } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        console.log(`Ready! Logged in as ${client.user.tag}`);

        // Register commands globally (for now) or per guild
        // Ideally this should be a separate script or method, but putting here for simplicity in this step.
        const commands = client.commands.map(cmd => cmd.data);

        client.application.commands.set(commands)
            .then(() => console.log('Successfully registered application commands.'))
            .catch(console.error);
    },
};
