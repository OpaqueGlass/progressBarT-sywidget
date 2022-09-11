import {
    getKramdown,
    getCurrentWidgetId,
    getblockAttrAPI,
    isValidStr,
    insertBlockAPI,
    addblockAttrAPI
} from './API.js';//啊啊啊，务必注意：ios要求大小写一致，别写错
import {language, setting} from './config.js';
/**模式类 */
class Mode {
    modeCode = 0;//模式对应的默认百分比值
    // get modeCode(){
    //     return this._modeCode;
    // }
    //计算和显示百分比
    async calculateApply() {}
    //初始化模式(子类实现时请先调用，手动模式除外)
    async init() {
        g_manualPercentage = this.modeCode;
        errorPush("");
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
        // super.init();
        errorPush("");
        //提示词设置
        $("#refresh").addClass("manualMode");
        $("#refresh").attr("title", language["manualMode"]);
        modePush(language["manualMode"]);
        g_progressContainerElem = document.getElementById("container");
        //获取点击/拖拽/触摸拖拽进度条事件
        //实现单击进度条任意位置
        g_progressContainerElem.addEventListener("click", this.eventClickBar);
        g_progressContainerElem.addEventListener("mousedown", this.eventMousedownBar);
        g_progressContainerElem.addEventListener("touchstart", this.eventTouchstartBar);
        changeBar(g_manualPercentage);
        //手动模式禁用动画
        $("#progress").css("transition-duration", "0s");
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
        console.assert((event.clientX - g_progressContainerElem.offsetLeft) >= 0, `点击定位进度实现逻辑有缺陷 ${percentage}`+
          `点击位置clientX${event.clientX}， 进度条左定位offsetLeft${g_progressContainerElem.offsetLeft}`);
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
    async init(){
        super.init();
        //设定自动模式提示词
        $("#refresh").attr("title", language["autoMode"]);
        $("#refresh").addClass("autoMode");
        modePush(language["autoMode"]);
        //重新读取目标块id
        await this.readBlockIdFromAttr();
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
        //设定自动模式功能键
        if (setting.taskFunction){
            $(`<button id="cancelAll">Fn</button>`).prependTo("#infos");
            // $("#cancelAll").click(this.fnclick);
            $("#cancelAll").dblclick(this.uncheckAll);
            $("#cancelAll").attr("title", language["autoModeFnBtn"]);
        }
    }
    destory(){
        this.observeClass.disconnect();
        this.observeNode.disconnect();
        clearInterval(this.autoRefreshInterval);
        $("#refresh").removeClass("autoMode");
        $("#cancelAll").remove();
    }
    async refresh(){
        errorPush("");//清空提示词
        infoPush("");
        //从挂件中读取id
        await this.readBlockIdFromAttr();
        console.log("手动点击刷新，读取到属性中id", g_targetBlockId);
        //没有块则创建块
        if (!isValidStr(g_targetBlockId) && setting.createBlock){
            console.info("无效id，将创建新块");
            let tempId = await insertBlockAPI("- [ ] ", g_thisWidgetId);
            if (isValidStr(tempId)){
                g_targetBlockId = tempId;
                let data = {};
                data[setting.autoTargetAttrName] = g_targetBlockId;
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
            //判断目标块
            if (!isValidStr(g_targetBlockId)){
                throw new Error(language["needSetAttr"]);
            };
            let percentage;
            //根据设置，从api/dom获得百分比
            percentage = this.calculatePercentageByDom(g_targetBlockId);
            //使用API重试
            if (percentage < 0 && !noAPI){
                errorPush(language["unknownIdAtDom"], 2000);
                $("#refresh").attr("title", language["autoModeAPI"]);
                percentage = this.modeCode;
                percentage = await this.calculatePercentageByAPI(g_targetBlockId);
                if (percentage >= 0) {
                    infoPush(language["usingAPI"]);
                    errorPush("");
                }
            }else{
                $("#refresh").attr("title", language["autoMode"]);
            }
            if (percentage < 0){
                throw new Error(language["notTaskList"]);
            }
            //更新进度条
            changeBar(percentage);
            }catch(err){
                console.error(err);
                errorPush(err);
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
            console.error(err);
            errorPush("错误：无法获取任务列表变化" + err);
        }
    }
    __setObserver(blockid){
        console.log("设定/重设observer");
        try{
            this.observeClass.disconnect();
            this.observeNode.disconnect();
            let target = $(window.parent.document).find(`div[data-node-id=${blockid}]`);
            if (target.length <= 0) {
                errorPush(language["cantObserve"] + blockid, 2000);
                console.warn("无法在DOM中找到对应块id，未设定observer");
                return;
            }
            console.assert(target.length == 1, "错误：多个匹配的观察节点");
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
            errorPush(language["setObserveErr"] + err, 2000);
            console.error(err);
            console.error("observer设置失败，无法获取任务列表变化");
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
        let allTasks = $(window.parent.document).find(`div[data-node-id=${blockid}]${directSymbol}[data-marker="*"]`);
        let checkedTasks = $(window.parent.document).find(`div[data-node-id=${blockid}]${directSymbol}.protyle-task--done[data-marker="*"]`);
        if (allTasks.length == 0){
            console.warn("DOM计算进度失败：找不到对应块，或块类型错误。", blockid);
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
            // errorPush(language["getKramdownFailed"] + blockid);
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
    async readBlockIdFromAttr(){
        g_thisWidgetId = getCurrentWidgetId();//获取当前挂件id
        let response = await getblockAttrAPI(g_thisWidgetId);
        if (setting.autoTargetAttrName in response.data){
            g_targetBlockId =  response.data[setting.autoTargetAttrName];
        }else{
            g_targetBlockId = null;
        }
        if (setting.taskCalculateModeAttrName in response.data){
            this.calculateAllTasks = response.data[setting.taskCalculateModeAttrName] == "true" ? true:false;
        }else{
            this.calculateAllTasks = setting.defaultTaskCalculateMode;
        }
        //如果没有设定，则自动获取上下文id
        if (!isValidStr(g_targetBlockId)){
            let thisWidgetBlockElem = window.frameElement.parentElement.parentElement;
            if ($(thisWidgetBlockElem.nextElementSibling).attr("data-subtype") === "t"){
                g_targetBlockId = $(thisWidgetBlockElem.nextElementSibling).attr("data-node-id");
                infoPush(language["autoDetectId"]);
            }else if ($(thisWidgetBlockElem.previousElementSibling).attr("data-subtype") === "t"){
                //下一个目标块不存在，获取上一个目标块
                g_targetBlockId = $(thisWidgetBlockElem.previousElementSibling).attr("data-node-id");
                infoPush(language["autoDetectId"]);
            }
        }
    }
}

class TimeMode extends Mode {
    modeCode = -2;
    timeRefreshInterval;
    times = [null, null];//0开始时间，1结束时间
    todayMode = false;
    async init(){
        super.init();
        //设定提示词
        $("#refresh").addClass("timeMode");
        $("#refresh").attr("title", language["timeMode"]);
        modePush(language["timeMode"], 0);
        clearInterval(this.timeRefreshInterval);
        if (setting.onstart){
            await this.calculateApply();
        }
    }
    async calculateApply(){
        clearInterval(this.timeRefreshInterval);
        //有时间才能计算
        if (await this.readTimesFromAttr()){
            if (setting.timeModeRefreshInterval > 0){
                this.timeRefreshInterval = setInterval(() => {
                    this.calculateTimeGap();
                }, setting.timeModeRefreshInterval);
            }
            changeBar(this.calculateTimeGap());
            if (this.todayMode){
                modePush(`${this.times[0].toLocaleTimeString()} ~ ${this.times[1].toLocaleTimeString()}`, 0);
            }else{
                modePush(`${this.times[0].toLocaleString()} ~ ${this.times[1].toLocaleString()}`, 0);
            }
        }else{
            //失败情况应该已经在readTimesFromAttr中处理
        }
    }
    destory(){
        clearInterval(this.timeRefreshInterval);
        $("#refresh").removeClass("timeMode");
    }
    //计算时间差
    calculateTimeGap(){
        let totalGap = this.times[1] - this.times[0];
        if (totalGap <= 0){
            errorPush(language["timeModeSetError"]);
            return;
        }
        let nowDate = new Date();
        let passed = nowDate - this.times[0];
        let result = passed / totalGap * 100.0;
        if (result < 0){
            errorPush(language["earlyThanStart"], 7000);
        }else if (result > 100){
            // result = 100;
            // infoPush();
        }
        return result;
    }
    /**
     * 读取属性中时间，并设定时间
     * 属性中时间格式要求yyyy mm dd 或 yyyy mm dd hh mm 或hh mm（自动在执行时补全为当天）
     * 如果为20xx年，允许yy mm dd
     * @return true读取成功 false 读取失败
     */
    async readTimesFromAttr(){
        g_thisWidgetId = getCurrentWidgetId();//获取当前挂件id
        let response = await getblockAttrAPI(g_thisWidgetId);
        if (setting.startTimeAttrName in response.data && setting.endTimeAttrName in response.data){
            //属性原始字符串
            let startimeStr = response.data[setting.startTimeAttrName]
            let endtimeStr = response.data[setting.endTimeAttrName];
            if (startimeStr == "null" || endtimeStr == "null") {
                errorPush(language["timeNotSet"]);
                console.warn("时间未设定", response.data);
                return false;
            }
            //拆分连续的数字（string）
            let startNums = startimeStr.match(/[0-9]+/gm);
            let endNums = endtimeStr.match(/[0-9]+/gm);
            let nums = [startNums, endNums];
            this.todayMode = false;
            for (let i = 0; i < nums.length; i++){
                if (!isValidStr(nums[i])) { //无匹配项
                    errorPush(language["timeSetIllegal"]);
                    console.warn("时间设定非法", this.times[i]);
                    return false;
                }
                //处理yy mm dd的情况
                if (nums[i].length != 2){
                    if (nums[i][0].length == 2){
                        nums[i][0] = "20" + nums[i][0];
                    }
                }
                switch (nums[i].length){
                    case 3: {//输入格式YYYY MM DD
                        this.times[i] = new Date(nums[i][0], nums[i][1] - 1, nums[i][2]);
                        break;
                    }
                    case 5: {//输入格式YYYY MM DD HH MM
                        this.times[i] = new Date(nums[i][0], nums[i][1] - 1, nums[i][2], nums[i][3], nums[i][4]);
                        break;
                    }
                    case 2: {//输入格式HH MM
                        this.times[i] = new Date();
                        this.times[i].setHours(nums[i][0]);
                        this.times[i].setMinutes(nums[i][1]);
                        this.times[i].setSeconds(0);
                        this.todayMode = true;//标记为当天模式
                        break;
                    }
                    default: {
                        errorPush(Error(language["timeSetIllegal"]));
                        console.warn("时间设定非法", this.times[i]);
                        return false;
                    }
                }
            }
            console.info(`parseGetTime起${this.times[0].toLocaleString()}止${this.times[1].toLocaleString()}`);
            return true;
        }
        if ("id" in response.data){
            console.warn("时间未设定", response.data);
            errorPush(language["timeNotSet"]);
        }else{
            console.warn("获取时间属性失败", response);
            errorPush(language["noTimeAttr"]);
        }
        return false;
    }
    async refresh(){
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
    if (percentage >= 100) {
        percentage = 100;
        document.getElementById("progress").style.borderBottomRightRadius = 5 + "px";
        document.getElementById("progress").style.borderTopRightRadius = 5 + "px";
    }else{
        //设定圆角
        document.getElementById("progress").style.borderBottomRightRadius = 0;
        document.getElementById("progress").style.borderTopRightRadius = 0;
    }
    let accuratePercentage = Math.floor(percentage * 100) / 100//下取整（间接保留两位小数）
    let intPercentage = Math.round(origin);//四舍五入取整
    document.getElementById("progress").style.width = accuratePercentage + "%";
    document.getElementById("percentage").innerHTML = intPercentage + "%";
    g_barRefreshLogTimeout = setTimeout(()=>{console.log("进度条进度已刷新", g_thisWidgetId)}, 500);
}


/**
 * 初始化时从属性中获取当前工作模式、应用颜色设置
 * @returns 手动，当前要显示的百分比，null自动
 */
async function getSettingAtStartUp(){
    g_thisWidgetId = getCurrentWidgetId();//获取当前挂件id
    let response = await getblockAttrAPI(g_thisWidgetId);
    console.log("getAttr", response);
    if (response.data == null) return null;
    applyProgressColor(response);
    if (setting.manualAttrName in response.data){
        return response.data[setting.manualAttrName];
    }
    return null;
}

/**
 * 应用属性中关于颜色的设置
 * @param {*} response 
 */
function applyProgressColor(response){
    if (response == null) return;
    //一并进行进度条颜色样式读取和设置
    if (setting.frontColorAttrName in response.data && setting.backColorAttrName in response.data){
        //判断为null?
        if (isValidStr(response.data[setting.frontColorAttrName])){
            $("#progress").css("background", response.data[setting.frontColorAttrName]);
        }else{
            $("#progress").css("background", "");
        }
        if (isValidStr(response.data[setting.backColorAttrName])){
            $("#container").css("background", response.data[setting.backColorAttrName]);
        }else{
            $("#container").css("background", "");
        }
    }
}

/**
 * 将百分比值设置给属性
 */
async function setManualSetting2Attr(){
    let data = {};
    g_thisWidgetId = getCurrentWidgetId();//获取当前挂件id
    data[setting.manualAttrName] = g_manualPercentage.toString();
    let response = await addblockAttrAPI(data, g_thisWidgetId);
    if (response == 0){
        console.log("已写入百分比属性", data[setting.manualAttrName]);
        infoPush(language["saved"], 1500);
    }else{
        errorPush(language["writeAttrFailed"]);
    }
}

/**
 * 首次创建时写入默认属性
 */
async function setDefaultSetting2Attr(){
    let data = {};
    data[setting["manualAttrName"]] = setting.defaultMode.toString();
    data[setting["startTimeAttrName"]] = "null";
    data[setting["endTimeAttrName"]] = "null";
    data[setting["autoTargetAttrName"]] = "null";
    data[setting["frontColorAttrName"]] = setting.defaultFrontColor;
    data[setting["backColorAttrName"]] = setting.defaultBackColor;
    data[setting["taskCalculateModeAttrName"]] = setting["defaultTaskCalculateMode"].toString();
    let response = await addblockAttrAPI(data, g_thisWidgetId);
    if (response == 0){
        console.log("初始化时写入属性", data);
        infoPush(language["saved"], 1500);
    }else{
        errorPush(language["writeAttrFailed"]);
    }
}



function errorPush(msg, timeout = 10000){
    // $(`<p>${msg}</p>`).appendTo("#errorInfo");
    clearTimeout(g_errorPushTimeout);
    $("#errorInfo").text(msg);
    if (timeout == 0) return;
    g_errorPushTimeout = setTimeout(()=>{$("#errorInfo").text("");}, timeout);
}

function infoPush(msg, timeout = 7000){
    clearTimeout(g_infoPushTimeout);
    $("#infoInfo").text(msg);
    if (timeout == 0) return;
    g_infoPushTimeout = setTimeout(()=>{$("#infoInfo").text("");}, timeout);
}

function modePush(msg = "", timeout = 2000){
    clearTimeout(g_modePushTimeout);
    $("#modeInfo").text(msg);
    if (timeout == 0) return;
    g_modePushTimeout = setTimeout(()=>{$("#modeInfo").text("");}, timeout);
}

/**
 * 初始化挂件，设置颜色等
 */
async function __init(){
    //读取模式
    g_manualPercentage = await getSettingAtStartUp();
    console.log("启动时模式", g_manualPercentage);
    //没有响应属性
    if (g_manualPercentage == null || g_manualPercentage == NaN){
        //创建属性（延时创建，防止无法写入）
        setTimeout(async function(){await setDefaultSetting2Attr();}, 1000);
        g_manualPercentage = setting.defaultMode;
    }
    g_manualPercentage = parseFloat(g_manualPercentage);
    //防止首次启动读取错误
    //设置挂件宽高
    // if (g_manualPercentage == null){
        window.frameElement.style.width = setting.widgetWidth;
        window.frameElement.style.height = setting.widgetHeight;
    // }
    //样式更新
    __refreshAppreance();
    if (g_manualPercentage >= 0){//手动模式
        g_mode = new ManualMode();
    }else if (g_manualPercentage == -2){//时间模式
        g_mode = new TimeMode();
    }else if (g_manualPercentage == -1){//自动模式
        g_mode = new AutoMode();
    }else{
        g_mode = new ManualMode();
        console.warn("初始化时模式设定不正确，将被重设", g_manualPercentage);
        g_manualPercentage = 0;
    }
    await g_mode.init();
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
        await g_mode.refresh();
        __refreshAppreance();//深色模式重设
        applyProgressColor(await getblockAttrAPI(g_thisWidgetId));//进度条颜色重设
    }catch(err){
        console.error(err);
        errorPush(err);
    }
}

/**
 * 双击刷新按钮切换模式
 */
async function dblClickChangeMode(){
    clearTimeout(g_refreshBtnTimeout);
    g_mode.destory();//退出上一模式
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

/**
 * 单击刷新按钮
 */
async function clickManualRefresh(){
    clearTimeout(g_refreshBtnTimeout);
    g_refreshBtnTimeout = setTimeout(__refresh, 400);
};
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
let g_barRefreshLogTimeout;

try{
    //绑定按钮事件
    //单击，手动刷新
    document.getElementById("refresh").onclick = clickManualRefresh;
    //双击：切换模式
    document.getElementById("refresh").ondblclick = dblClickChangeMode;
    await __init();
}catch (err){
    errorPush(err);
    console.error(err);
}
