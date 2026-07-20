// pair.js — WhatsApp pairing server (local file session backend)
const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const router = express.Router();
const pino = require('pino');
const axios = require('axios');
const { serialize, commands: importedCommands, whatsappAutomation, callAutomation, externalPlugins } = require('./lib');
const { connectDatabase, getConnectionStatus } = require('./lib/database');
const { getEffectiveConfig, getFormattedSettings, updateUserConfig } = require('./lib/userConfig');
const { getOrCreateWebPassword } = require('./models/UserSettings');
const globalConfig = require('./config');

const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers,
    DisconnectReason
} = require('baileys');

// Initialize database connection
connectDatabase().catch(err => console.log('DB connection failed, using file-based config:', err.message));

// ─────────────────────────────────────────────
// Paths & in-memory state
// ─────────────────────────────────────────────

const SESSION_BASE_PATH = './session';
const CONFIG_BASE_PATH = './config';

const activeSockets = new Map();
global.activeSockets = activeSockets;
const socketCreationTime = new Map();

// Ensure directories exist and are writable
for (const dir of [SESSION_BASE_PATH, CONFIG_BASE_PATH]) {
    fs.ensureDirSync(dir);
    try { fs.chmodSync(dir, '777'); } catch (_) { }
}

// ─────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────

function safeSanitizeNumber(number) {
    return String(number || '').replace(/[^0-9]/g, '');
}

// ─────────────────────────────────────────────
// Local config helpers  (config/ folder — never synced remotely)
// ─────────────────────────────────────────────

async function loadLocalUserConfig(number) {
    try {
        const file = path.join(CONFIG_BASE_PATH, `config_${safeSanitizeNumber(number)}.json`);
        if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
        console.error(`Failed to load config for ${number}:`, e.message);
    }
    console.warn(`No configuration found for ${number}, using default config`);
    return { ...globalConfig };
}

async function updateLocalUserConfig(number, newConfig) {
    const file = path.join(CONFIG_BASE_PATH, `config_${safeSanitizeNumber(number)}.json`);
    fs.writeFileSync(file, JSON.stringify(newConfig, null, 2), 'utf8');
}

// ─────────────────────────────────────────────
// Session cleanup — local files only
// ─────────────────────────────────────────────

async function cleanupSession(sanitizedNumber) {
    // Remove in-memory references
    activeSockets.delete(sanitizedNumber);
    socketCreationTime.delete(sanitizedNumber);

    // Delete the local session folder
    const sessionPath = path.join(SESSION_BASE_PATH, `session_${sanitizedNumber}`);
    if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true, force: true });
        console.log(`🗑️  Removed local session folder for ${sanitizedNumber}.`);
    }
}

// ─────────────────────────────────────────────
// Auto-restart / logout handler
// ─────────────────────────────────────────────

function setupAutoRestart(client, number) {
    client.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection !== 'close') return;

        const sanitizedNumber = safeSanitizeNumber(number);
        const statusCode = lastDisconnect?.error?.output?.statusCode;

        // Permanent disconnects — do NOT reconnect
        const isLoggedOut =
            statusCode === DisconnectReason.loggedOut ||
            statusCode === 401 ||
            statusCode === 403 ||
            statusCode === 405;

        if (isLoggedOut) {
            console.log(`❌ Session logged out for ${sanitizedNumber} (code ${statusCode}). Cleaning up...`);
            await cleanupSession(sanitizedNumber);
            console.log(`✅ Cleanup complete for ${sanitizedNumber}.`);
        } else {
            //console.log(`🔄 Connection lost for ${sanitizedNumber} (code ${statusCode}), reconnecting in 10s...`);
            activeSockets.delete(sanitizedNumber);
            socketCreationTime.delete(sanitizedNumber);
            await delay(10000);
            const mockRes = { headersSent: false, send: () => { }, status: () => mockRes };
            try {
                await EmpirePair(number, mockRes);
            } catch (e) {
                console.error('Reconnect attempt failed:', e.message || e);
            }
        }
    });
}

// ─────────────────────────────────────────────
// Core pairing function
// ─────────────────────────────────────────────

