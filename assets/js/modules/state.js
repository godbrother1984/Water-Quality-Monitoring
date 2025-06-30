// จัดการสถานะ (State) ส่วนกลางของแอปพลิเคชัน

// ใช้ private variables เพื่อไม่ให้แก้ไขค่าได้โดยตรงจากภายนอก
let _currentConfig = {};
let _lastKnownData = null;
let _mainIntervalId = null;
let _currentSimulatedValues = {};
let _isFetching = false;
let _settingsChanged = false;

export const state = {
    // Config
    getConfig: () => _currentConfig,
    setConfig: (newConfig) => { _currentConfig = newConfig; },
    
    // Last Data
    getLastData: () => _lastKnownData,
    setLastData: (data) => { _lastKnownData = data; },

    // Main Interval
    getIntervalId: () => _mainIntervalId,
    setIntervalId: (id) => { _mainIntervalId = id; },

    // Simulation Values
    getSimulatedValues: () => _currentSimulatedValues,
    setSimulatedValue: (key, value) => { _currentSimulatedValues[key] = value; },

    // Fetching status
    isFetching: () => _isFetching,
    setFetching: (status) => { _isFetching = status; },

    // Settings Changed status
    haveSettingsChanged: () => _settingsChanged,
    setSettingsChanged: (status) => { _settingsChanged = status; }
};
