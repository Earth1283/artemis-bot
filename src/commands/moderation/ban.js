const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a user.')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user to ban')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('The reason for the ban')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    async execute(interaction) {
        const targetUser = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const guildId = interaction.guild.id;
        const moderatorId = interaction.user.id;

        try {
            // Try to DM the user BEFORE banning
            try {
                const { EmbedBuilder } = require('discord.js');
                const banEmbed = new EmbedBuilder()
                    .setTitle('🔨 You have been Banned')
                    .setColor(0xEF4444) // Red
                    .addFields(
                        { name: 'Server', value: interaction.guild.name, inline: true },
                        { name: 'Reason', value: reason, inline: true },
                        { name: 'Date', value: new Date().toLocaleString(), inline: false }
                    )
                    .setFooter({ text: 'You can appeal if the server has an appeal system.' });

                await targetUser.send({ embeds: [banEmbed] });
            } catch (err) {
                console.log(`Could not DM user ${targetUser.tag} before ban.`);
            }

            await interaction.guild.members.ban(targetUser, { reason });

            // Log to DB
            const stmt = db.prepare('INSERT INTO infractions (user_id, guild_id, type, reason, moderator_id, timestamp) VALUES (?, ?, ?, ?, ?, ?)');
            stmt.run(targetUser.id, guildId, 'ban', reason, moderatorId, Date.now());

            await interaction.reply({ content: `🔨 Banned **${targetUser.tag}** for: ${reason}`, ephemeral: false });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'An error occurred while banning the user. Ensure I have permission.', ephemeral: true });
        }
    },
};
