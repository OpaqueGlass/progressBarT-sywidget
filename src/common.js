
// debug push
let g_DEBUG = 2;
const g_NAME = "progress";
const g_FULLNAME = "进度条T";

function pushDebug(text) {
    let areaElem = document.getElementById("debugArea");
    if (areaElem) {
        areaElem.value = areaElem.value + `\n${new Date().toLocaleTimeString()}` + text;
        areaElem.scrollTop = areaElem.scrollHeight;
    }
}

/*
LEVEL 0 忽略所有
LEVEL 1 仅Error
LEVEL 2 Err + Warn
LEVEL 3 Err + Warn + Info
LEVEL 4 Err + Warn + Info + Log
LEVEL 5 Err + Warn + Info + Log + Debug
*/
function commonPushCheck() {
    if (window.top["OpaqueGlassDebugV2"] == undefined || window.top["OpaqueGlassDebugV2"][g_NAME] == undefined) {
        return g_DEBUG;
    }
    return window.top["OpaqueGlassDebugV2"][g_NAME];
}

export function debugPush(str, ...args) {
    pushDebug(str);
    if (commonPushCheck() >= 5) {
        console.debug(`${g_FULLNAME}[D] ${new Date().toLocaleString()}  ${str}`, ...args);
    }
}

export function logPush(str, ...args) {
    pushDebug(str);
    if (commonPushCheck() >= 4) {
        console.log(`${g_FULLNAME}[L] ${new Date().toLocaleString()} ${str}`, ...args);
    }
}

export function errorPush(str, ... args) {
    if (commonPushCheck() >= 1) {
        console.error(`${g_FULLNAME}[E] ${new Date().toLocaleString()} ${str}`, ...args);
    }
}

export function warnPush(str, ... args) {
    if (commonPushCheck() >= 2) {
        console.warn(`${g_FULLNAME}[W] ${new Date().toLocaleString()} ${str}`, ...args);
    }
}