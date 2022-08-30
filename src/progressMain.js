import {
    getKramdown,
    getCurrentWidgetId,
    getblockAttrAPI,
    isValidStr,
    pushMsgAPI,
    insertBlockAPI,
    addblockAttrAPI
} from './API.js';//啊啊啊，务必注意：ios要求大小写一致，别写错
import {language, setting} from './config.js';
/**模式类 */
class Mode {
    modeCode = 100;//模式对应的默认百分比值
    // get modeCode(){
    //     return this._modeCode;
    // }
    //计算和显示百分比
    async calculateApply() {}
    //初始化模式
    async init() {
        g_manualPercentage = this.modeCode;
        console.log("父类填写", g_manualPercentage);
    }
    //退出模式
    async destory() {}
    //点击刷新按钮要执行的操作
    refresh() {}
    constructor(){
    }
}
//手动模式
class ManualMode extends Mode {
    savePercentTimeout;
    modeCode = 0;
    //初始化
    async init(){
        super.init();
        console.log("手动模式初始化");
        g_progressContainerElem = document.getElementById("container");
        //获取点击/拖拽进度条事件
        //实现单击进度条任意位置
        g_progressContainerElem.addEventListener("click", this.eventClickBar);
        //实现：拖拽参考:（Web-once@CSDN） https://blog.csdn.net/qq_42381297/article/details/82595467
        g_progressContainerElem.addEventListener("mousedown", this.eventMousedownBar);
        //完成拖拽
        document.onmouseup = function(){
            clearTimeout(this.savePercentTimeout);
            document.onmousemove=null;
            //延时保存百分比
            if (setting.saveAttrTimeout > 0) this.savePercentTimeout = setTimeout(setManualSetting2Attr, setting.saveAttrTimeout);
        }

        //手动模式禁用动画
        $("#progress").css("transition-duration", "0s");
        //提示词设置
        $("#refresh").addClass("manualMode");
        $("#refresh").attr("title", language["manualMode"]);
        infoPush(language["manualMode"]);
    }
    
    destory(){
        console.log("手动模式删除");
        //离开手动模式启用动画
        $("#progress").css("transition-duration", "300ms");
        //清除绑定的事件，禁用拖拽、点击
        g_progressContainerElem.removeEventListener("click", this.eventClickBar);
        g_progressContainerElem.removeEventListener("mousedown", this.eventMousedownBar);
        document.onmouseup = null;
        //清除延时保存
        clearTimeout(this.savePercentTimeout);
        $("#refresh").removeClass("manualMode");
    }
    //鼠标拖拽点击事件
    eventMousedownBar(event){
        let progressBarElem = document.getElementById("container");
        document.onmousemove = function(e){
            clearTimeout(this.savePercentTimeout);
            let event = e || event;
            // 2.3获取移动的位置
            // event.clientX - oProgress.offsetLeft
            let x = event.clientX - progressBarElem.offsetLeft;
            //拖拽超出边界时重置
            if(x <= 0){
                x = 0;
            }else if (x >= progressBarElem.clientWidth){
                x = progressBarElem.clientWidth;
            }
            changeBar(x / progressBarElem.clientWidth * 100.0);
            g_manualPercentage = x / progressBarElem.clientWidth * 100.0;
            return false;
        }
    }
    //鼠标点击
    eventClickBar(event){
        //offset点击事件位置在点击元素的偏移量，clientWidth进度条显示宽度
        changeBar(event.offsetX / g_progressContainerElem.clientWidth * 100.0);
        g_manualPercentage = (event.offsetX / g_progressContainerElem.clientWidth * 100.0);
        if (setting.saveAttrTimeout > 0) this.savePercentTimeout = setTimeout(setManualSetting2Attr, setting.saveAttrTimeout);
    }
    //点击刷新按钮：保存进度
    async refresh(){
        clearTimeout(this.savePercentTimeout);
        await setManualSetting2Attr();
    }
}

