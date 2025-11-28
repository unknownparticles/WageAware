// 主应用逻辑

class WageAwareApp {
  constructor() {
    this.settings = null;
    this.currentSession = null;
    this.history = [];
    this.view = 'tracker';
    this.metrics = { moneyEarned: 0, displayRate: 0, isOvertime: false, workedMinutes: 0 };
    this.animationFrame = null;
    this.chart = null;

    // 模态框状态
    this.showModal = false;
    this.modalType = 'Annual'; // Annual, Sick, Personal, Work
    this.modalData = {
      date: '',
      start: '',
      end: '',
      ratio: 1.0
    };
  }

  init() {
    // 加载数据
    this.settings = Storage.getSettings();
    this.currentSession = Storage.getCurrentSession();
    this.history = Storage.getHistory();

    // 渲染
    if (!this.settings.isConfigured) {
      this.showFirstRunSettings();
    } else {
      this.render();
      this.bindEvents();
      if (this.currentSession) {
        this.startTimer();
      }
    }
  }

  // ========== 首次运行设置 ==========
  showFirstRunSettings() {
    const app = document.getElementById('root');
    app.innerHTML = `
      <div class="min-h-screen bg-dark p-4">
        <h1 class="text-center text-3xl font-bold text-white mt-10">欢迎使用 牛马工时计算器</h1>
        <p class="text-center text-gray-400 mt-2">让我们先设置一下您的薪资信息。</p>
        ${this.renderSettingsForm(true)}
      </div>
    `;
    this.bindSettingsFormEvents(true);
  }

  // ========== 主应用渲染 ==========
  render() {
    const app = document.getElementById('root');
    app.innerHTML = `
      <div class="min-h-screen bg-dark flex flex-col max-w-xl mx-auto border-x border-gray-800 shadow-2xl relative">
        <!-- Header -->
        <header class="p-4 border-b border-gray-800 flex justify-between items-center bg-dark/80 backdrop-blur-md sticky top-0 z-10">
          <h1 class="font-bold text-lg text-white tracking-wider flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            牛马<span class="text-primary">工时</span>计算器
          </h1>
          ${this.currentSession ? '<span class="text-xs font-mono text-red-400 border border-red-900 bg-red-900/20 px-2 py-1 rounded">进行中</span>' : ''}
        </header>

        <!-- Main Content -->
        <main id="main-content" class="flex-1 overflow-hidden relative">
          ${this.renderView()}
        </main>

        <!-- Bottom Navigation -->
        <nav class="border-t border-gray-800 bg-surface grid grid-cols-4 p-2 pb-6 md:pb-2">
          <button data-view="tracker" class="nav-btn flex flex-col items-center p-2 rounded-lg transition-colors ${this.view === 'tracker' ? 'text-primary' : 'text-gray-500 hover:text-gray-300'}">
            ${Icons.Clock}
            <span class="text-[10px] font-bold mt-1 uppercase">打卡</span>
          </button>
          <button data-view="calendar" class="nav-btn flex flex-col items-center p-2 rounded-lg transition-colors ${this.view === 'calendar' ? 'text-primary' : 'text-gray-500 hover:text-gray-300'}">
            ${Icons.CalendarDays}
            <span class="text-[10px] font-bold mt-1 uppercase">日历</span>
          </button>
          <button data-view="stats" class="nav-btn flex flex-col items-center p-2 rounded-lg transition-colors ${this.view === 'stats' ? 'text-primary' : 'text-gray-500 hover:text-gray-300'}">
            ${Icons.LayoutDashboard}
            <span class="text-[10px] font-bold mt-1 uppercase">统计</span>
          </button>
          <button data-view="settings" class="nav-btn flex flex-col items-center p-2 rounded-lg transition-colors ${this.view === 'settings' ? 'text-primary' : 'text-gray-500 hover:text-gray-300'}">
            ${Icons.Settings}
            <span class="text-[10px] font-bold mt-1 uppercase">设置</span>
          </button>
        </nav>
      </div>
    `;
  }

  renderView() {
    switch (this.view) {
      case 'tracker':
        return this.renderTracker();
      case 'stats':
        return this.renderStats();
      case 'calendar':
        return this.renderCalendar();
      case 'settings':
        return this.renderSettingsForm(false);
      default:
        return '';
    }
  }

