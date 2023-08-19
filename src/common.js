
// debug push
let g_DEBUG = 2;
const g_NAME = "progress";
const g_FULLNAME = "进度条T";

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
        console.debug(`${g_FULLNAME}[D]  ${str}`, ...args);
    }
}

export function logPush(str, ...args) {
    pushDebug(str);
    if (commonPushCheck() >= 4) {
        console.log(`${g_FULLNAME}[L] ${str}`, ...args);
    }
}

export function errorPush(str, ... args) {
    if (commonPushCheck() >= 1) {
        console.error(`${g_FULLNAME}[E] ${str}`, ...args);
    }
}

export function warnPush(str, ... args) {
    if (commonPushCheck() >= 2) {
        console.warn(`${g_FULLNAME}[W] ${str}`, ...args);
    }
}