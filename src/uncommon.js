/**
 * common.js 可能可以应用到其他项目的操作函数
 */
import { isValidStr } from "./API.js";
import { language, setting } from "./config.js";

/**
 * 解析符合以下条件的字符串为日期：
 * 年月日时分，之间用任意非数字字符隔开；支持只输入时、分
 * @returns [int, Date, Str] 解析是否成功（0失败，1成功为日期，2成功为时间）；若成功，对应的Date时间；若成功，对应的时间字符串
 */
export function parseTimeString(timeStr, format = "") {
    let resultDate;
    let resultDateStr;
    let resultCode;
    // 非字符串、空字符串、“null”字符串
    if (!isValidStr(timeStr) || timeStr == "null") {
        return [0, null, ""];
    }
    // 拆分连续的数字（string）
    let timeNums = timeStr.match(/[0-9]+/gm);
    // 无数字的情况
    if (!timeNums ||timeNums.length <= 1) {
        return [0, null, ""];
    }
    // 处理yy MM dd的情况
    if (timeNums.length != 2){
        if (timeNums[0].length == 2){
            timeNums[0] = "20" + timeNums[0];
        }
    }
    resultCode = 1;
    switch (timeNums.length){
        case 3: {//输入格式yyyy MM dd
            resultDate = new Date(timeNums[0], timeNums[1] - 1, timeNums[2]);
            resultDateStr = formatDateString(resultDate, format);
            break;
        }
        case 5: {//输入格式yyyy MM dd HH mm
            resultDate = new Date(timeNums[0], timeNums[1] - 1, timeNums[2], timeNums[3], timeNums[4]);
            resultDateStr = formatDateString(resultDate, format) + resultDate.toLocaleTimeString();
            break;
        }
        case 2: {//输入格式HH mm
            resultDate = new Date();
            resultDate.setHours(timeNums[0]);
            resultDate.setMinutes(timeNums[1]);
            resultDate.setSeconds(0);
            resultDateStr = resultDate.toLocaleTimeString();
            resultCode = 2;
            break;
        }
        default: {
            errorPush(Error(language["timeSetIllegal"]));
            console.warn("时间设定非法", this.times[i]);
            return [0, null, ""];
        }
    }
    return [resultCode, resultDate, resultDateStr];
}

export function formatDateString(date, format) {
    let result = format;
    if (!isValidStr(format)) {
        return date.toLocaleDateString();
    }
    result = result.replace(new RegExp("yyyy","g"), date.getFullYear());
    result = result.replace(new RegExp("yy","g"), date.getFullYear() % 100);
    result = result.replace(new RegExp("MM","g"), date.getMonth() - 1);
    result = result.replace(new RegExp("dd","g"), date.getDate());
    result = result.replace(new RegExp("HH","g"), date.getHours());
    result = result.replace(new RegExp("mm","g"), date.getMinutes());
    return result;
}

/**
 * 计算两个日期相差的天数，返回天数
 * end - start
 * @param {Date} start
 * @param {Date} end
 * @return {int} 正数：start距离end还有x天
 */
export function calculateDateGapByDay(start, end) {
    let from = Date.parse(start.toDateString());
    let to = Date.parse(end.toDateString());
    return Math.ceil((to - from) / (1 * 24 * 60 * 60 * 1000));
}

/**
 * 计算截止小时
 */
export function calculateDateGapByHour(start, end) {
    let from = Date.parse(start.toDateString());
    let to = Date.parse(end.toDateString());
    return Math.ceil((to - from) / (60 * 60 * 1000) * 10) / 10;
}

/**
 * 载入用户设定的输出模板
 * @param {*} attrName 
 * @param  {...any} args 
 * @returns 
 */
export function useUserTemplate(attrName, ...args) {
    let result;
    if (isValidStr(setting[attrName])) {
        result = setting[attrName];
    }else{
        result = language[attrName];
    }
    if (args.length == 0) {
        return result;
    }else if (args.length == 1) {
        return result.replace(new RegExp("%%", "g"), args[0]);
    }else{
        for (let i = 0; i < args.length; i++) {
            result = result.replace(new RegExp(`%${i}%`, "g"), args[i]);
        }
        return result;
    }
}

/**
 * 返回当前时间距离输入参数endTime
 * @param {*} endTime 
 * @returns 
 */
export function getDayGapString(endTime, by="day") {
    // 计算还有多少天
    let gapDay = calculateDateGapByDay(new Date(), endTime);
    let dateGapString = "";
    if (gapDay > 0) {
        dateGapString = useUserTemplate("countDay_dayLeft", gapDay);
    } else if (gapDay == 0) {
        dateGapString = useUserTemplate("countDay_today");
    } else {
        dateGapString = useUserTemplate("countDay_exceed", -gapDay);
    }
    return dateGapString;
}