  // ========== Tracker 视图 ==========
  renderTracker() {
    if (this.showModal) {
      return this.renderEntryModal();
    }

    if (!this.currentSession) {
      return `
        <div class="flex flex-col h-full p-6">
          <div class="flex-1 flex flex-col items-center justify-center text-center">
            <div class="mb-8 p-6 rounded-full bg-surface border-4 border-gray-700 shadow-[0_0_50px_rgba(16,185,129,0.1)]">
              ${Icons.Clock.replace('width="24"', 'width="64"').replace('height="24"', 'height="64"').replace('stroke="currentColor"', 'stroke="#6b7280"')}
            </div>
            <h2 class="text-3xl font-light text-gray-300 mb-2">准备开工?</h2>
            <p class="text-gray-500 mb-8 max-w-xs">开始追踪以实时查看你的收益。</p>
            <button id="start-work-btn" class="group relative inline-flex items-center justify-center px-12 py-5 font-bold text-white transition-all duration-200 bg-primary text-xl rounded-full hover:bg-emerald-400 hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] focus:outline-none ring-offset-2 focus:ring-2 ring-emerald-400">
              ${Icons.Play.replace('width="24"', 'width="20"').replace('height="24"', 'height="20"')} <span class="ml-2">上班打卡</span>
            </button>
          </div>

          <!-- Quick Actions -->
          <div class="mt-auto border-t border-gray-800 pt-6">
            <p class="text-xs text-gray-500 uppercase font-bold mb-3 text-center">快捷记录</p>
            <div class="grid grid-cols-4 gap-2">
              <button data-modal="Work" class="quick-action bg-surface border border-gray-700 p-2 rounded-lg flex flex-col items-center gap-1 hover:border-emerald-500 hover:text-emerald-400 transition-colors">
                ${Icons.CalendarClock.replace('width="24"', 'width="18"').replace('height="24"', 'height="18"').replace('stroke="currentColor"', 'stroke="#10b981"').replace('class="', 'class="mb-1 ')}
                <span class="text-[10px] font-bold text-gray-300">补卡</span>
              </button>
              <button data-modal="Annual" class="quick-action bg-surface border border-gray-700 p-2 rounded-lg flex flex-col items-center gap-1 hover:border-blue-500 hover:text-blue-400 transition-colors">
                ${Icons.Briefcase.replace('width="24"', 'width="18"').replace('height="24"', 'height="18"').replace('stroke="currentColor"', 'stroke="#3b82f6"').replace('class="', 'class="mb-1 ')}
                <span class="text-[10px] font-bold text-gray-300">年假</span>
              </button>
              <button data-modal="Sick" class="quick-action bg-surface border border-gray-700 p-2 rounded-lg flex flex-col items-center gap-1 hover:border-red-500 hover:text-red-400 transition-colors">
                ${Icons.Thermometer.replace('width="24"', 'width="18"').replace('height="24"', 'height="18"').replace('stroke="currentColor"', 'stroke="#ef4444"').replace('class="', 'class="mb-1 ')}
                <span class="text-[10px] font-bold text-gray-300">病假</span>
              </button>
              <button data-modal="Personal" class="quick-action bg-surface border border-gray-700 p-2 rounded-lg flex flex-col items-center gap-1 hover:border-yellow-500 hover:text-yellow-400 transition-colors">
                ${Icons.Coffee.replace('width="24"', 'width="18"').replace('height="24"', 'height="18"').replace('stroke="currentColor"', 'stroke="#eab308"').replace('class="', 'class="mb-1 ')}
                <span class="text-[10px] font-bold text-gray-300">事假</span>
              </button>
            </div>
          </div>
        </div>
      `;
    }

    // 工作中状态
    const isOvertime = this.metrics.isOvertime;
    const startTime = new Date(this.currentSession.startTime);
    const startTimeStr = `${String(startTime.getHours()).padStart(2, '0')}:${String(startTime.getMinutes()).padStart(2, '0')}`;

    return `
      <div class="flex flex-col items-center justify-center h-full p-4 transition-colors duration-1000 ${isOvertime ? 'bg-red-950/20' : ''}">
        
        <!-- Status Label -->
        <div class="text-sm font-bold uppercase tracking-widest mb-6 py-1 px-3 rounded-full border ${isOvertime ? 'text-red-500 border-red-500 bg-red-500/10 animate-pulse' : 'text-emerald-500 border-emerald-500 bg-emerald-500/10'}">
          ${isOvertime ? '加班中 (时薪递减)' : '工作中'}
        </div>

        <!-- Main Money Display -->
        <div class="mb-2">
          <span id="money-display" class="text-5xl md:text-6xl font-mono font-bold tracking-tighter ${isOvertime ? 'text-red-500' : 'text-white'}">
            ${formatCurrency(this.metrics.moneyEarned)}
          </span>
        </div>
        
        <p class="text-gray-400 text-sm mb-4">
          ${isOvertime ? '本日工资已达上限 (加班无薪)' : '今日已赚'}
        </p>

        <!-- 上班时间显示与修改 -->
        <div class="mb-8">
          <button id="edit-start-time-btn" class="text-xs text-gray-500 hover:text-primary transition-colors flex items-center gap-1">
            <span>🕐</span>
            <span>上班时间: <span id="start-time-display" class="font-mono">${startTimeStr}</span></span>
            <span class="text-[10px]">✏️</span>
          </button>
        </div>

        <!-- Secondary Metrics -->
        <div class="grid grid-cols-2 gap-8 w-full max-w-md mb-12">
          <div class="text-center p-4 rounded-lg bg-surface border border-gray-700">
            <p class="text-xs text-gray-400 uppercase tracking-wider mb-1">平均时薪</p>
            <p id="rate-display" class="text-2xl font-mono font-bold ${isOvertime ? 'text-red-400 animate-pulse-slow' : 'text-primary'}">
              ${formatCurrency(this.metrics.displayRate).replace('¥', '')}/时
            </p>
            ${isOvertime ? '<span class="text-[10px] text-red-400">正在递减...</span>' : ''}
          </div>
          
          <div class="text-center p-4 rounded-lg bg-surface border border-gray-700">
            <p class="text-xs text-gray-400 uppercase tracking-wider mb-1">工作时长</p>
            <p id="duration-display" class="text-2xl font-mono font-bold text-gray-200">
              ${formatDurationChinese(this.metrics.workedMinutes * 60 * 1000)}
            </p>
          </div>
        </div>

        <!-- Stop Button -->
        <button id="stop-work-btn" class="w-full max-w-xs py-4 rounded-xl font-bold text-white bg-red-600 hover:bg-red-500 shadow-lg hover:shadow-red-500/30 transition-all flex items-center justify-center gap-2">
          ${Icons.Square.replace('width="24"', 'width="18"').replace('height="24"', 'height="18"')} <span>下班打卡</span>
        </button>

      </div>
    `;
  }

