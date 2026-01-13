const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const managementApi = require('../../utils/managementApi');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('smp')
        .setDescription('Artemis SMP Management Commands')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers) // Default fallback, but we'll check roles manually too if configured
        .addSubcommand(subcommand =>
            subcommand
                .setName('ban')
                .setDescription('Ban a player from the server')
                .addStringOption(option => option.setName('player').setDescription('Player name').setRequired(true))
                .addStringOption(option => option.setName('reason').setDescription('Reason for ban').setRequired(false))
                .addStringOption(option => option.setName('duration').setDescription('Duration (e.g. 1d, 1h)').setRequired(false))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('unban')
                .setDescription('Unban a player')
                .addStringOption(option => option.setName('player').setDescription('Player name').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('ban-ip')
                .setDescription('Ban an IP address')
                .addStringOption(option => option.setName('ip').setDescription('IP address').setRequired(true))
                .addStringOption(option => option.setName('reason').setDescription('Reason for ban').setRequired(false))
        )
        .addSubcommandGroup(group =>
            group
                .setName('whitelist')
                .setDescription('Manage the whitelist')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('add')
                        .setDescription('Add a player to the whitelist')
                        .addStringOption(option => option.setName('player').setDescription('Player name').setRequired(true))
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('remove')
                        .setDescription('Remove a player from the whitelist')
                        .addStringOption(option => option.setName('player').setDescription('Player name').setRequired(true))
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('list')
                        .setDescription('List whitelisted players')
                )
        ),
    async execute(interaction, client) {
        // Role Check
        const moderatorRoleId = client.config.roles.moderator;
        if (moderatorRoleId && !interaction.member.roles.cache.has(moderatorRoleId) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: client.messages.errors.no_permission || 'You do not have permission.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        const subcommand = interaction.options.getSubcommand();
        const group = interaction.options.getSubcommandGroup();
        const player = interaction.options.getString('player');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const duration = interaction.options.getString('duration');
        const ip = interaction.options.getString('ip');

        try {
            let result;

            if (group === 'whitelist') {
                if (subcommand === 'add') {
                    result = await managementApi.whitelistAdd(player);
                    await interaction.editReply(`✅ **${player}** has been added to the whitelist.`);
                } else if (subcommand === 'remove') {
                    result = await managementApi.whitelistRemove(player);
                    await interaction.editReply(`✅ **${player}** has been removed from the whitelist.`);
                } else if (subcommand === 'list') {
                    result = await managementApi.whitelistList();
                    // Assuming result is an array of names
                    const names = Array.isArray(result) ? result.join(', ') : JSON.stringify(result);
                    await interaction.editReply(`**Whitelisted Players:**\n${names}`);
                }
            } else {
                if (subcommand === 'ban') {
                    result = await managementApi.ban(player, reason, duration);
                    await interaction.editReply(`✅ **${player}** has been banned.\nReason: ${reason}\nDuration: ${duration || 'Permanent'}`);
                } else if (subcommand === 'unban') {
                    result = await managementApi.unban(player);
                    await interaction.editReply(`✅ **${player}** has been unbanned.`);
                } else if (subcommand === 'ban-ip') {
                    result = await managementApi.banIp(ip, reason);
                    await interaction.editReply(`✅ IP **${ip}** has been banned.\nReason: ${reason}`);
                }
            }
        } catch (error) {
            // Error message is already logged by api wrapper
            const errorMsg = error.message || 'An error occurred connecting to the management server.';
            await interaction.editReply(`❌ Error: ${errorMsg}`);
        }
    },
};
