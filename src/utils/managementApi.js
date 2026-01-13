const axios = require('axios');
const { loadConfig } = require('../config');

class ManagementApi {
    constructor() {
        this.config = loadConfig();
        this.baseUrl = `http://${this.config.managementIp || this.config.serverIp}:${process.env.MANAGEMENT_API_PORT || 3000}`;
        this.secret = process.env.MANAGEMENT_API_SECRET;
    }

    get headers() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.secret}`, // Assuming Bearer token or just a custom header
            'X-Server-Secret': this.secret // Adding this as a fallback common pattern
        };
    }

    async post(endpoint, data = {}) {
        try {
            const response = await axios.post(`${this.baseUrl}${endpoint}`, data, { headers: this.headers });
            return response.data;
        } catch (error) {
            console.error(`Management API Error [${endpoint}]:`, error.response?.data || error.message);
            throw error.response?.data || new Error('Failed to connect to management server.');
        }
    }

    async get(endpoint) {
        try {
            const response = await axios.get(`${this.baseUrl}${endpoint}`, { headers: this.headers });
            return response.data;
        } catch (error) {
            console.error(`Management API Error [${endpoint}]:`, error.response?.data || error.message);
            throw error.response?.data || new Error('Failed to connect to management server.');
        }
    }

    async ban(player, reason, duration) {
        return this.post('/ban', { player, reason, duration });
    }

    async unban(player) {
        return this.post('/unban', { player });
    }

    async banIp(ip, reason) {
        return this.post('/ban-ip', { ip, reason });
    }

    async whitelistAdd(player) {
        return this.post('/whitelist/add', { player });
    }

    async whitelistRemove(player) {
        return this.post('/whitelist/remove', { player });
    }

    async whitelistList() {
        return this.get('/whitelist');
    }
}

module.exports = new ManagementApi();
