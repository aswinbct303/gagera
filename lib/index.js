const {commands, Sparky, isPublic, plugins} = require('./plugins');
const {YtInfo, yts, yta, ytv, spdl} = require('./youtube.js');
const {serialize} = require('./serialize');
const {whatsappAutomation, callAutomation} = require('./whatsappController');
const {uploadMedia,handleMediaUpload,addMessage,getMessages,askGroq} = require("./tools");
const { getEffectiveConfig, updateUserConfig, updateUserConfigs, getFormattedSettings } = require('./userConfig');
const { connectDatabase, getConnectionStatus } = require('./database');
global.owner = ["917012984396"];

module.exports = {
    commands, Sparky, YtInfo, yts, yta, ytv, spdl, isPublic, serialize, 
    whatsappAutomation, callAutomation, uploadMedia, handleMediaUpload, addMessage, getMessages, askGroq,
    getEffectiveConfig, updateUserConfig, updateUserConfigs, getFormattedSettings,
    connectDatabase, getConnectionStatus
};