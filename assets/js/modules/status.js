import { state } from './state.js';

const localState = {
    uptimeInterval: null,
    startTime: null,
    previousStatus: {}, // To track status changes for logging
    logEntries: [],
    MAX_LOG_ENTRIES: 50,
};

// --- Helper Functions ---
function getStatusInfo(param, value) {
    if (value === 'N/A' || value === null || value === undefined) {
        return { text: 'No Data', colorClass: 'text-red-500', bgClass: 'bg-red-900/50' };
    }
    
    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) {
        return { text: 'Normal', colorClass: 'text-green-400', bgClass: 'bg-green-900/50' }; // For non-numeric status
    }

    const { criticalLow, warningLow, warningHigh, criticalHigh } = param;

    if (criticalLow !== null && numericValue < criticalLow) {
        return { text: 'Critical Low', colorClass: 'text-red-400', bgClass: 'bg-red-900/50' };
    }
    if (criticalHigh !== null && numericValue > criticalHigh) {
        return { text: 'Critical High', colorClass: 'text-red-400', bgClass: 'bg-red-900/50' };
    }
    if (warningLow !== null && numericValue < warningLow) {
        return { text: 'Warning Low', colorClass: 'text-yellow-400', bgClass: 'bg-yellow-900/50' };
    }
    if (warningHigh !== null && numericValue > warningHigh) {
        return { text: 'Warning High', colorClass: 'text-yellow-400', bgClass: 'bg-yellow-900/50' };
    }
    
    return { text: 'Normal', colorClass: 'text-green-400', bgClass: 'bg-green-900/50' };
}

