const mongoose = require('mongoose');

const userSettingsSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    // Status settings
    AUTO_STATUS_VIEW: { type: Boolean, default: true },
    STATUS_REACTION: { type: Boolean, default: false },
    STATUS_REACTION_EMOJI: { type: String, default: "🍉,🍓,🎀,💀,💗,📍,🔪,🛒,☠️,🐍,👍🏻" },
    STATUS_REPLY: { type: Boolean, default: false },
    STATUS_REPLY_MSG: { type: String, default: "Nice Status Brother 🦫✨" },
    SAVE_STATUS: { type: Boolean, default: false },
    READ_MESSAGES: { type: Boolean, default: false },
    
    // Call settings
    REJECT_CALL: { type: Boolean, default: false },
    REJECT_CALL_MSG: { type: String, default: "_Calls are not allowed. Please don't call again._" },
    
    // PM settings
    PM_BLOCK: { type: Boolean, default: false },
    
    // Bot settings
    WORK_TYPE: { type: String, default: "public", enum: ["public", "private"] },
    BOT_INFO: { type: String, default: "X-BOT-MD;ASWIN SPARKY;https://url.aswinsparky.qzz.io/H4STof.mp4" },
    LANGUAGE: { type: String, default: "english" },
    STICKER_DATA: { type: String, default: "X BOT MD;ASWIN SPARKY" },
    AUDIO_DATA: { type: String, default: "X BOT MD;ASWIN SPARKY;https://files.catbox.moe/ttdne9.jpg" },
    MENU_TYPE: { type: String, default: "video" },
    PING: { type: String, default: "Latency" },
    SUDO: { type: String, default: "917012984396" },
    HANDLERS: { type: String, default: "false" },
    
    // Web settings password
    webPassword: { type: String, default: null },
    
    // Metadata
    updatedAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});

// Cache for settings to avoid repeated DB calls
const settingsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const UserSettings = mongoose.model('UserSettings', userSettingsSchema);

/**
 * Get user settings from DB or create default
 * @param {string} userId - WhatsApp user JID
 * @returns {Promise<Object>} User settings
 */
async function getUserSettings(userId) {
    // Check cache first
    const cached = settingsCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }
    
    try {
        let settings = await UserSettings.findOne({ userId });
        
        if (!settings) {
            settings = new UserSettings({ userId });
            await settings.save();
        }
        
        // Convert to plain object
        const settingsObj = settings.toObject();
        
        // Update cache
        settingsCache.set(userId, {
            data: settingsObj,
            timestamp: Date.now()
        });
        
        return settingsObj;
    } catch (error) {
        console.error('Error getting user settings:', error);
        return null;
    }
}

/**
 * Update user setting
 * @param {string} userId - WhatsApp user JID
 * @param {string} key - Setting key
 * @param {*} value - Setting value
 * @returns {Promise<Object>} Updated settings
 */
async function updateUserSetting(userId, key, value) {
    try {
        const settings = await UserSettings.findOneAndUpdate(
            { userId },
            { [key]: value, updatedAt: new Date() },
            { returnDocument: 'after', upsert: true }
        );
        
        // Invalidate cache
        settingsCache.delete(userId);
        
        return settings.toObject();
    } catch (error) {
        console.error('Error updating user setting:', error);
        return null;
    }
}

/**
 * Update multiple settings at once
 * @param {string} userId - WhatsApp user JID
 * @param {Object} updates - Object with key-value pairs
 * @returns {Promise<Object>} Updated settings
 */
async function updateMultipleSettings(userId, updates) {
    try {
        const settings = await UserSettings.findOneAndUpdate(
            { userId },
            { ...updates, updatedAt: new Date() },
            { returnDocument: 'after', upsert: true }
        );
        
        // Invalidate cache
        settingsCache.delete(userId);
        
        return settings.toObject();
    } catch (error) {
        console.error('Error updating multiple settings:', error);
        return null;
    }
}

/**
 * Clear cache for a specific user or all users
 * @param {string} userId - Optional user ID to clear, clears all if not provided
 */
function clearSettingsCache(userId = null) {
    if (userId) {
        settingsCache.delete(userId);
    } else {
        settingsCache.clear();
    }
}

/**
 * Get all settings for all users (admin use)
 * @returns {Promise<Array>} All user settings
 */
async function getAllUserSettings() {
    try {
        return await UserSettings.find().lean();
    } catch (error) {
        console.error('Error getting all user settings:', error);
        return [];
    }
}

/**
 * Delete user settings
 * @param {string} userId - WhatsApp user JID
 * @returns {Promise<boolean>} Success status
 */
async function deleteUserSettings(userId) {
    try {
        await UserSettings.deleteOne({ userId });
        settingsCache.delete(userId);
        return true;
    } catch (error) {
        console.error('Error deleting user settings:', error);
        return false;
    }
}

/**
 * Generate or get web password for user
 * @param {string} userId - WhatsApp user JID
 * @returns {Promise<string>} The password
 */
async function getOrCreateWebPassword(userId) {
    try {
        let settings = await UserSettings.findOne({ userId });
        
        if (!settings) {
            settings = new UserSettings({ userId });
        }
        
        // Generate new password if doesn't exist
        if (!settings.webPassword) {
            const crypto = require('crypto');
            const password = crypto.randomBytes(4).toString('hex').toUpperCase();
            settings.webPassword = password;
            await settings.save();
            settingsCache.delete(userId);
            return password;
        }
        
        return settings.webPassword;
    } catch (error) {
        console.error('Error getting/creating web password:', error);
        return null;
    }
}

/**
 * Verify web password
 * @param {string} userId - WhatsApp user JID
 * @param {string} password - Password to verify
 * @returns {Promise<boolean>} Valid or not
 */
async function verifyWebPassword(userId, password) {
    try {
        const settings = await UserSettings.findOne({ userId });
        if (!settings || !settings.webPassword) return false;
        return settings.webPassword === password;
    } catch (error) {
        console.error('Error verifying web password:', error);
        return false;
    }
}

module.exports = {
    UserSettings,
    getUserSettings,
    updateUserSetting,
    updateMultipleSettings,
    clearSettingsCache,
    getAllUserSettings,
    deleteUserSettings,
    getOrCreateWebPassword,
    verifyWebPassword
};
