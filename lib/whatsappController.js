const globalConfig = require('../config');
const { getEffectiveConfig } = require('./userConfig');

async function whatsappAutomation(client, m, message) {
    // Get per-user config for the bot owner
    const userId = client.user?.id?.split(':')[0] + '@s.whatsapp.net' || globalConfig.SUDO + '@s.whatsapp.net';
    const config = await getEffectiveConfig(userId);

    if (
        config.AUTO_STATUS_VIEW &&
        m.key &&
        m.key.remoteJid === 'status@broadcast' &&
        m.key.participant
    ) {
        try {
            // Mark the status as read
            await client.readMessages([m.key]);
        } catch (err) {
            // Handle error silently
        }

        if (config.STATUS_REACTION) {
            const emojiArray = config.STATUS_REACTION_EMOJI.split(',');
            const emoji = emojiArray[Math.floor(Math.random() * emojiArray.length)];

            try {
                await client.sendMessage(
                    "status@broadcast",
                    {
                        react: {
                            key: m.key,
                            text: emoji,
                        },
                    },
                    {
                        statusJidList: [m.key.participant, client.user.id].filter(Boolean),
                    }
                );
            } catch (err) {
                // Handle error silently
            }
        }

        if (config.STATUS_REPLY) {
            try {
                await client.sendMessage(m.key.participant, {
                    text: config.STATUS_REPLY_MSG,
                }, {quoted: m});
            } catch (err) {
                // Handle error silently
            }
        }
    }
}


async function callAutomation(client, callInfo) {
    // Get per-user config for the bot owner
    const userId = client.user?.id?.split(':')[0] + '@s.whatsapp.net' || globalConfig.SUDO + '@s.whatsapp.net';
    const config = await getEffectiveConfig(userId);

    if(config.REJECT_CALL && callInfo.status === "offer" && !config.SUDO.includes(callInfo.from.split("@")[0])) {
        await client.rejectCall(callInfo.id, callInfo.from);
        if (config.REJECT_CALL_TXT === "true") {
        return await client.sendMessage(callInfo.from, {text: config.REJECT_CALL_MSG });
        }
    }
}


module.exports = {whatsappAutomation, callAutomation};
