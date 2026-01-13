const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('Displays the current status of the SMP'),
    async execute(interaction, client) {
        await interaction.deferReply();

        const serverIp = client.config.serverIp;
        const apiUrl = `https://api.mcsrvstat.us/3/${serverIp}`;

        try {
            const response = await axios.get(apiUrl);
            const data = response.data;

            const embed = new EmbedBuilder()
                .setTitle('Artemis SMP Status')
                .setColor(client.config.colors.primary)
                .addFields({ name: 'Server IP', value: `\`${serverIp}\`` });

            const row = new ActionRowBuilder();

            if (data.online) {
                embed.setDescription('✅ The server is currently **ONLINE**!')
                    .addFields(
                        { name: 'Players', value: `${data.players.online}/${data.players.max}`, inline: true },
                        { name: 'Version', value: data.version || 'Unknown', inline: true }
                    );

                if (data.motd && data.motd.clean && data.motd.clean.length > 0) {
                    embed.addFields({ name: 'MOTD', value: data.motd.clean.join('\n') });
                }

                // Add See More Button
                const seeMoreBtn = new ButtonBuilder()
                    .setCustomId('status_see_more')
                    .setLabel('See More')
                    .setStyle(ButtonStyle.Primary);

                row.addComponents(seeMoreBtn);

            } else {
                embed.setDescription('❌ The server is currently **OFFLINE**.')
                    .setColor(client.config.colors.error);
            }

            const payload = { embeds: [embed] };
            if (data.online) payload.components = [row];

            await interaction.editReply(payload);

        } catch (error) {
            console.error(error);
            await interaction.editReply('Could not fetch server status.');
        }
    },
};
