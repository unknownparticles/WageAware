// LocalStorage 管理
const Storage = {
    // 获取设置
    getSettings() {
        const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
        return data ? JSON.parse(data) : { ...DEFAULT_SETTINGS };
    },

    // 保存设置
    saveSettings(settings) {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    },

    // 获取当前会话
    getCurrentSession() {
        const data = localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION);
        return data ? JSON.parse(data) : null;
    },

    // 保存当前会话
    saveCurrentSession(session) {
        if (session) {
            localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, JSON.stringify(session));
        } else {
            localStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION);
        }
    },

    // 获取历史记录
    getHistory() {
        const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
        return data ? JSON.parse(data) : [];
    },

    // 保存历史记录
    saveHistory(history) {
        localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
    },

    // 添加历史记录（同一天的工作记录会自动合并）
    addHistoryEntry(entry) {
        const history = this.getHistory();

        // 如果是工作记录，检查是否已有同一天的工作记录
        if (entry.type === 'work') {
            const entryDate = formatDate(new Date(entry.date));
            const existingIndex = history.findIndex(h =>
                h.type === 'work' && formatDate(new Date(h.date)) === entryDate
            );

            if (existingIndex !== -1) {
                // 找到同一天的工作记录，进行合并
                const existingEntry = history[existingIndex];
                const settings = this.getSettings();
                const mergedEntry = mergeWorkRecords(settings, existingEntry, entry);

                // 替换原记录
                history[existingIndex] = mergedEntry;
                this.saveHistory(history);
                return history;
            }
        }

        // 没有找到需要合并的记录，正常添加到开头
        history.unshift(entry);
        this.saveHistory(history);
        return history;
    },

    // 导出所有数据
    exportAllData() {
        const data = {
            version: '1.0',
            exportTime: new Date().toISOString(),
            settings: this.getSettings(),
            history: this.getHistory()
        };
        return data;
    },

    // 导入数据（智能合并）
    importData(importedData, options = { mergeHistory: true, replaceSettings: false }) {
        if (!importedData || !importedData.version) {
            throw new Error('无效的数据格式');
        }

        // 导入设置
        if (importedData.settings) {
            if (options.replaceSettings) {
                this.saveSettings(importedData.settings);
            }
            // 否则保留当前设置
        }

        // 导入历史记录
        if (importedData.history && Array.isArray(importedData.history)) {
            if (options.mergeHistory) {
                // 合并模式：使用 addHistoryEntry 逐条添加，自动去重
                const currentHistory = this.getHistory();

                // 先保存当前历史，以便回滚
                const backup = [...currentHistory];

                try {
                    // 遍历导入的记录
                    importedData.history.forEach(entry => {
                        // 检查是否已存在（基于日期和类型的简单去重）
                        const entryDate = formatDate(new Date(entry.date));
                        const isDuplicate = currentHistory.some(existing => {
                            const existingDate = formatDate(new Date(existing.date));
                            // 工作记录按日期去重（会自动合并）
                            if (entry.type === 'work' && existing.type === 'work') {
                                return existingDate === entryDate;
                            }
                            // 请假记录按日期+note去重
                            if (entry.type === 'leave' && existing.type === 'leave') {
                                return existingDate === entryDate && existing.note === entry.note;
                            }
                            return false;
                        });

                        if (!isDuplicate) {
                            this.addHistoryEntry(entry);
                        }
                    });
                } catch (error) {
                    // 回滚
                    this.saveHistory(backup);
                    throw error;
                }
            } else {
                // 替换模式：直接替换所有历史记录
                this.saveHistory(importedData.history);
            }
        }

        return {
            settings: this.getSettings(),
            history: this.getHistory()
        };
    },

    // 清空所有数据
    clearAll() {
        localStorage.removeItem(STORAGE_KEYS.SETTINGS);
        localStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION);
        localStorage.removeItem(STORAGE_KEYS.HISTORY);
    },
};
