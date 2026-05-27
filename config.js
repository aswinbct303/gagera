const fs = require("fs");
const dotenv = require("dotenv");

function toBool(value) {
	return value === "true";
}

if (fs.existsSync("config.env")) {
	dotenv.config({
		path: "./config.env"
	});
}

module.exports = {
	VERSION: require("./package.json").version,
	ALWAYS_ONLINE: toBool(process.env.ALWAYS_ONLINE || "false"),
	API: "https://api-aswin-sparky.koyeb.app",
	AUDIO_DATA: process.env.AUDIO_DATA || "X BOT MD;ASWIN SPARKY;https://files.catbox.moe/ttdne9.jpg",
	AUTO_STATUS_VIEW: toBool(process.env.AUTO_STATUS_VIEW || "true"),
	BOT_INFO: process.env.BOT_INFO || "X-BOT-MD;ASWIN SPARKY;https://url.aswinsparky.qzz.io/H4STof.mp4",
	CALL_BLOCK: toBool(process.env.CALL_BLOCK || "false"),
	CALL_BLOCK_MSG: process.env.CALL_BLOCK_MSG || "_Calls are not allowed. Please don’t call again!._",
	DISABLE_PM: toBool(process.env.DISABLE_PM || "false"),
	HANDLERS: (process.env.HANDLERS || process.env.HANDLER || "false").trim(),
	LANGUAGE: process.env.LANGUAGE || "english",
	LOGS: toBool(process.env.LOGS || "false"),
	MENU_TYPE: process.env.MENU_TYPE || "video", // Menu style big, small, image, video, document, text, payment
	MENU_FONT: process.env.MENU_FONT || "tiny", // randomStyle, listall, strikeThrough, wingdings, vaporwave, typewriter, analucia, tildeStrikeThrough, underline, doubleUnderline, slashThrough, sparrow, heartsBetween, arrowBelow, crossAboveBelow, creepify, bubbles, mirror, squares, roundsquares, flip, tiny, createMap, serif_I, manga, ladybug, runes, serif_B, serif_BI, serif_I, fancy1, fancy2, fancy3, fancy4, fancy5, fancy6, fancy7, fancy8, fancy9, fancy10, fancy11, fancy12, fancy13, fancy14, fancy15, fancy16, fancy17, fancy18, fancy19, fancy20, fancy21, fancy22, fancy23, fancy24, fancy25, fancy26, fancy27, fancy28, fancy29, fancy30, fancy31, fancy32, fancy33
	MAX_RETRIES: "3",
	PORT: process.env.PORT || 8080,
	GROQ_API_KEY: process.env.GROQ_API_KEY || "",
	PING: process.env.PING || "Latency",
	PM_BLOCK: toBool(process.env.PM_BLOCK || "false"),
	READ_MESSAGES: toBool(process.env.READ_MESSAGES || "false"),
	REJECT_CALL: toBool(process.env.REJECT_CALL || "false"),
	REJECT_CALL_TXT: process.env.REJECT_CALL_TXT || "false",
	REJECT_CALL_MSG: process.env.REJECT_CALL_MSG || "_Calls are not allowed. Please don’t call again!._",
	START_MSG: toBool(process.env.START_MSG || "true"),
	STICKER_DATA: process.env.STICKER_DATA || `X BOT MD;ASWIN SPARKY`,
	SUDO: process.env.SUDO || "917012984396",
	WORK_TYPE: process.env.WORK_TYPE || "public",
	SAVE_STATUS: toBool(process.env.SAVE_STATUS || "false"),
	STATUS_REPLY: toBool(process.env.STATUS_REPLY || "false"),
	STATUS_REPLY_MSG: process.env.STATUS_REPLY_MSG || "Nice Status Brother 🦫✨",
	STATUS_REACTION: toBool(process.env.STATUS_REACTION || "false"),
	STATUS_REACTION_EMOJI: process.env.STATUS_REACTION_EMOJI || "🍉,🍓,🎀,💀,💗,📍,🔪,🛒,☠️,🐍,👍🏻",
	WARN_COUNT: process.env.WARN_COUNT || "3"
};
