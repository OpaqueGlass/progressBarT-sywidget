export {
    token,
    includeOs,
    setting,
    language
};
let token = "";//api鉴权token
let includeOs = [];//目前没用
let setting = {
    attrName: "2targetid", //挂件将寻找属性名称（属性名称仅支持英文和数字），请将对应属性值设定为任务列表的块id（后面会补充custom-这里不用写）
    widgetWidth: "50em",//挂件的宽
    widgetHeight: "4em",//挂件的高
    refreshInterval: 0,//自动模式自动刷新间隔（单位：毫秒），由于请求api，请勿设定的时间过短；为0禁用
    onstart: true, //在文档打开时同步一次进度
    // api: false, //使用api统计百分比，编辑时“实时”更新可能导致高频率调用思源API
    manualAttrName: "1progress",//挂件将寻找的属性名称，如需手动模式，请创建对应属性，并设定属性值为要显示的百分比（整数0~100）（后面会补充custom-这里不用写）
    startTimeAttrName: "3start",//挂件将寻找的属性名称，如需时间模式，请创建对应属性，并设定属性值为开始时间（后面会补充custom-这里不用写）
    endTimeAttrName: "4end",//挂件将寻找的属性名称，如需时间模式，请创建对应属性，并设定属性值为结束时间（后面会补充custom-这里不用写）
    saveAttrTimeout: 0, //自动保存百分比延时，单位毫秒，为0则禁用
    timeModeRefreshInterval: 1000 * 60 * 10,//时间模式定时刷新间隔，单位毫秒，为0则禁用
    createBlock: false, //如果块不存在，则创建块
    defaultMode: 0, //-2时间模式 -1自动模式 >=0手动模式
};
let zh_CN = {
    "notTaskList": "不是任务列表块，或块id填写错误。",
    "getKramdownFailed": "通过API获取块失败，请检查块ID是否正确：",
    "unknownIdAtDom": "页面内未找到对应块，将尝试API获取。",
    "cantObserve": "无法实时自动计算进度，需手动点击",
    "autoMode": "当前：自动模式",
    "manualMode": "当前：手动模式",
    "needSetAttr": `未设置目标块id。请在挂件块属性“${setting.attrName}”中填写块id后点击刷新，或直接点击刷新新建块`,
    "saved": "已保存",
    "writeAttrFailed": "保存属性失败",
    "timeMode": "当前：时间模式",
    "timeModeSetError": "时间设定错误，开始时间晚于或等于结束时间",
    "timeSetIllegal": "时间设定错误，时间格式请参考说明文档README.md",
    "timeNotSet": `请在挂件块属性“${setting.startTimeAttrName}”、“${setting.endTimeAttrName}”中创建/设定开始、结束时间`,
    "earlyThanStart": "当前时间早于开始时间",
    "startTime": "",
    "endTime": "",
    "noTimeAttr": `读取挂件属性时发生错误`,
    "autoModeAPI": `当前：自动模式(API)`,//
    "usingAPI": `当前正在使用API自动计算。若未设置间隔刷新，将必须手动点击刷新`,
}
setting["attrName"] = "custom-" + setting["attrName"];
setting["manualAttrName"] = "custom-" + setting["manualAttrName"];
setting["startTimeAttrName"] = "custom-" + setting["startTimeAttrName"];
setting["endTimeAttrName"] = "custom-" + setting["endTimeAttrName"];
let language = zh_CN;