const { glob } = require('glob');
const path = require('path');

async function loadHandlers(client) {
    // Load Events
    const eventFiles = await glob('src/events/**/*.js');
    eventFiles.forEach((file) => {
        const event = require(path.resolve(file));
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args, client));
        } else {
            client.on(event.name, (...args) => event.execute(...args, client));
        }
        console.log(`Loaded event: ${event.name}`);
    });

    // Load Commands
    const commandFiles = await glob('src/commands/**/*.js');
    commandFiles.forEach((file) => {
        const command = require(path.resolve(file));
        client.commands.set(command.data.name, command);
        console.log(`Loaded command: ${command.data.name}`);
    });
}

module.exports = { loadHandlers };
