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

    // 添加历史记录
    addHistoryEntry(entry) {
        const history = this.getHistory();
        history.unshift(entry); // 添加到开头
        this.saveHistory(history);
        return history;
    },

    // 清空所有数据
    clearAll() {
        localStorage.removeItem(STORAGE_KEYS.SETTINGS);
        localStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION);
        localStorage.removeItem(STORAGE_KEYS.HISTORY);
    },
};
