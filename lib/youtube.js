const axios = require("axios");
const cheerio = require("cheerio");
const {
  getJson
} = require("../plugins/pluginsCore");

const validQueryDomains = new Set([
    'youtube.com',
    'www.youtube.com',
    'm.youtube.com',
    'music.youtube.com',
    'gaming.youtube.com',
  ]);

  const validPathDomains = /^https?:\/\/(youtu\.be\/|(www\.)?youtube\.com\/(embed|v|shorts)\/)/;
  const getURLVideoID = link => {
    const parsed = new URL(link.trim());
    let id = parsed.searchParams.get('v');
    if (validPathDomains.test(link.trim()) && !id) {
      const paths = parsed.pathname.split('/');
      id = parsed.host === 'youtu.be' ? paths[1] : paths[2];
    } else if (parsed.hostname && !validQueryDomains.has(parsed.hostname)) {
      throw Error('Not a YouTube domain');
    }
    if (!id) {
      throw Error(`No video id found: "${link}"`);
    }
    id = id.substring(0, 11);
    return id;
  };
  
const YtInfo = async (url) => {
  try {
    const videoId = getURLVideoID(url);
    const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const response = await axios.get(oEmbedUrl);
    const data = response.data;

    return {
      title: data.title,
      thumbnail: data.thumbnail_url,
      author: data.author_name,
      videoId: videoId
    };
  } catch (error) {
    return false; 
  }
};

async function yts(query) {
  try {
    const response = await axios.get("https://m.youtube.com/results?search_query=" + encodeURIComponent(query), {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36",
      },
    });

    const html = response.data;
    const $ = cheerio.load(html);

    let ytInitialData;
    $("script").each((_, element) => {
      const scriptContent = $(element).html();
      if (scriptContent && scriptContent.includes("var ytInitialData =")) {
        const jsonStr = scriptContent
          .replace(/^var ytInitialData = /, "")
          .replace(/;$/, "");
        ytInitialData = JSON.parse(jsonStr);
      }
    });
    if (!ytInitialData) {
      throw new Error("Failed to parse YouTube data.");
    }
    const results = [];
    const content = ytInitialData.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
    const items = content[0]?.itemSectionRenderer?.contents || [];
    items.forEach((item) => {
      const itemType = Object.keys(item)[0];
      const data = item[itemType];
      if (itemType === "videoRenderer") {
        results.push({
          title: data.title?.runs[0]?.text,
          videoId: data.videoId,
          url: `https://youtu.be/${data.videoId}`,
          image: data.thumbnail?.thumbnails?.pop()?.url,
          thumbnail: data.thumbnail?.thumbnails?.pop()?.url,
          duration: data.lengthText?.simpleText,
          views: data.viewCountText?.simpleText,
          publishedTime: data.publishedTimeText?.simpleText,
          author: data.ownerText?.runs[0]?.text,
        });
      }
    });

    return results;  
  } catch (error) {
    console.error("Error in ytsearch:", error);
    return [];  
  }
}

async function ytv(url) {
  try {
    let data = await getJson(`https://api-aswin-sparky.koyeb.app/api/downloader/ytv?url=${url}`);
    return data.data.url;
  } catch (error) {
    console.error("Error fetching audio:", error);
    throw error; // rethrow the error for further handling
  }
}

async function yta(url) {
  try {
    let data = await getJson(`https://api-aswin-sparky.koyeb.app/api/downloader/song?search=${url}`);
    return data.data.url;
  } catch (error) {
    console.error("Error fetching audio:", error);
    throw error; // rethrow the error for further handling
  }
}

async function spdl(url) {
  try {
    let data = await getJson(`https://api-aswin-sparky.koyeb.app/api/downloader/spotify?url=${url}`);
    return data.data.download;
  } catch (error) {
    console.error("Error fetching audio:", error);
    throw error; // rethrow the error for further handling
  }
}

module.exports = {
  YtInfo,
  yts,
  ytv,
  yta,
  spdl
};
