import { state } from './state.js';
import { CHART_COLORS } from './config.js';

export const graph = {
    elements: {}, // Initialized as empty
    mainChart: null, 
    brushChart: null, 
    timeRange: { min: 0, max: 0 },
    isInitialized: false,

    _cacheElements() {
        this.elements = { 
            checkboxes: document.getElementById('graph-param-checkboxes'), 
            mainChartEl: document.getElementById('mainChart'),
            brushChartEl: document.getElementById('brushChart'), 
            brushEl: document.getElementById('brush'), 
            brushContainer: document.getElementById('brush-chart-container'), 
            resetZoomBtn: document.getElementById('reset-zoom-btn'),
            // New elements for stats and table
            statsContainer: document.getElementById('graph-stats-container'),
            historyTable: document.getElementById('history-table'),
            historyTableBody: document.getElementById('history-table-body'),
            exportCsvBtn: document.getElementById('export-csv-btn'),
        };
    },

    async init() {
        this._cacheElements();
        this.initMainChart();
        this.initBrushChart();
        this.initControls();
        await this.setupControls();
        this.isInitialized = true;
    },

    initMainChart() {
        if (!this.elements.mainChartEl) return;
        if (this.mainChart) this.mainChart.destroy();
        this.mainChart = new Chart(this.elements.mainChartEl.getContext('2d'), {
            type: 'line', data: { datasets: [] },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                scales: { 
                    x: { type: 'time', time: { tooltipFormat: 'PPpp', displayFormats: { hour: 'HH:mm', day: 'MMM dd' } }, ticks: { color: '#9ca3af', maxRotation: 0, autoSkip: true, autoSkipPadding: 30 }, grid: { color: '#374151' } }, 
                    y: { beginAtZero: false, ticks: { color: '#9ca3af' }, grid: { display: true, color: '#374151' } } 
                }, 
                plugins: { 
                    legend: { position: 'top', labels: { color: '#d1d5db' } }, 
                    tooltip: { enabled: true, mode: 'index', intersect: false, callbacks: { label: function(c) { let l = c.dataset.label||''; if(l){l+=': '} if(c.parsed.y!==null){l+=c.parsed.y.toFixed(2)} return l; } } }, 
                    datalabels: { display: false } 
                }, 
                animation: false,
                onHover: (event, chartElement) => {
                    event.native.target.style.cursor = chartElement[0] ? 'pointer' : 'default';
                }
            }
        });
    },

    initBrushChart() {
        if (!this.elements.brushChartEl) return;
        if (this.brushChart) this.brushChart.destroy();
        this.brushChart = new Chart(this.elements.brushChartEl.getContext('2d'), {
            type: 'line', data: { datasets: [] },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                scales: { x: { display: false }, y: { display: false } }, 
                plugins: { legend: { display: false }, tooltip: false, datalabels: { display: false } }, 
                animation: false, 
                elements: { point: { radius: 0 }, line: { borderWidth: 1 } } 
            }
        });
    },

    initControls() {
        this.elements.resetZoomBtn.addEventListener('click', () => this.resetView());
        this.initBrushHandlers();
        
        this.elements.checkboxes.addEventListener('change', (e) => {
            if (!this.mainChart) return;
            const targetKey = e.target.value;
            const isChecked = e.target.checked;
            const mainDataset = this.mainChart.data.datasets.find(d => d.jsonKey === targetKey);
            if (mainDataset) mainDataset.hidden = !isChecked;
            const brushDataset = this.brushChart.data.datasets.find(d => d.jsonKey === targetKey);
            if (brushDataset) brushDataset.hidden = !isChecked;
            this.mainChart.update('none');
            this.brushChart.update('none');
            this.updateHistoryDisplay();
        });

        this.elements.exportCsvBtn.addEventListener('click', () => this.exportToCSV());
    },

    initBrushHandlers() {
        let isDragging = false, isResizing = null, startX, startLeft, startWidth;
        const handleMouseDown = (e) => {
            startX = e.clientX;
            startLeft = this.elements.brushEl.offsetLeft;
            startWidth = this.elements.brushEl.offsetWidth;
            if (e.target.classList.contains("brush-handle")) {
                isResizing = e.target.classList.contains("left") ? "left" : "right";
            } else if (e.target === this.elements.brushEl) {
                isDragging = true;
            }
        };
        const handleMouseMove = (e) => {
            if (!isDragging && !isResizing) return;
            e.preventDefault();
            const dx = e.clientX - startX;
            const containerWidth = this.elements.brushContainer.offsetWidth;
            if (isDragging) {
                let newLeft = startLeft + dx;
                newLeft = Math.max(0, Math.min(newLeft, containerWidth - startWidth));
                this.elements.brushEl.style.left = `${newLeft}px`;
            } else if (isResizing === 'left') {
                let newLeft = startLeft + dx;
                let newWidth = startWidth - dx;
                if (newLeft < 0) { newWidth += newLeft; newLeft = 0; }
                if (newWidth < 20) newWidth = 20;
                this.elements.brushEl.style.left = `${newLeft}px`;
                this.elements.brushEl.style.width = `${newWidth}px`;
            } else if (isResizing === 'right') {
                let newWidth = startWidth + dx;
                if (startLeft + newWidth > containerWidth) { newWidth = containerWidth - startLeft; }
                if (newWidth < 20) newWidth = 20;
                this.elements.brushEl.style.width = `${newWidth}px`;
            }
            this.updateMainChartFromBrush();
        };
        const handleMouseUp = () => {
            if(isDragging || isResizing) {
                this.updateHistoryDisplay();
            }
            isDragging = false;
            isResizing = null;
        };
        this.elements.brushContainer.addEventListener("mousedown", handleMouseDown);
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
    },

    updateMainChartFromBrush() {
        if (!this.mainChart) return;
        const { min, max } = this.timeRange;
        if (min === 0 || max === 0) return;
        const containerWidth = this.elements.brushContainer.offsetWidth;
        const brushLeft = this.elements.brushEl.offsetLeft;
        const brushWidth = this.elements.brushEl.offsetWidth;
        const totalTimeSpan = max - min;
        this.mainChart.options.scales.x.min = min + (brushLeft / containerWidth) * totalTimeSpan;
        this.mainChart.options.scales.x.max = min + ((brushLeft + brushWidth) / containerWidth) * totalTimeSpan;
        this.mainChart.update("none");
    },
    
    async loadHistoryFromServer() {
        try {
            const response = await fetch('api/graph_data.php');
            if (!response.ok) {
                console.error('Failed to fetch graph history from server');
                return {};
            }
            const serverHistory = await response.json();
            const formattedHistory = {};
            for (const key in serverHistory) {
                formattedHistory[key] = serverHistory[key].map(p => ({ x: new Date(p.x), y: p.y }));
            }
            return formattedHistory;
        } catch (error) {
            console.error('Error loading graph history:', error);
            return {};
        }
    },

    async saveHistoryPoint(jsonKey, dataPoint) {
        try {
            await fetch('api/graph_data.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jsonKey, dataPoint })
            });
        } catch (error) {
            console.error('Failed to save history point to server:', error);
        }
    },
    
    updateCharts(data) {
        if (!this.mainChart || !this.brushChart || !data) return;
        const now = new Date();
        const currentConfig = state.getConfig();
        const retentionMs = (currentConfig.retentionHours || 48) * 36e5;
        const retentionCutoff = now.getTime() - retentionMs;

        [this.mainChart, this.brushChart].forEach(chart => {
            chart.data.datasets.forEach(dataset => {
                if (data.hasOwnProperty(dataset.jsonKey)) {
                    const value = parseFloat(data[dataset.jsonKey]);
                    if (!isNaN(value)) {
                        const newDataPoint = { x: now, y: value };
                        dataset.data.push(newDataPoint);
                        const firstValidIndex = dataset.data.findIndex(p => new Date(p.x).getTime() > retentionCutoff);
                        if (firstValidIndex > 0) dataset.data.splice(0, firstValidIndex);

                        if (chart === this.mainChart) {
                           this.saveHistoryPoint(dataset.jsonKey, { x: now.toISOString(), y: value });
                        }
                    }
                }
            });
        });
        
        this.mainChart.update('none');
        this.brushChart.update('none');
        this.updateHistoryDisplay();
    },

    async setupControls() {
        const currentConfig = state.getConfig();
        if (!currentConfig.params) return;
        const params = currentConfig.params.filter(p => p.type === 'value');
        this.elements.checkboxes.innerHTML = '';

        const historicalData = await this.loadHistoryFromServer();

        const mainDatasets = [];
        const brushDatasets = [];
        params.forEach((p, index) => {
            const div = document.createElement('div');
            div.className = 'flex items-center';
            div.innerHTML = `<input id="graph-param-${p.jsonKey}" type="checkbox" value="${p.jsonKey}" class="param-checkbox w-4 h-4" checked><label for="graph-param-${p.jsonKey}" class="ml-2 text-sm text-gray-300">${p.displayName}</label>`;
            this.elements.checkboxes.appendChild(div);

            const color = CHART_COLORS[index % CHART_COLORS.length];
            const paramHistory = historicalData[p.jsonKey] || [];
            
            mainDatasets.push({ label: p.displayName, jsonKey: p.jsonKey, data: [...paramHistory], borderColor: color, backgroundColor: color + '33', fill: false, tension: 0.1, pointRadius: 1, borderWidth: 2 });
            brushDatasets.push({ jsonKey: p.jsonKey, data: [...paramHistory], borderColor: color, backgroundColor: color + '33' });
        });
        if (this.mainChart && this.brushChart) {
            this.mainChart.data.datasets = mainDatasets;
            this.brushChart.data.datasets = brushDatasets;
            await this.resetView();
        }
    },

    async resetView(forceReload = false) {
        if (!this.mainChart || !this.brushChart) return;
        
        if(forceReload){
           await this.setupControls();
        }

        const currentConfig = state.getConfig();
        const retentionMs = (currentConfig.retentionHours || 48) * 36e5;
        const now = Date.now();
        const minTime = now - retentionMs;
        this.timeRange.min = minTime;
        this.timeRange.max = now;
        this.mainChart.options.scales.x.min = minTime;
        this.mainChart.options.scales.x.max = now;
        this.brushChart.options.scales.x.min = minTime;
        this.brushChart.options.scales.x.max = now;
        this.elements.brushEl.style.left = '0px';
        this.elements.brushEl.style.width = '100%';
        this.mainChart.update('none');
        this.brushChart.update('none');
        this.updateHistoryDisplay();
    },

    // --- NEW FUNCTIONS for Stats and Table ---
    updateHistoryDisplay() {
        if (!this.mainChart || !this.elements.statsContainer || !this.elements.historyTableBody) return;

        const { min: visibleMin, max: visibleMax } = this.mainChart.options.scales.x;
        this.elements.statsContainer.innerHTML = '';
        this.elements.historyTableBody.innerHTML = '';

        const visibleDatasets = this.mainChart.data.datasets.filter(ds => !ds.hidden);
        const tableData = {};
        
        visibleDatasets.forEach(dataset => {
            const dataInRange = dataset.data.filter(p => p.x >= visibleMin && p.x <= visibleMax);
            if (dataInRange.length === 0) {
                // Render a placeholder stats card
                const placeholderCard = document.createElement('div');
                placeholderCard.className = 'bg-gray-800 p-4 rounded-lg';
                placeholderCard.innerHTML = `
                    <h3 class="font-bold text-lg" style="color:${dataset.borderColor}">${dataset.label}</h3>
                    <p class="text-gray-400 text-sm">No data in selected range</p>`;
                this.elements.statsContainer.appendChild(placeholderCard);
                return;
            }

            const values = dataInRange.map(p => p.y);
            const min = Math.min(...values);
            const max = Math.max(...values);
            const avg = values.reduce((a, b) => a + b, 0) / values.length;

            const statCard = document.createElement('div');
            statCard.className = 'bg-gray-800 p-4 rounded-lg';
            statCard.innerHTML = `
                <h3 class="font-bold text-lg truncate" style="color:${dataset.borderColor}" title="${dataset.label}">${dataset.label}</h3>
                <div class="grid grid-cols-3 gap-2 text-center mt-2">
                    <div><p class="text-xs text-gray-400">MIN</p><p class="text-base font-semibold">${min.toFixed(2)}</p></div>
                    <div><p class="text-xs text-gray-400">MAX</p><p class="text-base font-semibold">${max.toFixed(2)}</p></div>
                    <div><p class="text-xs text-gray-400">AVG</p><p class="text-base font-semibold">${avg.toFixed(2)}</p></div>
                </div>`;
            this.elements.statsContainer.appendChild(statCard);

            dataInRange.forEach(point => {
                const timestamp = point.x.toISOString();
                if (!tableData[timestamp]) {
                    tableData[timestamp] = {};
                }
                tableData[timestamp][dataset.jsonKey] = point.y;
            });
        });

        // --- FIX START ---
        // Populate Table Headers
        const thead = this.elements.historyTable.querySelector('thead');
        if (!thead) return; // Defensive check

        thead.innerHTML = ''; // Clear previous headers
        const headerRow = document.createElement('tr');
        
        let headersHTML = `<th scope="col" class="px-4 py-3">Timestamp</th>`;
        visibleDatasets.forEach(ds => {
            headersHTML += `<th scope="col" class="px-4 py-3 text-right" style="color:${ds.borderColor}">${ds.label}</th>`;
        });
        headerRow.innerHTML = headersHTML;
        thead.appendChild(headerRow);
        // --- FIX END ---

        const sortedTimestamps = Object.keys(tableData).sort((a, b) => new Date(b) - new Date(a));
        const latestTimestamps = sortedTimestamps.slice(0, 200); // Limit to latest 200 for performance

        latestTimestamps.forEach(ts => {
            const rowData = tableData[ts];
            const row = document.createElement('tr');
            row.className = 'border-b border-gray-700 hover:bg-gray-800';
            const formattedDate = new Date(ts).toLocaleString('th-TH', { 
                year: 'numeric', month: 'short', day: 'numeric', 
                hour: '2-digit', minute: '2-digit', second: '2-digit' 
            });
            row.innerHTML = `<td class="px-4 py-2 font-medium text-gray-300 whitespace-nowrap">${formattedDate}</td>`;
            
            visibleDatasets.forEach(ds => {
                const value = rowData[ds.jsonKey];
                row.innerHTML += `<td class="px-4 py-2 text-right">${value !== undefined ? value.toFixed(2) : 'N/A'}</td>`;
            });
            this.elements.historyTableBody.appendChild(row);
        });
    },

    exportToCSV() {
        if (!this.mainChart) return;
        const { min: visibleMin, max: visibleMax } = this.mainChart.options.scales.x;
        const visibleDatasets = this.mainChart.data.datasets.filter(ds => !ds.hidden);
        
        if (visibleDatasets.length === 0) {
            alert("No data to export.");
            return;
        }

        const headers = ['Timestamp', ...visibleDatasets.map(ds => ds.label)];
        const tableData = {};

        visibleDatasets.forEach(dataset => {
            const dataInRange = dataset.data.filter(p => p.x >= visibleMin && p.x <= visibleMax);
            dataInRange.forEach(point => {
                const timestamp = point.x.toISOString();
                if (!tableData[timestamp]) {
                    tableData[timestamp] = {};
                }
                tableData[timestamp][dataset.label] = point.y;
            });
        });
        
        let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n";
        const sortedTimestamps = Object.keys(tableData).sort((a, b) => new Date(a) - new Date(b));

        sortedTimestamps.forEach(ts => {
            let row = [ts];
            visibleDatasets.forEach(ds => {
                const value = tableData[ts][ds.label];
                row.push(value !== undefined ? value.toFixed(4) : '');
            });
            csvContent += row.join(",") + "\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `history_export_${new Date().toISOString()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};
