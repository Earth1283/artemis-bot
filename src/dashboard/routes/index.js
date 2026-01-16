const express = require('express');
const router = express.Router();
const passport = require('passport');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Middleware to check authentication
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/');
}

// Routes
router.get('/', (req, res) => {
    if (req.isAuthenticated()) {
        return res.redirect('/dashboard');
    }
    res.render('index', { user: req.user });
});

router.get('/auth/discord', (req, res, next) => {
    if (!process.env.CLIENT_ID || !process.env.DISCORD_CLIENT_SECRET) {
        return res.send('<h1>Configuration Error</h1><p>Discord OAuth is not configured. Please add CLIENT_ID and DISCORD_CLIENT_SECRET to your .env file.</p>');
    }
    passport.authenticate('discord')(req, res, next);
});

router.get('/auth/discord/callback', (req, res, next) => {
    if (!process.env.CLIENT_ID || !process.env.DISCORD_CLIENT_SECRET) {
        return res.redirect('/');
    }
    passport.authenticate('discord', {
        failureRedirect: '/'
    })(req, res, next);
}, (req, res) => {
    res.redirect('/dashboard');
});

router.get('/logout', (req, res) => {
    req.logout(() => {
        res.redirect('/');
    });
});

router.get('/dashboard', ensureAuthenticated, (req, res) => {
    // Load messages.yml
    const messagesPath = path.join(__dirname, '../../../messages.yml');
    let messagesContent = "";

    if (fs.existsSync(messagesPath)) {
        messagesContent = fs.readFileSync(messagesPath, 'utf8');
    }

    res.render('dashboard', {
        user: req.user,
        messagesContent: messagesContent,
        success: req.query.success
    });
});

router.post('/api/save', ensureAuthenticated, (req, res) => {
    const { content } = req.body;
    const messagesPath = path.join(__dirname, '../../../messages.yml');

    try {
        // Validate YAML
        yaml.load(content); // Throws if invalid

        fs.writeFileSync(messagesPath, content, 'utf8');

        // Reload in bot (needs reference to client, or we just rely on bot reloading or simple reload)
        // For now, we just save to file. The bot loads on startup, maybe we need hot reload.
        // We can emit an event or just let it be. 'config.js' loads synchonously on call, 
        // but client.messages is loaded once in index.js.
        // We'll address hot reload later or ask user to restart.

        res.redirect('/dashboard?success=true');
    } catch (e) {
        res.status(500).send('Invalid YAML or Error saving: ' + e.message);
    }
});

module.exports = router;
