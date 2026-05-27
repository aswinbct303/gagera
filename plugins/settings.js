const { Sparky, isPublic } = require("../lib/");
const { getFormattedSettings, updateUserConfig, getEffectiveConfig } = require("../lib/userConfig");
const { getConnectionStatus } = require("../lib/database");

// Available settings that users can configure
const AVAILABLE_SETTINGS = {
    'autostatus': { key: 'AUTO_STATUS_VIEW', type: 'boolean', desc: 'Auto view status updates' },
    'statusreact': { key: 'STATUS_REACTION', type: 'boolean', desc: 'Auto react to status updates' },
    'statusemoji': { key: 'STATUS_REACTION_EMOJI', type: 'string', desc: 'Status reaction emojis (comma-separated)' },
    'statusreply': { key: 'STATUS_REPLY', type: 'boolean', desc: 'Auto reply to status updates' },
    'statusreplymsg': { key: 'STATUS_REPLY_MSG', type: 'string', desc: 'Status reply message text' },
    'savestatus': { key: 'SAVE_STATUS', type: 'boolean', desc: 'Auto save status updates' },
    'readmsg': { key: 'READ_MESSAGES', type: 'boolean', desc: 'Auto read incoming messages' },
    'rejectcall': { key: 'REJECT_CALL', type: 'boolean', desc: 'Auto reject incoming calls' },
    'rejectcallmsg': { key: 'REJECT_CALL_MSG', type: 'string', desc: 'Call rejection message' },
    'worktype': { key: 'WORK_TYPE', type: 'enum', values: ['public', 'private'], desc: 'Bot work mode (public/private)' },
    'pmblock': { key: 'PM_BLOCK', type: 'boolean', desc: 'Block private messages' },
    'botinfo': { key: 'BOT_INFO', type: 'string', desc: 'Bot info text (name;owner;image-url)' },
    'language': { key: 'LANGUAGE', type: 'string', desc: 'Bot response language' }
};

/**
 * Format setting key for display
 */
