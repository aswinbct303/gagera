const globalConfig = require('../config');
const { connectDatabase, getConnectionStatus } = require('./database');
const { getUserSettings, updateUserSetting, updateMultipleSettings } = require('../models/UserSettings');

// Ensure DB is connected
connectDatabase().catch(() => {});

/**
 * Get effective config for a user
 * Merges global config with per-user settings from MongoDB
 * @param {string} userId - WhatsApp user JID
 * @returns {Promise<Object>} Effective config for the user
 */
async function getEffectiveConfig(userId) {
    if (!userId || !getConnectionStatus()) {
        return globalConfig;
    }
    
    try {
        const userSettings = await getUserSettings(userId);
        
        if (!userSettings) {
            return globalConfig;
        }
        
        // Merge global config with user settings (user settings take precedence)
        return {
            ...globalConfig,
            ...Object.fromEntries(
                Object.entries(userSettings).filter(([key, value]) => {
                    // Only override these specific user-configurable settings
                    const userConfigurable = [
                        'AUTO_STATUS_VIEW', 'STATUS_REACTION', 'STATUS_REACTION_EMOJI',
                        'STATUS_REPLY', 'STATUS_REPLY_MSG', 'SAVE_STATUS', 'READ_MESSAGES',
                        'REJECT_CALL', 'REJECT_CALL_MSG', 'PM_BLOCK',
                        'WORK_TYPE', 'BOT_INFO', 'LANGUAGE',
                        'STICKER_DATA', 'AUDIO_DATA', 'MENU_TYPE', 'PING', 'SUDO', 'HANDLERS'
                    ];
                    return userConfigurable.includes(key) && value !== undefined;
                })
            )
        };
    } catch (error) {
        console.error('Error getting effective config:', error);
        return globalConfig;
    }
}

/**
 * Update a single setting for a user
 * @param {string} userId - WhatsApp user JID
 * @param {string} key - Setting name
 * @param {*} value - Setting value
 * @returns {Promise<Object>} Updated settings
 */
async function updateUserConfig(userId, key, value) {
    if (!userId || !getConnectionStatus()) {
        return null;
    }
    
    // Convert boolean strings to actual booleans
    if (value === 'true') value = true;
    if (value === 'false') value = false;
    
    return await updateUserSetting(userId, key, value);
}

/**
 * Update multiple settings for a user
 * @param {string} userId - WhatsApp user JID
 * @param {Object} updates - Key-value pairs of settings
 * @returns {Promise<Object>} Updated settings
 */
async function updateUserConfigs(userId, updates) {
    if (!userId || !getConnectionStatus()) {
        return null;
    }
    
    // Convert boolean strings to actual booleans
    const processedUpdates = {};
    for (const [key, value] of Object.entries(updates)) {
        if (value === 'true') processedUpdates[key] = true;
        else if (value === 'false') processedUpdates[key] = false;
        else processedUpdates[key] = value;
    }
    
    return await updateMultipleSettings(userId, processedUpdates);
}

/**
 * Get formatted settings list for display
 * @param {string} userId - WhatsApp user JID
 * @returns {Promise<string>} Formatted settings string
 */
async function getFormattedSettings(userId) {
    if (!userId || !getConnectionStatus()) {
        return 'Database not connected. Using global settings.';
    }
    
    try {
        const settings = await getUserSettings(userId);
        const effective = await getEffectiveConfig(userId);
        
        return `*Your Settings:*\n\n` +
            `📱 *Auto Status View:* ${effective.AUTO_STATUS_VIEW ? '✅' : '❌'}\n` +
            `😀 *Status Reaction:* ${effective.STATUS_REACTION ? '✅' : '❌'}\n` +
            `📝 *Status Reply:* ${effective.STATUS_REPLY ? '✅' : '❌'}\n` +
            `💾 *Save Status:* ${effective.SAVE_STATUS ? '✅' : '❌'}\n` +
            `📖 *Read Messages:* ${effective.READ_MESSAGES ? '✅' : '❌'}\n` +
            `📞 *Reject Calls:* ${effective.REJECT_CALL ? '✅' : '❌'}\n` +
            `🚫 *PM Block:* ${effective.PM_BLOCK ? '✅' : '❌'}\n` +
            `🌐 *Work Type:* ${effective.WORK_TYPE}\n` +
            `🗣️ *Language:* ${effective.LANGUAGE}\n` +
            `🔖 *Sticker Data:* ${effective.STICKER_DATA}\n` +
            `🎵 *Audio Data:* ${effective.AUDIO_DATA}\n` +
            `📜 *Menu Type:* ${effective.MENU_TYPE}\n` +
            `🏓 *Ping:* ${effective.PING}\n` +
            `👑 *Sudo:* ${effective.SUDO}\n` +
            `⌨️ *Handlers:* ${effective.HANDLERS}\n\n` +
            `_Use .set <setting> <value> to change_`;
    } catch (error) {
        return 'Error fetching settings.';
    }
}

module.exports = {
    getEffectiveConfig,
    updateUserConfig,
    updateUserConfigs,
    getFormattedSettings,
    connectDatabase,
    getConnectionStatus
};
