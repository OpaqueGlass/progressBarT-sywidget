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

let targetBlockId;
let refreshBtnTimeout;
let thisWidgetId;
let observerTimeout;
let manualPercentage = null;
let setAttrTimeout;
let progressBarElem = document.getElementById("container");
/**
 * 更改显示的进度条
 * @param {*} percentage 百分比，整数，传入百分之x
 */
function changeBar(percentage){
    if (percentage >= 100) {
        percentage = 100;
        document.getElementById("progress").style.borderBottomRightRadius = 15 + "px";
        document.getElementById("progress").style.borderTopRightRadius = 15 + "px";
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
 * 从指定的块id中获取已经完成的任务（仅第一级）所占百分比
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
 * 从属性custom-targetId获取块id
 * @returns 块id
 */
async function getBlockIdFromAttr(){
    thisWidgetId = getCurrentWidgetId();//获取当前挂件id
    let response = await getblockAttrAPI(thisWidgetId);
    if (setting.attrName in response.data){
        return response.data[setting.attrName];
    }
    return null;
}

/**
 * 从属性中获取当前工作模式
 * @returns 手动，当前要显示的百分比，null自动
 */
async function getManualSettingFromAttr(){
    thisWidgetId = getCurrentWidgetId();//获取当前挂件id
    let response = await getblockAttrAPI(thisWidgetId);
    if (setting.manualAttrName in response.data){
        return parseInt(response.data[setting.manualAttrName]);
    }
    return null;
}

/**
 * 将百分比值设置给属性
 */
async function setManualSetting2Attr(){
    let data = {};
    data[setting.manualAttrName] = manualPercentage.toString();
    let response = await addblockAttrAPI(data, thisWidgetId);
}


/**
 * 重新计算百分比并更新进度条
 * @param {boolean} noAPI 不使用API，此选项为true则使用dom重新计算，否则以setting.api设置为准
 */
async function __reCalculate(noAPI = false){
    if (!isValidStr(targetBlockId)) return ;//TODO blockid 无效时的处理,扔个错误
    let percentage;
    //根据设置，从api/dom获得百分比
    if (setting.api && !noAPI){
        percentage = await calculatePercentageByAPI(targetBlockId);
    }else{
        percentage = calculatePercentageByDom(targetBlockId);
    }
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
    if (allTasks == null){
        throw Error(language["notTaskList"]);
    }
    let checkedTasksNum = checkedTasks ? checkedTasks.length : 0;
    return checkedTasksNum / allTasks.length * 100;
}

function debugPush(msg, timeout = 7000){
    // $(`<p>${msg}</p>`).appendTo("#errorInfo");
    $("#errorInfo").text(msg);
    setTimeout(()=>{$("#errorInfo").text("");}, timeout)
}

/**
 * 初始化挂件，设置颜色等
 */
async function __init(){
    //设置挂件宽高
    window.frameElement.style.width = setting.widgetWidth;
    window.frameElement.style.height = setting.widgetHeight;
    //读取模式
    manualPercentage = await getManualSettingFromAttr();
    if (manualPercentage >= 0){
        changeBar(manualPercentage);
        manualModeInit();
        $("#refresh").addClass("manualMode");
        $("#refresh").attr("title", language["manualMode"]);
        return;
    }
    //以下： 仅自动模式
    $("#refresh").attr("title", language["autoMode"]);
    //读取目标id
    targetBlockId = await getBlockIdFromAttr();
    //自动模式下启动时刷新
    if (setting.onstart){
        __reCalculate();
    }
    //设定定时刷新
    if (setting.refreshInterval > 0){
        setInterval(__reCalculate, setting.refreshInterval);
    }
    if (targetBlockId){
        __setObserver(targetBlockId);
    }
    
}

/**
 * 刷新挂件颜色
 */
function __refreshAppreance(){
    //TODO：
    if (window.top.siyuan.config.appearance.mode){

    }
}

/**
 * 手动点击刷新：没有块则创建块！
 */
async function __refresh(){
    //没有块则创建块
    if (!isValidStr(targetBlockId)){
        let tempId = await insertBlockAPI("- [ ] ", thisWidgetId);
        if (isValidStr(tempId)){
            targetBlockId = tempId;
            let data = {};
            data[setting.attrName] = targetBlockId;
            let response = await addblockAttrAPI(data, thisWidgetId);
            if (response != 0){
                // throw Error(language["writeAttrFailed"]);
            }
        }
        
    }
    let attrBlockId = await getBlockIdFromAttr()
    targetBlockId = attrBlockId ? attrBlockId : targetBlockId; 
    __reCalculate();
}


/**
 * 监视待办事件列表块dom变化
 * @param {*} blockid 
 */
function __setObserver(blockid){
    try{
        mutationObserver.disconnect();
        mutationObserver2.disconnect();
        let target = $(window.parent.document).find(`div[data-node-id=${blockid}]`);
        if (target.length <= 0) {
            debugPush(language["unknownId"] + blockid);
            return;
        }
        //监听任务项class变换，主要是勾选和悬停高亮会影响//副作用：悬停高亮也会触发
        mutationObserver.observe(target[0], {"attributes": true, "attributeFilter": ["class"], "subtree": true});
        //监听任务项新增和删除
        mutationObserver2.observe(target[0], {"childList": true});
    }catch(err){
        debugPush(err);
        console.error(err);
    }
}

/**
 * 手动模式事件函数
 * @param {*} event 
 */
function manualClick(event){
    clearTimeout(setAttrTimeout);
    //offset点击事件位置在点击元素的偏移量，clientWidth进度条显示宽度
    changeBar(event.offsetX / progressBarElem.clientWidth * 100.0);
    manualPercentage(event.offsetX / progressBarElem.clientWidth * 100.0);
    setAttrTimeout = setTimeout(setManualSetting2Attr, setting.saveAttrTimeout);
}
/**
 * 手动模式事件函数
 */
function manualMousedown(event){
    clearTimeout(setAttrTimeout);
    document.onmousemove = function(e){
        var event = e || event;
        // 2.3获取移动的位置
        // event.clientX - oProgress.offsetLeft
        var x = event.clientX - progressBarElem.offsetLeft;
        if( x<=0 ){
            x = 0;
        }
        changeBar(x / progressBarElem.clientWidth * 100.0);
        manualPercentage = x / progressBarElem.clientWidth * 100.0;
        return false;
    }
}

/**
 * 手动模式开启后初始化
 */
function manualModeInit(){
    
    //实现单击进度条任意位置
    progressBarElem.addEventListener("click", manualClick);
    //实现：拖拽参考:（Web-once@CSDN） https://blog.csdn.net/qq_42381297/article/details/82595467
    progressBarElem.addEventListener("mousedown", manualMousedown);
    document.onmouseup = function(){
        document.onmousemove=null;
        //延时保存百分比
        setAttrTimeout = setTimeout(setManualSetting2Attr, setting.saveAttrTimeout);
    }
    // progressBar.addEventListener("")
}

/**
 * 手动模式关闭后取消事件
 */
function manualDestory(){
    let progressBar = document.getElementById("container");
    progressBar.removeEventListener("click", manualClick);
    progressBar.removeEventListener("mousedown", manualMousedown);
    document.onmouseup = null;
}

function observeRefresh(){
    clearTimeout(observerTimeout);
    //由于可能高频度触发事件，设定为禁止通过api刷新
    observerTimeout = setTimeout(()=>{__reCalculate(true);}, 300);
}

/******************     非函数部分       ************************ */

//监听事件，当事件发生时刷新进度条
let mutationObserver = new MutationObserver(observeRefresh);
let mutationObserver2 = new MutationObserver(observeRefresh);
//绑定按钮事件
//单击，手动刷新
document.getElementById("refresh").onclick=async function(){
    clearTimeout(refreshBtnTimeout);
    refreshBtnTimeout = setTimeout(async function(){
        if (manualPercentage < 0){
            __refresh();
        }
    }, 300);
};
//双击：切换模式
document.getElementById("refresh").ondblclick=async function(){
    clearTimeout(refreshBtnTimeout);
    if (manualPercentage < 0){//如果当前为自动模式，则切换为手动模式
        console.log("手动模式");
        manualPercentage = 0;
        setManualSetting2Attr();
        mutationObserver.disconnect();
        mutationObserver2.disconnect();
        manualModeInit();
        $("#refresh").addClass("manualMode");
        $("#refresh").attr("title", language["manualMode"]);
    }else{
        console.log("自动模式");
        //设置属性：切换为自动模式，移除事件listener
        manualPercentage = "-1";
        setManualSetting2Attr();
        manualDestory();
        //重新读取目标块id
        targetBlockId = await getBlockIdFromAttr();
        //设置domobserver
        __setObserver(targetBlockId);
        //自动刷新
        if (setting.onstart){
            __reCalculate();
        }
        $("#refresh").removeClass("manualMode");
        $("#refresh").attr("title", language["autoMode"]);
    }
};


try{
    __init();
}catch (err){
    debugPush(err);
    console.error(err);
}

// calculatePercentageByDom();
