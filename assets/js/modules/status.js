import { state } from './state.js';

// Encapsulate state within the module
const localState = {
    dataCount: 0,
    startTime: null,
    uptimeInterval: null,
};

// Helper to format status text and icon
function formatStatus(text) {
    return `
        <span class="flex items-center text-green-400">
            ${text}
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 ml-2 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
        </span>
    `;
}

// Helper to format uptime into a readable string
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
    elements: {}, // Initialized as empty

    _cacheElements() {
        this.elements = { 
            sensorGrid: document.getElementById('sensor-status-grid'),
            connection: document.getElementById('system-connection-status'),
            lastData: document.getElementById('system-last-data-time'),
            dataCount: document.getElementById('system-data-count'),
            uptime: document.getElementById('system-uptime'),
        };
    },
    
    // This function creates the card structure based on settings
    applySettings: function() {
        const currentConfig = state.getConfig();
        if (!currentConfig || !currentConfig.params || !this.elements.sensorGrid) return;
        
        // Clear previous grid
        this.elements.sensorGrid.innerHTML = '';

        // Create cards only for parameters of type 'value'
        const valueParams = currentConfig.params.filter(p => p.type === 'value');
        
        valueParams.forEach(param => {
            const card = document.createElement('div');
            card.className = 'status-card bg-gray-800 p-4 rounded-lg';
            card.innerHTML = `
                <h3 class="text-gray-400 text-sm">${param.displayName}</h3>
                <div data-status-key="${param.jsonKey}" class="text-2xl font-bold mt-1 text-gray-500">Waiting...</div>
            `;
            this.elements.sensorGrid.appendChild(card);
        });
    },
    
    // This function updates the values on the cards
    updateDisplay: function(data, error = null) {
        if (!this.elements.connection) return;

        // --- Update System Status ---
        if (error) {
            this.elements.connection.innerHTML = `<span class="text-red-500">Disconnected</span>`;
        } else {
            this.elements.connection.innerHTML = formatStatus('Connected');
            localState.dataCount++; // Increment data count on successful fetch
            
            const now = new Date();
            this.elements.lastData.textContent = now.toLocaleString('en-GB', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            }).replace(',', '');
        }
        
        this.elements.dataCount.textContent = localState.dataCount;

        // --- Update Sensor Status ---
        if (this.elements.sensorGrid) {
            this.elements.sensorGrid.querySelectorAll('[data-status-key]').forEach(el => {
                const key = el.dataset.statusKey;
                
                if (error || !data.hasOwnProperty(key) || data[key] === 'N/A') {
                    el.innerHTML = '<span class="text-red-500">No Data</span>';
                } else {
                    el.innerHTML = formatStatus('Normal');
                }
            });
        }
    },

    init() {
        this._cacheElements();
        // Start uptime counter if it's not already running
        if (!localState.uptimeInterval) {
            localState.startTime = Date.now();
            localState.uptimeInterval = setInterval(() => {
                if (this.elements.uptime) { // Check if element exists
                    const seconds = (Date.now() - localState.startTime) / 1000;
                    this.elements.uptime.textContent = formatUptime(seconds);
                }
            }, 1000);
        }
    }
};