async function EmpirePair(number, res) {


    const sanitizedNumber = safeSanitizeNumber(number);

    if (activeSockets.has(sanitizedNumber)) {
        if (res && !res.headersSent) res.send({ status: 'already_connected' });
        return;
    }

    const sessionPath = path.join(SESSION_BASE_PATH, `session_${sanitizedNumber}`);
    fs.ensureDirSync(sessionPath);
    try { fs.chmodSync(sessionPath, '777'); } catch (_) { }

    // Load auth state from local files (Baileys handles read/write automatically)
    let authState;
    try {
        authState = await useMultiFileAuthState(sessionPath);
    } catch (err) {
        console.error(`Failed to initialize auth state for ${sanitizedNumber}:`, err?.message || err);
        await cleanupSession(sanitizedNumber);
        if (res && !res.headersSent) {
            try { res.status(500).send({ error: 'Auth state corrupted, session removed' }); } catch (_) { }
        }
        return;
    }

    const { state, saveCreds } = authState;
    const waLogger = pino({ level: 'fatal' }).child({ level: 'fatal' });

    try {
        const client = makeWASocket({
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, waLogger),
            },
            printQRInTerminal: false,
            //version: [2, 3000, 1033893291],
            logger: waLogger,
            browser: ["Ubuntu", "Chrome", "20.0.04"],
        });

        activeSockets.set(sanitizedNumber, client);
        socketCreationTime.set(sanitizedNumber, Date.now());

        // Optional handler hooks (set up before events)
        if (typeof setupStatusHandlers === 'function') try { setupStatusHandlers(client); } catch (_) { }
        if (typeof setupCommandHandlers === 'function') try { setupCommandHandlers(client, sanitizedNumber); } catch (_) { }
        if (typeof setupMessageHandlers === 'function') try { setupMessageHandlers(client); } catch (_) { }
        setupAutoRestart(client, sanitizedNumber);
        if (typeof setupNewsletterHandlers === 'function') try { setupNewsletterHandlers(client); } catch (_) { }
        if (typeof handleMessageRevocation === 'function') try { handleMessageRevocation(client, sanitizedNumber); } catch (_) { }

        // Persist creds to disk whenever they change (Baileys built-in)
        client.ev.on('creds.update', saveCreds);

        // Request pairing code for brand-new sessions
        if (!client.authState?.creds?.registered) {
            const userConfig = await getEffectiveConfig(sanitizedNumber + '@s.whatsapp.net');
            let retries = Number(userConfig.MAX_RETRIES) || 3;
            let code;
            while (retries > 0) {
                try {
                    await delay(1500);
                    code = await client.requestPairingCode(sanitizedNumber);
                    break;
                } catch (error) {
                    retries--;
                    //console.warn(`Pairing code request failed (${retries} left):`, error?.message || error);
                    await delay(2000 * (Number(userConfig.MAX_RETRIES) - retries));
                }
            }
            if (res && !res.headersSent) {
                try { res.send({ code }); } catch (_) { }
            }
        }

        // Connected
        client.ev.on('connection.update', async (update) => {
            if (update.connection !== 'open') return;
            try {
                await initializePlugins();
                console.log(`✅ Connected: ${sanitizedNumber}`);

                // Load plugins
                fs.readdirSync('./plugins')
                    .filter(f => path.extname(f) === '.js')
                    .forEach(f => {
                        try { require(`./plugins/${f}`); } catch (e) { console.warn('Plugin require failed:', e?.message || e); }
                    });

                // Join group
                await joinGroup(client).catch(() => { });

                // Newsletter follow
                try {
                    const nlJid = '120363162531955185@newsletter';
                    if (typeof client.newsletterFollow === 'function') {
                        await client.newsletterFollow(nlJid);
                        await client.sendMessage(nlJid, { react: { text: '❤️', key: { id: '1' } } }).catch(() => { });
                        console.log(`✅ Followed newsletter: ${nlJid}`);
                    }
                } catch (e) {
                    console.error('❌ Newsletter error:', e?.message || e);
                }

                // Config (MongoDB-based, with fallback to local file)
                let userConfig;
                try {
                    userConfig = await getEffectiveConfig(sanitizedNumber + '@s.whatsapp.net');
                } catch (_) {
                    userConfig = globalConfig;
                }

                // Generate or get web password
                let webPassword;
                if (getConnectionStatus()) {
                    webPassword = await getOrCreateWebPassword(sanitizedNumber + '@s.whatsapp.net');
                }

                // Startup message
                const startupMessage =
                    `*SPARKY BOT MINI CONNECTED!*\n\n` +
                    `_Mode: ${userConfig.WORK_TYPE}_\n_Prefix: ${userConfig.HANDLERS}_\n_Version: ${globalConfig.VERSION}_\n` +
                    `_Menu Type: ${userConfig.MENU_TYPE}_\n_Language: ${userConfig.LANGUAGE}_\n_Active Bots: ${activeSockets.size}_\n\n` +
                    `*Your Configurations*\n\n` +
                    `Auto status view: ${userConfig.AUTO_STATUS_VIEW ? '✅' : '❌'}\n` +
                    `Auto status reaction: ${userConfig.STATUS_REACTION ? '✅' : '❌'}\n` +
                    `Auto status reply: ${userConfig.STATUS_REPLY ? '✅' : '❌'}\n` +
                    `Auto read messages: ${userConfig.READ_MESSAGES ? '✅' : '❌'}\n` +
                    `Auto reject calls: ${userConfig.REJECT_CALL ? '✅' : '❌'}\n` +
                    (webPassword ? `🔐 *Web Settings Password:* \`${webPassword}\`\n` +
                        `*Access:* *https://minibot.aswinsparky.qzz.io/settings*\n*Keep this password safe!*` : '');

                const sudoId = client.user?.id?.replace(/:.*@/, '@');
                try {
                    if (typeof client.sendMessage === 'function') {
                        await client.sendMessage(sudoId, {
                            text: startupMessage
                        }, { quoted: false }).catch(() => { });
                    }
                } catch (e) { console.warn('Failed to send startup message:', e?.message || e); }

            } catch (error) {
                console.error('Connection open error:', error?.message || error);
            }
        });

        // Messages
        client.ev.on('messages.upsert', async (msg) => {
            let m;
            try {
                m = await serialize(JSON.parse(JSON.stringify(msg.messages[0])), client);
            } catch (e) {
                console.error('Error serializing message:', e);
                return;
            }

            try { await whatsappAutomation(client, m, msg); } catch (e) {
                console.error('whatsappAutomation error:', e?.message || e);
            }

            if (Array.isArray(importedCommands)) {
                // Get user-specific config for command execution
                const cmdConfig = await getEffectiveConfig(sanitizedNumber + '@s.whatsapp.net');

                if (cmdConfig.DISABLE_PM && !m.isGroup) return;

                for (const Sparky of importedCommands) {
                    try {
                        if (Sparky.fromMe && !m.sudo) continue;
                        const comman = m.body || '';

                        // Build a per-user command regex using the user's HANDLERS setting
                        let cmdPattern = Sparky._baseName;
                        if (cmdPattern) {
                            const handler = cmdConfig.HANDLERS;
                            let prefix;
                            if (!handler || handler === 'false') {
                                prefix = '^';
                            } else if (handler.split('').length > 1 && handler[0] === handler[1]) {
                                prefix = handler;
                            } else if (/[-!$%^&*()_+|~=`{}\[\]:";'<>?,.\/]/.test(handler)) {
                                prefix = '^[' + handler + ']';
                            } else {
                                prefix = handler;
                            }
                            const userRegex = new RegExp(`${prefix}\\s*${cmdPattern}\\s*(?!\\S)(.*)$`, 'i');
                            if (Sparky.on) {
                                Sparky.function({ m, args: m.body, client, config: cmdConfig });
                            } else if (userRegex.test(comman)) {
                                const args = comman.replace(userRegex, '$1').trim();
                                Sparky.function({ m, args, client, config: cmdConfig });
                            }
                        } else {
                            if (Sparky.on) {
                                Sparky.function({ m, args: m.body, client, config: cmdConfig });
                            } else if (Sparky.name && Sparky.name.test(comman)) {
                                const args = m.body.replace(Sparky.name, '$1').trim();
                                Sparky.function({ m, args, client, config: cmdConfig });
                            }
                        }
                    } catch (e) {
                        console.log('Command handler error:', e);
                    }
                }
            }
        });

        // Calls
        client.ev.on('call', async (call) => {
            try {
                const calls = Array.isArray(call) ? call : [call];
                for (const c of calls) await callAutomation(client, c);
            } catch (e) {
                console.error('Call handler error:', e?.message || e);
            }
        });

    } catch (error) {
        console.error('Pairing error:', error?.message || error);
        activeSockets.delete(sanitizedNumber);
        socketCreationTime.delete(sanitizedNumber);
        if (res && !res.headersSent) {
            try { res.status(503).send({ error: 'Service Unavailable' }); } catch (_) { }
        }
    }
}

// ─────────────────────────────────────────────
// Join group helper
// ─────────────────────────────────────────────

async function joinGroup(client) {
    let retries = Number(config.MAX_RETRIES) || 3;
    const inviteCode = 'I6lxNWSNneILUeqRqCa36S';
    while (retries--) {
        try {
            if (typeof client.groupAcceptInvite !== 'function') throw new Error('groupAcceptInvite not supported');
            const res = await client.groupAcceptInvite(inviteCode);
            if (res?.gid) return { status: 'success', gid: res.gid };
            throw new Error('No group ID in response');
        } catch (err) {
            const msg = err?.message || '';
            if (msg.includes('not-authorized')) return { status: 'failed', error: 'Not authorized or banned' };
            if (msg.includes('conflict')) return { status: 'failed', error: 'Already in group' };
            if (msg.includes('gone')) return { status: 'failed', error: 'Invalid or expired invite link' };
            if (retries) await delay(2000 * (Number(userConfig.MAX_RETRIES) - retries));
        }
    }
    return { status: 'failed', error: 'Max retries reached' };
}

// ─────────────────────────────────────────────
// Express route — start pairing
// ─────────────────────────────────────────────

router.get('/', async (req, res) => {
    const { number } = req.query;
    if (!number) return res.status(400).send({ error: 'Number parameter is required' });

    const sanitized = safeSanitizeNumber(number);
    if (activeSockets.has(sanitized)) {
        return res.status(200).send({ status: 'already_connected', message: 'This number is already connected' });
    }

    try {
        await EmpirePair(number, res);
    } catch (err) {
        console.error('EmpirePair failed to start:', err?.message || err);
        if (!res.headersSent) {
            try { res.status(500).send({ error: 'Failed to start pairing' }); } catch (_) { }
        }
    }
});

// ─────────────────────────────────────────────
// External plugins loader
// ─────────────────────────────────────────────

async function initializePlugins() {
    try {
        if (!externalPlugins || typeof externalPlugins.findAll !== 'function') return;
        const plugins = await externalPlugins.findAll();
        if (!Array.isArray(plugins)) return;
        for (const plugin of plugins) {
            try {
                const pluginPath = `./plugins/${plugin.dataValues.name}.js`;
                if (!fs.existsSync(pluginPath)) {
                    const response = await axios.get(plugin.dataValues.url);
                    if (response.status === 200 && response.data) {
                        fs.writeFileSync(pluginPath, response.data);
                        try { require(pluginPath); } catch (e) { console.warn('Failed to require external plugin:', e.message || e); }
                        console.log('External plugin loaded:', plugin.dataValues.name);
                    }
                }
            } catch (e) { console.log('Plugin install error:', e?.message || e); }
        }
    } catch (e) { console.log('initializePlugins error:', e?.message || e); }
}

// ─────────────────────────────────────────────
// Auto-reconnect from local session folders on startup
// ─────────────────────────────────────────────

async function autoReconnectFromLocal() {
    try {
        if (!fs.existsSync(SESSION_BASE_PATH)) return;

        const entries = fs.readdirSync(SESSION_BASE_PATH, { withFileTypes: true });
        const sessionDirs = entries.filter(e => e.isDirectory() && e.name.startsWith('session_'));

        if (sessionDirs.length === 0) {
            console.log('ℹ️  No local sessions found. Nothing to reconnect.');
            return;
        }

        // Only reconnect sessions that have a valid creds.json
        const validSessions = sessionDirs.filter(dir => {
            const credsFile = path.join(SESSION_BASE_PATH, dir.name, 'creds.json');
            return fs.existsSync(credsFile);
        });

        if (validSessions.length === 0) {
            console.log('ℹ️  No valid local sessions found. Nothing to reconnect.');
            return;
        }

        console.log(`🔁 Found ${validSessions.length} local session(s). Reconnecting...`);

        for (const dir of validSessions) {
            const number = dir.name.replace('session_', '');
            if (activeSockets.has(number)) continue;
            const mockRes = { headersSent: false, send: () => { }, status: () => mockRes };
            try {
                await EmpirePair(number, mockRes);
                console.log(`✅ Reconnected: ${number}`);
            } catch (e) {
                console.error(`❌ Failed to reconnect ${number}:`, e.message || e);
            }
            await delay(1000);
        }
    } catch (error) {
        console.error('❌ autoReconnectFromLocal error:', error.message);
    }
}

// ─────────────────────────────────────────────
// Auto-updater — polls main repo every 60 seconds
// ─────────────────────────────────────────────

const { exec: _exec } = require('child_process');
const simpleGit = require('simple-git');
const _git = simpleGit();

async function _pullUpdates() {
    try {
        await _git.fetch();
        const newCommits = await _git.log(['main..origin/main']);

        if (newCommits.total === 0) {
            //console.log('[AutoUpdater] ✅ Already up to date.');
            return;
        }

        console.log(`[AutoUpdater] 🔄 ${newCommits.total} new commit(s) found. Pulling...`);

        // Stash any local changes so the pull doesn't conflict
        const stashResult = await _git.stash(['save', '--include-untracked', 'auto-stash-before-update']);
        const didStash = !stashResult.includes('No local changes');

        await _git.pull('origin', 'main');

        if (didStash) {
            try {
                await _git.stash(['pop']);
            } catch (_) {
                console.warn('[AutoUpdater] ⚠️  Stash pop conflict — stash kept. Resolve manually.');
            }
        }

        console.log('[AutoUpdater] ✅ Updates applied successfully!');

        // Re-run npm install if package.json was among the changed files
        const pkgChanged = newCommits.all.some(c =>
            c.message.includes('package.json') ||
            c.diff?.files?.some(f => f.file === 'package.json')
        );
        if (pkgChanged) {
            console.log('[AutoUpdater] 📦 package.json changed — running npm install...');
            await new Promise((resolve, reject) => {
                _exec('npm install --force', { cwd: __dirname }, (err, _stdout, stderr) => {
                    if (err) {
                        console.error('[AutoUpdater] ❌ npm install failed:', stderr);
                        reject(err);
                    } else {
                        console.log('[AutoUpdater] ✅ npm install completed.');
                        resolve();
                    }
                });
            });
        }

        // Restart the process so the new code is loaded
        // pm2 / nodemon / forever will automatically bring the process back up.
        console.log('[AutoUpdater] 🔁 Restarting process to apply updates...');
        process.exit(0);

    } catch (e) {
        console.error('[AutoUpdater] ❌ Error:', e.message);
    }
}

function startAutoUpdater(intervalMs = 60_000) {
    console.log(`[AutoUpdater] 🚀 Started — checking for updates every ${intervalMs / 1000}s.`);
    // Run once immediately on startup, then on every interval
    _pullUpdates();
    setInterval(_pullUpdates, intervalMs);
}

// ─────────────────────────────────────────────
// Process lifecycle
// ─────────────────────────────────────────────

process.on('exit', () => {
    activeSockets.forEach((client, number) => {
        try { client?.ws?.close?.(); } catch (_) { }
        activeSockets.delete(number);
        socketCreationTime.delete(number);
    });
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err?.message || err);
});

// Kick off reconnection on startup
autoReconnectFromLocal();

// Start background auto-updater (checks every 60 seconds)
startAutoUpdater();

// Provide a way to restart a session externally
router.restartSession = async (number) => {
    const sanitizedNumber = safeSanitizeNumber(number);
    if (activeSockets.has(sanitizedNumber)) {
        console.log(`🔄 Restarting session for ${sanitizedNumber} to apply new settings...`);
        const client = activeSockets.get(sanitizedNumber);
        try { client?.ws?.close?.(); } catch (_) { }
        return true;
    }
    return false;
};

module.exports = router;
