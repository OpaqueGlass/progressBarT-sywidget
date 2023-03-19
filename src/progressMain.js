import {
    getKramdown,
    getCurrentWidgetId,
    getblockAttrAPI,
    isValidStr,
    insertBlockAPI,
    addblockAttrAPI,
    updateBlockAPI
} from './API.js';//啊啊啊，务必注意：ios要求大小写一致，别写错
import {language, setting, defaultAttr, attrName/*, attrSetting*/} from './config.js';
/**模式类 */
class Mode {
    modeCode = 0;//模式对应的默认百分比值
    // 模式id
    modeId = 0;
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
        //提示词设置
        $("#refresh").addClass("manualMode");
        $("#refresh").attr("title", language["manualMode"] + language["ui_refresh_btn_hint"]);
        modePush(language["manualMode"]);
        $("#innerCurrentMode").text(language["manualMode"]);
        $("#container").addClass("canClick");
        errorPush("");
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
            window.frameElement.style.height = setting.widgetBarOnlyHeight;
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
        $("#refresh").attr("title", language["autoMode"] + language["ui_refresh_btn_hint"]);
        $("#refresh").addClass("autoMode");
        modePush(language["autoMode"]);
        $("#innerCurrentMode").text(language["autoMode"]);
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
        //自动模式下隐藏提示信息
        if (!g_displaySetting){
            window.frameElement.style.height = setting.widgetBarOnlyHeight;
        }
        $("#outerInfos").css("display", "none");
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
                console.warn("无法在DOM中找到对应块id，未设定observer", blockid);
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
        let allTasks = $(window.parent.document).find(`div[data-node-id=${blockid}]${directSymbol}[data-marker="*"][data-subtype="t"]`);
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
            console.error("获取邻近块时出错", err);
        }
    }
}

class TimeMode extends Mode {
    modeCode = -2;
    timeRefreshInterval;
    times = [null, null];//0开始时间，1结束时间
    todayMode = false;
    dateString = ["", ""];// 开始时间，结束时间字符串
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
        $("#outerInfos").css("display", "");     
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
            try {
                if (setting.showGapDay == false) {
                    modePush(`${this.dateString[0]} ~ ${this.dateString[1]}`);
                    return;
                }
                if (this.todayMode) {
                    modePush(`${this.dateString[0]} ~ ${this.dateString[1]}`, 0);
                }else{
                    // 计算还有多少天
                    let gapDay = this.calculateDateGapByDay(new Date(), this.times[1]);
                    let dateGapString = "";
                    if (gapDay > 0) {
                        dateGapString = `D-${gapDay}`;
                    } else if (gapDay == 0) {
                        dateGapString = `D-DAY`;
                    } else {
                        dateGapString = `+${-gapDay}`;
                    }
                    modePush(`${this.dateString[0]} ~ ${this.dateString[1]} ${dateGapString}`, 0);
                }
            }catch(err) {
                console.error(err);
                console.warn("输出日期时出现错误");
                if (this.todayMode) {
                    modePush(`${this.times[0].toLocaleTimeString()} ~ ${this.times[1].toLocaleTimeString()}`, 0);
                }else{
                    modePush(`${this.times[0].toLocaleString()} ~ ${this.times[1].toLocaleString()}`, 0);
                }
            } 
        }else{
            //失败情况应该已经在readTimesFromAttr中处理
        }
    }
    destory(){
        clearInterval(this.timeRefreshInterval);
        $("#refresh").removeClass("timeMode");
        $("#outerInfos").css("display", "none");     
    }
    //计算时间差
    calculateTimeGap(){
        let totalGap = this.times[1] - this.times[0];
        if (totalGap <= 0){
            errorPush(language["timeModeSetError"]);
            console.warn(language["timeModeSetError"]);
            return;
        }
        let nowDate = new Date();
        let passed = nowDate - this.times[0];
        let result = passed / totalGap * 100.0;
        if (result < 0){
            errorPush(language["earlyThanStart"], 7000);
            console.warn(language["earlyThanStart"]);
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
        if (attrName.startTime in response.data && attrName.endTime in response.data){
            //属性原始字符串
            let startimeStr = response.data[attrName.startTime]
            let endtimeStr = response.data[attrName.endTime];
            if (startimeStr == "null" || endtimeStr == "null") {
                errorPush(language["timeNotSet"]);
                console.warn("时间未设定", response.data);
                return false;
            }
            //将获取到的时间字符串写入挂件设置部分
            $("#startTime").val(startimeStr);
            $("#endTime").val(endtimeStr);
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
                        this.dateString[i] = this.times[i].toLocaleDateString();
                        break;
                    }
                    case 5: {//输入格式YYYY MM DD HH MM
                        this.times[i] = new Date(nums[i][0], nums[i][1] - 1, nums[i][2], nums[i][3], nums[i][4]);
                        this.dateString[i] = this.times[i].toLocaleString();
                        break;
                    }
                    case 2: {//输入格式HH MM
                        this.times[i] = new Date();
                        this.times[i].setHours(nums[i][0]);
                        this.times[i].setMinutes(nums[i][1]);
                        this.times[i].setSeconds(0);
                        this.dateString[i] = this.times[i].toLocaleTimeString();
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
    /**
     * 计算两个日期相差的天数，返回天数
     * end - start
     * @param {Date} start
     * @param {Date} end
     * @return {int} 正数：start距离end还有x天
     */
     calculateDateGapByDay(start, end) {
        let from = Date.parse(start.toDateString());
        let to = Date.parse(end.toDateString());
        return Math.ceil((to - from) / (1 * 24 * 60 * 60 * 1000));
    }
    async refresh(){
        errorPush("");
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
    document.getElementById("percentage").innerHTML = intPercentage + "%";
    g_barRefreshLogTimeout = setTimeout(()=>{console.log("进度条进度已刷新", g_thisWidgetId)}, 500);
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
            console.log("【挂件记忆宽高信息】!", newWidgetKramdown);
            await updateBlockAPI(newWidgetKramdown, g_thisWidgetId);
        }else{
            console.log(widgetKramdown);
            console.warn("当前id不对应progressBarT挂件，不设定挂件高度");
        }
        throw new Error(language["writeHeightInfoFailed"]);
    }
    // console.log("getAttr", response);
    if (response.data == null) return null;
    applyProgressColor(response);//应用属性
    //获取外观属性
    g_apperance.frontColor = isValidStr(response.data[attrName.frontColor])? 
        response.data[attrName.frontColor] : $("#progress").css("background-color");
    g_apperance.backColor = isValidStr(response.data[attrName.backColor]) ? 
        response.data[attrName.backColor] : $("#container").css("background-color");
    try{
        g_apperance.barWidth = isValidStr(response.data[attrName.barWidth]) ? 
            response.data[attrName.barWidth] : parseInt($("#progress").css("height").replace("px", ""));
    }catch(err){
        console.warn("获取barheight失败", err);
        g_apperance.barWidth = defaultAttr.barWidth;
    }
    //初始化设置-统计子项
    if (response.data[attrName.taskCalculateMode] == "true"){
        $("#allTask").prop("checked", true);
    }

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
    $("#progress, #container").css("height", width + "px");
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
        console.log("已写入百分比属性", data[attrName.manual]);
        infoPush(language["saved"], 1500);
    }else{
        errorPush(language["writeAttrFailed"]);
        console.error("属性获取失败", response);
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
        console.log("初始化时写入属性", data);
        infoPush(language["saved"], 1500);
    }else{
        errorPush(language["writeAttrFailed"]);
        console.error("属性获取失败", response);
    }
}