  renderEntryModal() {
    const title = {
      'Work': '补卡 (手动记录工时)',
      'Annual': '记录年假',
      'Sick': '记录病假',
      'Personal': '记录事假'
    }[this.modalType];

    const icon = {
      'Work': Icons.CalendarClock.replace('stroke="currentColor"', 'stroke="#10b981"'),
      'Annual': Icons.Briefcase.replace('stroke="currentColor"', 'stroke="#3b82f6"'),
      'Sick': Icons.Thermometer.replace('stroke="currentColor"', 'stroke="#ef4444"'),
      'Personal': Icons.Coffee.replace('stroke="currentColor"', 'stroke="#eab308"')
    }[this.modalType];

    const previewAmount = this.getModalPreviewAmount();

    return `
      <div class="absolute inset-0 bg-dark z-50 p-6 flex flex-col justify-center animate-in fade-in duration-200">
        <div class="bg-surface border border-gray-700 rounded-xl p-6 shadow-2xl relative">
          <button id="close-modal-btn" class="absolute top-4 right-4 text-gray-500 hover:text-white">
            ${Icons.X}
          </button>
          <h3 class="text-xl font-bold text-white mb-6 flex items-center gap-2">
            ${icon}
            ${title}
          </h3>

          <div class="space-y-4">
            ${this.modalType === 'Work' ? `
              <div>
                <label class="text-xs text-gray-400 block mb-1">日期</label>
                <input id="modal-date" type="date" value="${this.modalData.date}" class="w-full bg-dark border border-gray-600 rounded p-2 text-white">
              </div>
            ` : ''}

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="text-xs text-gray-400 block mb-1">${this.modalType === 'Work' ? '上班时间' : '开始时间'}</label>
                <input id="modal-start" type="time" value="${this.modalData.start}" class="w-full bg-dark border border-gray-600 rounded p-2 text-white">
              </div>
              <div>
                <label class="text-xs text-gray-400 block mb-1">${this.modalType === 'Work' ? '下班时间' : '结束时间'}</label>
                <input id="modal-end" type="time" value="${this.modalData.end}" class="w-full bg-dark border border-gray-600 rounded p-2 text-white">
              </div>
            </div>
            
            ${this.modalType !== 'Work' ? `
              <div>
                <label class="text-xs text-gray-400 block mb-1">工资折算比例 (1.0 = 全薪)</label>
                <input id="modal-ratio" type="number" step="0.1" min="0" max="1" value="${this.modalData.ratio}" class="w-full bg-dark border border-gray-600 rounded p-2 text-white">
              </div>
            ` : ''}

            <div class="bg-dark/50 p-3 rounded border border-gray-700/50 mt-4">
              <p class="text-xs text-gray-500 mb-1">预计获得工资</p>
              <p id="modal-preview" class="text-xl font-mono text-emerald-400 font-bold">
                ${formatCurrency(previewAmount)}
              </p>
            </div>

            <button id="submit-entry-btn" class="w-full bg-primary text-dark font-bold py-3 rounded hover:bg-emerald-400 mt-4">
              确认添加记录
            </button>
          </div>
        </div>
      </div>
    `;
  }

  getModalPreviewAmount() {
    try {
      if (this.modalType === 'Work') {
        return calculateManualWorkValue(this.settings, this.modalData.date, this.modalData.start, this.modalData.end).earnedAmount;
      } else {
        return calculateLeaveValue(this.settings, this.modalData.start, this.modalData.end, this.modalData.ratio).earnedAmount;
      }
    } catch (e) {
      return 0;
    }
  }

  // ========== Stats 视图 ==========
  renderStats() {
    if (this.history.length === 0) {
      return `
        <div class="flex flex-col items-center justify-center h-full text-gray-500">
          ${Icons.TrendingUp.replace('width="24"', 'width="48"').replace('height="24"', 'height="48"').replace('stroke="currentColor"', 'stroke="#6b7280"').replace('class="', 'class="mb-4 opacity-50 ')}
          <p>暂无工作记录。</p>
          <p class="text-sm">第一次打卡下班后即可查看统计。</p>
        </div>
      `;
    }

    return `
      <div class="p-4 space-y-6 pb-20 overflow-y-auto h-full">
        <div class="flex justify-between items-center">
          <h2 class="text-xl font-bold text-white">统计报表</h2>
          <div class="flex bg-dark rounded-lg p-1 border border-gray-700">
            <button data-period="week" class="period-btn px-3 py-1 rounded text-xs bg-surface text-white shadow">周</button>
            <button data-period="month" class="period-btn px-3 py-1 rounded text-xs text-gray-400 hover:text-white">月</button>
            <button data-period="year" class="period-btn px-3 py-1 rounded text-xs text-gray-400 hover:text-white">年</button>
          </div>
        </div>

        <div id="stats-content">
          ${this.renderStatsContent('week')}
        </div>
      </div>
    `;
  }

  renderStatsContent(period) {
    const stats = this.calculateStats(period);

    if (!stats) {
      return '<div class="text-center text-gray-500 py-10">此时间段无数据。</div>';
    }

    return `
      <!-- Cards -->
      <div class="grid grid-cols-2 gap-3">
        <div class="bg-surface p-4 rounded-xl border border-gray-700">
          <div class="flex items-center gap-2 mb-2 text-gray-400">
            ${Icons.DollarSign.replace('width="24"', 'width="16"').replace('height="24"', 'height="16"')}
            <span class="text-xs uppercase font-bold">平均时薪</span>
          </div>
          <div class="text-2xl font-mono text-emerald-400 font-bold">
            ${formatCurrency(stats.avgHourlyRate)}/时
          </div>
          <!-- 麦当劳参照 -->
          <div class="mt-2 pt-2 border-t border-gray-700/50">
            <div class="flex items-center justify-between text-[10px]">
              <span class="text-gray-500">🍔 麦当劳</span>
              <span class="text-gray-400">¥12/时</span>
            </div>
            ${stats.avgHourlyRate > 12 ?
        `<div class="text-[10px] text-emerald-400 mt-1">↑ 高 ${((stats.avgHourlyRate / 12 - 1) * 100).toFixed(0)}%</div>` :
        stats.avgHourlyRate < 12 ?
          `<div class="text-[10px] text-red-400 mt-1">↓ 低 ${((1 - stats.avgHourlyRate / 12) * 100).toFixed(0)}%</div>` :
          `<div class="text-[10px] text-gray-400 mt-1">= 持平</div>`
      }
          </div>
        </div>
        <div class="bg-surface p-4 rounded-xl border border-gray-700">
          <div class="flex items-center gap-2 mb-2 text-gray-400">
            ${Icons.Clock.replace('width="24"', 'width="16"').replace('height="24"', 'height="16"')}
            <span class="text-xs uppercase font-bold">平均加班</span>
          </div>
          <div class="text-2xl font-mono text-red-400 font-bold">
            ${Math.round(stats.avgOvertimeMinutes)}分
          </div>
        </div>
        <div class="bg-surface p-4 rounded-xl border border-gray-700 col-span-2">
          <div class="flex items-center gap-2 mb-2 text-gray-400">
            ${Icons.TrendingDown.replace('width="24"', 'width="16"').replace('height="24"', 'height="16"')}
            <span class="text-xs uppercase font-bold">最长工时</span>
          </div>
          <div class="text-2xl font-mono text-white font-bold">
            ${stats.maxDurationHours.toFixed(2)} 小时
          </div>
        </div>
      </div>

      <!-- Chart -->
      <div class="bg-surface p-4 rounded-xl border border-gray-700" style="height: 300px;">
        <h3 class="text-sm font-bold text-gray-400 mb-4">有效时薪趋势</h3>
        <canvas id="stats-chart"></canvas>
      </div>
    `;
  }

