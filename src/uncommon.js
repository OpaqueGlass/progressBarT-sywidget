/**
 * common.js 可能可以应用到其他项目的操作函数
 */
import { isValidStr, isDarkMode } from "./API.js";
import { debugPush, logPush } from "./common.js";
import { language, setting, holidayInfo } from "./config.js";

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
    if (!timeNums || timeNums.length <= 1) {
        return [0, null, ""];
    }
    // 处理yy MM dd的情况
    if (timeNums.length != 2) {
        if (timeNums[0].length == 2) {
            timeNums[0] = "20" + timeNums[0];
        }
    }
    resultCode = 1;
    switch (timeNums.length) {
        case 3: {//输入格式yyyy MM dd
            resultDate = new Date(timeNums[0], timeNums[1] - 1, timeNums[2]);
            resultDateStr = formatDateString(resultDate, format);
            break;
        }
        case 5: {//输入格式yyyy MM dd HH mm
            resultDate = new Date(timeNums[0], timeNums[1] - 1, timeNums[2], timeNums[3], timeNums[4]);
            resultDateStr = formatDateString(resultDate, format) + " " + resultDate.toLocaleTimeString();
            break;
        }
        case 2: {//输入格式HH mm
            resultDate = new Date();
            resultDate.setHours(timeNums[0]);
            resultDate.setMinutes(timeNums[1]);
            resultDate.setSeconds(0);
            resultDateStr = formatDateString(resultDate, useUserTemplate("timeFormat"));
            resultCode = 2;
            break;
        }
        default: {
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
    result = result.replace(new RegExp("yyyy", "g"), date.getFullYear());
    result = result.replace(new RegExp("yy", "g"), date.getFullYear() % 100);
    result = result.replace(new RegExp("MM", "g"), date.getMonth() + 1);
    result = result.replace(new RegExp("dd", "g"), date.getDate());
    result = result.replace(new RegExp("HH", "g"), date.getHours() > 9 ? date.getHours() : "0" + date.getHours());
    result = result.replace(new RegExp("mm", "g"), date.getMinutes() > 9 ? date.getMinutes() : "0" + date.getMinutes());
    return result;
}

/**
 * 计算两个日期相差的天数，返回天数
 * end - start
 * @param {Date} start
 * @param {Date} end
 * @param {boolean} onlyWorkDay 是否只计算工作日（跳过法定节假日）
 * @return {int} 正数：start距离end还有x天
 */
export function calculateDateGapByDay(start, end, onlyWorkDay) {
    let from = Date.parse(start.toDateString());
    let to = Date.parse(end.toDateString());
    let result;
    if (onlyWorkDay) {
        debugPush(">>>> 还剩天数")
        result = calculateDateGapByWorkDay({start, end, remain: true});
        debugPush("剩余天数计算", result);
        return result;
    }
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
 * 计算时间间隔内的法定工作日
 * 周一至周五（除法定节假日）+调休
 * @param {Date} start 
 * @param {Date} end 
 * @param {boolean} remain 是否是在计算剩余时间（这将考虑已经结束等情况，否则将默认start < end）
 */
export function calculateDateGapByWorkDay({start, end, remain=false, gapEnd=null}) {
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    // 时段判定应当返回最后一个工作日，即end应该是工作日
    debugPush("输入开始结束时间", start, end);
    // 总时间段才需要走这个逻辑
    let lastWorkdayEnd = getLastWorkingDay(holidayInfo?.workdays ?? [], holidayInfo?.holidays ?? [], start, end);
    debugPush("统计时段", start, end, lastWorkdayEnd);
    // 总时间段指示的区间中，必须包含工作日，否则无效
    if (remain == false && lastWorkdayEnd == null) {
        throw new Error("区间内无工作日");
    }
    if (lastWorkdayEnd == null) {
        lastWorkdayEnd = getLastWorkingDay(holidayInfo?.workdays ?? [], holidayInfo?.holidays ?? [], new Date(0), end);;
    }
    debugPush("过滤后结束时间v2", lastWorkdayEnd);
    let overFlag = lastWorkdayEnd != null && start >= lastWorkdayEnd;
    debugPush("时段已过判定", overFlag, remain);
    if (overFlag && remain) {
        debugPush("时段已过，fallback到默认实现", start, lastWorkdayEnd);
        return Math.floor((lastWorkdayEnd - start) / (1 * 24 * 60 * 60 * 1000));
    }
    const holidayCount = getRangeHolidayCount(start, lastWorkdayEnd);
    const weekdaysCount = getRangeWeekDayCount(start, lastWorkdayEnd);
    const workdaysCount = getRangeWorkDayCount(start, lastWorkdayEnd);
    let result = weekdaysCount - holidayCount + workdaysCount;
    debugPush("周一至周五总计", weekdaysCount, "减去假日", holidayCount, "调休日", workdaysCount, "Res", result);
    // 在计算时段时，出现工作日时段结果为0，但是设置的结束时间还未到达的情况，例如：
    // 班 休 休 班
    //     Now  ^结束
    // 回退一天，计算正确的结束工作日
    // if (result <= 0 && (lastWorkdayEnd - start) > 0 && remain) {
    //     end.setDate(end.getDate() - 1);
    //     lastWorkdayEnd = getLastWorkingDay(holidayInfo?.workdays ?? [], holidayInfo?.holidays ?? [], new Date(0), end);
    //     debugPush("工作日计算出现0，调整后日期", lastWorkdayEnd);
    //     return Math.floor((lastWorkdayEnd - start) / (1 * 24 * 60 * 60 * 1000));
    // }
    return result;
}


/**
 * 获取区间假日天数
 * @param {Date} start 时间段开始
 * @param {Date} end 时间段结束
 * @returns 区间范围内法定节假日天数（以发布为准，不含正常周末，不含节日周末）
 */
function getRangeHolidayCount(start, end) {
    // dateArray为休息日Array
    const dateArray = holidayInfo?.holidays ?? [];
    debugPush("休息日数组", dateArray.length);
    const filteredDates = dateArray.filter(dateStr => {
        const date = new Date(dateStr);
        return date >= start && date < end && date.getDay() !== 0 && date.getDay() !== 6;
    });

    return filteredDates.length;
}
/**
 * 获取区间调休上班天数
 * @param {Date} start 
 * @param {Date} end 
 * @returns 区间内调休上班日，仅含周末
 */
function getRangeWorkDayCount(start, end) {
    // dateArray为工作日Array
    const dateArray = holidayInfo?.workdays ?? [];
    debugPush("工作日数组", dateArray.length);
    const filteredDates = dateArray.filter(dateStr => {
        const date = new Date(dateStr);
        // debugPush("调休工作日", "输入日期", dateStr, "转换日期", date, date.getDay(), date >= start && date < end && (date.getDay() == 0 || date.getDay() == 6));
        return date >= start && date < end && (date.getDay() == 0 || date.getDay() == 6);
    });

    return filteredDates.length;
}

function getRangeWeekDayCount(start, end) {
    // 计算两个日期之间的总天数差（不包括结束日期）
    const totalDays = Math.floor((end - start) / (1000 * 60 * 60 * 24));

    // 计算完整的周数
    const fullWeeks = Math.floor(totalDays / 7);
    let weekdaysCount = fullWeeks * 5; // 每周有 5 个工作日

    // 计算剩余的天数
    let remainingDays = totalDays % 7;

    // 获取开始日期的星期几（0 是星期天，1 是星期一，依此类推）
    let startDay = start.getDay();
    // 计算剩余天数中的工作日
    for (let i = 0; i < remainingDays; i++) {
        let currentDay = (startDay + i) % 7;
        if (currentDay !== 0 && currentDay !== 6) { // 排除周六和周日
            weekdaysCount++;
        }
    }

    return weekdaysCount;
}

function getLastWorkingDay(workDays, holidays, startDate, endDate) {
    // 将上班日和节假日数组转换为 Set 对象，便于查找
    const workDaySet = new Set(workDays);
    const holidaySet = new Set(holidays);

    let lastWorkingDay = null;
    let currentDate = new Date(endDate);
    // 遍历时间段内的每一天，从结束日期向前
    while (currentDate >= startDate) {
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0'); // 月份从 0 开始，需要加 1
        const day = String(currentDate.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;

        // 检查是否为工作日且不在节假日列表中
        if ((currentDate.getDay() !== 0 && currentDate.getDay() !== 6) || workDaySet.has(dateString)) {
            if (!holidaySet.has(dateString)) {
                lastWorkingDay = new Date(currentDate);
                break; // 找到最近的工作日后跳出循环
            }
        }
        // 移动到前一天
        currentDate.setDate(currentDate.getDate() - 1);
    }
    return lastWorkingDay;
}

async function parseHolidayInfo() {
    const response = await fetch('https://raw.githubusercontent.com/lanceliao/china-holiday-calender/master/holidayAPI.json');
    const data = await response.json();
    const parseDates = (data) => {
        const holidays = [];
        const workdays = [];
    
        const addDates = (start, end) => {
            let currentDate = new Date(start);
            const endDate = new Date(end);
            while (currentDate <= endDate) {
                holidays.push(currentDate.toISOString().split('T')[0]);
                currentDate.setDate(currentDate.getDate() + 1);
            }
        };
    
        for (const year in data.Years) {
            data.Years[year].forEach(holiday => {
                addDates(holiday.StartDate, holiday.EndDate);
                holiday.CompDays.forEach(compDay => {
                    workdays.push(compDay);
                });
            });
        }
    
        holidays.sort();
        workdays.sort();
    
        return { holidays, workdays };
    };
    
    const { holidays, workdays } = parseDates(data);
    logPush("holiday", JSON.stringify(holidays));
    logPush("workdays", JSON.stringify(workdays));
    return { holidays, workdays };
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
    } else {
        result = language[attrName];
    }
    if (args.length == 0) {
        return result;
    } else if (args.length == 1) {
        return result.replace(new RegExp("%%", "g"), args[0]);
    } else {
        for (let i = 0; i < args.length; i++) {
            result = result.replace(new RegExp(`%${i}%`, "g"), args[i]);
        }
        return result;
    }
}

/**
 * 格式化语言模板
 * @param {*} attrName 
 * @param  {...any} args 
 * @returns 
 */
export function formatLanguageTemplate(attrName, ...args) {
    let result;
    result = language[attrName];
    if (args.length == 0) {
        return result;
    } else if (args.length == 1) {
        return result.replace(new RegExp("%%", "g"), args[0]);
    } else {
        for (let i = 0; i < args.length; i++) {
            result = result.replace(new RegExp(`%${i}%`, "g"), args[i]);
        }
        return result;
    }
}

/**
 * 返回当前时间距离输入参数endTime
 * @param {*} endTime 
 * @param {boolean} simplify 简化输出（用于自动模式）
 * @returns 
 */
export function getDayGapString({ endTime, simplify = false, percentage = null, onlyWorkDay = false }) {
    // 计算还有多少天
    let gapDay = calculateDateGapByDay(new Date(), endTime, onlyWorkDay);
    let dateGapString = "";
    if (gapDay > 0) {
        dateGapString = useUserTemplate(simplify ? "countDay_dayLeft_sim" : "countDay_dayLeft", gapDay);
    } else if (gapDay == 0) {
        dateGapString = useUserTemplate(simplify ? "countDay_today_sim" : "countDay_today");
    } else {
        dateGapString = useUserTemplate(simplify ? "countDay_exceed_sim" : "countDay_exceed", -gapDay);
    }
    // 旧代码：时间段折合
    // let gradientColors = generateGradientColor("#FF0000", "#00FF00", 30);
    // let gradientColors = generateGradientColors(7);
    // let ratio = Math.floor(gapDay / 30 * 7);
    // console.log(gradientColors);
    // if (gapDay <= 0) gapDay = 0;
    // if (gapDay >= gradientColors.length) gapDay = gradientColors.length - 1;
    // 处理并返回时间颜色
    let colorStr = getCorrespondingColor(gapDay, percentage);
    if (isValidStr(colorStr)) {
        dateGapString = `<span style="color: ${colorStr}">${dateGapString}</span>`;
    } else {
        dateGapString = `${dateGapString}`;
    }
    return dateGapString;
}
/**
 * 两段渐变色生成
 * @param {*} startColor 
 * @param {*} endColor 
 * @param {*} steps 
 * @returns 颜色数组
 */
function generateGradientColor(startColor, endColor, steps) {
    const start = {
        red: parseInt(startColor.slice(1, 3), 16),
        green: parseInt(startColor.slice(3, 5), 16),
        blue: parseInt(startColor.slice(5, 7), 16),
    };
    const end = {
        red: parseInt(endColor.slice(1, 3), 16),
        green: parseInt(endColor.slice(3, 5), 16),
        blue: parseInt(endColor.slice(5, 7), 16),
    };
    const diff = {
        red: end.red - start.red,
        green: end.green - start.green,
        blue: end.blue - start.blue,
    };
    const gradientColors = [];
    for (let i = 0; i < steps; i++) {
        const ratio = i / (steps - 1);
        const color = {
            red: Math.round(start.red + diff.red * ratio),
            green: Math.round(start.green + diff.green * ratio),
            blue: Math.round(start.blue + diff.blue * ratio),
        };
        const hex = `#${color.red.toString(16).padStart(2, '0')}${color.green.toString(16).padStart(2, '0')}${color.blue.toString(16).padStart(2, '0')}`;
        gradientColors.push(hex);
    }
    return gradientColors;
}
/**
 * 多段渐变色生成
 * @returns 颜色数组
 */
function generateGradientColors(colors, n) {
    // const colors = ['#FF0000', '#FFA500', '#008000', '#00FFFF', '#0000FF', '#800080'];
    // const colors = ["#FF0000", "#FF3300", "#FF6600", "#FFA500", "#CCFF00", "#66FF00", "#00FF00 "];
    const gradientColors = [];
    const colorCount = colors.length - 1;
    const colorStep = 1 / (n - 1);
    for (let i = 0; i < n; i++) {
        const colorIndex1 = Math.floor(i * colorStep * colorCount);
        const colorIndex2 = Math.ceil(i * colorStep * colorCount);
        const color1 = colors[colorIndex1];
        const color2 = colors[colorIndex2];
        const ratio = i * colorStep * colorCount - colorIndex1;
        const r1 = parseInt(color1.substring(1, 3), 16);
        const g1 = parseInt(color1.substring(3, 5), 16);
        const b1 = parseInt(color1.substring(5, 7), 16);
        const r2 = parseInt(color2.substring(1, 3), 16);
        const g2 = parseInt(color2.substring(3, 5), 16);
        const b2 = parseInt(color2.substring(5, 7), 16);
        const r = Math.floor(r1 * (1 - ratio) + r2 * ratio);
        const g = Math.floor(g1 * (1 - ratio) + g2 * ratio);
        const b = Math.floor(b1 * (1 - ratio) + b2 * ratio);
        const color = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        gradientColors.push(color);
    }
    return gradientColors;
}
/**
 * 通过config获取颜色配置，并选择颜色
 * @param {*} remainDay 
 * @param {*} gapPercentage 百分比（已经乘以100）
 */
function getCorrespondingColor(remainDay, gapPercentage = null) {
    // 安全检查
    if (setting.colorGradient_baseColor.length != setting.colorGradient_triggerDay.length
        || setting.colorGradient_baseColor_night.length != setting.colorGradient_baseColor.length
        || setting.colorGradient_triggerDay.length != setting.colorGradient_triggerPercentage.length) {
        console.warn("设置中数组长度不匹配，无法应用颜色");
        $("#color-test").html(language["color_cards_error"]);
        return null;
    }
    // debug 颜色设定方格
    $("#color-test").html(generateColorBlocksPlus(
        isDarkMode() ? setting.colorGradient_baseColor_night : setting.colorGradient_baseColor,
        setting.colorGradient_triggerDay, setting.colorGradient_triggerPercentage));

    if (!isValidStr(gapPercentage)) {
        for (let i = 0; i < setting.colorGradient_baseColor.length; i++) {
            if (remainDay <= setting.colorGradient_triggerDay[i]) {
                if (isDarkMode()) {
                    return setting.colorGradient_baseColor_night[i];
                }
                return setting.colorGradient_baseColor[i];
            }
        }
    } else {
        for (let i = 0; i < setting.colorGradient_baseColor.length; i++) {
            if (gapPercentage >= setting.colorGradient_triggerPercentage[i]) {
                if (isDarkMode()) {
                    return setting.colorGradient_baseColor_night[i];
                }
                return setting.colorGradient_baseColor[i];
            }
        }
    }

    return undefined;
}

/**
 * 横排生成颜色预览
 * @param {*} colors 
 * @param {*} numbers 
 * @param {*} percentages 
 * @returns html
 */
function generateColorBlocksPlus(colors, numbers, percentages) {
    let html = language["colorCardExample"];
    if (!isValidStr(colors) || !isValidStr(numbers) || colors.length != numbers.length) {
        return language["gradient_error"];
    }
    for (let i = 0; i < colors.length; i++) {
        // html += `<div style="background-color:${colors[i]}; width:50px; height:50px; display:inline-block;">${numbers[i]}</div>`;
        html += `<span style="color: ${colors[i]}">${formatLanguageTemplate("color_cards", 100 - percentages[i], numbers[i])}</span>`
    }
    return html;
}

/**
 * 计算经过百分比（已经*100）
 * @param {*} startTime 
 * @param {*} endTime 
 * @param {*} scale 单位（例：1单位毫秒）
 * @returns 
 */
export function calculateTimePercentage(startTime, endTime, scale = 1, onlyWorkDay = false) {
    let totalGap = endTime - startTime;
    if (totalGap <= 0) {
        console.warn(language["timeModeSetError"]);
        throw new Error(language["timeModeSetError"]);
    }
    let nowDate = new Date();
    let passed = Math.floor((nowDate - startTime) / scale) * scale;
    let result = passed / totalGap * 100.0;
    if (result < 0) {
        console.warn(language["earlyThanStart"]);
        throw new Error(language["earlyThanStart"]);
    }
    if (onlyWorkDay) {
        // 无论如何，我们会将结束时间调整到合适的最后一个工作日（没有的报错）
        debugPush(">>>> 全组时段")
        let workDayCount = calculateDateGapByWorkDay({start: startTime, end: endTime});
        debugPush(">>>> 还剩时段时段")
        let remainCount = calculateDateGapByWorkDay({start: nowDate, end: endTime, remain: true});
        debugPush("时间段进度百分比", workDayCount, remainCount);
        result = 100.0 * (workDayCount - remainCount) / workDayCount;
    }
    if (result === NaN) {
        logPush("进度计算出现NaN，总时段为0，转换为100%");
        result = 100.0;
    }
    return result;
}

export const SCALE = {
    MS: 1,
    SECOND: 1000,
    MIN: 1000 * 60,
    HOUR: 1000 * 60 * 60,
    DAY: 1000 * 60 * 60 * 24,
    WEEK: 1000 * 60 * 60 * 24 * 7,
}