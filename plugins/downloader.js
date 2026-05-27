const { Sparky, isPublic, spdl, askGroq, addMessage, getMessages } = require("../lib");
const { getJson, extractUrlsFromText, getString, isUrl } = require("./pluginsCore");
const axios = require('axios');
const fetch = require('node-fetch');
const gis = require("g-i-s");
const config = require("../config.js");
const lang = getString('download');


Sparky(
    {
        name: "insta",
        fromMe: isPublic,
        desc: "Instagram media downloader - download images and videos from Instagram",
        category: "downloader",
    },
    async ({
        m, client, args
    }) => {
        args = args || m.quoted?.text;
        if (!args) return await m.reply(lang.NEED_URL);
        //if (isUrl(args)) return await m.reply(lang.NOT_URL);
        try {
            await m.react('⬇️');
            let response = await getJson(config.API + "/api/downloader/igdl?url=" + args);
            for (let i of response.data) {
                await m.sendMsg(m.jid, i.url, { quoted: m }, i.type)
            }
            await m.react('✅');
        } catch (e) {
            console.log(e);
            await m.react('❌');
        }
    }
);

Sparky({
    name: "sparky",
    fromMe: isPublic,
    category: "misc",
    desc: "AI chat with memory"
},
async ({ m, args }) => {
    if(!config.GROQ_API_KEY) return m.reply("_Please provide a grok api key_");
    args = args || m.quoted?.text;
    if (!args) return m.reply("_Hi this is Sparky Your Ai. Assistant How can i help you?_");

    try {
        const chatId = m.jid;
        let history = getMessages(chatId) || [];
        history = history
            .filter(msg => msg && msg.role && msg.content)
            .map(msg => ({
                role: msg.role,
                content: String(msg.content)
            }))
        const messages = [
            {
                role: "system",
                content: "You are Sparky, a helpful WhatsApp AI assistant."
            },
            ...history,
            { role: "user", content: args }
        ];
        addMessage(chatId, "user", args);
        const getResult = await askGroq(messages);
        addMessage(chatId, "assistant", getResult);
        return m.reply(getResult);
    } catch (err) {
        console.log("ERROR:", err.message);
        return m.reply("AI broke ☠️");
    }
});

Sparky({
    name: "pintrest",
    fromMe: isPublic,
    category: "downloader",
    desc: "Download images and content from Pinterest",
},
async ({
    m, client, args
}) => {
    try {
        let match = args || m.quoted?.text;
        if (!match) return await m.reply(lang.NEED_URL);
        await m.react('⬇️');
        //if (!match.includes("pin.it")) return await m.reply("_Please provide a valid Pinterest URL_");
        const result = await getJson(config.API + "/api/downloader/pin?url=" + match);
        await m.sendFromUrl(result.data.url, { caption: result.data.created_at });
        await m.react('✅');
    } catch (error) {
        await m.react('❌');
        console.error(error);
    }
});

Sparky({
    name: "fb",
    fromMe: isPublic,
    category: "downloader",
    desc: "Download files from Facebook by providing a valid URL",
},
async ({
    m, client, args
}) => {
    try {
        let match = args || m.quoted?.text;
        if (!match) return await m.reply(lang.NEED_URL);
        await m.react('⬇️');
        const data = await getJson(config.API + "/api/downloader/fbdl?url=" + match);
        await m.sendFromUrl(data.data.high, { caption: data.data.title });
        await m.react('✅');
    } catch (error) {
        await m.react('❌');
        return m.reply(error);
    }
});

Sparky({
    name: "spotify",
    fromMe: isPublic,
    category: "downloader",
    desc: "play a song"
  },
  async ({
    m, client, args
  }) => {
    try {
        args = args || m.quoted?.text;
        if(!args) return await m.reply(lang.NEED_Q);
  await m.react('🔎');
  const ser = await getJson(config.API + "/api/search/spotify?search=" + args)
  const play = ser.data[0];
        await m.react('⬇️');
        await m.reply(`_Downloading ${play.name} By ${play.artists}_`)
  const url = await spdl(play.link);
  await m.sendMsg(m.jid , url, { mimetype: "audio/mpeg" } , "audio")
   await m.react('✅');     
    } catch (error) {
        await m.react('❌');
        m.reply(error);
    }
  });

  Sparky({
    name: "spotifydl",
    fromMe: isPublic,
    category: "downloader",
    desc: "play a song"
  },
  async ({
    m, client, args
  }) => {
    try {
        args = args || m.quoted?.text;
        if(!args) return await m.reply(lang.NEED_URL);
        await m.react('⬇️');
  const url = await spdl(args);
  await m.sendMsg(m.jid , url, { mimetype: "audio/mpeg" } , "audio")
   await m.react('✅');     
    } catch (error) {
        await m.react('❌');
        m.reply(error);
    }
  });


Sparky({
    name: "gitclone",
    fromMe: isPublic,
    category: "downloader",
    desc: "Download GitHub repositories as ZIP files",
},
async ({
    m, client, args
}) => {
    try {
        let match = args || m.quoted?.text;
        if (!isUrl(match)) return await m.reply(lang.NEED_URL)
        await m.react('⬇️');
        let user = match.split("/")[3];
        let repo = match.split("/")[4];
        const msg = await m.reply(lang.DOWNLOADING);
        await client.sendMessage(m.jid, {
            document: {
                url: `https://api.github.com/repos/${user}/${repo}/zipball`
            },
            fileName: repo,
            mimetype: "application/zip"
        }, {
            quoted: m
        });
        await m.react('✅');
    } catch (error) {
        await m.react('❌');
        console.error(error);
    }
});
