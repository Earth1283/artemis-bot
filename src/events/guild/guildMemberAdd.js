const { Events } = require('discord.js');

module.exports = {
    name: Events.GuildMemberAdd,
    once: false,
    execute: async (member, client) => {
        const welcomeConfig = client.messages.welcome;
        if (!welcomeConfig || !welcomeConfig.enabled) return;

        const channelId = client.config.channels.welcome;
        if (!channelId) return; // No channel configured

        const channel = member.guild.channels.cache.get(channelId);
        if (!channel) return;

        let message = welcomeConfig.message || "Welcome {user}!";

        // Replace placeholders
        // {user} -> <@id>
        // {server} -> Guild Name
        // {memberCount} -> Guild Member Count

        // The placeholder in yaml might be <@{user}> or just {user}, let's just replace {user} with the ID so users can format it how they want (e.g. <@{user}> in yaml) OR we can be smart.
        // The previous plan showed `<@{user}>` in YAML so `{user}` should be the ID.
        message = message
            .replace(/{user}/g, member.id)
            .replace(/{server}/g, member.guild.name)
            .replace(/{memberCount}/g, member.guild.memberCount);

        try {
            await channel.send(message);
        } catch (error) {
            console.error('Could not send welcome message', error);
        }
    },
};
