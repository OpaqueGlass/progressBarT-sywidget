export {
    token, includeOs, setting, language, defaultAttr, attrName, attrSetting
};
let token = "";//api鉴权token
let includeOs = [];//目前没用
let defaultAttr = {//挂件创建时默认属性设定
    percentage: -1, //挂件被创建时默认的模式。-2时间模式 -1自动模式 >=0手动模式
    targetid: "null",//更改此设定无意义，请勿修改
    start: "null",// 开始时间默认值，更改此项可能意义不大
    end: "null",// 结束时间默认值，更改此项可能意义不大
    frontColor: "rgba(45, 164, 78, 1)",//进度条前景色对应的属性默认值
    backColor: "rgba(175, 184, 193, 0.2)",//进度条背景色对应的属性默认值
    alltask: false,//计算子任务进度默认值。认为所有任务（包括子任务）的权重相同，统计所有任务完成的进度，而不只是第一层级
    barWidth: 10,//进度条高度，单位px像素
    frontColorSelector: {//前景色颜色选择器配置（jscolor）（若在custom.js中设置此项，需包含其下的所有设置）
        value: 'rgba(51,153,255,0.5)',//好像实际上没用到
        position: 'bottom',
        height: 80,
        backgroundColor: '#333',
        palette: 'rgba(0,0,0,0) #2da44eff #f1993eff #0080cfff #cb406cff #ff5454ff #af481bff #269affff',//预设颜色组
        paletteCols: 11,
        hideOnPaletteClick: true
    },
    backColorSelector: {//背景色颜色选择器配置（若在custom.js中设置此项，需包含其下的所有设置）
        value: 'rgba(51,153,255,0.5)',
        position: 'bottom',
        height: 80,
        backgroundColor: '#333',
        palette: 'rgba(176,176,176,0.2) #e9d7c740 #dbe4e540 rgba(175,184,193,0.2) rgba(255, 231, 231, 0.25) #ffe438 #88dd20 #22e0cd #269aff #bb1cd4',//预设颜色组
        paletteCols: 11, hideOnPaletteClick: true
    }
}
//在此自定义属性名称（只接受英文（最好是小写）、数字，后面会补充custom-这里不用写）
let attrName = {
    manual: "1progress",//百分比/模式对应的属性名称
    autoTarget: "2targetid", //任务列表块id对应的属性名称
    startTime: "3start",//开始时间对应的属性名称
    endTime: "4end",//结束时间对应的属性名称
    frontColor: "5frontcolor",//进度条前景色对应的属性名称
    backColor: "6backcolor",//进度条背景色对应的属性名称
    taskCalculateMode: "7alltask",//自动模式统计任务范围对应的属性名称
    barWidth: "6width", //进度条高度
    basicSetting: "pgbtconfig", //进度条基础设定
}
let attrSetting = {
    
}
let setting = {
    widgetWidth: "50em",//挂件的宽
    widgetHeight: "4.3em",//挂件的高
    widgetBarOnlyHeight: "3em",//只显示进度条和刷新按钮时，挂件的高
    refreshInterval: 0,//自动模式自动刷新间隔（单位：毫秒），由于请求api，请勿设定的时间过短；为0禁用
    onstart: true, //在挂件被加载时同步一次进度
    saveAttrTimeout: 1000 * 0.5, //手动模式：在操作进度条后自动保存百分比的延迟时间，单位毫秒，为0则禁用自动保存
    timeModeRefreshInterval: 1000 * 60 * 10,//时间模式定时刷新间隔，单位毫秒，请勿设定的时间过短；为0则禁用
    createBlock: false, //如果块不存在，则创建块
    updateForSubNode: true,//在子任务增删时更新进度(beta)，此选项开启后，可能出现性能问题，建议关闭
    showGapDay: true, // 时间模式显示日期间隔天数
    showButtons: false, // 在进度条右侧展示刷新和设置按钮
    saveDefaultHeight: true, // 挂件默认高度记忆（加载时将默认宽高写入文档，以减少载入文档时挂件高度变化）
};
let zh_CN = {
    "notTaskList": "不是任务列表块，或块id填写错误。（若为无序、任务混合列表，请勾选统计子任务后再试）",
    "getKramdownFailed": "通过API获取块失败，请检查块ID是否正确：",
    "unknownIdAtDom": "页面内未找到对应块，正尝试API获取。",
    "cantObserve": "页面内未找到对应块，无法自动触发进度计算",
    "setObserveErr": "内部错误，无法自动触发进度计算",
    "autoMode": "当前：自动模式",
    "manualMode": "当前：手动模式",
    "needSetAttr": `未设置目标块id且未在紧邻块发现列表，请创建任务列表或设定id。`,
    "saved": "已保存",
    "writeAttrFailed": "保存失败，写入属性失败",
    "writeHeightInfoFailed": "记忆挂件宽高设定失败",
    "timeMode": "当前：时间模式",
    "timeModeSetError": "时间设定错误，开始时间晚于或等于结束时间",
    "timeSetIllegal": "时间设定错误，时间格式请参考说明文档README.md",
    "timeNotSet": `未设定开始时间或结束时间`,
    "earlyThanStart": "当前时间早于开始时间",
    "startTime": "",
    "endTime": "",
    "noTimeAttr": `读取挂件属性时发生错误`,
    "autoModeAPI": `当前：自动模式(API)`,//
    "usingAPI": `当前正在使用API自动计算。若未设置间隔刷新，则必须手动点击刷新。`,
    "autoModeFnBtn": "取消全部/完成全部",
    "autoDetectId": "已自动定位临近的列表",
    "frontColorText": "前景色设定：",
    "backColorText": "背景色设定：",
    "barWidthText": "进度条高度：",
    "saveBtnText": "保存外观",
    "saveSettingText": "保存设置",
    "startTimeText": "开始时间：",
    "endTimeText": "结束时间：",
    "allTaskText": "统计子任务：",
    "blockIdText": "任务列表块id：",
    "changeModeText": "切换模式",
    "refreshed": "已刷新"
}

