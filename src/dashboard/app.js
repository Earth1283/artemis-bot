const express = require('express');
const passport = require('passport');
const { Strategy } = require('passport-discord');
const session = require('cookie-session');
const path = require('path');
const db = require('../database/db');
const { loadConfig } = require('../config');

const app = express();
const config = loadConfig();

// Passport Setup
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    // In a real app, you'd fetch user from DB. For now, we just pass ID or formatted object.
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    done(null, user || { id: id }); // Fallback if not in DB for some reason, though Strat saves it
});

if (process.env.CLIENT_ID && process.env.DISCORD_CLIENT_SECRET) {
    const port = process.env.MANAGEMENT_API_PORT || 3000;
    const callbackURL = process.env.DISCORD_CALLBACK_URL || `http://localhost:${port}/auth/discord/callback`;

    console.log(`[Dashboard] OAuth Callback URL set to: ${callbackURL}`);
    console.log('[Dashboard] Ensure this exact URL is added to your Discord Developer Portal -> OAuth2 -> Redirects');

    passport.use(new Strategy({
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.DISCORD_CLIENT_SECRET,
        callbackURL: callbackURL,
        scope: ['identify']
    }, (accessToken, refreshToken, profile, done) => {
        // Save/Update user in DB
        const expiresAt = Date.now() + 604800000; // 7 days (approx)

        // Check if user exists
        const row = db.prepare('SELECT * FROM users WHERE id = ?').get(profile.id);
        if (row) {
            db.prepare('UPDATE users SET access_token = ?, refresh_token = ?, expires_at = ? WHERE id = ?')
                .run(accessToken, refreshToken, expiresAt, profile.id);
        } else {
            db.prepare('INSERT INTO users (id, access_token, refresh_token, expires_at, permissions) VALUES (?, ?, ?, ?, ?)')
                .run(profile.id, accessToken, refreshToken, expiresAt, 'user');
        }

        process.nextTick(() => {
            return done(null, profile);
        });
    }));
} else {
    console.warn("Dashboard authentication disabled: Missing CLIENT_ID or DISCORD_CLIENT_SECRET in .env");
}

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET || 'super_secret_key',
    resave: false,
    saveUninitialized: false,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 1 week
}));

app.use(passport.initialize());
app.use(passport.session());

// Routes
const mainRoutes = require('./routes/index');
app.use('/', mainRoutes);

module.exports = app;