function errorPush(msg, timeout = 7000){
    // $(`<p>${msg}</p>`).appendTo("#errorInfo");
    clearTimeout(g_errorPushTimeout);
    $("#errorInfo").text(msg);
    if (timeout == 0) return;
    if (msg != ""){
        if (!g_displaySetting){
            displaySetting();
        }
        return;
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
    // console.log("启动时模式", g_manualPercentage);
    //没有响应属性
    if (g_manualPercentage == null || g_manualPercentage == NaN){
        console.log("重设挂件宽高")
        // //设置挂件宽高
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
    laydate.render({
        elem: "#startTimePicker"
        ,format: "yyyy-MM-dd"
        ,trigger: "click"
        ,value: new Date()
        ,ready: function(date) {
            window.frameElement.style.height = $("body").outerHeight() + 355 + "px";
            $("#startTime").val(`${date.year}-${date.month}-${date.date}`);
        }
        ,change: function(value) {
            $("#startTime").val(value);
        }
        ,done: function(value) {
            $("#startTime").val(value);
        }
    });
    laydate.render({
        elem: "#endTimePicker"
        ,format: "yyyy-MM-dd"
        ,trigger: "click"
        ,ready: function(){
            window.frameElement.style.height = $("body").outerHeight() + 355 + "px";
        }
        ,change: function(value) {
            $("#endTime").val(value);
        }
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
        console.warn("初始化时模式设定不正确，将被重设", g_manualPercentage);
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
        console.error(err);
        errorPush(err);
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
        window.frameElement.style.height = g_mode.modeCode == -2 ? 
            setting.widgetHeight : setting.widgetBarOnlyHeight;
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
    $(".btn").css("display", showButtons ? "" : "none");
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
        console.log("已写入外观属性");
        infoPush(language["saved"], 1500);
    }else{
        errorPush(language["writeAttrFailed"]);
        console.error("属性获取失败", response);
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
    for (let attr in data){
        if (data[attr] == "") data[attr] = "null";
    }
    console.log("属性项", data);
    //保存属性
    if (await addblockAttrAPI(data, g_thisWidgetId)){
        console.error(language["writeAttrFailed"]);
        errorPush("保存失败");
        return;
    }
    //保存属性后触发刷新，可能需要延时？
    infoPush("请等待刷新完成");
    setTimeout(__refresh, 1000);
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
    $("#saveAppearBtn").on("click", saveAppearance);
    $("#saveSettingBtn").on("click", async function(){await saveSettings();});
    if (setting.showButtons == false) {
        showButtonsController(setting.showButtons);
    }
    await __init();
}catch (err){
    errorPush(err);
    console.error(err);
}