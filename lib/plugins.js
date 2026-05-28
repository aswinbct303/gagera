const {
  HANDLERS,
  WORK_TYPE
} = require("../config.js");
var config = require("../config.js");

///
var sparkymon;
if (config.HANDLERS == "false") {
  sparkymon = '^';
} else {
  sparkymon = config.HANDLERS;
}
var aswin;
if (config.HANDLERS.split('').length > 0x1 && config.HANDLERS.split('')[0x0] === config.HANDLERS.split('')[0x1]) {
  aswin = config.HANDLERS;
} else {
  if (/[-!$%^&*()_+|~=`{}\[\]:";'<>?,.\/]/.test(sparkymon) && sparkymon !== '^') {
    aswin = '^' + '[' + sparkymon + ']';
  } else {
    aswin = sparkymon;
  }
}
if (config.MULTI_HANDLERS && aswin.includes('^[')) {
  aswin = aswin + '?';
}
////
const commands = [];
function Sparky(info, func) {
  const infos = info;
  infos.function = func;
  // Store the raw command name so pair.js can build per-user regexes
  infos._baseName = typeof info.name === 'string' ? info.name : null;
  infos.name = new RegExp(`${aswin}\\s*${info.name}\\s*(?!\\S)(.*)$`, "i");
  if (info['on'] === undefined && info['name'] === undefined) {
    infos.on = 'message';
    infos.fromMe = infos.fromMe || false;
  }
 if (!(infos.name === undefined && infos.name)) {
    infos.dontAddCommandList = false;
  }
  if (infos.on) {
    infos.dontAddCommandList = true;
  }
  // if (infos.dontAddCommandList === true) return;
  // if (infos.dontAddCommandList) return null

  if (!info.category) infos.category = "misc";

  commands.push(infos);
  return infos;
}

const isPublic = WORK_TYPE.toLowerCase() === "private" ? "public" : true && false;
module.exports = {
  commands,
  Sparky,
  isPublic
};