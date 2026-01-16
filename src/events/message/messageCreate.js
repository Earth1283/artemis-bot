const { Events, ChannelType } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const db = require('../../database/db');
const { tools, toolDefinitions } = require('../../utils/aiTools');

// Store the genAI instance
let genAI;
let model;

async function downloadImage(url) {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return {
        inlineData: {
            data: Buffer.from(response.data).toString('base64'),
            mimeType: response.headers['content-type']
        }
    };
}

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

                if (!genAI) {
                    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
                }

                // --- Quota Check for Images ---
                const hasImages = message.attachments.size > 0;
                let imageParts = [];

                if (hasImages) {
                    const userId = message.author.id;
                    const specialUser = "862583929320112130";

                    if (userId !== specialUser) {
                        const today = new Date().setHours(0, 0, 0, 0);

                        // Get current quota
                        const quota = db.prepare('SELECT * FROM ai_quotas WHERE user_id = ?').get(userId);

                        if (quota) {
                            if (quota.last_reset < today) {
                                // Reset quota for new day
                                db.prepare('UPDATE ai_quotas SET usage_count = 0, last_reset = ? WHERE user_id = ?').run(today, userId);
                            } else if (quota.usage_count >= 2) {
                                await message.reply("You have reached your daily limit of 2 images. Please try again tomorrow.");
                                return;
                            }
                        } else {
                            db.prepare('INSERT INTO ai_quotas (user_id, usage_count, last_reset) VALUES (?, 0, ?)').run(userId, today);
                        }
                    }

                    // Process images
                    for (const [key, attachment] of message.attachments) {
                        if (attachment.contentType && attachment.contentType.startsWith('image/')) {
                            const imagePart = await downloadImage(attachment.url);
                            imageParts.push(imagePart);
                        }
                    }

                    // Increment usage
                    if (userId !== specialUser && imageParts.length > 0) {
                        db.prepare('UPDATE ai_quotas SET usage_count = usage_count + 1 WHERE user_id = ?').run(userId);
                    }
                }

                // Initialize Model with Tools
                // Note: gemini-pro-vision (if used previously) doesn't support tools, but gemini-1.5-flash/pro does.
                // Assuming newer models are used or we fallback.
                model = genAI.getGenerativeModel({
                    model: geminiConfig.model || "gemini-1.5-flash",
                    systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
                    tools: [{ functionDeclarations: toolDefinitions }]
                });

                // Fetch history
                const limit = geminiConfig.memory_limit || 10;
                const messages = await message.channel.messages.fetch({ limit: limit });

                const history = [];
                const sortedMessages = Array.from(messages.values()).sort((a, b) => a.createdTimestamp - b.createdTimestamp);

                for (const msg of sortedMessages) {
                    if (!msg.content && msg.attachments.size === 0) continue;
                    // Skip current message to add it separately with images
                    if (msg.id === message.id) continue;

                    const role = msg.author.id === client.user.id ? "model" : "user";
                    history.push({
                        role: role,
                        parts: [{ text: msg.content || "analyzing image..." }], // Placeholder for old images in history if needed, or we just ignore them for now
                    });
                }

                // Ensure history starts with user
                while (history.length > 0 && history[0].role === "model") {
                    history.shift();
                }

                const chat = model.startChat({
                    history: history,
                });

                // Construct prompt with text and images
                const prompt = [message.content, ...imageParts];

                const result = await chat.sendMessage(prompt);
                const response = result.response;
                let responseText = response.text();

                // Check for function calls
                const functionCalls = response.functionCalls();
                if (functionCalls && functionCalls.length > 0) {
                    for (const call of functionCalls) {
                        const functionName = call.name;
                        if (tools[functionName]) {
                            const apiResponse = await tools[functionName](call.args);

                            // Send the function result back to the model
                            const result2 = await chat.sendMessage([
                                {
                                    functionResponse: {
                                        name: functionName,
                                        response: apiResponse
                                    }
                                }
                            ]);
                            responseText = result2.response.text();
                        }
                    }
                }

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
                    await message.channel.send("I'm overloaded right now (429). Please try again later.");
                } else {
                    console.error('Error handling Gemini request:', error);
                    await message.channel.send("I'm having trouble thinking right now.");
                }
            }
        }
    },
};