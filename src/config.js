const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const configPath = path.join(__dirname, '../config.json');
const messagesPath = path.join(__dirname, '../messages.yml');

function loadConfig() {
    if (!fs.existsSync(configPath)) {
        throw new Error('config.json not found!');
    }
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

function loadMessages() {
    if (!fs.existsSync(messagesPath)) {
        throw new Error('messages.yml not found!');
    }
    return yaml.load(fs.readFileSync(messagesPath, 'utf8'));
}

module.exports = { loadConfig, loadMessages };
