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

/**
 * 更改显示的进度条
 * @param {*} percentage 百分比，整数，传入百分之x
 */
function changeBar(percentage){
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
    let intPercentage = Math.round(percentage);//四舍五入取整
    document.getElementById("progress").style.width = accuratePercentage + "%";
    document.getElementById("percentage").innerHTML = intPercentage + "%";
}

/**
 * 通过任务列表本文计算百分比（通过API）
 * @returns 百分比
 */
async function calculatePercentageByAPI(blockid){
    let kramdown = await getKramdown(blockid);
    if (!isValidStr(kramdown)){
        debugPush(language["getKramdownFailed"] + blockid);
        return;
    }
    let all = kramdown.match(/^\* {.*}\[.\].*$/gm);
    let checked = kramdown.match(/^\* {.*}\[X\].*$/gm);
    if (!all){//找不到（说明块id有误），返回
        debugPush(language["notTaskList"] + blockid);
        return;
    }
    let count = checked ? checked.length : 0;
    return count / all.length * 100;
}

/**
 * 从属性custom-targetId重设目标块id
 * 无返回值！
 */
async function setBlockIdFromAttr(){
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
 */
async function setTimesFromAttr(){
    g_thisWidgetId = getCurrentWidgetId();//获取当前挂件id
    let response = await getblockAttrAPI(g_thisWidgetId);
    if (setting.startTimeAttrName in response.data && setting.endTimeAttrName in response.data){
        let startimeStr = response.data[setting.startTimeAttrName]
        let endtimeStr = response.data[setting.endTimeAttrName];
        let startNums = startimeStr.match(/[0-9]+/gm);//拆分连续的数字（string）
        let endNums = endtimeStr.match(/[0-9]+/gm);
        let nums = [startNums, endNums];
        for (let i = 0; i < nums.length; i++){
            switch (nums[i].length){
                case 3: {//输入格式YYYY MM DD
                    if (nums[i][0].length == 2){
                        nums[i][0] = "20" + nums[i][0];
                    }
                    g_times[i] = new Date(nums[i][0], nums[i][1] - 1, nums[i][2]);
                    break;
                }
                case 5: {//输入格式YYYY.MM.DD HH:MM
                    if (nums[i][0].length == 2){
                        nums[i][0] = "20" + nums[i][0];
                    }
                    g_times[i] = new Date(nums[i][0], nums[i][1] - 1, nums[i][2], nums[i][i][3], nums[i][4]);
                    break;
                }
                case 2: {//输入格式HH:MM
                    g_times[i] = new Date();
                    g_times[i].setHours(nums[i][0]);
                    g_times[i].setMinutes(nums[i][1]);
                    break;
                }
                default: {
                    throw new Error(language["parseTimeStrErr"]);
                }
            }
        }
        console.log("开始时间", g_times[0].toLocaleString());
        console.log("结束时间", g_times[1].toLocaleString());
    }
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


/**
 * 重新计算百分比并更新进度条
 * 从指定的块id中获取已经完成的任务（仅第一级）所占百分比
 * @param {boolean} noAPI 不使用API，此选项为true则使用dom重新计算，否则以setting.api设置为准
 */
async function __reCalculate(noAPI = false){
    //判断目标块
    if (!isValidStr(g_targetBlockId)){
        throw new Error(language["needSetAttr"]);
    };
    let percentage;
    //根据设置，从api/dom获得百分比
    if (setting.api && !noAPI){
        percentage = await calculatePercentageByAPI(g_targetBlockId);
    }else{
        percentage = calculatePercentageByDom(g_targetBlockId);
    }
    //更新进度条
    changeBar(percentage);
}

/**
 * 通过dom计算
 * @param {*} blockid 
 * @return 已选事项的百分比
 */
function calculatePercentageByDom(blockid){
    //寻找指定块下的任务项
    let allTasks = $(window.parent.document).find(`div[data-node-id=${blockid}]>[data-marker="*"]`);
    let checkedTasks = $(window.parent.document).find(`div[data-node-id=${blockid}]>.protyle-task--done[data-marker="*"]`);
    if (allTasks.length == 0){
        throw new Error(language["notTaskList"]);
    }
    //已完成任务列表项计数
    let checkedTasksNum = checkedTasks ? checkedTasks.length : 0;
    return checkedTasksNum / allTasks.length * 100;
}

function debugPush(msg, timeout = 7000){
    // $(`<p>${msg}</p>`).appendTo("#errorInfo");
    clearTimeout(g_debugPushTimeout);
    $("#errorInfo").text(msg);
    g_debugPushTimeout = setTimeout(()=>{$("#errorInfo").text("");}, timeout)
}

function calculateTimeGap(){

}

/**
 * 初始化挂件，设置颜色等
 */
async function __init(){
    //读取模式
    g_manualPercentage = await getManualSettingFromAttr();
    //设置挂件宽高
    // if (g_manualPercentage == null){
        window.frameElement.style.width = setting.widgetWidth;
        window.frameElement.style.height = setting.widgetHeight;
    // }
    __refreshAppreance();
    if (g_manualPercentage >= 0){
        changeBar(g_manualPercentage);
        manualModeInit();
        $("#refresh").addClass("manualMode");
        $("#refresh").attr("title", language["manualMode"]);
        return;
    }
    //以下： 仅自动模式
    $("#refresh").attr("title", language["autoMode"]);
    //刷新目标id
    await setBlockIdFromAttr();
    //自动模式下启动时刷新
    if (setting.onstart && g_manualPercentage < 0){
        await __reCalculate();
    }
    //设定定时刷新
    if (setting.refreshInterval > 0){
        setInterval(async function(){await __reCalculate()}, setting.refreshInterval);
    }
    //挂监视，获取dom变化
    if (isValidStr(g_targetBlockId)){
        __setObserver(g_targetBlockId);
    }
}

/**
 * 刷新挂件颜色
 */
function __refreshAppreance(){
    //TODO：设置颜色
    if (window.top.siyuan.config.appearance.mode){
        $("#container").addClass("container_dark");
        $("#progress").addClass("progress_dark");
        $("#percentage").addClass("text_dark");
    }else{
        $("#container").removeClass("container_dark");
        $("#progress").removeClass("progress_dark");
        $("#percentage").removeClass("text_dark");
    }
}

/**
 * 手动点击刷新：没有块则创建块！
 */
async function __refresh(){
    try{
        await setBlockIdFromAttr();
        //如果为手动模式，保存百分比
        if (g_manualPercentage >= 0){
            clearTimeout(g_savePercentTimeout);
            await setManualSetting2Attr();
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
        await __reCalculate();
    }catch(err){
        console.error(err);
        debugPush(err);
    }
}


/**
 * (设置监视)监视待办事件列表块dom变化
 * @param {*} blockid 
 */
function __setObserver(blockid){
    try{
        g_observeClass.disconnect();
        g_observeNode.disconnect();
        let target = $(window.parent.document).find(`div[data-node-id=${blockid}]`);
        if (target.length <= 0) {
            debugPush(language["unknownId"] + blockid);
            return;
        }
        console.assert(target.length == 1, "错误：多个匹配的观察节点");
        //监听任务项class变换，主要是勾选和悬停高亮会影响//副作用：悬停高亮也会触发
        g_observeClass.observe(target[0], {"attributes": true, "attributeFilter": ["class"], "subtree": true});
        //监听任务项新增和删除
        g_observeNode.observe(target[0], {"childList": true});
    }catch(err){
        debugPush(err);
        console.error(err);
    }
}

/**
 * 手动模式点击进度条事件函数
 * @param {*} event 
 */
function manualClick(event){
    clearTimeout(g_savePercentTimeout);
    //offset点击事件位置在点击元素的偏移量，clientWidth进度条显示宽度
    changeBar(event.offsetX / g_progressBarElem.clientWidth * 100.0);
    g_manualPercentage = (event.offsetX / g_progressBarElem.clientWidth * 100.0);
    g_savePercentTimeout = setTimeout(setManualSetting2Attr, setting.saveAttrTimeout);
}
/**
 * 手动模式拖动进度条事件函数（按下）
 */
function manualMousedown(event){
    document.onmousemove = function(e){
        clearTimeout(g_savePercentTimeout);
        let event = e || event;
        // 2.3获取移动的位置
        // event.clientX - oProgress.offsetLeft
        let x = event.clientX - g_progressBarElem.offsetLeft;
        //拖拽超出边界时重置
        if(x <= 0){
            x = 0;
        }else if (x >= g_progressBarElem.clientWidth){
            x = g_progressBarElem.clientWidth;
        }
        changeBar(x / g_progressBarElem.clientWidth * 100.0);
        g_manualPercentage = x / g_progressBarElem.clientWidth * 100.0;
        return false;
    }
}

/**
 * 手动模式开启后初始化
 */
function manualModeInit(){
    //实现单击进度条任意位置
    g_progressBarElem.addEventListener("click", manualClick);
    //实现：拖拽参考:（Web-once@CSDN） https://blog.csdn.net/qq_42381297/article/details/82595467
    g_progressBarElem.addEventListener("mousedown", manualMousedown);
    //完成拖拽
    document.onmouseup = function(){
        clearTimeout(g_savePercentTimeout);
        document.onmousemove=null;
        //延时保存百分比
        g_savePercentTimeout = setTimeout(setManualSetting2Attr, setting.saveAttrTimeout);
    }
}

/**
 * 关闭手动模式后取消事件
 */
function manualDestory(){
    let progressBar = document.getElementById("container");
    progressBar.removeEventListener("click", manualClick);
    progressBar.removeEventListener("mousedown", manualMousedown);
    document.onmouseup = null;
}

/**
 * observer调用的函数，防止多次触发
 */
function observeRefresh(){
    clearTimeout(g_observerTimeout);
    //由于可能高频度触发事件，设定为禁止通过api刷新
    g_observerTimeout = setTimeout(async function(){await __reCalculate(true);}, 300);
}

/**
 * 双击刷新按钮切换模式
 */
async function dblClickChangeMode(){
    clearTimeout(g_refreshBtnTimeout);
    if (g_manualPercentage == -1){//如果当前为自动模式，则切换为手动模式
        g_manualPercentage = 0;//切换为手动模式
        setManualSetting2Attr();//保存模式设定
        g_observeClass.disconnect();
        g_observeNode.disconnect();
        manualModeInit();
        $("#refresh").addClass("manualMode");
        $("#refresh").attr("title", language["manualMode"]);
        console.log("已切换为手动模式");
    }else if (g_manualPercentage >= 0){
        //设置属性：切换为自动模式，移除事件listener
        g_manualPercentage = "-1";
        setManualSetting2Attr();
        manualDestory();
        //重新读取目标块id
        await setBlockIdFromAttr();
        //设置domobserver
        __setObserver(g_targetBlockId);
        //自动刷新
        if (setting.onstart){
            await __reCalculate();
        }
        $("#refresh").removeClass("manualMode");
        $("#refresh").attr("title", language["autoMode"]);
        console.log("已切换为自动模式");
    }else{

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
let g_observerTimeout;//防止多次触发observe延时
let g_debugPushTimeout;//推送消失延时
let g_manualPercentage = null;//手动模式下百分比，注意，负值用于区分为自动模式
let g_savePercentTimeout;//保存手动百分比延时
let g_progressBarElem = document.getElementById("container");
let g_observeClass = new MutationObserver(observeRefresh);
let g_observeNode = new MutationObserver(observeRefresh);
let g_times = new Array(2);

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