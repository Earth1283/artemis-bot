const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Warn a user.')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user to warn')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('The reason for the warning')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
        const target = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const guildId = interaction.guild.id;
        const moderatorId = interaction.user.id;

        try {
            // Log to DB
            const stmt = db.prepare('INSERT INTO infractions (user_id, guild_id, type, reason, moderator_id, timestamp) VALUES (?, ?, ?, ?, ?, ?)');
            stmt.run(target.id, guildId, 'warn', reason, moderatorId, Date.now());

            // Try to DM the user
            try {
                const { EmbedBuilder } = require('discord.js');
                const warnEmbed = new EmbedBuilder()
                    .setTitle('⚠️ You have been Warned')
                    .setColor(0xFACC15) // Yellow
                    .addFields(
                        { name: 'Server', value: interaction.guild.name, inline: true },
                        { name: 'Reason', value: reason, inline: true },
                        { name: 'Date', value: new Date().toLocaleString(), inline: false }
                    );

                await target.send({ embeds: [warnEmbed] });
            } catch (err) {
                console.log(`Could not DM user ${target.tag}`);
            }

            await interaction.reply({ content: `✅ Warned **${target.tag}** for: ${reason}`, ephemeral: false });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'An error occurred while warning the user.', ephemeral: true });
        }
    },
};