class AutoMode extends Mode {
    modeCode = -1;
    autoRefreshInterval;
    observeClass = new MutationObserver(this.observeRefresh);
    observeNode = new MutationObserver(this.observeRefresh);
    observerTimeout;
    async init(){
        super.init();
        console.log("自动模式初始化")
        //重新读取目标块id
        await readBlockIdFromAttr();
        //设置domobserver
        if (isValidStr(g_targetBlockId)){
            this.__setObserver(g_targetBlockId);
        }
        //启动时自动刷新
        if (setting.onstart){
            await g_mode.calculateApply();
        }
        //设定间隔定时刷新
        if (setting.refreshInterval > 0){
            this.autoRefreshInterval = setInterval(async function(){await g_mode.calculateApply()}, setting.refreshInterval);
        }
        //设定自动模式提示词
        $("#refresh").attr("title", language["autoMode"]);
        infoPush(language["autoMode"]);
    }
    /**
     * 重新计算百分比并更新进度条（自动模式重新计算）
     * 将优先尝试dom计算，若dom无法计算且noAPI = false，则尝试API计算
     * 从指定的块id中获取已经完成的任务（仅第一级）所占百分比
     * @param {boolean} noAPI 不使用API，此选项为true则使用dom重新计算，否则以setting.api设置为准
     */
    async calculateApply(noAPI = false){
        try{
            //判断目标块
            if (!isValidStr(g_targetBlockId)){
                throw new Error(language["needSetAttr"]);
            };
            let percentage;
            //根据设置，从api/dom获得百分比
            percentage = this.calculatePercentageByDom(g_targetBlockId);
            //使用API重试
            if (percentage < 0 && !noAPI){
                percentage = await this.calculatePercentageByAPI(g_targetBlockId);
            }
            if (percentage < 0){
                throw new Error(language["notTaskList"]);
            }
            //更新进度条
            changeBar(percentage);
            }catch(err){
                console.error(err);
                debugPush(err);
            }
    }
    destory(){
        console.log("退出自动")
        this.observeClass.disconnect();
        this.observeNode.disconnect();
        clearInterval(this.autoRefreshInterval);
    }
    /**
    * observer调用的函数，防止多次触发
    */
    observeRefresh(){
        clearTimeout(this.observerTimeout);
        //由于可能高频度触发事件，设定为禁止通过api刷新
        this.observerTimeout = setTimeout(async function(){await g_mode.calculateApply(true);}, 300);
    }
    __setObserver(blockid){
        try{
            this.observeClass.disconnect();
            this.observeNode.disconnect();
            let target = $(window.parent.document).find(`div[data-node-id=${blockid}]`);
            if (target.length <= 0) {
                infoPush(language["unknownIdAtDom"] + blockid, 2000);
                console.log("无法在DOM中找到对应块id");
                return;
            }
            console.assert(target.length == 1, "错误：多个匹配的观察节点");
            //监听任务项class变换，主要是勾选和悬停高亮会影响//副作用：悬停高亮也会触发
            this.observeClass.observe(target[0], {"attributes": true, "attributeFilter": ["class"], "subtree": true});
            //监听任务项新增和删除
            this.observeNode.observe(target[0], {"childList": true});
        }catch(err){
            debugPush(err);
            console.error(err);
        }
    }
    /**
     * 通过dom计算
     * @param {*} blockid 
     * @return 已选事项的百分比
     */
    calculatePercentageByDom(blockid){
        //寻找指定块下的任务项
        let allTasks = $(window.parent.document).find(`div[data-node-id=${blockid}]>[data-marker="*"]`);
        let checkedTasks = $(window.parent.document).find(`div[data-node-id=${blockid}]>.protyle-task--done[data-marker="*"]`);
        if (allTasks.length == 0){
            console.log("DOM找不到对应块，或块类型错误。");
            return -100;
            // throw new Error(language["notTaskList"]);
        }
        //已完成任务列表项计数
        let checkedTasksNum = checkedTasks ? checkedTasks.length : 0;
        return checkedTasksNum / allTasks.length * 100;
    }

