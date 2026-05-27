const fileType = require('file-type');
const FormData = require('form-data');
const fetch = require('node-fetch');
const fs = require("fs");
const axios = require("axios");
const config = require("../config");

const MAX_FILE_SIZE_MB = 200; // Maximum file size

async function uploadMedia(buffer) {
  try {
    const { ext } = await fileType.fromBuffer(buffer);
    const bodyForm = new FormData();
    bodyForm.append("fileToUpload", buffer, "file." + ext);
    bodyForm.append("reqtype", "fileupload");

    const res = await fetch("https://catbox.moe/user/api.php", {
      method: "POST",
      body: bodyForm,
    });

    if (!res.ok) {
      throw new Error(`Upload failed with status ${res.status}: ${res.statusText}`);
    }

    const data = await res.text();
    return data;
  } catch (error) {
    console.error("Error during media upload:", error);
    throw new Error('Failed to upload media');
  }
}

async function handleMediaUpload(mediaBuffer) {
  try {
    // Check the file size
    const fileSizeMB = mediaBuffer.length / (1024 * 1024);
    if (fileSizeMB > MAX_FILE_SIZE_MB) {
      return `File size exceeds the limit of ${MAX_FILE_SIZE_MB}MB.`;
    }

    // Upload the media (replace with your actual upload logic)
    const mediaUrl = await uploadMedia(mediaBuffer); // Replace with actual upload logic

    return mediaUrl;
  } catch (error) {
    console.error('Error handling media upload:', error);
    throw new Error('Failed to handle media upload');
  }
}

const FILE = "./chatMemory.json";
function loadMemory() {
  try {
    if (!fs.existsSync(FILE)) return {};
    const data = fs.readFileSync(FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.log("Memory corrupted. Resetting...");
    return {};
  }
}
function saveMemory(data) {
  fs.writeFileSync(FILE + ".tmp", JSON.stringify(data, null, 2));
  fs.renameSync(FILE + ".tmp", FILE);
}

function addMessage(id, role, content) {
  const memory = loadMemory();

  if (!memory[id]) memory[id] = [];
  memory[id].push({ role, content });

  if (memory[id].length > 10)
    memory[id] = memory[id].slice(-10);

  saveMemory(memory);
}

function getMessages(id) {
  const memory = loadMemory();
  return memory[id] || [];
}

async function askGroq(prompt) {
  try {
    const result = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.1-8b-instant",
        messages: prompt
      },
      {
        headers: {
          Authorization: `Bearer ${config.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    return result.data.choices[0].message.content;
  } catch (err) {
    console.log("Groq error:", err.response?.data || err.message);
    throw new Error(err.response?.data || err.message);
  }
}


module.exports = {
  uploadMedia,
  handleMediaUpload,
  addMessage,
  getMessages,
  askGroq
};