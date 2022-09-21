export {
    token,
    includeOs,
    setting,
    language,
    defaultAttr
};
let token = "";//api鉴权token
let includeOs = [];//目前没用
let defaultAttr = {//挂件创建时默认属性设定
    percentage: -1, //挂件被创建时默认的模式。-2时间模式 -1自动模式 >=0手动模式
    targetid: "null",//更改此设定无意义，请勿修改
    start: "null",//更改此设定无意义，请勿修改
    end: "null",//更改此设定无意义，请勿修改
    frontColor: "rgb(45, 164, 78)",//进度条前景色对应的属性默认值（关于默认进度条颜色background，也可修改css，但这里一旦设定优先级更高）
    backColor: "rgba(175, 184, 193, 0.2)",//进度条背景色对应的属性默认值
    alltask: false,//计算子任务进度默认值。认为所有任务（包括子任务）的权重相同，统计所有任务完成的进度，而不只是第一层级
    hideInfo: true,//自动、手动模式不显示提示信息（错误信息仍然显示），只留下进度条和刷新按钮;此设置更改只在挂件重新载入后生效
    barWidth: 10,//进度条高度，单位px像素
    frontColorSelector: {//前景色颜色选择器配置
        value: 'rgba(51,153,255,0.5)',
        position: 'bottom',
        height: 80,
        backgroundColor: '#333',
        palette: 'rgba(0,0,0,0) #2da44eff #f1993eff #0080cfff #cb406cff #ff5454ff #af481bff #269affff',
        paletteCols: 11,
        hideOnPaletteClick: true
    },
    backColorSelector: {//背景色颜色选择器配置
        value: 'rgba(51,153,255,0.5)',
        position: 'bottom',
        height: 80,
        backgroundColor: '#333',
        palette: 'rgba(176,176,176,0.2) #e9d7c740 #dbe4e540 rgba(175,184,193,0.2) rgba(255, 231, 231, 0.25) #ffe438 #88dd20 #22e0cd #269aff #bb1cd4',
        paletteCols: 11, hideOnPaletteClick: true
    }
}
let setting = {
    widgetWidth: "50em",//挂件的宽
    widgetHeight: "4.3em",//挂件的高
    widgetBarOnlyHeight: "3em",//只显示进度条和刷新按钮时，挂件的高
    refreshInterval: 0,//自动模式自动刷新间隔（单位：毫秒），由于请求api，请勿设定的时间过短；为0禁用
    onstart: true, //在挂件被加载时同步一次进度
    manualAttrName: "1progress",//百分比/模式对应的属性名称（只接受英文（最好是小写）、数字，后面会补充custom-这里不用写，下同）
    autoTargetAttrName: "2targetid", //任务列表块id对应的属性名称
    startTimeAttrName: "3start",//开始时间对应的属性名称
    endTimeAttrName: "4end",//结束时间对应的属性名称
    frontColorAttrName: "5frontcolor",//进度条前景色对应的属性名称
    backColorAttrName: "6backcolor",//进度条背景色对应的属性名称
    taskCalculateModeAttrName: "7alltask",//自动模式统计任务范围对应的属性名称
    hideInfoAttrName: "8hideinfo",//在自动模式、手动模式隐藏提示词和按钮（后面会补充custom-这里不用写，同上）
    barWidthAttrName: "width", //进度条高度//devwarn新建属性，下面要补全custom-
    saveAttrTimeout: 1000 * 0.5, //手动模式：在操作进度条后自动保存百分比的延迟时间，单位毫秒，为0则禁用自动保存
    timeModeRefreshInterval: 1000 * 60 * 10,//时间模式定时刷新间隔，单位毫秒，请勿设定的时间过短；为0则禁用
    createBlock: false, //如果块不存在，则创建块
    updateForSubNode: true,//在子任务增删时更新进度(beta)，此选项开启后，可能出现性能问题，建议关闭
};
let zh_CN = {
    "notTaskList": "不是任务列表块，或块id填写错误。",
    "getKramdownFailed": "通过API获取块失败，请检查块ID是否正确：",
    "unknownIdAtDom": "页面内未找到对应块，正尝试API获取。",
    "cantObserve": "页面内未找到对应块，无法自动触发进度计算",
    "setObserveErr": "内部错误，无法自动触发进度计算",
    "autoMode": "当前：自动模式",
    "manualMode": "当前：手动模式",
    "needSetAttr": `未设置目标块id且未在紧邻块发现任务列表。请在挂件下方/上方创建任务列表，或在挂件块属性“${setting.autoTargetAttrName}”中填写块id后点击刷新${setting.createBlock ? "，或直接点击刷新新建块" : ""}`,
    "saved": "已保存",
    "writeAttrFailed": "保存失败，写入属性失败",
    "timeMode": "当前：时间模式",
    "timeModeSetError": "时间设定错误，开始时间晚于或等于结束时间",
    "timeSetIllegal": "时间设定错误，时间格式请参考说明文档README.md",
    "timeNotSet": `请在挂件块属性“${setting.startTimeAttrName}”、“${setting.endTimeAttrName}”中设定开始、结束时间`,
    "earlyThanStart": "当前时间早于开始时间",
    "startTime": "",
    "endTime": "",
    "noTimeAttr": `读取挂件属性时发生错误`,
    "autoModeAPI": `当前：自动模式(API)`,//
    "usingAPI": `当前正在使用API自动计算。若未设置间隔刷新，则必须手动点击刷新。`,
    "autoModeFnBtn": "取消全部/完成全部",
    "autoDetectId": "",//"已自动定位临近的任务列表",
    "frontColorText": "前景色设定：",
    "backColorText": "背景色设定：",
    "barWidthText": "进度条高度：",
    "saveBtnText": "保存",
}
let language = zh_CN;

setting["autoTargetAttrName"] = "custom-" + setting["autoTargetAttrName"];
setting["manualAttrName"] = "custom-" + setting["manualAttrName"];
setting["startTimeAttrName"] = "custom-" + setting["startTimeAttrName"];
setting["endTimeAttrName"] = "custom-" + setting["endTimeAttrName"];
setting["frontColorAttrName"] = "custom-" + setting["frontColorAttrName"];
setting["backColorAttrName"] = "custom-" + setting["backColorAttrName"];
setting["taskCalculateModeAttrName"] = "custom-" + setting["taskCalculateModeAttrName"];
setting["hideInfoAttrName"] = "custom-" + setting["hideInfoAttrName"];
setting["barWidthAttrName"] = "custom-" + setting["barWidthAttrName"];