const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('faq')
        .setDescription('Get answers to frequently asked questions')
        .addStringOption(option =>
            option.setName('topic')
                .setDescription('The topic you need help with')
                .setRequired(false)
                .setAutocomplete(true)
        ),
    async autocomplete(interaction, client) {
        const focusedValue = interaction.options.getFocused();
        const faqs = client.messages.faq || [];
        const choices = faqs.map(faq => faq.question);
        const filtered = choices.filter(choice => choice.toLowerCase().includes(focusedValue.toLowerCase()));

        // Limit to 25 choices (Discord API limit)
        await interaction.respond(
            filtered.slice(0, 25).map(choice => ({ name: choice, value: choice }))
        );
    },
    async execute(interaction, client) {
        const topic = interaction.options.getString('topic');
        const faqs = client.messages.faq || [];

        if (topic) {
            const faq = faqs.find(f => f.question.toLowerCase() === topic.toLowerCase());
            if (faq) {
                let answer = faq.answer.replace(/{serverIp}/g, client.config.serverIp);
                await interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle(faq.question)
                            .setDescription(answer)
                            .setColor(client.config.colors.primary)
                    ]
                });
            } else {
                await interaction.reply({ content: 'That topic was not found.', ephemeral: true });
            }
        } else {
            // List all topics
            const description = faqs.map(f => `• **${f.question}**`).join('\n');
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('Frequently Asked Questions')
                        .setDescription(description || 'No FAQs configured.')
                        .setColor(client.config.colors.primary)
                        .setFooter({ text: 'Use /faq <topic> to see the answer.' })
                ]
            });
        }
    },
};
