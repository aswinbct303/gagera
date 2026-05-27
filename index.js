require('dotenv').config();
const express = require('express');
const app = express();
__path = process.cwd()
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const PORT = process.env.PORT || 8000;
let code = require('./pair');
let webSettings = require('./webSettings');
const { startSessionCleaner } = require('./session_cleaner');

require('events').EventEmitter.defaultMaxListeners = 500;

// Middleware
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/code', code);
app.use('/settings', webSettings);
app.use('/pair', async (req, res, next) => {
    res.sendFile(__path + '/pair.html');
});
app.use('/', async (req, res, next) => {
    res.sendFile(__path + '/public/index.html');
});

// ✅ Changed here to bind on 0.0.0.0
app.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 Server running on http://localhost:' + PORT);
    console.log('📱 Web Settings: http://localhost:' + PORT + '/settings');
    // Start session folder cleaner (keeps only creds.json, runs every 12h)
    startSessionCleaner();
});

module.exports = app;