  calculateStats(period) {
    if (!this.history.length) return null;

    const now = new Date();
    let filtered = this.history;

    if (period === 'week') {
      const start = startOfWeek(now);
      filtered = this.history.filter(d => new Date(d.date) >= start);
    } else if (period === 'month') {
      const start = startOfMonth(now);
      filtered = this.history.filter(d => new Date(d.date) >= start);
    } else if (period === 'year') {
      const start = startOfYear(now);
      filtered = this.history.filter(d => new Date(d.date) >= start);
    }

    if (filtered.length === 0) return null;

    const totalDuration = filtered.reduce((acc, cur) => acc + cur.totalDurationMs, 0);
    const totalOvertime = filtered.reduce((acc, cur) => acc + cur.overtimeDurationMs, 0);
    const totalEarned = filtered.reduce((acc, cur) => acc + cur.earnedAmount, 0);
    const avgRate = filtered.reduce((acc, cur) => acc + cur.effectiveHourlyRate, 0) / filtered.length;

    const maxDurationSession = filtered.reduce((prev, current) =>
      (prev.totalDurationMs > current.totalDurationMs) ? prev : current
    );

    const chartData = filtered.map(d => ({
      date: period === 'year' ? formatMonthChinese(new Date(d.date)) : formatDateChinese(new Date(d.date)),
      rate: d.effectiveHourlyRate,
      overtime: d.overtimeDurationMs / 1000 / 60 / 60,
      type: d.type
    }));

    return {
      avgHourlyRate: avgRate,
      avgOvertimeMinutes: (totalOvertime / filtered.length) / 1000 / 60,
      maxDurationHours: maxDurationSession.totalDurationMs / 1000 / 60 / 60,
      totalEarned,
      chartData
    };
  }