    /**
     * 通过任务列表本文计算百分比（通过API）
     * @returns 百分比
     */
    async calculatePercentageByAPI(blockid){
        let kramdown = await getKramdown(blockid);
        if (!isValidStr(kramdown)){
            console.warn("获取kramdown失败", kramdown);
            debugPush(language["getKramdownFailed"] + blockid);
            return 0;//不是块id错误，避免触发autoModeCalculate的错误提示
        }
        let all = kramdown.match(/^\* {.*}\[.\].*$/gm);
        let checked = kramdown.match(/^\* {.*}\[X\].*$/gm);
        if (!all){//找不到（说明块类型有误），返回
            return -100;
        }
        let count = checked ? checked.length : 0;
        return count / all.length * 100;
    }
}
/****************     方法/函数    ***************************/
/**
 * 更改显示的进度条
 * @param {*} percentage 百分比，整数，传入百分之x
 */
function changeBar(percentage){
    let origin = percentage;
    if (percentage >= 100) {
        percentage = 100;
        document.getElementById("progress").style.borderBottomRightRadius = 5 + "px";
        document.getElementById("progress").style.borderTopRightRadius = 5 + "px";
    }else{
        //设定圆角
        document.getElementById("progress").style.borderBottomRightRadius = 0;
        document.getElementById("progress").style.borderTopRightRadius = 0;
    }
    if (percentage < 0) {
        percentage = 0;
    }
    let accuratePercentage = Math.floor(percentage * 100) / 100//下取整（间接保留两位小数）
    let intPercentage = Math.round(origin);//四舍五入取整
    document.getElementById("progress").style.width = accuratePercentage + "%";
    document.getElementById("percentage").innerHTML = intPercentage + "%";
    console.log("进度条进度已刷新", g_thisWidgetId);
}

/**
 * 从属性custom-targetId重设目标块id
 * 无返回值！
 */
async function readBlockIdFromAttr(){
    g_thisWidgetId = getCurrentWidgetId();//获取当前挂件id
    let response = await getblockAttrAPI(g_thisWidgetId);
    if (setting.attrName in response.data){
        let idAttr = response.data[setting.attrName];
        g_targetBlockId =  isValidStr(idAttr) ? idAttr : g_targetBlockId;
    }
}

/**
 * 从属性中获取当前工作模式
 * @returns 手动，当前要显示的百分比，null自动
 */
async function getManualSettingFromAttr(){
    g_thisWidgetId = getCurrentWidgetId();//获取当前挂件id
    let response = await getblockAttrAPI(g_thisWidgetId);
    if (setting.manualAttrName in response.data){
        return parseInt(response.data[setting.manualAttrName]);
    }
    return null;
}

/**
 * 读取属性中时间，并设定时间
 * 属性中时间格式要求yyyy mm dd 或 yyyy mm dd hh mm 或hh mm（自动在执行时补全为当天）
 * 如果为20xx年，允许yy mm dd
 * @return true读取成功 false 读取失败
 */
async function readTimesFromAttr(){
    g_thisWidgetId = getCurrentWidgetId();//获取当前挂件id
    let response = await getblockAttrAPI(g_thisWidgetId);
    if (setting.startTimeAttrName in response.data && setting.endTimeAttrName in response.data){
        //属性原始字符串
        let startimeStr = response.data[setting.startTimeAttrName]
        let endtimeStr = response.data[setting.endTimeAttrName];
        //拆分连续的数字（string）
        let startNums = startimeStr.match(/[0-9]+/gm);
        let endNums = endtimeStr.match(/[0-9]+/gm);
        let nums = [startNums, endNums];
        for (let i = 0; i < nums.length; i++){
            //处理yy mm dd的情况
            if (nums[i].length != 2){
                if (nums[i][0].length == 2){
                    nums[i][0] = "20" + nums[i][0];
                }
            }
            switch (nums[i].length){
                case 3: {//输入格式YYYY MM DD
                    g_times[i] = new Date(nums[i][0], nums[i][1] - 1, nums[i][2]);
                    break;
                }
                case 5: {//输入格式YYYY MM DD HH MM
                    g_times[i] = new Date(nums[i][0], nums[i][1] - 1, nums[i][2], nums[i][i][3], nums[i][4]);
                    break;
                }
                case 2: {//输入格式HH MM
                    g_times[i] = new Date();
                    g_times[i].setHours(nums[i][0]);
                    g_times[i].setMinutes(nums[i][1]);
                    break;
                }
                default: {
                    debugPush(Error(language["parseTimeStrErr"]));
                }
            }
        }
        console.log("get开始时间", g_times[0].toLocaleString());
        console.log("get结束时间", g_times[1].toLocaleString());
        return true;
    }
    console.warn("获取时间属性失败", response);   
    return false;
}

