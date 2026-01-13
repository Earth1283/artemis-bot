const { Events, ChannelType } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

// Store the genAI instance
let genAI;
let model;

module.exports = {
    name: Events.MessageCreate,
    once: false,
    execute: async (message, client) => {
        if (message.author.bot || message.system) return;

        // --- Existing IP Logic ---
        const content = message.content.toLowerCase().trim();
        const regex = /^(ip|what is the ip)$/i;

        if (regex.test(content)) {
            const serverIp = client.config.serverIp;
            let response = 'The IP is ' + serverIp; // Fallback

            // Check for custom message
            const msgConfig = client.messages.ip_response;
            if (msgConfig && msgConfig.options && msgConfig.options.length > 0) {
                if (msgConfig.randomly_select) {
                    response = msgConfig.options[Math.floor(Math.random() * msgConfig.options.length)];
                } else {
                    response = msgConfig.options[0]; // First one by default
                }
            }

            // Replace placeholders
            response = response.replace(/{serverIp}/g, serverIp).replace(/{user}/g, message.author.id);

            try {
                await message.reply(response);
            } catch (error) {
                console.error('Failed to reply to IP query', error);
            }
            return; // Don't continue to Gemini if it was a command
        }

        // --- Gemini Channel Logic ---
        const geminiConfig = client.config.gemini;

        // Check if configured and correct channel
        if (geminiConfig && geminiConfig.channel_id === message.channel.id) {
            
            if (!process.env.GEMINI_API_KEY) {
                console.warn('Gemini is enabled but GEMINI_API_KEY is missing in .env');
                return;
            }

            try {
                await message.channel.sendTyping();
                
                // Read system message
                let systemInstruction = "";
                try {
                    const systemMsgPath = path.join(process.cwd(), 'system-msg.txt');
                    if (fs.existsSync(systemMsgPath)) {
                        systemInstruction = fs.readFileSync(systemMsgPath, 'utf8');
                    }
                } catch (err) {
                    console.error("Failed to read system-msg.txt", err);
                }

                // Initialize or Re-initialize if system prompt needs to be fresh or just to be safe with config
                // Ideally we check if model params changed, but for now we can just get the model.
                // The SDK is lightweight for this.
                if (!genAI) {
                    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
                }
                
                model = genAI.getGenerativeModel({ 
                    model: geminiConfig.model || "gemini-pro",
                    systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined
                });

                // Fetch history
                const limit = geminiConfig.memory_limit || 10;
                // Fetch more than limit to filter out bots/system messages if needed, 
                // but for now strict limit is fine.
                const messages = await message.channel.messages.fetch({ limit: limit });

                // Format history for Gemini
                // Discord messages are newest first, Gemini expects oldest first
                const history = [];
                const sortedMessages = Array.from(messages.values()).sort((a, b) => a.createdTimestamp - b.createdTimestamp);

                for (const msg of sortedMessages) {
                    // Skip empty messages (e.g. attachments only) if needed, 
                    // though Gemini can handle empty text if we are careful.
                    if (!msg.content) continue;

                    const role = msg.author.id === client.user.id ? "model" : "user";
                    
                    // Basic cleanup, maybe remove bot mentions? 
                    // For DM it's cleaner, mostly 1 on 1.
                    history.push({
                        role: role,
                        parts: [{ text: msg.content }],
                    });
                }
                
                // The last message in 'history' is the current message we are replying to.
                // Gemini's chat.sendMessage logic works by providing history *before* the new message, 
                // OR we can just use generateContent with the whole transcript. 
                // startChat is better for maintaining context logic if we were keeping the object alive,
                // but since this is stateless per request, startChat with history is good.
                
                // However, the current message is already in 'history' because we fetched it.
                // We should remove the last user message from history and send it as the prompt
                // to match startChat semantics which expects history to be *past* turns.
                
                let lastUserMessage = "";
                if (history.length > 0 && history[history.length - 1].role === "user") {
                    lastUserMessage = history.pop().parts[0].text;
                } else {
                    // This shouldn't happen in a DM triggered by a user message
                    lastUserMessage = message.content; 
                }

                // Ensure history starts with user
                while (history.length > 0 && history[0].role === "model") {
                    history.shift();
                }

                const chat = model.startChat({
                    history: history,
                });

                const result = await chat.sendMessage(lastUserMessage);
                const responseText = result.response.text();

                if (!responseText) return;

                // Split message if too long for Discord (2000 chars)
                if (responseText.length > 2000) {
                    const chunks = responseText.match(/[\s\S]{1,2000}/g) || [];
                    for (const chunk of chunks) {
                        await message.reply(chunk);
                    }
                } else {
                    await message.reply(responseText);
                }

            } catch (error) {
                if (error.status === 429) {
                    let waitTime = "a few";
                    const match = error.message.match(/Please retry in ([0-9.]+)s/);
                    if (match && match[1]) {
                        waitTime = Math.ceil(parseFloat(match[1]));
                    }
                    await message.channel.send(`Please slow down! I'm on cooldown. Try again in ${waitTime} seconds. Do **NOT** send a new message in ${waitTime} seconds.`);
                } else {
                    console.error('Error handling Gemini request:', error);
                    await message.channel.send("I'm having trouble thinking right now. If this issue presists, contact Earth1283");
                }
            }
        }
    },
};