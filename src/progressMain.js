import {
    getKramdown,
    getCurrentWidgetId,
    getblockAttrAPI,
    isValidStr,
    insertBlockAPI,
    addblockAttrAPI,
    updateBlockAPI
} from './API.js';//啊啊啊，务必注意：ios要求大小写一致，别写错
import {language, setting, defaultAttr, attrName, attrSetting} from './config.js';
import {getDayGapString, parseTimeString, useUserTemplate, formatDateString, calculateTimePercentage, SCALE} from "./uncommon.js";
import { debugPush, logPush, warnPush, errorPush } from './common.js';
/**模式类 */
class Mode {
    modeCode = 0;//模式对应的默认百分比值
    // 模式id
    modeId = 0;
    // 挂件高度
    widgetHeight=setting.widgetAutoModeWithTimeRemainHeight;
    // 是否携带标题
    titleEnable = false;
    // get modeCode(){
    //     return this._modeCode;
    // }
    //计算和显示百分比
    async calculateApply() {}
    //初始化模式(子类实现时请先调用，手动模式除外)
    async init() {
        g_manualPercentage = this.modeCode;
        showError("");
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
    widgetHeight = setting.widgetBarOnlyHeight;
    //初始化
    async init(){
        // super.init();
        //提示词设置
        $("#refresh").addClass("manualMode");
        $("#refresh").attr("title", language["manualMode"] + language["ui_refresh_btn_hint"]);
        $("#innerCurrentMode").text(language["manualMode"]);
        $("#container").addClass("canClick");
        showError("");
        g_progressContainerElem = document.getElementById("container");
        //获取点击/拖拽/触摸拖拽进度条事件
        //实现单击进度条任意位置
        g_progressContainerElem.addEventListener("click", this.eventClickBar);
        g_progressContainerElem.addEventListener("mousedown", this.eventMousedownBar);
        //触摸进度条事件
        /* 检测浏览器是否支持passive event listener */
        let passiveIfSupported = false;
        try {
        window.addEventListener("test", null,
            Object.defineProperty(
            {},
            "passive",
            {
                get() { passiveIfSupported = { passive: true }; }
            }
            )
        );
        } catch (err) {}
        g_progressContainerElem.addEventListener("touchstart", this.eventTouchstartBar, passiveIfSupported );
        
        changeBar(g_manualPercentage);
        //手动模式禁用动画
        $("#progress").css("transition-duration", "0s");
        //隐藏提示信息
        if (!g_displaySetting){
            window.frameElement.style.height = this.widgetHeight;
        }
    }
    
    destory(){
        document.onmouseup = null;
        //清除延时保存
        clearTimeout(this.savePercentTimeout);
        //离开手动模式启用动画
        $("#progress").css("transition-duration", "300ms");
        //清除绑定的事件，禁用拖拽、点击、触摸拖拽
        g_progressContainerElem.removeEventListener("click", this.eventClickBar);
        g_progressContainerElem.removeEventListener("mousedown", this.eventMousedownBar);
        g_progressContainerElem.removeEventListener("touchstart", this.eventTouchstartBar);
        $("#refresh").removeClass("manualMode");
        $("#container").removeClass("canClick");
    }
    //点击刷新按钮：保存进度
    async refresh(){
        clearTimeout(this.savePercentTimeout);
        await setManualSetting2Attr();
    }
    //鼠标拖拽点击事件
    //拖拽参考：https://blog.csdn.net/m0_47214030/article/details/117911609（CC 4.0 BY-SA）
    eventMousedownBar(event){
        //完成拖拽
        document.onmouseup = function(){
            document.onmousemove = null;
            //延时保存百分比
            clearTimeout(this.savePercentTimeout);
            if (setting.saveAttrTimeout > 0) this.savePercentTimeout = setTimeout(setManualSetting2Attr, setting.saveAttrTimeout);
            //清除mouseup，使得只有点击进度条才会触发保存
            document.onmouseup = null;
        }
        //拖拽期间计算
        document.onmousemove = function(e){
            let event = e || event;
            //获取移动位置
            let x = event.clientX - g_progressContainerElem.offsetLeft;
            //拖拽超出边界时重置
            if(x <= 0){
                x = 0;
            }else if (x >= g_progressContainerElem.clientWidth){
                x = g_progressContainerElem.clientWidth;
            }
            changeBar(x / g_progressContainerElem.clientWidth * 100.0);
            g_manualPercentage = x / g_progressContainerElem.clientWidth * 100.0;
            return false;
        }

    }
    //鼠标点击
    eventClickBar(event){
        //offset点击事件位置在点击元素的偏移量，clientWidth进度条显示宽度
        let percentage = (event.clientX - g_progressContainerElem.offsetLeft) / g_progressContainerElem.clientWidth * 100.0;
        if ((event.clientX - g_progressContainerElem.offsetLeft) < 0) {
            logPush(`点击定位进度实现逻辑有缺陷 ${percentage}`+
            `点击位置clientX${event.clientX}， 进度条左定位offsetLeft${g_progressContainerElem.offsetLeft}`);
        }
        if (percentage >= 99.4) percentage = 100.0;
        if (percentage <= 0.5) percentage = 0.0;
        changeBar(percentage);
        g_manualPercentage = percentage;
    }
    //移动端触摸拖拽
    eventTouchstartBar(event){
        document.ontouchend = function(){
            document.ontouchmove = null;
            //延时保存百分比
            clearTimeout(this.savePercentTimeout);
            if (setting.saveAttrTimeout > 0) this.savePercentTimeout = setTimeout(setManualSetting2Attr, setting.saveAttrTimeout);
            document.ontouchend = null;
        }
        document.ontouchmove = function(event){
            let touchEvent = event.targetTouches[0];
            let x = touchEvent.clientX - g_progressContainerElem.offsetLeft;
            if (x < 0){
                x = 0;
            }else if (x > g_progressContainerElem.clientWidth){
                x = g_progressContainerElem.clientWidth;
            }
            changeBar(x / g_progressContainerElem.clientWidth * 100.0);
            g_manualPercentage = x / g_progressContainerElem.clientWidth * 100.0;
            return false;
        }
    }
}

class AutoMode extends Mode {
    modeCode = -1;
    autoRefreshInterval;
    observeClass = new MutationObserver(this.observeRefresh);
    observeNode = new MutationObserver(this.observeRefresh);
    calculateAllTasks = false;//模式：统计所有任务（含子任务）进度
    observerTimeout;//内保存延迟
    clickFnBtnTimeout;
    widgetHeight = setting.widgetBarOnlyHeight;
    endTimeStr = undefined;
    startTimeStr = undefined;
    async init(){
        super.init();
        //设定自动模式提示词
        $("#refresh").attr("title", language["autoMode"] + language["ui_refresh_btn_hint"]);
        $("#refresh").addClass("autoMode");
        $("#innerCurrentMode").text(language["autoMode"]);
        //重新读取目标块id
        await this.readAndApplyAttr();
        //设置domobserver
        if (isValidStr(g_targetBlockId)){
            this.__setObserver(g_targetBlockId);
        }
        //启动时自动刷新
        if (setting.onstart){
            await this.calculateApply();
        }
        //设定间隔定时刷新
        if (setting.refreshInterval > 0){
            // 同一页面中如果有较多的挂件，相同的刷新间隔可能导致大量并发，这里加入随机数
            let randomNum = Math.floor(Math.random() * 10001);
            this.autoRefreshInterval = setInterval(async function(){await g_mode.calculateApply()}, setting.refreshInterval + randomNum);
        }
        //自动模式下隐藏提示信息
        if (!g_displaySetting){
            window.frameElement.style.height = this.widgetHeight;
        }
        //设定自动模式功能键
        $(`<button id="cancelAll">Fn</button>`).prependTo("#infos");
        __refreshAppreance();//为刚刚写入的按钮加深色模式
        // $("#cancelAll").click(this.fnclick);
        $("#cancelAll").dblclick(this.uncheckAll);
        $("#cancelAll").attr("title", language["autoModeFnBtn"]);
    }
    destory(){
        this.observeClass.disconnect();
        this.observeNode.disconnect();
        clearInterval(this.autoRefreshInterval);
        $("#refresh").removeClass("autoMode");
        $("#cancelAll").remove();
        $("#outerInfos").css("display", "none");
        $("#outerInfos").click(null);
        $("#outerInfos").dblclick(null);
        $("#percentage").css("display", "");
    }
    async refresh(){
        showError("");//清空提示词
        infoPush("");
        //从挂件中读取id
        await this.readAndApplyAttr();
        logPush("手动点击刷新，读取到属性中id", g_targetBlockId);
        //没有块则创建块
        if (!isValidStr(g_targetBlockId) && setting.createBlock){
            logPush("无效id，将创建新块");
            let tempId = await insertBlockAPI("- [ ] ", g_thisWidgetId);
            if (isValidStr(tempId)){
                g_targetBlockId = tempId;
                let data = {};
                data[attrName.autoTarget] = g_targetBlockId;
                let response = await addblockAttrAPI(data, g_thisWidgetId);
                if (response != 0){
                    throw Error(language["writeAttrFailed"]);
                }
            }
        }
        //重设事件监视
        this.observeClass.disconnect();
        this.observeNode.disconnect();
        this.__setObserver(g_targetBlockId);
        //计算进度
        await this.calculateApply();
    }
    /**
     * 重新计算百分比并更新进度条（自动模式重新计算）
     * 将优先尝试dom计算，若dom无法计算且noAPI = false，则尝试API计算
     * 从指定的块id中获取已经完成的任务（仅第一级）所占百分比
     * @param {boolean} noAPI 不使用API，此选项为true则使用dom重新计算，否则以setting.api设置为准
     */
     async calculateApply(noAPI = false){
        try{
            // 读取并设置时间
            let [endParseResult, endTime, endTimeStr] = parseTimeString(this.endTimeStr);
            let [startParseResult, startTime, startTimeStr] = parseTimeString(this.startTimeStr);
            // 简化截止日期字符串
            if (endParseResult == 1 && setting.dateSimplize
                 && endTime.getFullYear() == new Date().getFullYear()) {
                endTimeStr = formatDateString(endTime, useUserTemplate("dateFormat_simp"));
            }else if (endParseResult == 1) {
                endTimeStr = formatDateString(endTime, useUserTemplate("dateFormat"));
            }
            // 隐藏右侧百分比
            if (endParseResult == 1 && setting.hideRightPercentage) {
                $("#percentage").css("display", "none");
                $("#outerInfos").css({"user-select": "none", "cursor": "pointer"});
                $("#outerInfos").click(clickManualRefresh);
                $("#outerInfos").dblclick(dblClickShowSetting);
            }else{
                $("#percentage").css("display", "");
                $("#outerInfos").css({"user-select": "", "cursor": ""});
            }
            if (endParseResult == 1 && startParseResult != 1) {
                $("#outerInfos").css("display", "");
                modePush(useUserTemplate("countDay_auto_modeinfo", `<span class="apply-percentage"></span>`, getDayGapString({"endTime":endTime, "simplify":true}), endTimeStr), 0);
                this.widgetHeight = setting.widgetAutoModeWithTimeRemainHeight;
            }else if (endParseResult == 1 && startParseResult == 1) {
                $("#outerInfos").css("display", "");
                try {
                    // 这里的百分比用于控制颜色，如果日程过短，颜色变化明显或许会更好，因此不要SCALE.DAY
                    let percentage = calculateTimePercentage(startTime, endTime);
                    modePush(useUserTemplate("countDay_auto_modeinfo", `<span class="apply-percentage"></span>`, getDayGapString({"endTime":endTime, "simplify":true, "percentage": percentage}), endTimeStr), 0);
                    this.widgetHeight = setting.widgetAutoModeWithTimeRemainHeight;
                }catch(err) {
                    errorPush(err);
                }
            }else{
                $("#outerInfos").css("display", "none");
                this.widgetHeight = setting.widgetBarOnlyHeight;
                if (isValidStr(this.endTimeStr) && this.endTimeStr != "null") {
                    showError(language["timeSetIllegal"]);
                }
            }
            // 判断目标块
            if (!isValidStr(g_targetBlockId)){
                throw new Error(language["needSetAttr"]);
            };
            let percentage;
            //根据设置，从api/dom获得百分比
            percentage = this.calculatePercentageByDom(g_targetBlockId);
            //使用API重试
            if (percentage < 0 && !noAPI){
                infoPush(language["unknownIdAtDom"], 0);
                $("#refresh").attr("title", language["autoModeAPI"]);
                percentage = this.modeCode;
                percentage = await this.calculatePercentageByAPI(g_targetBlockId);
                if (percentage >= 0) {
                    infoPush(language["usingAPI"], 0);
                } else {
                    infoPush(language["autoModeFailed"], 0);
                }
            }else if (percentage < 0 && noAPI){
                $("#refresh").attr("title", language["autoMode"]);
                infoPush(language["autoModeFailed"], 0);
            }
            if (percentage < 0){
                throw new Error(language["notTaskList"]);
            }
            //更新进度条
            changeBar(percentage);
            }catch(err){
                errorPush(err);
                showError(err.name + err.message);
            }
    }
    /**
    * observer调用的函数，防止多次触发
    */
    observeRefresh(mutationList){
        try{
        let resetFlag = false;//重设条件
        //测试中，对子节点变更做限定
        //触发条件：为全部统计、config.js中设置允许beta触发方式，当前是增删触发的
        if (setting.updateForSubNode && g_mode.calculateAllTasks
            && mutationList[0].type == "childList"){
            do{
            // 大规模节点变动，大概率有任务更新，节约时间，直接放行
            if (mutationList.length >= 13) break;
            //检查变动是否涉及list、li
            let isNodeModify = false;
            for (let mutation of mutationList){ 
                if ($(mutation.target).hasClass("li") || $(mutation.target).hasClass("list")){
                    isNodeModify = true;
                    //节点删除时重设监视节点，为能及时监视新增的列表
                    if ($(mutation.target).hasClass("list") && mutation.removedNodes.length >= 1){
                        resetFlag = true;
                    }
                    break;
                }
            }
            if (!isNodeModify && mutationList[0].type == "childList") {
                return;
            }
            
            }while(0);
        }

        //防止鼠标多选块触发
        //方法2：确定变动的块出现--done class变化再触发计算
        if (mutationList[0].type == "attributes"){
            let oldChecked = mutationList[0].oldValue.indexOf("protyle-task--done") == -1 ? false : true;
            let nowChecked = $(mutationList[0].target).hasClass("protyle-task--done");
            if (oldChecked == nowChecked){
                return;
            }
        }
        g_mode.calculateApply(true);//可能反复触发，这里统计不应该使用API
        if (resetFlag){
            g_mode.__setObserver(g_targetBlockId);
        }
        }catch(error){
            errorPush(err);
            showError(language["cannot_observe"] + err);
        }
    }
    /**
     * 重设observer
     * @param {*} blockid 
     * @returns 
     */
    __setObserver(blockid){
        logPush("设定/重设observer");
        try{
            this.observeClass.disconnect();
            this.observeNode.disconnect();
            let target = $(window.parent.document).find(`div[data-node-id=${blockid}]`);
            if (target.length <= 0) {
                infoPush(language["cantObserve"] + blockid, 2000);
                warnPush("无法在DOM中找到对应块id，未设定observer", blockid);
                return;
            }
            if (target.length != 1) {
                warnPush("错误：多个匹配的观察节点");
            }
            //监听任务项class变换，主要是勾选和悬停高亮会影响//副作用：悬停高亮也会触发
            this.observeClass.observe(target[0], {"attributes": true, "attributeFilter": ["class"], "subtree": true, "attributeOldValue": true});
            //监听任务项新增和删除
            this.observeNode.observe(target[0], {"childList": true});//监听第一层级任务新增/删除
            //监听全部任务项，//请注意：若设定为subtree: true，键入编辑时，将被多次触发。建议subtree: false
            if (setting.updateForSubNode && this.calculateAllTasks){
                let subTaskLists = $(window.parent.document).find(`div[data-node-id=${blockid}] .list[data-subtype="t"]`)
                for (let i = 0; i < subTaskLists.length; i++){
                    this.observeNode.observe(subTaskLists[i], {"childList": true});
                }
            }
        }catch(err){
            infoPush(language["setObserveErr"] + err, 2000);
            errorPush(err);
            errorPush("observer设置失败，无法获取任务列表变化");
        }
    }
    /**
     * 通过dom计算
     * @param {*} blockid 
     * @return 已选事项的百分比
     */
    calculatePercentageByDom(blockid){
        let directSymbol = ">";//>直接子元素
        if (this.calculateAllTasks){
            directSymbol = " ";//要统计所有元素，就不限定为直接子元素了
        }
        //寻找指定块下的任务项
        let allTasks = $(window.parent.document).find(`div[data-node-id=${blockid}]${directSymbol}[data-marker="*"][data-subtype="t"]`);
        let checkedTasks = $(window.parent.document).find(`div[data-node-id=${blockid}]${directSymbol}.protyle-task--done[data-marker="*"]`);
        if (allTasks.length == 0){
            warnPush("DOM计算进度失败：找不到对应块，或块类型错误。", blockid);
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
            warnPush("获取kramdown失败", kramdown);
            // showError(language["getKramdownFailed"] + blockid);
            throw new Error(language["getKramdownFailed"] + blockid);
            return 0;//不是块id错误，避免触发autoModeCalculate的错误提示
        }
        let allRegex = /^\* {.*}\[.\].*$/gm;
        let checkedRegex = /^\* {.*}\[X\].*$/gm;
        if (this.calculateAllTasks){//统计全部时
            allRegex = /^ *\* {.*}\[.\].*$/gm;
            checkedRegex = /^ *\* {.*}\[X\].*$/gm;
        }
        let all = kramdown.match(allRegex);
        let checked = kramdown.match(checkedRegex);
        if (!all){//找不到（说明块类型有误），返回
            return -100;
        }
        let count = checked ? checked.length : 0;
        return count / all.length * 100;
    }
    //清空勾选（全部，包括子任务列表）
    async uncheckAll(){
        let checkedTasks = $(window.parent.document).find(`div[data-node-id=${g_targetBlockId}] [data-marker="*"].protyle-task--done`);
        if (checkedTasks.length > 0){
            $(window.parent.document).find(`div[data-node-id=${g_targetBlockId}] [data-marker="*"].protyle-task--done > .protyle-action--task`).each(function(){$(this).click();});
        }else{
            $(window.parent.document).find(`div[data-node-id=${g_targetBlockId}] [data-marker="*"] > .protyle-action--task`).each(function(){$(this).click();});
        }
        
    }
    fnclick(){
        clearTimeout(this.clickFnBtnTimeout);
    }
    /**
     * 从属性custom-targetId重设目标块id
     * 无返回值！
     */
    async readAndApplyAttr(){
        g_thisWidgetId = getCurrentWidgetId();//获取当前挂件id
        let response = await getblockAttrAPI(g_thisWidgetId);
        if (attrName.autoTarget in response.data){
            g_targetBlockId = response.data[attrName.autoTarget];
        }else{
            g_targetBlockId = "null";
        }
        if (attrName.taskCalculateMode in response.data){
            this.calculateAllTasks = response.data[attrName.taskCalculateMode] == "true" ? true:false;
        }else{
            this.calculateAllTasks = defaultAttr["alltask"];
        }
        // 读取结束时间
        if (attrName.endTime in response.data) {
            this.endTimeStr = response.data[attrName.endTime];
        }
        if (attrName.startTime in response.data) {
            this.startTimeStr = response.data[attrName.startTime];
        }
        //向挂件设置项写入id
        $("#blockId").val(isValidStr(g_targetBlockId) ? g_targetBlockId : "");
        //如果没有设定，则自动获取上下文id
        try{
        if (!isValidStr(g_targetBlockId)){
            let thisWidgetBlockElem = window.frameElement.parentElement.parentElement;
            if ($(thisWidgetBlockElem.nextElementSibling).attr("data-subtype") === "t"){
                g_targetBlockId = $(thisWidgetBlockElem.nextElementSibling).attr("data-node-id");
                infoPush(language["autoDetectId"] + "↓", 2500);
            }else if ($(thisWidgetBlockElem.previousElementSibling).attr("data-subtype") === "t"){
                //下一个目标块不存在，获取上一个目标块
                g_targetBlockId = $(thisWidgetBlockElem.previousElementSibling).attr("data-node-id");
                infoPush(language["autoDetectId"] + "↑", 2500);
            }else if ($(thisWidgetBlockElem.nextElementSibling).attr("data-type") === "NodeList") {
                // 挂件下方是列表，但不是任务列表（若要统计无序列表/有序列表下的任务项，需要勾选统计子任务）
                g_targetBlockId = $(thisWidgetBlockElem.nextElementSibling).attr("data-node-id");
                infoPush(language["autoDetectId"] + "↓", 2500);
            }else if ($(thisWidgetBlockElem.previousElementSibling).attr("data-type") === "NodeList") {
                // 挂件上方是列表，但不是任务列表（若要统计无序列表/有序列表下的任务项，需要勾选统计子任务）
                g_targetBlockId = $(thisWidgetBlockElem.previousElementSibling).attr("data-node-id");
                infoPush(language["autoDetectId"] + "↑", 2500);
            }
        }
        }catch(err){
            errorPush("获取邻近块时出错", err);
        }
    }
}

class TimeMode extends Mode {
    modeCode = -2;
    timeRefreshInterval;
    times = [null, null];//0开始时间，1结束时间
    todayMode = false; //自定义开始/结束时间均为时间，需要按天重复
    dateMode = false;//自定义开始/结束时间均为日期，需要按天进行处理
    dateString = ["", ""];// 开始时间，结束时间字符串
    widgetHeight = setting.widgetTimeModeHeight;
    title = "";
    async init(){
        super.init();
        //设定提示词
        $("#refresh").addClass("timeMode");
        $("#refresh").attr("title", language["timeMode"]);
        modePush(language["timeMode"], 0);
        $("#innerCurrentMode").text(language["timeMode"]);
        clearInterval(this.timeRefreshInterval);
        if (setting.onstart){
            await this.calculateApply();
        }
        //进入时间模式恢复提示信息
        if (!g_displaySetting){
            window.frameElement.style.height = setting.widgetHeight;
        }
        // 外观更改
        $(".time-mode-a").css("display", "");
        // $("#outerInfos").css("display", "none")
        $("#percentage").css("display", "none");
        $("#header-left-info, #end-time-display").click(clickManualRefresh);
        $("#header-left-info, #end-time-display").dblclick(dblClickShowSetting);
        // document.getElementById("header-left-info").onclick = clickManualRefresh;
        // document.getElementById("header-left-info").ondblclick = dblClickShowSetting;
    }
    async calculateApply(){
        clearInterval(this.timeRefreshInterval);
        // 判断是否需要定时刷新
        if (setting.timeModeRefreshInterval > 0){
            clearInterval(this.timeRefreshInterval);
            this.timeRefreshInterval = setInterval(() => {
                this.calculateApply();
            }, setting.timeModeRefreshInterval);
        }else{
            clearInterval(this.timeRefreshInterval);
        }
        // 获取时间
        let percentage = -1;
        try {
           percentage = await this.getTimePercentage();
        }catch(err) {
            warnPush(err);
            showError(err.name + err.message);
            return ;
        }
        
        try {
            changeBar(percentage);
            // 时间模式左右时间占比动态化：
            if (setting.timeTextMinimize) {
                let textLength = this.dateString[0].length > this.dateString[1].length ? 
                        this.dateString[0].length : this.dateString[1].length;
                if (textLength >= 6) textLength = 4.7;
                $("#start-time-display, #end-time-display").css("min-width", `${textLength}em`);
            }
            if (this.todayMode) {
                $("#start-time-display").text(this.dateString[0]);
                $("#end-time-display").text(this.dateString[1]);
                $("#time-day-left").html("");
            }else{
                // 颜色变换都使用精确的时间百分比（不以天为单位）
                let dateGapString = getDayGapString({"endTime":this.times[1], "percentage": calculateTimePercentage(this.times[0], this.times[1])});
                $("#start-time-display").text(this.dateString[0]);
                $("#end-time-display").text(this.dateString[1]);
                $("#time-day-left").html(dateGapString);
            }
        }catch(err) {
            errorPush(err);
            warnPush("输出日期时出现错误");
            if (this.todayMode) {
                modePush(`${this.times[0].toLocaleTimeString()} ~ ${this.times[1].toLocaleTimeString()}`, 0);
            }else{
                modePush(`${this.times[0].toLocaleString()} ~ ${this.times[1].toLocaleString()}`, 0);
            }
            clearInterval(this.timeRefreshInterval);
        } 
        
    }
    destory(){
        clearInterval(this.timeRefreshInterval);
        $("#refresh").removeClass("timeMode");
        $("#percentage").css("display", "");
        $(".time-mode-a").css("display", "none");
        $("#header-left-info, #end-time-display").click(null);
        $("#header-left-info, #end-time-display").dblclick(null);
    }
    //计算时间差
    async getTimePercentage(){
        // 根据模式切换
        switch (attrSetting["timeModeMode"]) {
            // 自定义
            case 0: {
                let timeAttrResult = await this.readTimesFromAttr();
                let tempScale = this.dateMode ? SCALE.DAY : SCALE.MS;
                return calculateTimePercentage(this.times[0], this.times[1], tempScale);
                break;
            }
            // 天
            case 1: {
                await this.readTimesFromAttr(true);
                let start = new Date();
                start.setHours(0, 0, 0, 0);
                let end = new Date();
                end.setHours(23, 59, 59, 99);
                this.dateString[0] = formatDateString(start, useUserTemplate("timeFormat"));
                this.dateString[1] = formatDateString(end, useUserTemplate("timeFormat"));
                this.times[0] = start;
                this.times[1] = end;
                this.todayMode = true;
                if (!isValidStr(this.title)) {
                    $("#title").text(formatDateString(start, useUserTemplate("dateFormat")));
                    $("#title").prop("title", formatDateString(new Date(), useUserTemplate("timeFormat")));
                }
                return calculateTimePercentage(this.times[0], this.times[1]);
                break;
            }
            // 周
            case 2: {
                await this.readTimesFromAttr(true);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                let todayOfWeek = today.getDay(); // 今天是星期几（0表示星期日）
                if (todayOfWeek == 0) todayOfWeek = 7;
                this.times[0] = new Date(today.getFullYear(), today.getMonth(), today.getDate() - todayOfWeek + (setting.weekStartDay));
                this.times[1] = new Date(today.getFullYear(), today.getMonth(), today.getDate() - todayOfWeek + 6 + (setting.weekStartDay));
                // 提示词
                this.todayMode = false;
                this.dateString[0] = language["weekOfDay"][setting.weekStartDay];
                this.dateString[1] = language["weekOfDay"][(setting.weekStartDay + 6) % 7];
                if (!isValidStr(this.title)) {
                    const start = new Date(today.getFullYear(), 0, 4);  // 获取当年的1月4日
                    const offsetMillis = start.getDay() * 86400000;  // 计算1月4日距离所在周的偏移毫秒数
                    const firstMonday = new Date(start.getTime() - offsetMillis + 86400000);  // 找到所在周的第一个周一
                    const diffMillis = today.getTime() - firstMonday.getTime();  // 计算当前时间距离所在周第一个周一的毫秒数
                    const diffDays = Math.floor(diffMillis / 86400000);  // 将毫秒数转为天数
                    let numOfWeek = Math.floor((diffDays + 0) / 7) + 1;  // 计算当前是第几周
                    if (numOfWeek <= 0) {
                        numOfWeek = 0;
                    }
                    $("#title").text(useUserTemplate("weekFormat", numOfWeek, language["weekOfDay"][today.getDay()]));
                    $("#title").prop("title", `${formatDateString(today, useUserTemplate("dateFormat_simp"))} ${language["weekOfDay"][today.getDay()]}`);
                }
                return calculateTimePercentage(this.times[0], this.times[1], SCALE.DAY);
                break;
            }
            // 月
            case 3: {
                await this.readTimesFromAttr(true);
                // 获取当前日期
                const today = new Date();
                // 获取当前月份的第一天
                this.times[0] = new Date(today.getFullYear(), today.getMonth(), 1);
                this.times[1] = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                this.dateString[0] = formatDateString(this.times[0], useUserTemplate("dateFormat_simp"));
                this.dateString[1] = formatDateString(this.times[1], useUserTemplate("dateFormat_simp"));
                this.todayMode = false;
                if (!isValidStr(this.title)) {
                    $("#title").text(useUserTemplate("monthFormat", language["months"][today.getMonth()], formatDateString(today, useUserTemplate("dateFormat_simp"))));
                    $("#title").prop("title", formatDateString(today, useUserTemplate("dateFormat_simp")));
                }
                return calculateTimePercentage(this.times[0], this.times[1], SCALE.DAY);
                break;
            }
            // 年
            case 4: {
                await this.readTimesFromAttr(true);
                // 获取当前日期
                const today = new Date();
                // 获取当前年份的第一天
                this.times[0] = new Date(today.getFullYear(), 0, 1);
                // 获取当前年份的最后一天
                this.times[1] = new Date(today.getFullYear(), 11, 31);
                this.dateString[0] = formatDateString(this.times[0], useUserTemplate("dateFormat_simp"));
                this.dateString[1] = formatDateString(this.times[1], useUserTemplate("dateFormat_simp"));
                this.todayMode = false;
                if (!isValidStr(this.title)) {
                    $("#title").text(formatDateString(this.times[0], useUserTemplate("yearFormat")));
                    $("#title").prop("title", formatDateString(today, useUserTemplate("dateFormat_simp")));
                }
                return calculateTimePercentage(this.times[0], this.times[1], SCALE.DAY); 
                break;
            }
            default: {
                warnPush(language["timeRepeatSetError"]);
                throw new Error(language["timeRepeatSetError"]);
            }
        }
        
    }
    /**
     * 读取属性中时间，并设定时间
     * 属性中时间格式要求yyyy mm dd 或 yyyy mm dd hh mm 或hh mm（自动在执行时补全为当天）
     * 如果为20xx年，允许yy mm dd
     * @return true读取成功 false 读取失败
     */
    async readTimesFromAttr(titleOnly = false){
        g_thisWidgetId = getCurrentWidgetId();//获取当前挂件id
        let response = await getblockAttrAPI(g_thisWidgetId);
        // 读取标题
        if (attrName.barTitle in response.data) {
            let title = response.data[attrName.barTitle];
            if (isValidStr(title) && title != "null") {
                $("#title").html(title);
                this.title = title;
            }else{
                $("#title").html("");
                this.title = "";
            }
        }
        if (titleOnly) return;
        if (attrName.startTime in response.data && attrName.endTime in response.data){
            //属性原始字符串
            let startimeStr = response.data[attrName.startTime]
            let endtimeStr = response.data[attrName.endTime];
            if (startimeStr == "null" || endtimeStr == "null") {
                logPush("时间未设定", response.data);
                throw new Error(language["timeNotSet"]);
            }
            //将获取到的时间字符串写入挂件设置部分
            $("#startTime").val(startimeStr);
            $("#endTime").val(endtimeStr);
            let startParseResult;
            [startParseResult, this.times[0], this.dateString[0]] = parseTimeString(startimeStr, useUserTemplate("dateFormat_simp"));
            if (startParseResult <= 0) {
                // showError(Error(language["timeSetIllegal"]));
                logPush("时间设定非法", this.times[0]);
                throw new Error(language["timeSetIllegal"]);
            }
            let endParseResult;
            [endParseResult, this.times[1], this.dateString[1]] = parseTimeString(endtimeStr, useUserTemplate("dateFormat_simp"));
            if (endParseResult <= 0) {
                // showError(Error(language["timeSetIllegal"]));
                logPush("时间设定非法", this.times[1]);
                throw new Error(language["timeSetIllegal"]);
            }
            if (startParseResult == 2 && endParseResult == 2) {
                this.todayMode = true;
            }else{
                this.todayMode = false;
            }
            // 均为日期，按日期计算
            if (startParseResult == 1 && endParseResult == 1) {
                this.dateMode = true;
            }else{
                this.dateMode = false;
            }
            debugPush(`parseGetTime起${this.times[0].toLocaleString()}止${this.times[1].toLocaleString()}`);
            // 
            if (!isValidStr(this.title)) {
                $("#title").text(`${formatDateString(this.times[0])}~${formatDateString(this.times[1])}`);
            }
            return true;
        }
        if ("id" in response.data){
            logPush("时间未设定", response.data);
            // showError(language["timeNotSet"]);
            throw new Error(language["timeSetIllegal"]);
        }else{
            warnPush("获取时间属性失败", response);
            // showError(language["noTimeAttr"]);
            throw new Error(language["timeSetIllegal"]);
        }
        return false;
    }
    async refresh(){
        showError("");
        await this.calculateApply();
    }
}
/****************     方法/函数    ***************************/
/**
 * 更改显示的进度条
 * @param {*} percentage 百分比，整数，传入百分之x
 */
function changeBar(percentage){
    clearTimeout(g_barRefreshLogTimeout);
    let origin = percentage;
    if (percentage > 100) {
        percentage = 100;
    }else if (percentage < 0){
        percentage = 0;
    }
    let accuratePercentage = Math.floor(percentage * 100) / 100//下取整（间接保留两位小数）
    let intPercentage = Math.round(origin);//四舍五入取整
    document.getElementById("progress").style.width = accuratePercentage + "%";
    // document.getElementById("percentage").innerHTML = ;
    $(".apply-percentage").html(intPercentage + "%");
    g_barRefreshLogTimeout = setTimeout(()=>{logPush("进度条进度已刷新", g_thisWidgetId)}, 500);
}


/**
 * 初始化时从属性中获取当前工作模式、获取/应用颜色设置
 * @returns 手动，当前要显示的百分比，null自动
 */
async function getSettingAtStartUp(){
    g_thisWidgetId = getCurrentWidgetId();//获取当前挂件id
    // 通过API获取进度条属性
    let response = await getblockAttrAPI(g_thisWidgetId);
    // 将挂件的高度设定写入块
    if (!("custom-resize-flag" in response.data) && setting.saveDefaultHeight && ("id" in response.data)) {
        await resetWidgetHeight();
        throw new Error(language["writeHeightInfoFailed"]);
    }
    if (response.data == null) return null;
    applyProgressColor(response);//应用属性
    // 解析整合属性
    if (isValidStr(response.data[attrName.basicSetting])) {
        Object.assign(attrSetting, JSON.parse(response.data[attrName.basicSetting].replaceAll("&quot;", "\"")));
    }
    // 获取外观属性
    g_apperance.frontColor = isValidStr(response.data[attrName.frontColor])? 
        response.data[attrName.frontColor] : $("#progress").css("background-color");
    g_apperance.backColor = isValidStr(response.data[attrName.backColor]) ? 
        response.data[attrName.backColor] : $("#container").css("background-color");
    try{
        g_apperance.barWidth = isValidStr(response.data[attrName.barWidth]) ? 
            response.data[attrName.barWidth] : parseInt($("#progress").css("height").replace("px", ""));
    }catch(err){
        warnPush("获取barheight失败", err);
        g_apperance.barWidth = defaultAttr.barWidth;
    }
    //UI载入设置-统计子项
    if (response.data[attrName.taskCalculateMode] == "true"){
        $("#allTask").prop("checked", true);
    }

    // UI载入设置-开始、结束时间
    $("#startTime").val(response.data[attrName.startTime] == "null" ? "" : response.data[attrName.startTime]);
    $("#endTime").val(response.data[attrName.endTime] == "null" ? "" : response.data[attrName.endTime]);
    $("#barTitleSet").val(response.data[attrName.barTitle] == "null"? "":response.data[attrName.barTitle]);
    [g_startTimes.code, g_startTimes.time, g_startTimes.str] = parseTimeString($("#startTime").val());
    [g_endTimes.code, g_endTimes.time, g_endTimes.str] = parseTimeString($("#endTime").val());
    // 获取挂件其他设定
    // if (attrName.basicSetting in response.data) {
    //     g_attrSetting = JSON.parse(response.data[attrName.basicSetting].replaceAll("&quot;", "\""));
    // }

    //获取进度设定[请不要在之后处理属性内容]
    if (attrName.manual in response.data){
        return response.data[attrName.manual];
    }
    return null;
}

async function resetWidgetHeight() {
    // 写属性
    let data = {};
    data["custom-resize-flag"] = "progressbarT: do not delete.请不要删去此属性，否则挂件将在下次加载时重新将挂件默认宽高写入文档中";
    let response = await addblockAttrAPI(data, g_thisWidgetId);
    // 获取kramdown
    let widgetKramdown = await getKramdown(g_thisWidgetId);
    // 重写Kramdown
    let newWidgetKramdown = "";
    if (widgetKramdown.includes("/widgets/progress")) {
        if (widgetKramdown.includes("style=")) {
            newWidgetKramdown = widgetKramdown.replace(new RegExp(`style="height: .*px; width: .*px;"`, ""), `style="height: ${setting.widgetBarOnlyHeight}; width: ${setting.widgetWidth};"`) //765 48
        }else{
            newWidgetKramdown = widgetKramdown.replace(new RegExp("><\/iframe>", ""), ` style="height: ${setting.widgetBarOnlyHeight}; width: ${setting.widgetWidth};"><\/iframe>`);
        }
        logPush("【挂件记忆宽高信息】!", newWidgetKramdown);
        await updateBlockAPI(newWidgetKramdown, g_thisWidgetId);
    }else{
        logPush(widgetKramdown);
        warnPush("当前id不对应progressBarT挂件，不设定挂件高度");
    }
    throw new Error(language["writeHeightInfoFailed"]);
}

/**
 * 发送请求后，用于应用属性中关于颜色的设置
 * @param {*} response 
 */
function applyProgressColor(response){
    if (response == null) return;
    //一并进行进度条颜色样式读取和设置
    //判断为null?
    if (isValidStr(response.data[attrName.frontColor])){//前景色
        $("#progress").css("background", response.data[attrName.frontColor]);
    }else{
        $("#progress").css("background", defaultAttr.frontColor);
    }
    if (isValidStr(response.data[attrName.backColor])){//背景色
        $("#container").css("background", response.data[attrName.backColor]);
    }else{
        $("#container").css("background", defaultAttr.backColor);
    }
    //宽度和圆角
    let width = isValidStr(response.data[attrName.barWidth]) ?
        response.data[attrName.barWidth] : defaultAttr.barWidth;
    $("#progress, #container, #progress2").css("height", width + "px");
    $("#progress2").css("top", - width + "px");
    $("#container").css("border-radius", width/2 + "px");
}

/**
 * 将百分比值设置给属性
 */
async function setManualSetting2Attr(){
    let data = {};
    g_thisWidgetId = getCurrentWidgetId();//获取当前挂件id
    data[attrName.manual] = g_manualPercentage.toString();
    let response = await addblockAttrAPI(data, g_thisWidgetId);
    if (response == 0){
        logPush("已写入百分比属性", data[attrName.manual]);
        infoPush(language["saved"], 1500);
    }else{
        showError(language["writeAttrFailed"]);
        errorPush("属性获取失败", response);
    }
}

/**
 * 首次创建时写入默认属性
 */
async function setDefaultSetting2Attr(){
    let data = {};
    data[attrName["manual"]] = defaultAttr["percentage"].toString();
    data[attrName["startTime"]] = defaultAttr["start"];
    data[attrName["endTime"]] = defaultAttr["end"];
    data[attrName["autoTarget"]] = defaultAttr["targetid"];
    data[attrName["frontColor"]] = defaultAttr["frontColor"];
    data[attrName["backColor"]] = defaultAttr["backColor"];
    data[attrName["taskCalculateMode"]] = defaultAttr["alltask"].toString();
    data[attrName["barWidth"]] = defaultAttr["barWidth"].toString();
    // data[attrName["basicSetting"]] = JSON.stringify(g_attrSetting);
    let response = await addblockAttrAPI(data, g_thisWidgetId);
    if (response == 0){
        logPush("初始化时写入属性", data);
        infoPush(language["saved"], 1500);
    }else{
        showError(language["writeAttrFailed"]);
        errorPush("属性获取失败", response);
    }
}

function showError(msg, timeout = 7000){
    if (msg.includes("fetch")) {
        warnPush("fetch error ingored");
        return;
    }
    // $(`<p>${msg}</p>`).appendTo("#errorInfo");
    clearTimeout(g_errorPushTimeout);
    $("#errorInfo").text(msg);
    if (timeout == 0) return;
    if (msg != ""){
        if (!g_displaySetting){
            displaySetting();
        }
        return;
    } else {
        // 推送空白，如果同时展开，需要折叠
        if (g_displaySetting){
            displaySetting();
        }
    }
    g_errorPushTimeout = setTimeout(()=>{
        $("#errorInfo").text("");
    }, timeout);
}

function infoPush(msg, timeout = 7000){
    clearTimeout(g_infoPushTimeout);
    $("#infoInfo").text(msg);
    if (msg === language["saved"]) {//已保存时下划线注明
        $("#percentage").css("text-decoration", "underline");
    }
    if (msg === language["refreshed"]) {
        $("#percentage").css("text-decoration", "overline");
    }
    if (timeout == 0) return;
    g_infoPushTimeout = setTimeout(()=>{
        $("#infoInfo").text("");
        $("#percentage").css("text-decoration", "");
    }, timeout);
}

function modePush(msg = "", timeout = 2000){
    clearTimeout(g_modePushTimeout);
    $("#modeInfo").html(msg);
    if (timeout == 0) return;
    g_modePushTimeout = setTimeout(()=>{$("#modeInfo").text("");}, timeout);
}

/**
 * 初始化挂件，设置颜色等
 */
async function __init(){
    //读取模式
    g_manualPercentage = await getSettingAtStartUp();
    // logPush("启动时模式", g_manualPercentage);
    //没有响应属性
    if (g_manualPercentage == null || g_manualPercentage == NaN){
        logPush("重设挂件宽高")
        //设置挂件宽高
        window.frameElement.style.width = setting.widgetWidth;
        window.frameElement.style.height = setting.widgetHeight;
        //创建属性（延时创建，防止无法写入）
        setTimeout(async function(){await setDefaultSetting2Attr();}, 3000);
        g_manualPercentage = defaultAttr["percentage"];
    }
    g_manualPercentage = parseFloat(g_manualPercentage);
    //初始化外观设置项input;
    //设定Jscolor设置参数
    defaultAttr.frontColorSelector.value = g_apperance.frontColor;
    $("#frontColor").attr("data-jscolor", JSON.stringify(defaultAttr.frontColorSelector));
    defaultAttr.backColorSelector.value = g_apperance.backColor;
    $("#backColor").attr("data-jscolor", JSON.stringify(defaultAttr.backColorSelector));
    jscolor.install();//注入jscolor
    $("#barWidth").val(g_apperance.barWidth);
    // showButtonsController(setting.showButtons);

    //呃，写入提示文字
    $("#saveAppearBtn").text(language["saveBtnText"]);
    $("#saveSettingBtn").text(language["saveSettingText"]);
    $("#frontText").text(language["frontColorText"]);
    $("#backText").text(language["backColorText"]);
    $("#barWidthText").text(language["barWidthText"]);
    $("#blockIdText").text(language["blockIdText"]);
    $("#startTimeText").text(language["startTimeText"]);
    $("#endTimeText").text(language["endTimeText"]);
    $("#allTaskText").text(language["allTaskText"]);
    // $("#showButtonText").text(language["showButtonText"]);
    $("#changeMode").text(language["changeModeText"]);
    $("#settingBtn").attr("title", language["ui_setting_btn_hint"]);
    $("#barTitleText").text(language["barTitleText"]);
    $("#timeModeSelectText").text(language["timeModeSelectText"]);
    $("#resetHeight").text(language["resetHeightText"]);
    $("#resetHeight").prop("title", language["resetHeightHint"]);
    
    for (let i = 0; i<language["timeModeArray"].length; i++) {
        $("#timeModeSelect").append(`<option value="${i}">${language["timeModeArray"][i]}</option>`);
    }
    $("#timeModeSelect").val(attrSetting["timeModeMode"]);

    // 初始化日期选择控件
    laydate.render({
        elem: "#startTimePicker"
        ,format: "yyyy-MM-dd"
        ,trigger: "click"
        ,lang: language["calendar_lang"]
        ,value: g_startTimes.code > 0 ? g_startTimes.time : new Date()
        ,ready: function(date) {
            window.frameElement.style.height = $("body").outerHeight() + 355 + "px";
            if (date.month < 10) {
                date.month = "0" + date.month;
            }
            if (date.date < 10) {
                date.date = "0" + date.date;
            }
            if (!isValidStr($("#startTime").val())) {
                $("#startTime").val(`${date.year}-${date.month}-${date.date}`);
            }else{
                let [resultCode, newdate, _] = parseTimeString($("#startTime").val());
                if (resultCode == 1) {
                    // date.date = newdate.getDate();
                    date = newdate;
                }
            }
            
        }
        // ,change: function(value) {
        //     $("#startTime").val(value);
        // }
        ,done: function(value) {
            $("#startTime").val(value);
        }
    });
    laydate.render({
        elem: "#endTimePicker"
        ,format: "yyyy-MM-dd"
        ,value: g_endTimes.code > 0 ? g_endTimes.time : null
        ,lang: language["calendar_lang"]
        ,trigger: "click"
        ,ready: function(){
            window.frameElement.style.height = $("body").outerHeight() + 355 + "px";
        }
        // ,change: function(value) {
        //     $("#endTime").val(value);
        // }
        ,done: function(value) {
            $("#endTime").val(value);
        }
    });
    //样式更新
    __refreshAppreance();
    //模式更改
    if (g_manualPercentage >= 0){//手动模式
        g_mode = new ManualMode();
    }else if (g_manualPercentage == -2){//时间模式
        g_mode = new TimeMode();
    }else if (g_manualPercentage == -1){//自动模式
        g_mode = new AutoMode();
    }else{
        g_mode = new ManualMode();
        warnPush("初始化时模式设定不正确，将被重设", g_manualPercentage);
        g_manualPercentage = 0;
    }
    //初始化模式
    await g_mode.init();
}

/**
 * 刷新挂件颜色
 */
function __refreshAppreance(){
    if (window.top.siyuan.config.appearance.mode){
        $("#container").addClass("container_dark");
        $("#progress").addClass("progress_dark");
        $("#percentage, #modeInfo, .settings span").addClass("text_dark");
        $("input").addClass("input_dark");
        $("button").addClass("btn_dark");
        $("body").attr("dark_mode", "true");
    }else{
        $("#container").removeClass("container_dark");
        $("#progress").removeClass("progress_dark");
        $("#percentage, #modeInfo, .settings span").removeClass("text_dark");
        $("input").removeClass("input_dark");
        $("button").removeClass("btn_dark");
        $("body").removeAttr("dark_mode");
    }
}

/**
 * 手动点击刷新（button按下后事件）
 * 没有块则创建块！
 */
async function __refresh(){
    try{
        await g_mode.refresh();
        __refreshAppreance();//深色模式重设
        applyProgressColor(await getblockAttrAPI(g_thisWidgetId));//进度条颜色重设
        infoPush(language["refreshed"], 1500);
    }catch(err){
        errorPush(err);
        showError(err.name + err.message);
    }
}

/**
 * 双击刷新按钮切换模式
 */
async function dblClickChangeMode(){
    clearTimeout(g_refreshBtnTimeout);
    // TODO 更改为数组控制切换顺序，弃用if else 结构
    g_mode.destory();//退出上一模式
    if (g_manualPercentage) {

    }
    let modes = [AutoMode, TimeMode, ManualMode];

    if (g_manualPercentage == -1){//如果当前为自动模式，则切换为时间模式
        g_manualPercentage = -2;
        g_mode = new TimeMode();
    }else if (g_manualPercentage >= 0){//如果当前为手动模式，则切换为自动模式
        g_manualPercentage = -1;
        g_mode = new AutoMode();
    }else if (g_manualPercentage <= -2){//如果当前为时间模式，则切换为手动模式
        g_manualPercentage = 0;//切换为手动模式
        g_mode = new ManualMode();
    }
    await setManualSetting2Attr();//保存模式设置
    await g_mode.init();//进入下一模式
}

/** 双击百分比打开设置界面 */
function dblClickShowSetting() {
    clearTimeout(g_refreshBtnTimeout);
    displaySetting();
}

/**
 * 单击刷新按钮
 */
async function clickManualRefresh(){
    clearTimeout(g_refreshBtnTimeout);
    g_refreshBtnTimeout = setTimeout(__refresh, 400);
};

/**
 * 显示/隐藏设置项目
 */
function displaySetting(){
    if (g_displaySetting == false){
        g_displaySetting = true;
        $("#settings").css("display", "");
        window.frameElement.style.height = $("body").outerHeight() + 55 + "px";
    }else{
        g_displaySetting = false;
        $("#settings").css("display", "none");
        window.frameElement.style.height = g_mode.widgetHeight;
    }
}

/**
 * 从设置项读取并更改进度条外观
 */
function changeBarAppearance(){
    let frontColor = $("#frontColor").val();
    let backColor = $("#backColor").val();
    let width = $("#barWidth").val();
    // let showButtons = $("#showButtonCheckBox").prop("checked");
    $("#progress").css("background", frontColor);
    $("#container").css("background", backColor);
    $("#progress, #container").css("height", width + "px");
    //圆角重设, i.e. 
    $("#container").css("border-radius", width/2 + "px");
    // showButtonsController(showButtons);
}

/**
 * 控制按钮是否显示，传入true显示，false不显示
 * @param {*} showButtons 
 */
function showButtonsController(showButtons) {
    $("#settingBtn, #refresh").css("display", showButtons ? "" : "none");
    setting.showButtons = showButtons;
    document.getElementById("percentage").onclick = showButtons ? null : clickManualRefresh;
    document.getElementById("percentage").ondblclick = showButtons ? null : dblClickShowSetting;
    document.getElementById("percentage").title = showButtons ? language["ui_percentage_hint"] : language["ui_percentage_btn_hint"];
    // 控制不显示按钮时的交互方式
    $("#percentage").css({
        "-moz-user-select": showButtons ? "" : "none",
        "-o-user-select": showButtons ? "" : "none",
        "-khtml-user-select": showButtons ? "" : "none",
        "-webkit-user-select": showButtons ? "" : "none",
        "-ms-user-select": showButtons ? "" : "none",
        "user-select": showButtons ? "" : "none",
        "cursor": showButtons ? "" : "pointer"
    });
}

/**
 * 保存外观设置
 */
async function saveAppearance(){
    let data = {};
    g_thisWidgetId = getCurrentWidgetId();//获取当前挂件id
    data[attrName.frontColor] = $("#frontColor").val();
    data[attrName.backColor] = $("#backColor").val();
    data[attrName.barWidth] = $("#barWidth").val();
    // data[attrName.basicSetting] = JSON.stringify(g_attrSetting);
    let response = await addblockAttrAPI(data, g_thisWidgetId);
    if (response == 0){
        logPush("已写入外观属性");
        infoPush(language["saved"], 1500);
    }else{
        showError(language["writeAttrFailed"]);
        errorPush("属性获取失败", response);
    }
}

/**
 * 写入块id、开始时间、结束时间
 */
async function saveSettings(){
    let data = {};
    //获取用户设置，写入data
    //注意判空，为空写null
    //为空时保留null（因为为空时不显示null）
    data[attrName.autoTarget] = $("#blockId").val();
    data[attrName.startTime] = $("#startTime").val();
    data[attrName.endTime] = $("#endTime").val();
    data[attrName.taskCalculateMode] = document.getElementById("allTask").checked.toString();
    data[attrName.barTitle] = $("#barTitleSet").val();
    loadUI2AttrSetting();
    data[attrName.basicSetting] = JSON.stringify(attrSetting);
    for (let attr in data){
        if (data[attr] == "") data[attr] = "null";
    }
    logPush("属性项", data);
    //保存属性
    if (await addblockAttrAPI(data, g_thisWidgetId)){
        errorPush(language["writeAttrFailed"]);
        showError(language["writeAttrFailed"]);
        return;
    }
    //保存属性后触发刷新，可能需要延时？
    infoPush("请等待刷新完成");
    setTimeout(__refresh, 1000);
    function loadUI2AttrSetting() {
        attrSetting.timeModeMode = parseInt($("#timeModeSelect").val());
    }
}
/******************     非函数部分       ************************ */

let g_targetBlockId;//目标任务列表块id
let g_refreshBtnTimeout;//防止多次刷新、区分刷新点击数延时
let g_thisWidgetId;
let g_errorPushTimeout;//推送消失延时
let g_infoPushTimeout;//通知推送消失延时
let g_modePushTimeout;//模式提示消失延时
let g_manualPercentage = null;//手动模式下百分比，注意，负值用于区分为其他模式
let g_progressElem = document.getElementById("progress");
let g_progressContainerElem = document.getElementById("container");
let g_mode;
let g_modeId;
let g_barRefreshLogTimeout;
let g_displaySetting = false;
let g_startTimes = {"code": null, time: null, str: null};
let g_endTimes = {"code": null, time: null, str: null};
// let g_attrSetting = Object.assign({}, attrSetting);
let g_apperance = {
    frontColor: defaultAttr.frontColor,
    backColor: defaultAttr.backColor,
    barWidth: defaultAttr.barWidth
}

try{
    
    //绑定按钮事件
    //单击，手动刷新
    document.getElementById("refresh").onclick = clickManualRefresh;
    //双击：切换模式
    document.getElementById("refresh").ondblclick = dblClickChangeMode;
    document.getElementById("settingBtn").onclick = displaySetting;
    $("#changeMode").on("click", dblClickChangeMode);
    $("#frontColor, #backColor, #barWidth").on("change", changeBarAppearance);
    $("#resetHeight").click(resetWidgetHeight);
    $("#saveAppearBtn").on("click", saveAppearance);
    $("#saveSettingBtn").on("click", async function(){await saveSettings();});
    
    showButtonsController(setting.showButtons);
    
    await __init();
}catch (err){
    showError(err.name + err.message);
    errorPush(err);
}