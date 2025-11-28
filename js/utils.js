// 工具函数和计算器逻辑

// ============ 日期辅助函数 ============

// 解析 "HH:mm" 格式的时间字符串为从午夜开始的分钟数
function parseTimeStr(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
}

// 格式化日期为 YYYY-MM-DD
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 格式化日期为 MM月DD日
function formatDateChinese(date) {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日`;
}

// 格式化日期为 MM月 (用于年度图表)
function formatMonthChinese(date) {
    const month = date.getMonth() + 1;
    return `${month}月`;
}

// 格式化时间为 HH:mm
function formatTime(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

// 从 "HH:mm" 字符串创建今天的 Date 对象
function parseTimeToDate(timeStr, baseDate = new Date()) {
    const [h, m] = timeStr.split(':').map(Number);
    const date = new Date(baseDate);
    date.setHours(h, m, 0, 0);
    return date;
}

// 判断是否是周六
function isSaturday(date) {
    return date.getDay() === 6;
}

// 判断是否是周日
function isSunday(date) {
    return date.getDay() === 0;
}

// 判断是否是今天
function isToday(date) {
    const today = new Date();
    return formatDate(date) === formatDate(today);
}

// 判断两个日期是否同一天
function isSameDay(date1, date2) {
    return formatDate(date1) === formatDate(date2);
}

// 判断日期是否在同一个月
function isSameMonth(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth();
}

// 获取月份的第一天
function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

// 获取月份的最后一天
function endOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

// 获取周的第一天（周一）
function startOfWeek(date) {
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day; // 调整为周一开始
    const result = new Date(date);
    result.setDate(date.getDate() + diff);
    result.setHours(0, 0, 0, 0);
    return result;
}

// 获取年的第一天
function startOfYear(date) {
    return new Date(date.getFullYear(), 0, 1);
}

// 获取月份的天数
function getDaysInMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

// 添加天数
function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

// 添加月份
function addMonths(date, months) {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
}

// 减去月份
function subMonths(date, months) {
    return addMonths(date, -months);
}

// 获取指定月份的所有日期（包括前后填充的日期用于日历视图）
function getCalendarDays(date) {
    const firstDay = startOfMonth(date);
    const lastDay = endOfMonth(date);

    // 获取日历开始（从周一开始）
    const calendarStart = startOfWeek(firstDay);

    // 获取日历结束（到周日结束）
    let calendarEnd = new Date(lastDay);
    const lastDayOfWeek = calendarEnd.getDay();
    if (lastDayOfWeek !== 0) { // 如果不是周日
        calendarEnd = addDays(calendarEnd, 7 - lastDayOfWeek);
    }

    // 生成所有日期
    const days = [];
    let current = new Date(calendarStart);
    while (current <= calendarEnd) {
        days.push(new Date(current));
        current = addDays(current, 1);
    }

    return days;
}

// ============ 工作计算函数 ============

// 获取标准工作时长（分钟）
function getStandardWorkMinutes(settings) {
    const start = parseTimeStr(settings.workStartTime);
    const end = parseTimeStr(settings.workEndTime);
    let duration = end - start;

    // 处理跨夜班次（例如 22:00 到 06:00）
    if (duration < 0) duration += 24 * 60;

    if (settings.hasLunchBreak) {
        const lunchStart = parseTimeStr(settings.lunchStartTime);
        const lunchEnd = parseTimeStr(settings.lunchEndTime);
        let lunchDuration = lunchEnd - lunchStart;
        if (lunchDuration < 0) lunchDuration += 24 * 60;
        duration -= lunchDuration;
    }

    return duration > 0 ? duration : 0;
}

// 检查特定日期是否为配置的节假日
function isHoliday(date, holidays) {
    const dateStr = formatDate(date);
    return holidays.some(h => h.date === dateStr);
}

// 计算特定月份的工作日数量
function getWorkingDaysInMonth(date, scheduleType, holidays = []) {
    const daysInMonth = getDaysInMonth(date);
    let workingDays = 0;

    for (let day = 1; day <= daysInMonth; day++) {
        const current = new Date(date.getFullYear(), date.getMonth(), day);

        // 如果是节假日，不算工作日
        if (isHoliday(current, holidays)) {
            continue;
        }

        if (scheduleType === WorkScheduleType.NoWeekend) {
            workingDays++;
        } else if (scheduleType === WorkScheduleType.SingleWeekend) {
            if (!isSunday(current)) workingDays++;
        } else {
            // DoubleWeekend
            if (!isSaturday(current) && !isSunday(current)) workingDays++;
        }
    }
    return workingDays || 1; // 避免除以零
}

// 获取费率信息
function getRates(settings, date = new Date()) {
    const workingDays = getWorkingDaysInMonth(date, settings.scheduleType, settings.holidays);
    const dailySalary = settings.monthlySalary / workingDays;
    const standardMinutes = getStandardWorkMinutes(settings);
    const standardHourlyRate = dailySalary / (standardMinutes / 60);

    return { dailySalary, standardHourlyRate, standardMinutes };
}

// 计算实时指标（主要用于打卡计时器）
function calculateLiveMetrics(settings, startTime, now) {
    const startDate = new Date(startTime);
    const { dailySalary, standardHourlyRate } = getRates(settings, startDate);

    // 标准化时间到今天进行比较
    const today = new Date(now);
    const workStart = parseTimeToDate(settings.workStartTime, today);
    const workEnd = parseTimeToDate(settings.workEndTime, today);

    let endTimeDate = workEnd;
    if (workEnd < workStart) {
        endTimeDate = addDays(workEnd, 1);
    }

    const currentWorkDurationMs = now - startTime;
    const currentWorkMinutes = currentWorkDurationMs / 1000 / 60;

    // 计算实际工作分钟数（扣除午餐时间）
    let workedMinutes = currentWorkMinutes;

    if (settings.hasLunchBreak) {
        const lunchStart = parseTimeToDate(settings.lunchStartTime, today);
        const lunchEnd = parseTimeToDate(settings.lunchEndTime, today);

        const nowTime = now;
        const lunchStartTime = lunchStart.getTime();
        const lunchEndTime = lunchEnd.getTime();

        if (startTime < lunchStartTime && nowTime > lunchStartTime) {
            if (nowTime < lunchEndTime) {
                workedMinutes = (lunchStartTime - startTime) / 1000 / 60;
            } else {
                const lunchDurationMin = (lunchEndTime - lunchStartTime) / 1000 / 60;
                workedMinutes -= lunchDurationMin;
            }
        } else if (startTime >= lunchStartTime && startTime < lunchEndTime) {
            if (nowTime > lunchEndTime) {
                workedMinutes = (nowTime - lunchEndTime) / 1000 / 60;
            } else {
                workedMinutes = 0;
            }
        }
    }

    const isOvertime = now > endTimeDate.getTime();

    let moneyEarned = 0;
    let displayRate = standardHourlyRate;

    if (!isOvertime) {
        const validMinutes = Math.max(0, workedMinutes);
        moneyEarned = (validMinutes / 60) * standardHourlyRate;
    } else {
        // 加班：收入封顶为日薪，时薪递减
        moneyEarned = dailySalary;
        const totalHoursWorked = Math.max(0.1, workedMinutes / 60);
        displayRate = dailySalary / totalHoursWorked;
    }

    return {
        moneyEarned,
        displayRate,
        isOvertime,
        workedMinutes,
        standardHourlyRate
    };
}

// 计算请假价值
function calculateLeaveValue(settings, startStr, endStr, ratio) {
    const { standardHourlyRate } = getRates(settings);

    const start = parseTimeStr(startStr);
    const end = parseTimeStr(endStr);

    // 计算原始时长（分钟）
    let duration = end - start;
    if (duration < 0) duration += 24 * 60; // 跨夜检查

    // 扣除午餐时间（如果适用）
    if (settings.hasLunchBreak) {
        const lunchStart = parseTimeStr(settings.lunchStartTime);
        const lunchEnd = parseTimeStr(settings.lunchEndTime);

        // 简单的重叠检查
        const leaveInterval = { start, end };
        const lunchInterval = { start: lunchStart, end: lunchEnd };

        const overlapStart = Math.max(leaveInterval.start, lunchInterval.start);
        const overlapEnd = Math.min(leaveInterval.end, lunchInterval.end);

        if (overlapEnd > overlapStart) {
            duration -= (overlapEnd - overlapStart);
        }
    }

    const hours = duration / 60;
    const earned = hours * standardHourlyRate * ratio;

    return {
        earnedAmount: earned,
        durationMs: duration * 60 * 1000,
        hourlyRate: standardHourlyRate * ratio // 该时段的有效费率
    };
}

// 计算手动工作记录价值（补卡）
function calculateManualWorkValue(settings, dateStr, startStr, endStr) {
    const date = new Date(dateStr + 'T00:00:00');

    // 构建时间戳
    const start = parseTimeToDate(startStr, date);
    let end = parseTimeToDate(endStr, date);

    // 处理跨夜情况
    if (end < start) {
        end = addDays(end, 1);
    }

    // 重用实时指标逻辑
    const metrics = calculateLiveMetrics(settings, start.getTime(), end.getTime());

    // 重新计算加班时长用于统计
    const standardEnd = parseTimeToDate(settings.workEndTime, date);
    let standardEndTime = standardEnd.getTime();
    if (standardEnd < start) {
        // 如果班次开始较晚，标准结束时间可能是第二天
        standardEndTime += 24 * 60 * 60 * 1000;
    }

    const overtimeDurationMs = Math.max(0, end.getTime() - standardEndTime);

    return {
        earnedAmount: metrics.moneyEarned,
        effectiveHourlyRate: metrics.displayRate,
        totalDurationMs: end.getTime() - start.getTime(),
        overtimeDurationMs
    };
}

// ============ 格式化函数 ============

// 格式化货币
function formatCurrency(val) {
    return new Intl.NumberFormat('zh-CN', {
        style: 'currency',
        currency: 'CNY',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(val);
}

// 格式化简短货币（不带小数）
function formatCurrencyShort(val) {
    return new Intl.NumberFormat('zh-CN', {
        style: 'currency',
        currency: 'CNY',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(val);
}

// 格式化时长（毫秒 -> 小时:分钟）
function formatDuration(ms) {
    const totalMinutes = Math.floor(ms / 1000 / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}:${String(minutes).padStart(2, '0')}`;
}

// 格式化时长（中文）
function formatDurationChinese(ms) {
    const totalMinutes = Math.floor(ms / 1000 / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) {
        return `${hours}小时${minutes}分钟`;
    }
    return `${minutes}分钟`;
}

// 生成唯一 ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
