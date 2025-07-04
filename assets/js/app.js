import { state } from './modules/state.js';
import { DEFAULTS } from './modules/config.js'; // APP_VERSION is no longer imported
import { superParse, safeEvaluate } from './modules/helpers.js';
import { dashboard } from './modules/dashboard.js';
import { graph } from './modules/graph.js';
import { settings } from './modules/settings.js';
import { pinManager } from './modules/pinManager.js';
import { statusView } from './modules/status.js';
import { ui } from './modules/ui.js';

// --- INITIALIZATION ---
async function initializeDashboard(isRestart = false) {
    // Clear old interval if restarting
    if (state.getIntervalId()) {
        clearInterval(state.getIntervalId());
    }
    
    // Only load config from server on first load
    if (!isRestart) {
        await loadInitialConfig();
    }
    
    // One-time setup, only on the very first run
    if (!isRestart) {
        // Fetch changelog to get the latest version number dynamically
        try {
            const response = await fetch('api/get_changelog.php');
            const changelogData = await response.json();
            if (changelogData && changelogData.versions && changelogData.versions.length > 0) {
                const latestVersion = changelogData.versions[0].version;
                document.getElementById('app-version-btn').textContent = 'v' + latestVersion;
            } else {
                 document.getElementById('app-version-btn').textContent = 'v?.?.?';
            }
        } catch (error) {
            console.error("Could not fetch version from changelog:", error);
            document.getElementById('app-version-btn').textContent = 'v?.?.?';
        }
        
        // Pass the main initialization function to settings so it can be called after saving
        settings.init(initializeDashboard); 
        
        pinManager.init();
        await graph.init();
        dashboard.init();
        statusView.init();
        ui.init();
        
        setInterval(ui.updateClock, 1000);
    }
    
    const currentConfig = state.getConfig();
    if (Object.keys(currentConfig).length === 0) {
        console.error("Cannot initialize dashboard: config is empty.");
        return;
    }
    
    // Apply settings to all modules
    settings.applyConfigToUI(currentConfig); 
    dashboard.applySettings(); 
    statusView.applySettings();
    // graph.setupControls() is now called within graph.init(), so no need to call it here.
    
    await fetchAndUpdateAll();
    
    // Start new interval
    if (currentConfig.interval > 0) {
        const newIntervalId = setInterval(() => fetchAndUpdateAll(), currentConfig.interval * 1000);
        state.setIntervalId(newIntervalId);
    }

    // Show initial view
    if (!isRestart) {
        ui.showView('dashboard');
        ui.updateClock();
    }
}