function formatUptime(seconds) {
    if (seconds < 0) return '0s';
    const d = Math.floor(seconds / (3600*24));
    const h = Math.floor(seconds % (3600*24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    const s = Math.floor(seconds % 60);
    
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

export const statusView = {
    elements: {},

    _cacheElements() {
        this.elements = { 
            sensorGrid: document.getElementById('sensor-status-grid'),
            connectionStatus: document.getElementById('system-connection-status'),
            apiStatus: document.getElementById('api-connection-status'),
            lastData: document.getElementById('system-last-data-time'),
            dataLatency: document.getElementById('system-data-latency'),
            logBody: document.getElementById('status-log-body'),
        };
    },

    logEvent(message, level) {
        const now = new Date();
        const timestamp = now.toLocaleTimeString('en-GB');
        const newEntry = { timestamp, message, level };

        localState.logEntries.unshift(newEntry);
        if (localState.logEntries.length > localState.MAX_LOG_ENTRIES) {
            localState.logEntries.pop();
        }
        this.renderLog();
    },

    renderLog() {
        if (!this.elements.logBody) return;
        this.elements.logBody.innerHTML = localState.logEntries.map(entry => {
            let colorClass = 'text-gray-400';
            if (entry.level === 'CRITICAL') colorClass = 'text-red-400 font-bold';
            if (entry.level === 'WARNING') colorClass = 'text-yellow-400';
            return `<tr class="border-b border-gray-700/50"><td class="px-4 py-1.5 text-gray-500">${entry.timestamp}</td><td class="px-4 py-1.5 ${colorClass}">${entry.message}</td></tr>`;
        }).join('');
    },
    
    applySettings: function() {
        const currentConfig = state.getConfig();
        if (!currentConfig || !currentConfig.params || !this.elements.sensorGrid) return;
        
        this.elements.sensorGrid.innerHTML = '';
        localState.previousStatus = {}; // Reset previous status on settings change

        const valueParams = currentConfig.params;
        
        valueParams.forEach(param => {
            const card = document.createElement('div');
            card.id = `status-card-${param.jsonKey}`;
            card.className = 'status-card-rich bg-gray-800 p-4 rounded-lg flex items-start gap-4 transition-colors duration-300';
            card.innerHTML = `
                <div class="status-indicator-light w-3 h-3 rounded-full bg-gray-600 mt-1.5 flex-shrink-0"></div>
                <div class="flex-grow">
                    <div class="flex items-center gap-2">
                        <div class="param-icon w-5 h-5 text-gray-400">${param.icon || ''}</div>
                        <h3 class="text-gray-300 font-bold">${param.displayName}</h3>
                    </div>
                    <p data-status-text class="text-lg font-semibold text-gray-500">Waiting...</p>
                </div>
                <p data-status-value class="text-2xl font-bold text-gray-500"></p>
            `;
            this.elements.sensorGrid.appendChild(card);
            localState.previousStatus[param.jsonKey] = 'Waiting...'; // Initialize status
        });
        localState.previousStatus['API'] = 'Checking...';
    },
    
    updateDisplay: function(data, error = null) {
        if (!this.elements.connectionStatus) return;
        const currentConfig = state.getConfig();

        // --- Update System Status ---
        this.elements.connectionStatus.innerHTML = `<span class="text-green-400 font-semibold">Connected</span>`;
        
        const apiStatus = error ? 'Offline' : 'Online';
        if (apiStatus !== localState.previousStatus['API']) {
            this.logEvent(`Data Source (API) status changed to ${apiStatus}`, apiStatus === 'Offline' ? 'CRITICAL' : 'INFO');
            localState.previousStatus['API'] = apiStatus;
        }
        this.elements.apiStatus.innerHTML = apiStatus === 'Online' 
            ? `<span class="text-green-400 font-semibold">Online</span>`
            : `<span class="text-red-500 font-semibold">Offline</span>`;

        if (error) {
            this.elements.lastData.textContent = 'N/A';
            this.elements.dataLatency.textContent = 'N/A';
        } else {
            const now = new Date();
            this.elements.lastData.textContent = now.toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
            
            const dataTimestamp = data.t ? new Date(data.t).getTime() : null;
            if(dataTimestamp) {
                const latency = now.getTime() - dataTimestamp;
                this.elements.dataLatency.textContent = `${(latency / 1000).toFixed(1)}s`;
            } else {
                this.elements.dataLatency.textContent = 'N/A';
            }
        }
        
        // --- Update Sensor Status ---
        currentConfig.params.forEach(param => {
            const card = document.getElementById(`status-card-${param.jsonKey}`);
            if (!card) return;

            const value = data.hasOwnProperty(param.jsonKey) ? data[param.jsonKey] : 'N/A';
            const statusInfo = getStatusInfo(param, value);
            
            const statusTextEl = card.querySelector('[data-status-text]');
            const valueTextEl = card.querySelector('[data-status-value]');
            const lightEl = card.querySelector('.status-indicator-light');

            // Log status change
            if (statusInfo.text !== localState.previousStatus[param.jsonKey]) {
                const message = `${param.displayName} status changed to ${statusInfo.text}` + (typeof value === 'number' ? ` (${value.toFixed(2)})` : '');
                this.logEvent(message, statusInfo.text.toUpperCase().includes('CRITICAL') ? 'CRITICAL' : statusInfo.text.toUpperCase().includes('WARNING') ? 'WARNING' : 'INFO');
                localState.previousStatus[param.jsonKey] = statusInfo.text;
            }

            statusTextEl.textContent = statusInfo.text;
            statusTextEl.className = `text-lg font-semibold ${statusInfo.colorClass}`;
            
            if (typeof value === 'number') {
                valueTextEl.textContent = value.toFixed(2);
                valueTextEl.className = `text-2xl font-bold ${statusInfo.colorClass}`;
            } else {
                valueTextEl.textContent = '';
            }
            
            // Update light color
            lightEl.className = `status-indicator-light w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${statusInfo.bgClass.replace('bg-', 'bg-dot-')}`.replace('bg-dot-','bg-');
        });
    },

    init() {
        this._cacheElements();
        // Start uptime counter if it's not already running
        if (!localState.uptimeInterval) {
            localState.startTime = Date.now();
            this.logEvent('Dashboard session started', 'INFO');
            // This is just a placeholder and does not affect the UI.
            // A real uptime display would need its own element.
        }
    }
};
