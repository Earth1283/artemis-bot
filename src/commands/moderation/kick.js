const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a member.')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The member to kick')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('The reason for the kick')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    async execute(interaction) {
        const targetUser = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const guildId = interaction.guild.id;
        const moderatorId = interaction.user.id;

        const member = interaction.guild.members.cache.get(targetUser.id);

        if (!member) {
            return interaction.reply({ content: 'Member not found in this server.', ephemeral: true });
        }

        if (!member.kickable) {
            return interaction.reply({ content: 'I cannot kick this user. They might have higher roles than me.', ephemeral: true });
        }

        try {
            // Try to DM the user BEFORE kicking
            try {
                const { EmbedBuilder } = require('discord.js');
                const kickEmbed = new EmbedBuilder()
                    .setTitle('👢 You have been Kicked')
                    .setColor(0xF97316) // Orange
                    .addFields(
                        { name: 'Server', value: interaction.guild.name, inline: true },
                        { name: 'Reason', value: reason, inline: true },
                        { name: 'Date', value: new Date().toLocaleString(), inline: false }
                    )
                    .setFooter({ text: 'You may rejoin if you have an invite.' });

                await targetUser.send({ embeds: [kickEmbed] });
            } catch (err) {
                console.log(`Could not DM user ${targetUser.tag} before kick.`);
            }

            await member.kick(reason);

            // Log to DB
            const stmt = db.prepare('INSERT INTO infractions (user_id, guild_id, type, reason, moderator_id, timestamp) VALUES (?, ?, ?, ?, ?, ?)');
            stmt.run(targetUser.id, guildId, 'kick', reason, moderatorId, Date.now());

            await interaction.reply({ content: `👢 Kicked **${targetUser.tag}** for: ${reason}`, ephemeral: false });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'An error occurred while kicking the user.', ephemeral: true });
        }
    },
};