let language = zh_CN;
// let lang = window.top.siyuan.config.lang;
// 测试中的外部json语言配置文件读入，但再开个语言文件意义不大，废弃中
// language = await getLanguageFile(`/widgets/progress-dev/lang/${lang}.json`).catch(async(error)=>{
//     language = await getLanguageFile("/widgets/progress-dev/lang/zh_CN.json")
// });                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     

//补充属性名的custom-
for (let attr in attrName){
    attrName[attr] = "custom-" + attrName[attr];
}

// 导入外部config.js 测试功能
try {
    let allCustomConfig = await import('/widgets/custom.js');
    let customConfig = null;
    let customConfigName = "progressBarT";
    if (allCustomConfig[customConfigName] != undefined) {
        customConfig = allCustomConfig[customConfigName];
    }else if (allCustomConfig.config != undefined && allCustomConfig.config[customConfigName] != undefined) {
        customConfig = allCustomConfig.config[customConfigName];
    }
    // 导入token
    if (allCustomConfig.token != undefined) {
        token = allCustomConfig.token;
    }else if (allCustomConfig.config != undefined && allCustomConfig.config.token != undefined) {
        token = allCustomConfig.config.token;
    }
    
    // 仅限于config.setting/config.defaultAttr下一级属性存在则替换，深层对象属性将完全覆盖
    if (customConfig != null) {
        if ("setting" in customConfig) {
            for (let key in customConfig.setting) {
                if (key in setting) {
                    setting[key] = customConfig.setting[key];
                }
            }
        }

        if ("defaultAttr" in customConfig) {
            for (let key in customConfig.defaultAttr) {
                if (key in defaultAttr) {
                    defaultAttr[key] = customConfig.defaultAttr[key];
                }
            }
        }
        
    }
    
}catch (err) {
    console.warn("导入用户自定义设置时出现错误", err);
}

async function getLanguageFile(url) {
    let result;
    await fetch(url).then((response) => {
        result = response.json();
    });
    return result;
}