// --- DATA HANDLING ---
async function loadInitialConfig() {
    try {
        const response = await fetch('api/settings.php');
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Could not load settings. Status: ${response.status}. ${errorText}`);
        }
        const configFromServer = await response.json();
        
        // Deep merge defaults with server config
        const newConfig = {
            ...DEFAULTS,
            ...configFromServer,
            params: configFromServer.params || DEFAULTS.params,
            operationModes: configFromServer.operationModes || DEFAULTS.operationModes,
            barChartStyling: { ...DEFAULTS.barChartStyling, ...(configFromServer.barChartStyling || {}) },
            contentRotation: {
                ...DEFAULTS.contentRotation,
                ...(configFromServer.contentRotation || {}),
                sequence: (configFromServer.contentRotation && configFromServer.contentRotation.sequence) 
                    ? configFromServer.contentRotation.sequence 
                    : DEFAULTS.contentRotation.sequence
            }
        };
        state.setConfig(newConfig);
        console.log("Successfully loaded and merged config from server.");
    } catch (error) {
        console.error("Fatal Error loading config:", error);
        alert("Could not load dashboard configuration from the server. Using default settings as a fallback.");
        state.setConfig({ ...DEFAULTS });
    }
}

function generateSingleSimulatedValue(paramConfig) {
    const key = paramConfig.jsonKey;
    if(paramConfig.type === 'status') { 
        return key === 't' ? new Date().toISOString() : 'SIMULATED'; 
    };
    const currentSimulatedValues = state.getSimulatedValues();
    const currentValue = currentSimulatedValues[key] ?? paramConfig.sim_initial ?? 50;
    const range = paramConfig.sim_range ?? 2;
    const min = paramConfig.sim_min ?? 0;
    const max = paramConfig.sim_max ?? 100;
    const change = (Math.random() * range * 2) - range;
    let newValue = currentValue + change;
    newValue = Math.max(min, Math.min(max, newValue));
    state.setSimulatedValue(key, newValue);
    
    return newValue;
}

async function fetchAndUpdateAll() {
    if (state.isFetching()) {
        return;
    }
    state.setFetching(true);

    try {
        const configToUse = state.getConfig();

        if (!configToUse || !configToUse.params) {
            console.error("Cannot fetch data, config or params are missing.");
            state.setFetching(false);
            return;
        }

        const finalDataForGraph = {};
        const finalDataForDashboard = {};
        let rawDataForUI = {};
        let realData = null;
        let fetchError = null;
        
        // Fetch real data if needed
        const realDataParams = configToUse.params.filter(p => p.mode === 'real');
        if (realDataParams.length > 0 && configToUse.apiUrl) {
            try {
                const response = await fetch('api/fetch_data.php');
                if (!response.ok) throw new Error(`Could not fetch data (Status: ${response.status})`);
                const textData = await response.text();
                if (textData.trim() === '') throw new Error('Received empty data from server');
                realData = superParse(textData);
                if (!realData) throw new Error('Could not parse data from server. Format might be incorrect.');
            } catch (error) { 
                console.error("Data fetch error:", error); 
                fetchError = error; 
            }
        }
        
        // Process all parameters
        configToUse.params.forEach(p => {
            let rawValue = 'N/A';
            let calculatedValue = 'N/A';

            if (p.mode === 'simulated') {
                rawValue = generateSingleSimulatedValue(p);
            } else if (realData && realData.hasOwnProperty(p.jsonKey)) {
                rawValue = realData[p.jsonKey];
            }

            if (p.type === 'value' && rawValue !== 'N/A') {
                const numericRawValue = parseFloat(rawValue);
                if (!isNaN(numericRawValue)) {
                    calculatedValue = safeEvaluate(p.formula || 'x', numericRawValue);
                } else {
                    calculatedValue = rawValue;
                }
            } else {
                calculatedValue = rawValue;
            }
            
            rawDataForUI[p.jsonKey] = rawValue;
            finalDataForGraph[p.jsonKey] = calculatedValue;

            let dashboardValue = calculatedValue;
            if (p.type === 'value' && p.displayMax != null && typeof dashboardValue === 'number') {
                dashboardValue = Math.min(dashboardValue, p.displayMax);
            }
            finalDataForDashboard[p.jsonKey] = dashboardValue;
        });
        
        // Process operation mode with safety check
        const modeKey = configToUse.modeStatusKey;
        const operationModes = configToUse.operationModes || [];
        const modeValue = (realData && realData.hasOwnProperty(modeKey))
            ? realData[modeKey]
            : (operationModes.find(m => m.name === 'MEASURING')?.value || '1');
        finalDataForGraph[modeKey] = modeValue;
        finalDataForDashboard[modeKey] = modeValue;
        
        // Store last known data and update all displays
        state.setLastData({ ...finalDataForDashboard });
        dashboard.updateDisplay(finalDataForDashboard, fetchError);
        statusView.updateDisplay(finalDataForGraph, fetchError);
        settings.updateParameterLiveValues(rawDataForUI, finalDataForGraph);
        if(graph.isInitialized) graph.updateCharts(finalDataForGraph);

    } finally {
        state.setFetching(false);
    }
}


// --- STARTUP ---
window.onload = async () => {
    // Register Chart.js plugins globally
    Chart.register(ChartDataLabels);
    // Initialize the entire application
    await initializeDashboard();
};