/**
 * 将百分比值设置给属性
 */
async function setManualSetting2Attr(){
    let data = {};
    data[setting.manualAttrName] = g_manualPercentage.toString();
    let response = await addblockAttrAPI(data, g_thisWidgetId);
    if (response == 0){
        console.log("已写入属性", data);
        debugPush(language["saved"], 1500);
    }else{
        debugPush(language["writeAttrFailed"]);
    }
}


function debugPush(msg, timeout = 7000){
    // $(`<p>${msg}</p>`).appendTo("#errorInfo");
    clearTimeout(g_debugPushTimeout);
    $("#errorInfo").text(msg);
    g_debugPushTimeout = setTimeout(()=>{$("#errorInfo").text("");}, timeout)
}

function infoPush(msg, timeout = 5000){
    clearTimeout(g_infoPushTimeout);
    $("#infoInfo").text(msg);
    g_infoPushTimeout = setTimeout(()=>{$("#infoInfo").text("");}, timeout)
}

function modePush(msg=""){
    $("#modeInfo").text(msg);
}

function calculateTimeGap(){
    let totalGap = g_times[1] - g_times[0];
    if (totalGap <= 0){
        debugPush(language["timeModeSetError"]);
        return;
    }
    let nowDate = new Date();
    let passed = nowDate - g_times[0];
    let result = passed / totalGap * 100.0;
    if (result < 0){
        debugPush(language["earlyThanStart"], 3000);
    }else if (result > 100){
        // result = 100;
        // infoPush();
    }
    changeBar(result);
    modePush(`${g_times[0].toLocaleString()} ~ ${g_times[1].toLocaleString()}`);
}

/**
 * 初始化挂件，设置颜色等
 */
async function __init(){
    //读取模式
    g_manualPercentage = await getManualSettingFromAttr();
    g_manualPercentage = g_manualPercentage ? g_manualPercentage : setting.defaultMode;//防止首次启动读取错误
    //设置挂件宽高
    // if (g_manualPercentage == null){
        window.frameElement.style.width = setting.widgetWidth;
        window.frameElement.style.height = setting.widgetHeight;
    // }
    __refreshAppreance();
    //手动模式
    if (g_manualPercentage >= 0){
        changeBar(g_manualPercentage);
        // manualModeInit();
        //手动模式初始化
        g_mode = new ManualMode();
        await g_mode.init();
        return;
    }
    //时间模式
    if (g_manualPercentage == -2){
        $("#refresh").addClass("timeMode");
        if (setting.onstart){
            await timeModeInit();
        }
        return;
    }
    //以下： 仅自动模式
    if (g_manualPercentage == -1){
        g_mode = new AutoMode();
        await g_mode.init();
    }
    // $("#refresh").attr("title", language["autoMode"]);
    // //刷新目标id
    // await readBlockIdFromAttr();
    // //自动模式下启动时刷新
    // if (setting.onstart && g_manualPercentage == -1){
    //     // await autoModeCalculate();
    //     g_mode.calculateApply();
    // }
    // //设定定时刷新
    // if (setting.refreshInterval > 0 && g_manualPercentage == -1){
    //     //TODO 非自动模式清除
    //     setInterval(async function(){await g_mode.calculateApply()}, setting.refreshInterval);
    // }
    // //挂监视，获取dom变化
    // if (isValidStr(g_targetBlockId)){
    //     //TODO 检查非自动模式是否清除
    //     __setObserver(g_targetBlockId);
    // }
}

/**
 * 刷新挂件颜色
 */
function __refreshAppreance(){
    if (window.top.siyuan.config.appearance.mode){
        $("#container").addClass("container_dark");
        $("#progress").addClass("progress_dark");
        $("#percentage, #modeInfo").addClass("text_dark");
    }else{
        $("#container").removeClass("container_dark");
        $("#progress").removeClass("progress_dark");
        $("#percentage, #modeInfo").removeClass("text_dark");
    }
}