function formatSettingKey(key) {
    return key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Format setting value for display
 */
function formatSettingValue(value) {
    if (typeof value === 'boolean') return value ? '✅ On' : '❌ Off';
    return value;
}

Sparky({
    name: "settings",
    fromMe: true,
    category: "config",
    desc: "View and manage your bot settings"
},
async ({ m, args }) => {
    if (!getConnectionStatus()) {
        return await m.reply("⚠️ Database not connected. Settings are using global defaults.");
    }

    const userId = m.sender;

    // If no args, show current settings
    if (!args) {
        const settingsText = await getFormattedSettings(userId);
        return await m.reply(settingsText);
    }

    // Parse arguments: .settings <setting> <value>
    const parts = args.trim().split(/\s+/);
    const settingName = parts[0].toLowerCase();
    const settingValue = parts.slice(1).join(' ');

    // Show help for specific setting
    if (settingName === 'help') {
        let helpText = "*Available Settings:*\n\n";
        for (const [name, info] of Object.entries(AVAILABLE_SETTINGS)) {
            helpText += `• *${name}* - ${info.desc}\n`;
            if (info.type === 'boolean') helpText += `  Values: on/off, true/false, 1/0\n`;
            else if (info.type === 'enum') helpText += `  Values: ${info.values.join(', ')}\n`;
            else helpText += `  Type: ${info.type}\n`;
        }
        helpText += "\n_Example: .settings autostatus on_";
        return await m.reply(helpText);
    }

    // Check if setting exists
    if (!AVAILABLE_SETTINGS[settingName]) {
        return await m.reply(`❌ Unknown setting: ${settingName}\n\nUse *.settings help* to see available settings.`);
    }

    // If only setting name provided, show current value
    if (!settingValue) {
        const settings = await getEffectiveConfig(userId);
        const setting = AVAILABLE_SETTINGS[settingName];
        const currentValue = settings[setting.key];
        return await m.reply(
            `*Setting: ${formatSettingKey(setting.key)}*\n\n` +
            `Description: ${setting.desc}\n` +
            `Type: ${setting.type}\n` +
            `Current Value: ${formatSettingValue(currentValue)}\n\n` +
            `_To change: .settings ${settingName} <value>_`
        );
    }

    // Update the setting
    const setting = AVAILABLE_SETTINGS[settingName];
    let newValue = settingValue;

    // Convert value based on type
    if (setting.type === 'boolean') {
        const lowerValue = settingValue.toLowerCase();
        if (['on', 'true', '1', 'yes', 'enable'].includes(lowerValue)) {
            newValue = true;
        } else if (['off', 'false', '0', 'no', 'disable'].includes(lowerValue)) {
            newValue = false;
        } else {
            return await m.reply(`❌ Invalid boolean value. Use: on/off, true/false, 1/0`);
        }
    } else if (setting.type === 'enum') {
        if (!setting.values.includes(settingValue.toLowerCase())) {
            return await m.reply(`❌ Invalid value. Allowed: ${setting.values.join(', ')}`);
        }
        newValue = settingValue.toLowerCase();
    }

    // Update in database
    const result = await updateUserConfig(userId, setting.key, newValue);

    if (result) {
        return await m.reply(
            `✅ *Setting Updated*\n\n` +
            `${formatSettingKey(setting.key)}: ${formatSettingValue(newValue)}\n\n` +
            `_Change takes effect immediately!_`
        );
    } else {
        return await m.reply(`❌ Failed to update setting. Please try again.`);
    }
});

Sparky({
    name: "set",
    fromMe: true,
    category: "config",
    desc: "Quick alias for .settings command"
},
async ({ m, args }) => {
    // Reuse settings command logic
    const settingsCmd = require('./settings.js');
    // Trigger the settings command
    if (!args) {
        return await m.reply("Usage: *.set <setting> <value>*\n\nUse *.set help* for available settings.");
    }
    
    // Process through settings
    const parts = args.trim().split(/\s+/);
    const settingName = parts[0].toLowerCase();
    
    if (!AVAILABLE_SETTINGS[settingName]) {
        return await m.reply(`❌ Unknown setting: ${settingName}\n\nUse *.set help* to see available settings.`);
    }
    
    if (parts.length < 2) {
        const settings = await getEffectiveConfig(m.sender);
        const setting = AVAILABLE_SETTINGS[settingName];
        const currentValue = settings[setting.key];
        return await m.reply(
            `*${formatSettingKey(setting.key)}:* ${formatSettingValue(currentValue)}\n\n` +
            `_To change: .set ${settingName} <value>_`
        );
    }
    
    const settingValue = parts.slice(1).join(' ');
    const setting = AVAILABLE_SETTINGS[settingName];
    let newValue = settingValue;

    if (setting.type === 'boolean') {
        const lowerValue = settingValue.toLowerCase();
        if (['on', 'true', '1', 'yes', 'enable'].includes(lowerValue)) {
            newValue = true;
        } else if (['off', 'false', '0', 'no', 'disable'].includes(lowerValue)) {
            newValue = false;
        } else {
            return await m.reply(`❌ Invalid value. Use: on/off`);
        }
    } else if (setting.type === 'enum') {
        if (!setting.values.includes(settingValue.toLowerCase())) {
            return await m.reply(`❌ Invalid value. Allowed: ${setting.values.join(', ')}`);
        }
        newValue = settingValue.toLowerCase();
    }

    const result = await updateUserConfig(m.sender, setting.key, newValue);

    if (result) {
        return await m.reply(`✅ ${formatSettingKey(setting.key)} set to ${formatSettingValue(newValue)}`);
    } else {
        return await m.reply(`❌ Failed to update setting.`);
    }
});

Sparky({
    name: "resetsettings",
    fromMe: true,
    category: "config",
    desc: "Reset all settings to default values"
},
async ({ m }) => {
    if (!getConnectionStatus()) {
        return await m.reply("⚠️ Database not connected.");
    }

    const { deleteUserSettings } = require('../models/UserSettings');
    const success = await deleteUserSettings(m.sender);

    if (success) {
        return await m.reply("✅ All settings reset to defaults.\n\nYour previous configuration has been deleted. Use *.settings* to view current settings.");
    } else {
        return await m.reply("❌ Failed to reset settings.");
    }
});

module.exports = { AVAILABLE_SETTINGS };
