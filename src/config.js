export {
    token,
    includeOs,
    setting,
    language
};
let token = "";//api鉴权token
let includeOs = [];//目前没用
let setting = {
    attrName: "custom-targetid", //挂件将寻找属性名称，请将对应属性值设定为块id。注意，自定义属性以custom-开头，但软件中不显示custom-
    widgetWidth: "50em",//挂件的宽
    widgetHeight: "4em",//挂件的高
    refreshInterval: 0,//自动刷新间隔（单位：毫秒），由于请求api，请勿设定的时间过短；为0禁用
    onstart: true, //在文档打开时同步一次进度
    api: false, //使用api统计百分比，编辑时“实时”更新可能导致高频率调用思源API
    manualAttrName: "custom-percentage",//挂件将寻找的属性名称，如需手动模式，请创建对应属性，并设定属性值为要显示的百分比（整数0~100）
    startTimeAttrName: "custom-starttime",
    endTimeAttrName: "custom-endtime",
    saveAttrTimeout: 10000, //自动保存百分比延时，单位毫秒
    timeModeRefreshInterval: 1000,//时间模式定时刷新间隔，单位毫秒，为0则禁用
    createBlock: false, //如果块不存在，则创建块
    
};

let zh_CN = {
    "notTaskList": "不是任务列表块，或块id填写错误。",
    "getKramdownFailed": "通过API获取块失败，请检查块ID是否正确。",
    "unknownIdAtDom": "页面内未找到对应块，将尝试API获取。",
    "autoMode": "当前：自动模式",
    "manualMode": "当前：手动模式",
    "needSetAttr": `未设置目标块id。请再次点击刷新新建块，或者在挂件块属性${setting.attrName}中填写块id`,
    "saved": "已保存",
    "writeAttrFailed": "保存属性失败",
    "parseTimeStrErr": "时间字符串解析失败",
    "timeMode": "当前：时间模式",
    "timeModeSetError": "时间设定错误，开始时间晚于或等于结束时间",
    "earlyThanStart": "当前时间早于开始时间",
    "startTime": "",
    "endTime": "",
}

let language = zh_CN;