// webSettings.js - Web-based settings management with password authentication
const express = require('express');
const router = express.Router();
const path = require('path');
const { getConnectionStatus } = require('./lib/database');
const { getEffectiveConfig, updateUserConfig } = require('./lib/userConfig');
const { getUserSettings, verifyWebPassword, getOrCreateWebPassword } = require('./models/UserSettings');

// In-memory session store for authenticated users
const activeSessions = new Map();
const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes

// Clean up expired sessions periodically
setInterval(() => {
    const now = Date.now();
    for (const [sessionId, session] of activeSessions.entries()) {
        if (now - session.timestamp > SESSION_DURATION) {
            activeSessions.delete(sessionId);
        }
    }
}, 5 * 60 * 1000); // Clean every 5 minutes

/**
 * Middleware to check if user is authenticated
 */
function requireAuth(req, res, next) {
    const sessionId = req.cookies?.sessionId || req.headers['x-session-id'];
    
    if (!sessionId || !activeSessions.has(sessionId)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const session = activeSessions.get(sessionId);
    
    // Check if session expired
    if (Date.now() - session.timestamp > SESSION_DURATION) {
        activeSessions.delete(sessionId);
        return res.status(401).json({ error: 'Session expired' });
    }
    
    // Refresh session
    session.timestamp = Date.now();
    req.userId = session.userId;
    req.userNumber = session.userNumber;
    
    next();
}

/**
 * Generate unique session ID
 */
function generateSessionId() {
    return require('crypto').randomBytes(32).toString('hex');
}

// ═══════════════════════════════════════════════════════════════
// API Routes
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/auth - Authenticate user with number and password
 */
router.post('/api/auth', async (req, res) => {
    try {
        const { number, password } = req.body;
        
        if (!number || !password) {
            return res.status(400).json({ error: 'Number and password required' });
        }
        
        if (!getConnectionStatus()) {
            return res.status(503).json({ error: 'Database not connected' });
        }
        
        // Sanitize number
        const sanitizedNumber = String(number).replace(/[^0-9]/g, '');
        const userId = sanitizedNumber + '@s.whatsapp.net';
        
        // Verify password
        const isValid = await verifyWebPassword(userId, password.toUpperCase());
        
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Create session
        const sessionId = generateSessionId();
        activeSessions.set(sessionId, {
            userId,
            userNumber: sanitizedNumber,
            timestamp: Date.now()
        });
        
        res.json({ 
            success: true, 
            sessionId,
            userNumber: sanitizedNumber
        });
        
    } catch (error) {
        console.error('Auth error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
});

/**
 * POST /api/logout - Logout user
 */
router.post('/api/logout', (req, res) => {
    const sessionId = req.cookies?.sessionId || req.headers['x-session-id'];
    if (sessionId) {
        activeSessions.delete(sessionId);
    }
    res.json({ success: true });
});

/**
 * GET /api/settings - Get user settings
 */
router.get('/api/settings', requireAuth, async (req, res) => {
    try {
        const settings = await getEffectiveConfig(req.userId);
        
        // Return only user-configurable settings
        const userSettings = {
            AUTO_STATUS_VIEW: settings.AUTO_STATUS_VIEW,
            STATUS_REACTION: settings.STATUS_REACTION,
            STATUS_REACTION_EMOJI: settings.STATUS_REACTION_EMOJI,
            STATUS_REPLY: settings.STATUS_REPLY,
            STATUS_REPLY_MSG: settings.STATUS_REPLY_MSG,
            SAVE_STATUS: settings.SAVE_STATUS,
            READ_MESSAGES: settings.READ_MESSAGES,
            REJECT_CALL: settings.REJECT_CALL,
            REJECT_CALL_MSG: settings.REJECT_CALL_MSG,
            PM_BLOCK: settings.PM_BLOCK,
            WORK_TYPE: settings.WORK_TYPE,
            BOT_INFO: settings.BOT_INFO,
            LANGUAGE: settings.LANGUAGE,
            STICKER_DATA: settings.STICKER_DATA,
            AUDIO_DATA: settings.AUDIO_DATA,
            MENU_TYPE: settings.MENU_TYPE,
            PING: settings.PING,
            SUDO: settings.SUDO,
            HANDLERS: settings.HANDLERS
        };
        
        res.json({ success: true, settings: userSettings });
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ error: 'Failed to get settings' });
    }
});

/**
 * POST /api/settings - Update user settings
 */
router.post('/api/settings', requireAuth, async (req, res) => {
    try {
        const updates = req.body;
        const results = {};
        
        // Validate and update each setting
        for (const [key, value] of Object.entries(updates)) {
            // Skip invalid keys
            const validKeys = [
                'AUTO_STATUS_VIEW', 'STATUS_REACTION', 'STATUS_REACTION_EMOJI',
                'STATUS_REPLY', 'STATUS_REPLY_MSG', 'SAVE_STATUS', 'READ_MESSAGES',
                'REJECT_CALL', 'REJECT_CALL_MSG', 'PM_BLOCK',
                'WORK_TYPE', 'BOT_INFO', 'LANGUAGE',
                'STICKER_DATA', 'AUDIO_DATA', 'MENU_TYPE', 'PING', 'SUDO', 'HANDLERS'
            ];
            
            if (!validKeys.includes(key)) {
                results[key] = { success: false, error: 'Invalid setting' };
                continue;
            }
            
            // Update the setting
            const result = await updateUserConfig(req.userId, key, value);
            results[key] = { success: !!result };
        }
        
        // Restart session to apply settings automatically
        try {
            const pairModule = require('./pair');
            if (typeof pairModule.restartSession === 'function') {
                pairModule.restartSession(req.userNumber);
            }
        } catch (err) {
            console.error('Failed to auto-restart session:', err);
        }
        
        res.json({ success: true, results });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

/**
 * GET /api/check-session - Check if session is valid
 */
router.get('/api/check-session', requireAuth, (req, res) => {
    res.json({ success: true, userNumber: req.userNumber });
});

// ═══════════════════════════════════════════════════════════════
// Page Routes
// ═══════════════════════════════════════════════════════════════

/**
 * GET /settings - Serve the settings page
 */
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'settings.html'));
});

module.exports = router;