  // ========== Calendar 视图 ==========
  renderCalendar() {
    if (!this.currentCalendarMonth) {
      this.currentCalendarMonth = new Date();
    }

    const days = getCalendarDays(this.currentCalendarMonth);
    const monthName = `${this.currentCalendarMonth.getFullYear()}年${this.currentCalendarMonth.getMonth() + 1}月`;

    // 按日期分组历史记录
    const historyByDate = {};
    this.history.forEach(entry => {
      const date = formatDate(new Date(entry.date));
      if (!historyByDate[date]) {
        historyByDate[date] = [];
      }
      historyByDate[date].push(entry);
    });

    return `
      <div class="flex flex-col h-full">
        <!-- 日历头部 -->
        <div class="p-4 border-b border-gray-800">
          <div class="flex justify-between items-center mb-4">
            <button id="prev-month" class="p-2 hover:bg-surface rounded">
              ${Icons.ChevronLeft}
            </button>
            <h2 class="text-xl font-bold text-white">${monthName}</h2>
            <button id="next-month" class="p-2 hover:bg-surface rounded">
              ${Icons.ChevronRight}
            </button>
          </div>
          
          <!-- 星期标题 -->
          <div class="grid grid-cols-7 gap-1 text-center text-xs text-gray-400 font-bold">
            <div>一</div>
            <div>二</div>
            <div>三</div>
            <div>四</div>
            <div>五</div>
            <div class="text-blue-400">六</div>
            <div class="text-red-400">日</div>
          </div>
        </div>

        <!-- 日历主体 -->
        <div class="flex-1 overflow-y-auto p-4 pb-20">
          <div class="grid grid-cols-7 gap-1">
            ${days.map(day => {
      const dateStr = formatDate(day);
      const entries = historyByDate[dateStr] || [];
      const isCurrentMonth = isSameMonth(day, this.currentCalendarMonth);
      const isHol = isHoliday(day, this.settings.holidays);
      const isSat = isSaturday(day);
      const isSun = isSunday(day);
      const isWeekend = isSat || isSun;
      const isNonWorkDay = isHol || (isWeekend && this.settings.scheduleType !== WorkScheduleType.NoWeekend) ||
        (isSun && this.settings.scheduleType === WorkScheduleType.SingleWeekend);

      // 计算日期状态
      let bgColor = 'bg-dark';
      let borderColor = 'border-gray-700';
      let hasWork = false;
      let hasLeave = false;
      let isOvertime = false;

      if (entries.length > 0) {
        hasWork = entries.some(e => e.type === 'work');
        hasLeave = entries.some(e => e.type === 'leave');

        if (hasWork) {
          const workEntry = entries.find(e => e.type === 'work');
          if (workEntry) {
            isOvertime = workEntry.overtimeDurationMs > 0;
            if (isOvertime) {
              bgColor = 'bg-red-900/20';
              borderColor = 'border-red-500';
            } else {
              bgColor = 'bg-emerald-900/20';
              borderColor = 'border-emerald-500';
            }
          }
        }
      }

      // 非工作日灰色显示
      if (isNonWorkDay && !hasWork && !hasLeave) {
        bgColor = 'bg-gray-800/30';
      }

      return `
                  <div class="aspect-square ${isCurrentMonth ? '' : 'opacity-30'}">
                    <button 
                      data-date="${dateStr}" 
                      class="calendar-day w-full h-full p-1 rounded border ${bgColor} ${borderColor} hover:border-primary transition-colors text-left relative"
                    >
                      <div class="text-xs ${isToday(day) ? 'font-bold text-primary' : 'text-gray-300'}">
                        ${day.getDate()}
                      </div>
                      ${entries.length > 0 ? `
                        <div class="mt-1 space-y-0.5">
                          ${entries.slice(0, 2).map(entry => `
                            <div class="text-[8px] ${entry.type === 'leave' ? 'text-blue-400' : isOvertime ? 'text-red-400' : 'text-emerald-400'} truncate">
                              ${entry.note || (entry.type === 'leave' ? '请假' : '工作')}
                            </div>
                          `).join('')}
                          ${entries.length > 2 ? `<div class="text-[8px] text-gray-500">+${entries.length - 2}</div>` : ''}
                        </div>
                      ` : ''}
                    </button>
                  </div>
                `;
    }).join('')}
          </div>
        </div>

        <!-- 图例 -->
        <div class="p-4 border-t border-gray-800 bg-surface">
          <div class="grid grid-cols-3 gap-2 text-xs">
            <div class="flex items-center gap-1">
              <div class="w-3 h-3 rounded bg-emerald-900/20 border border-emerald-500"></div>
              <span class="text-gray-400">正常</span>
            </div>
            <div class="flex items-center gap-1">
              <div class="w-3 h-3 rounded bg-red-900/20 border border-red-500"></div>
              <span class="text-gray-400">加班</span>
            </div>
            <div class="flex items-center gap-1">
              <div class="w-3 h-3 rounded bg-gray-800/30 border border-gray-700"></div>
              <span class="text-gray-400">休息</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // 渲染日期详情模态框
  renderDateDetails(dateStr) {
    const entries = this.history.filter(e => formatDate(new Date(e.date)) === dateStr);
    const date = new Date(dateStr + 'T00:00:00');
    const isHol = isHoliday(date, this.settings.holidays);
    const holiday = this.settings.holidays.find(h => h.date === dateStr);

    return `
      <div class="absolute inset-0 bg-dark/90 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" id="date-details-modal">
        <div class="bg-surface border border-gray-700 rounded-xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
          <div class="flex justify-between items-start mb-4">
            <div>
              <h3 class="text-xl font-bold text-white">${formatDate(date)}</h3>
              ${isHol ? `<p class="text-sm text-blue-400">${holiday.name}</p>` : ''}
            </div>
            <button id="close-details-btn" class="text-gray-500 hover:text-white">
              ${Icons.X}
            </button>
          </div>

          ${entries.length === 0 ? `
            <div class="text-center text-gray-500 py-8">
              <p>这一天没有记录</p>
              <button id="add-record-btn" data-date="${dateStr}" class="mt-4 px-4 py-2 bg-primary text-dark font-bold rounded hover:bg-emerald-400">
                添加记录
              </button>
            </div>
          ` : `
            <div class="space-y-3">
              ${entries.map((entry, idx) => `
                <div class="bg-dark p-3 rounded border ${entry.type === 'leave' ? 'border-blue-500/30' : entry.overtimeDurationMs > 0 ? 'border-red-500/30' : 'border-emerald-500/30'}">
                  <div class="flex justify-between items-start mb-2">
                    <div class="flex items-center gap-2">
                      ${entry.type === 'leave' ? Icons.Coffee.replace('width="24"', 'width="16"').replace('height="24"', 'height="16"').replace('stroke="currentColor"', 'stroke="#3b82f6"') : Icons.Briefcase.replace('width="24"', 'width="16"').replace('height="24"', 'height="16"').replace('stroke="currentColor"', entry.overtimeDurationMs > 0 ? 'stroke="#ef4444"' : 'stroke="#10b981"')}
                      <span class="text-sm font-bold ${entry.type === 'leave' ? 'text-blue-400' : entry.overtimeDurationMs > 0 ? 'text-red-400' : 'text-emerald-400'}">
                        ${entry.note || (entry.type === 'leave' ? '请假' : '工作')}
                      </span>
                    </div>
                    <div class="flex gap-1">
                      <button class="edit-entry-btn text-gray-400 hover:text-white" data-index="${this.history.indexOf(entry)}">
                        ✏️
                      </button>
                      <button class="delete-entry-btn text-gray-400 hover:text-red-400" data-index="${this.history.indexOf(entry)}">
                        🗑️
                      </button>
                    </div>
                  </div>
                  <div class="text-xs text-gray-400 space-y-1">
                    <div>时长: ${formatDurationChinese(entry.totalDurationMs)}</div>
                    ${entry.overtimeDurationMs > 0 ? `<div class="text-red-400">加班: ${formatDurationChinese(entry.overtimeDurationMs)}</div>` : ''}
                    <div>收入: ${formatCurrency(entry.earnedAmount)}</div>
                    <div>时薪: ${formatCurrency(entry.effectiveHourlyRate)}/时</div>
                  </div>
                </div>
              `).join('')}
            </div>
            
            <button id="add-record-btn" data-date="${dateStr}" class="w-full mt-4 px-4 py-2 bg-gray-700 text-white font-bold rounded hover:bg-gray-600">
              添加更多记录
            </button>
          `}
        </div>
      </div>
    `;
  }

  // ========== Settings 表单 ==========
  renderSettingsForm(isFirstRun) {
    const s = this.settings;
    return `
      <div class="p-6 max-w-md mx-auto">
        <div class="bg-surface rounded-xl border border-gray-700 p-6 space-y-4">
          <div>
            <label class="text-sm text-gray-400 block mb-1">月薪 (¥)</label>
            <input id="setting-salary" type="number" value="${s.monthlySalary}" class="w-full bg-dark border border-gray-600 rounded p-2 text-white">
          </div>

          <div>
            <label class="text-sm text-gray-400 block mb-1">工作制度</label>
            <select id="setting-schedule" class="w-full bg-dark border border-gray-600 rounded p-2 text-white">
              <option value="DoubleWeekend" ${s.scheduleType === WorkScheduleType.DoubleWeekend ? 'selected' : ''}>双休</option>
              <option value="SingleWeekend" ${s.scheduleType === WorkScheduleType.SingleWeekend ? 'selected' : ''}>单休</option>
              <option value="NoWeekend" ${s.scheduleType === WorkScheduleType.NoWeekend ? 'selected' : ''}>无休</option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-sm text-gray-400 block mb-1">上班时间</label>
              <input id="setting-work-start" type="time" value="${s.workStartTime}" class="w-full bg-dark border border-gray-600 rounded p-2 text-white">
            </div>
            <div>
              <label class="text-sm text-gray-400 block mb-1">下班时间</label>
              <input id="setting-work-end" type="time" value="${s.workEndTime}" class="w-full bg-dark border border-gray-600 rounded p-2 text-white">
            </div>
          </div>

          <div>
            <label class="flex items-center gap-2">
              <input id="setting-has-lunch" type="checkbox" ${s.hasLunchBreak ? 'checked' : ''} class="rounded">
              <span class="text-sm text-gray-300">有午休时间</span>
            </label>
          </div>

          <div id="lunch-time-inputs" class="grid grid-cols-2 gap-4 ${s.hasLunchBreak ? '' : 'hidden'}">
            <div>
              <label class="text-sm text-gray-400 block mb-1">午休开始</label>
              <input id="setting-lunch-start" type="time" value="${s.lunchStartTime}" class="w-full bg-dark border border-gray-600 rounded p-2 text-white">
            </div>
            <div>
              <label class="text-sm text-gray-400 block mb-1">午休结束</label>
              <input id="setting-lunch-end" type="time" value="${s.lunchEndTime}" class="w-full bg-dark border border-gray-600 rounded p-2 text-white">
            </div>
          </div>

          <!-- 节假日管理 -->
          <div class="border-t border-gray-700 pt-4">
            <div class="flex justify-between items-center mb-2">
              <label class="text-sm text-gray-400 font-bold">法定节假日</label>
              <button id="import-holidays-btn" type="button" class="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-500">
                导入中国节假日
              </button>
            </div>
            <div class="text-xs text-gray-500 mb-2">
              已设置 ${s.holidays ? s.holidays.length : 0} 个节假日
            </div>
            ${s.holidays && s.holidays.length > 0 ? `
              <div class="max-h-32 overflow-y-auto bg-dark rounded p-2 space-y-1">
                ${s.holidays.slice(0, 10).map((h, idx) => `
                  <div class="flex justify-between items-center text-xs text-gray-300">
                    <span>${h.date} - ${h.name}</span>
                    <button class="remove-holiday-btn text-red-400 hover:text-red-300" data-index="${idx}">✕</button>
                  </div>
                `).join('')}
                ${s.holidays.length > 10 ? `<div class="text-xs text-gray-500">...还有 ${s.holidays.length - 10} 个</div>` : ''}
              </div>
            ` : '<div class="text-xs text-gray-500">暂无节假日设置</div>'}
          </div>

          <div class="flex gap-2">
            <button id="save-settings-btn" class="flex-1 bg-primary text-dark font-bold py-3 rounded hover:bg-emerald-400">
              保存设置
            </button>
            ${!isFirstRun ? '<button id="cancel-settings-btn" class="px-6 bg-gray-700 text-white font-bold py-3 rounded hover:bg-gray-600">取消</button>' : ''}
          </div>
        </div>
      </div>
    `;
  }

  // ========== 事件绑定 ==========
  bindEvents() {
    // 底部导航
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const view = e.currentTarget.dataset.view;
        this.switchView(view);
      });
    });

    // Tracker 视图事件
    if (this.view === 'tracker') {
      this.bindTrackerEvents();
    }

    // Stats 视图事件
    if (this.view === 'stats') {
      this.bindStatsEvents();
    }

    // Calendar 视图事件
    if (this.view === 'calendar') {
      this.bindCalendarEvents();
    }

    // Settings 视图事件
    if (this.view === 'settings') {
      this.bindSettingsFormEvents(false);
    }
  }

  bindTrackerEvents() {
    const startBtn = document.getElementById('start-work-btn');
    const stopBtn = document.getElementById('stop-work-btn');
    const editStartTimeBtn = document.getElementById('edit-start-time-btn');

    if (startBtn) {
      startBtn.addEventListener('click', () => this.handleStartWork());
    }

    if (stopBtn) {
      stopBtn.addEventListener('click', () => this.handleStopWork());
    }

    // 编辑上班时间
    if (editStartTimeBtn) {
      editStartTimeBtn.addEventListener('click', () => this.handleEditStartTime());
    }

    // 快捷操作按钮
    document.querySelectorAll('.quick-action').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const type = e.currentTarget.dataset.modal;
        this.openModal(type);
      });
    });

    // 模态框事件
    if (this.showModal) {
      this.bindModalEvents();
    }
  }

  bindModalEvents() {
    const closeBtn = document.getElementById('close-modal-btn');
    const submitBtn = document.getElementById('submit-entry-btn');

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.showModal = false;
        this.switchView('tracker');
      });
    }

    if (submitBtn) {
      submitBtn.addEventListener('click', () => this.handleSubmitEntry());
    }

    // 监听输入变化更新预览
    ['modal-date', 'modal-start', 'modal-end', 'modal-ratio'].forEach(id => {
      const input = document.getElementById(id);
      if (input) {
        input.addEventListener('input', () => {
          this.updateModalData();
          this.updateModalPreview();
        });
      }
    });
  }

  updateModalData() {
    const dateInput = document.getElementById('modal-date');
    const startInput = document.getElementById('modal-start');
    const endInput = document.getElementById('modal-end');
    const ratioInput = document.getElementById('modal-ratio');

    if (dateInput) this.modalData.date = dateInput.value;
    if (startInput) this.modalData.start = startInput.value;
    if (endInput) this.modalData.end = endInput.value;
    if (ratioInput) this.modalData.ratio = parseFloat(ratioInput.value);
  }

  updateModalPreview() {
    const preview = document.getElementById('modal-preview');
    if (preview) {
      preview.textContent = formatCurrency(this.getModalPreviewAmount());
    }
  }

  bindStatsEvents() {
    document.querySelectorAll('.period-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const period = e.currentTarget.dataset.period;

        // 更新按钮样式
        document.querySelectorAll('.period-btn').forEach(b => {
          b.className = 'period-btn px-3 py-1 rounded text-xs text-gray-400 hover:text-white';
        });
        e.currentTarget.className = 'period-btn px-3 py-1 rounded text-xs bg-surface text-white shadow';

        // 更新内容
        const container = document.getElementById('stats-content');
        container.innerHTML = this.renderStatsContent(period);

        // 重新渲染图表
        this.renderChart(period);
      });
    });

    // 初始渲染图表
    setTimeout(() => this.renderChart('week'), 100);
  }

  bindCalendarEvents() {
    // 月份切换按钮
    const prevBtn = document.getElementById('prev-month');
    const nextBtn = document.getElementById('next-month');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        this.currentCalendarMonth = subMonths(this.currentCalendarMonth, 1);
        this.switchView('calendar');
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        this.currentCalendarMonth = addMonths(this.currentCalendarMonth, 1);
        this.switchView('calendar');
      });
    }

    // 日期点击事件
    document.querySelectorAll('.calendar-day').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const dateStr = e.currentTarget.dataset.date;
        this.showDateDetails(dateStr);
      });
    });
  }

  showDateDetails(dateStr) {
    // 保存当前日期以便关闭后返回
    this.selectedDate = dateStr;

    // 在主内容区域显示详情
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = this.renderDateDetails(dateStr);

    // 绑定详情模态框事件
    this.bindDateDetailsEvents();
  }

  bindDateDetailsEvents() {
    const closeBtn = document.getElementById('close-details-btn');
    const addRecordBtn = document.getElementById('add-record-btn');

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.selectedDate = null;
        this.switchView('calendar');
      });
    }

    if (addRecordBtn) {
      addRecordBtn.addEventListener('click', (e) => {
        const dateStr = e.currentTarget.dataset.date;
        this.openModalForDate(dateStr);
      });
    }

    // 编辑按钮
    document.querySelectorAll('.edit-entry-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.currentTarget.dataset.index);
        this.editHistoryEntry(index);
      });
    });

    // 删除按钮
    document.querySelectorAll('.delete-entry-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.currentTarget.dataset.index);
        this.deleteHistoryEntry(index);
      });
    });
  }

  openModalForDate(dateStr) {
    // 打开补卡模态框，并设置日期
    this.modalType = 'Work';
    this.modalData = {
      date: dateStr,
      start: this.settings.workStartTime,
      end: this.settings.workEndTime,
      ratio: 1.0
    };
    this.showModal = true;
    this.switchView('tracker');
  }

  editHistoryEntry(index) {
    const entry = this.history[index];
    if (!entry) return;

    // 根据类型打开相应的模态框
    if (entry.type === 'work') {
      this.modalType = 'Work';
      const date = new Date(entry.date);
      // 这里需要从记录中推算时间，暂时使用默认值
      this.modalData = {
        date: formatDate(date),
        start: this.settings.workStartTime,
        end: this.settings.workEndTime,
        ratio: 1.0
      };
    } else {
      // 请假记录
      const note = entry.note || '';
      if (note.includes('年假')) {
        this.modalType = 'Annual';
        this.modalData = { date: formatDate(new Date()), start: this.settings.workStartTime, end: this.settings.workEndTime, ratio: 1.0 };
      } else if (note.includes('病假')) {
        this.modalType = 'Sick';
        this.modalData = { date: formatDate(new Date()), start: this.settings.workStartTime, end: this.settings.workEndTime, ratio: 0.8 };
      } else {
        this.modalType = 'Personal';
        this.modalData = { date: formatDate(new Date()), start: this.settings.workStartTime, end: this.settings.workEndTime, ratio: 0 };
      }
    }

    // 删除旧记录
    this.history.splice(index, 1);
    Storage.saveHistory(this.history);

    // 打开模态框编辑
    this.showModal = true;
    this.switchView('tracker');
  }

  deleteHistoryEntry(index) {
    if (confirm('确定要删除这条记录吗？')) {
      this.history.splice(index, 1);
      Storage.saveHistory(this.history);

      // 如果还在详情页面，重新渲染详情
      if (this.selectedDate) {
        this.showDateDetails(this.selectedDate);
      } else {
        this.switchView('calendar');
      }
    }
  }

  bindSettingsFormEvents(isFirstRun) {
    const hasLunchCheckbox = document.getElementById('setting-has-lunch');
    const lunchInputs = document.getElementById('lunch-time-inputs');
    const saveBtn = document.getElementById('save-settings-btn');
    const cancelBtn = document.getElementById('cancel-settings-btn');
    const importHolidaysBtn = document.getElementById('import-holidays-btn');

    if (hasLunchCheckbox) {
      hasLunchCheckbox.addEventListener('change', (e) => {
        lunchInputs.classList.toggle('hidden', !e.target.checked);
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.handleSaveSettings(isFirstRun));
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.switchView('tracker'));
    }

    // 导入节假日
    if (importHolidaysBtn) {
      importHolidaysBtn.addEventListener('click', () => this.importHolidays());
    }

    // 删除单个节假日
    document.querySelectorAll('.remove-holiday-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.currentTarget.dataset.index);
        this.removeHoliday(index);
      });
    });
  }

  // 导入中国法定节假日
  importHolidays() {
    if (confirm('确定要导入中国法定节假日吗？这将添加 ' + CHINA_HOLIDAYS_PRESET.length + ' 个节假日。')) {
      const newHolidays = CHINA_HOLIDAYS_PRESET.map((h, idx) => ({
        id: generateId(),
        ...h
      }));

      this.settings.holidays = newHolidays;
      Storage.saveSettings(this.settings);

      // 重新渲染设置页面
      this.switchView('settings');
    }
  }

  // 删除节假日
  removeHoliday(index) {
    this.settings.holidays.splice(index, 1);
    Storage.saveSettings(this.settings);
    this.switchView('settings');
  }

  // ========== 业务逻辑 ==========
  handleStartWork() {
    this.currentSession = {
      id: generateId(),
      date: new Date().toISOString(),
      startTime: Date.now(),
      endTime: null
    };
    Storage.saveCurrentSession(this.currentSession);
    this.startTimer();
    this.switchView('tracker');
  }

  handleStopWork() {
    if (!this.currentSession) return;

    const endTime = Date.now();
    const totalDurationMs = endTime - this.currentSession.startTime;

    // 计算标准工作时长（分钟）
    const standardMinutes = getStandardWorkMinutes(this.settings);
    const standardMs = standardMinutes * 60 * 1000;

    // 计算日薪和时薪
    const rates = getRates(this.settings);
    const dailySalary = rates.dailyRate;

    // 不管工作多久，下班后就获得全部日薪
    const earnedAmount = dailySalary;

    // 计算加班时长（如果工作超过标准时长）
    const overtimeDurationMs = totalDurationMs > standardMs ? (totalDurationMs - standardMs) : 0;

    // 计算有效时薪（总收入/实际工时）
    const actualHours = totalDurationMs / (1000 * 60 * 60);
    const effectiveHourlyRate = actualHours > 0 ? earnedAmount / actualHours : rates.hourlyRate;

    const stat = {
      date: this.currentSession.date,
      totalDurationMs: totalDurationMs,
      overtimeDurationMs: overtimeDurationMs,
      earnedAmount: earnedAmount,
      effectiveHourlyRate: effectiveHourlyRate,
      type: 'work'
    };

    this.history = Storage.addHistoryEntry(stat);
    this.currentSession = null;
    Storage.saveCurrentSession(null);
    this.stopTimer();
    this.switchView('tracker');
  }

  handleEditStartTime() {
    const newTime = prompt('请输入新的上班时间 (HH:MM):',
      new Date(this.currentSession.startTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }));

    if (newTime) {
      const [hours, minutes] = newTime.split(':').map(Number);
      if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
        const today = new Date();
        today.setHours(hours, minutes, 0, 0);

        // 确保新时间不晚于现在
        if (today.getTime() < Date.now()) {
          this.currentSession.startTime = today.getTime();
          Storage.saveCurrentSession(this.currentSession);

          // 重新启动计时器以更新显示
          this.stopTimer();
          this.switchView('tracker');
          // 立即更新一次界面
          setTimeout(() => {
            if (this.currentSession) {
              this.startTimer();
            }
          }, 100);
        } else {
          alert('上班时间不能晚于现在！');
        }
      } else {
        alert('时间格式不正确！请使用 HH:MM 格式（如 09:30）');
      }
    }
  }

  openModal(type) {
    this.modalType = type;
    this.modalData = {
      date: formatDate(new Date()),
      start: this.settings.workStartTime,
      end: this.settings.workEndTime,
      ratio: type === 'Annual' ? 1.0 : type === 'Sick' ? 0.8 : 0
    };
    this.showModal = true;
    this.switchView('tracker');
  }

  handleSubmitEntry() {
    this.updateModalData();

    if (this.modalType === 'Work') {
      const result = calculateManualWorkValue(this.settings, this.modalData.date, this.modalData.start, this.modalData.end);
      const stat = {
        date: new Date(this.modalData.date).toISOString(),
        totalDurationMs: result.totalDurationMs,
        overtimeDurationMs: result.overtimeDurationMs,
        earnedAmount: result.earnedAmount,
        effectiveHourlyRate: result.effectiveHourlyRate,
        type: 'work',
        note: '补卡'
      };
      this.history = Storage.addHistoryEntry(stat);
    } else {
      const result = calculateLeaveValue(this.settings, this.modalData.start, this.modalData.end, this.modalData.ratio);
      const note = this.modalType === 'Annual' ? '年假' : this.modalType === 'Sick' ? '病假' : '事假';
      const stat = {
        date: new Date().toISOString(),
        totalDurationMs: result.durationMs,
        overtimeDurationMs: 0,
        earnedAmount: result.earnedAmount,
        effectiveHourlyRate: result.hourlyRate,
        type: 'leave',
        note
      };
      this.history = Storage.addHistoryEntry(stat);
    }

    this.showModal = false;
    this.switchView('tracker');
  }

  handleSaveSettings(isFirstRun) {
    const newSettings = {
      monthlySalary: parseFloat(document.getElementById('setting-salary').value),
      scheduleType: document.getElementById('setting-schedule').value,
      workStartTime: document.getElementById('setting-work-start').value,
      workEndTime: document.getElementById('setting-work-end').value,
      hasLunchBreak: document.getElementById('setting-has-lunch').checked,
      lunchStartTime: document.getElementById('setting-lunch-start').value,
      lunchEndTime: document.getElementById('setting-lunch-end').value,
      holidays: this.settings.holidays || [],
      isConfigured: true
    };

    this.settings = newSettings;
    Storage.saveSettings(newSettings);

    if (isFirstRun) {
      this.init();
    } else {
      this.switchView('tracker');
    }
  }

  // ========== 定时器 ==========
  startTimer() {
    this.updateMetrics();
    const tick = () => {
      this.updateMetrics();
      this.animationFrame = requestAnimationFrame(tick);
    };
    this.animationFrame = requestAnimationFrame(tick);
  }

  stopTimer() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  updateMetrics() {
    if (!this.currentSession) return;

    const now = Date.now();
    this.metrics = calculateLiveMetrics(this.settings, this.currentSession.startTime, now);

    // 更新 DOM
    const moneyDisplay = document.getElementById('money-display');
    const rateDisplay = document.getElementById('rate-display');
    const durationDisplay = document.getElementById('duration-display');

    if (moneyDisplay) moneyDisplay.textContent = formatCurrency(this.metrics.moneyEarned);
    if (rateDisplay) rateDisplay.textContent = formatCurrency(this.metrics.displayRate).replace('¥', '') + '/时';
    if (durationDisplay) durationDisplay.textContent = formatDurationChinese(this.metrics.workedMinutes * 60 * 1000);
  }

  // ========== 视图切换 ==========
  switchView(view) {
    if (this.animationFrame && view !== 'tracker') {
      this.stopTimer();
    }

    this.view = view;
    this.render();
    this.bindEvents();

    if (view === 'tracker' && this.currentSession) {
      this.startTimer();
    }
  }

  // ========== Chart.js 图表渲染 ==========
  renderChart(period) {
    const canvas = document.getElementById('stats-chart');
    if (!canvas) return;

    const stats = this.calculateStats(period);
    if (!stats) return;

    // 销毁旧图表
    if (this.chart) {
      this.chart.destroy();
    }

    // 创建新图表
    const ctx = canvas.getContext('2d');
    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: stats.chartData.map(d => d.date),
        datasets: [{
          label: '有效时薪',
          data: stats.chartData.map(d => d.rate),
          backgroundColor: stats.chartData.map(d => {
            if (d.type === 'leave') return '#3b82f6';
            return d.rate < (stats.avgHourlyRate * 0.9) ? '#ef4444' : '#10b981';
          }),
          borderRadius: 4,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: '#1e293b',
            borderColor: '#334155',
            borderWidth: 1,
            callbacks: {
              label: (context) => `¥${context.parsed.y.toFixed(2)}`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: '#64748b',
              font: { size: 10 },
              callback: (value) => `¥${value}`
            },
            grid: {
              color: '#334155',
              drawBorder: false
            }
          },
          x: {
            ticks: {
              color: '#64748b',
              font: { size: 10 }
            },
            grid: {
              display: false
            }
          }
        }
      }
    });
  }
}

// 初始化应用
window.addEventListener('DOMContentLoaded', () => {
  window.app = new WageAwareApp();
  window.app.init();
});
