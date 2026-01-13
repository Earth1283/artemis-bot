const { Events, EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    name: Events.InteractionCreate,
    once: false,
    execute: async (interaction, client) => {
        // Handle Buttons
        if (interaction.isButton()) {
            if (interaction.customId === 'status_see_more') {
                await interaction.deferReply({ ephemeral: true });
                const serverIp = client.config.serverIp;
                try {
                    const response = await axios.get(`https://api.mcsrvstat.us/3/${serverIp}`);
                    const data = response.data;

                    if (!data.online) {
                        return interaction.editReply('Server is currently offline.');
                    }

                    const embed = new EmbedBuilder()
                        .setTitle('Detailed Status')
                        .setColor(client.config.colors.primary);

                    // Players List
                    if (data.players && data.players.list) {
                        const playerNames = data.players.list.map(p => p.name).join(', ');
                        embed.addFields({ name: 'Online Players', value: playerNames.substring(0, 1024) || 'None' });
                    } else {
                        embed.addFields({ name: 'Online Players', value: 'No individual player info available.' });
                    }

                    // Plugins/Mods (if available and not hidden)
                    if (data.plugins) {
                        const sortedPlugins = data.plugins.map(p => p.name).sort().join(', ');
                        if (sortedPlugins.length > 0) {
                            // Discord field limit is 1024 chars
                            embed.addFields({ name: 'Plugins', value: sortedPlugins.substring(0, 1024) });
                        }
                    }

                    if (data.software) {
                        embed.addFields({ name: 'Software', value: data.software });
                    }

                    await interaction.editReply({ embeds: [embed] });
                } catch (err) {
                    console.error(err);
                    await interaction.editReply('Failed to fetch details.');
                }
            }
            return;
        }

        if (!interaction.isChatInputCommand()) return;

        const command = client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        try {
            await command.execute(interaction, client);
        } catch (error) {
            console.error(error);
            const errorMsg = client.messages.errors?.generic || 'There was an error while executing this command!';
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: errorMsg, ephemeral: true });
            } else {
                await interaction.reply({ content: errorMsg, ephemeral: true });
            }
        }
    },
};