/**
 * 手动点击刷新（button按下后事件）
 * 没有块则创建块！
 */
async function __refresh(){
    try{
        //从挂件中读取id
        await readBlockIdFromAttr();
        //如果为手动模式，保存百分比
        if (g_manualPercentage >= 0){
            // clearTimeout(g_savePercentTimeout);
            // await setManualSetting2Attr();
            g_mode.refresh();
            return;
        }

        if (g_manualPercentage == -2){
            await timeModeInit();
            return;
        }
        //没有块则创建块
        if (!isValidStr(g_targetBlockId)){
            let tempId = await insertBlockAPI("- [ ] ", g_thisWidgetId);
            if (isValidStr(tempId)){
                g_targetBlockId = tempId;
                let data = {};
                data[setting.attrName] = g_targetBlockId;
                let response = await addblockAttrAPI(data, g_thisWidgetId);
                if (response != 0){
                    throw Error(language["writeAttrFailed"]);
                }
            }
        }
        await g_mode.calculateApply();
    }catch(err){
        console.error(err);
        debugPush(err);
    }
}

/**
 * 时间模式初始化
 */
async function timeModeInit(){
    clearInterval(g_timeRefreshInterval);
    //有时间才能计算
    if (await readTimesFromAttr()){
        if (setting.timeModeRefreshInterval > 0){
            g_timeRefreshInterval = setInterval(() => {
                calculateTimeGap();
            }, setting.timeModeRefreshInterval);
        }
        calculateTimeGap();
    }
}

/**
 * 时间模式退出清理自动项目
 */
function timeModeDestory(){
    clearInterval(g_timeRefreshInterval);
    $("#refresh").removeClass("timeMode");
}


/**
 * 双击刷新按钮切换模式
 */
async function dblClickChangeMode(){
    clearTimeout(g_refreshBtnTimeout);
    modePush();//清除上个模式的提示信息
    if (g_manualPercentage == -1){//如果当前为自动模式，则切换为时间模式
        g_manualPercentage = -2;
        setManualSetting2Attr();
        //退出自动模式
        g_mode.destory();
        //进入时间模式
        timeModeInit();
        $("#refresh").addClass("timeMode");
        $("#refresh").attr("title", language["timeMode"]);
        infoPush(language["timeMode"]);
    }else if (g_manualPercentage >= 0){//如果当前为手动模式，则切换为自动模式
        //设置属性：切换为自动模式，移除事件listener
        g_manualPercentage = -1;
        setManualSetting2Attr();
        //退出手动模式
        // manualModeDestory();
        g_mode.destory();
        g_mode = new AutoMode();
        await g_mode.init();
        
    }else if (g_manualPercentage <= -2){//如果当前为时间模式，则切换为手动模式
        g_manualPercentage = 0;//切换为手动模式
        setManualSetting2Attr();//保存模式设定
        //退出时间模式
        timeModeDestory();
        //进入手动模式
        g_mode = new ManualMode();
        await g_mode.init();
    }
}

/**
 * 单击刷新按钮
 */
async function clickManualRefresh(){
    clearTimeout(g_refreshBtnTimeout);
    g_refreshBtnTimeout = setTimeout(__refresh, 300);
};
/******************     非函数部分       ************************ */

let g_targetBlockId;//目标任务列表块id
let g_refreshBtnTimeout;//防止多次刷新、区分刷新点击数延时
let g_thisWidgetId;
let g_debugPushTimeout;//推送消失延时
let g_infoPushTimeout;//通知推送消失延时
let g_manualPercentage = null;//手动模式下百分比，注意，负值用于区分为自动模式
let g_progressElem = document.getElementById("progress");
let g_progressContainerElem = document.getElementById("container");
let g_times = [null, null];//0开始时间，1结束时间
let g_timeRefreshInterval;
let g_mode;

try{
    //绑定按钮事件
    //单击，手动刷新
    document.getElementById("refresh").onclick = clickManualRefresh;
    //双击：切换模式
    document.getElementById("refresh").ondblclick = dblClickChangeMode;
    await __init();
}catch (err){
    debugPush(err);
    console.error(err);
}
