import { state } from './state.js';

export const dashboard = {
    elements: {},
    barChart: null,

    _cacheElements() {
        this.elements = {
            logo: document.getElementById('dashboard-logo'),
            title: document.getElementById('dashboard-title'),
            subtitle: document.getElementById('dashboard-subtitle'),
            header: document.getElementById('dashboard-header'),
            mainContainer: document.getElementById('view-dashboard'),
            chartContainer: document.getElementById('dashboard-chart-container'),
            barChartEl: document.getElementById('dashboard-chart'),
            valuesContainer: document.getElementById('dashboard-values-container'),
            operationModes: document.getElementById('dashboard-operation-modes')
        };
    },

    // Enhanced responsive chart initialization
    initBarChart() {
        if (!this.elements.barChartEl) return;
        
        if(this.barChart) this.barChart.destroy();
        
        // Get context inside the function, after elements are cached
        const ctx = this.elements.barChartEl.getContext('2d');
        
        // Get responsive font sizes based on viewport
        const fontSize = this.getResponsiveFontSize();
        
        this.barChart = new Chart(ctx, {
            type: 'bar',
            data: { labels: [], datasets: [{ data: [] }] },
            options: {
                responsive: true, 
                maintainAspectRatio: false, 
                indexAxis: 'x',
                // Enhanced responsive behavior
                onResize: (chart, size) => {
                    this.handleChartResize(chart, size);
                },
                scales: {
                    x: { 
                        grid: { color: 'rgba(255, 255, 255, 0.2)' }, 
                        ticks: { 
                            color: 'white', 
                            font: { 
                                size: fontSize.label, 
                                weight: 'bold' 
                            },
                            maxRotation: 45,
                            minRotation: 0
                        } 
                    },
                    xTop: { 
                        position: 'top', 
                        grid: { drawOnChartArea: false, color: 'rgba(255, 255, 255, 0.2)' }, 
                        ticks: { 
                            color: 'white', 
                            font: { size: fontSize.range },
                            maxRotation: 45,
                            minRotation: 0
                        } 
                    },
                    y: { 
                        display: true, 
                        min: 0, 
                        max: 100, 
                        grid: { display: true, color: 'rgba(255, 255, 255, 0.2)' }, 
                        ticks: { display: false } 
                    }
                },
                plugins: { 
                    legend: { display: false }, 
                    datalabels: { display: false }, 
                    tooltip: { 
                        callbacks: { 
                            label: (context) => `${context.raw.toFixed(2)}%` 
                        },
                        titleFont: { size: fontSize.tooltip },
                        bodyFont: { size: fontSize.tooltip }
                    } 
                },
                // Enhanced interaction
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });

        // Setup resize observer for better responsiveness
        this.setupResizeObserver();
    },

    // Get responsive font sizes based on viewport width
    getResponsiveFontSize() {
        const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
        
        if (vw < 640) { // Mobile
            return {
                label: 10,
                range: 9,
                value: 12,
                unit: 10,
                tooltip: 11
            };
        } else if (vw < 1024) { // Tablet
            return {
                label: 12,
                range: 11,
                value: 14,
                unit: 12,
                tooltip: 12
            };
        } else if (vw < 1920) { // Desktop
            return {
                label: 14,
                range: 12,
                value: 16,
                unit: 14,
                tooltip: 13
            };
        } else { // Large screens
            return {
                label: 16,
                range: 14,
                value: 18,
                unit: 16,
                tooltip: 14
            };
        }
    },

    // Handle chart resize events
    handleChartResize(chart, size) {
        const fontSize = this.getResponsiveFontSize();
        
        // Update font sizes on resize
        chart.options.scales.x.ticks.font.size = fontSize.label;
        chart.options.scales.xTop.ticks.font.size = fontSize.range;
        chart.options.plugins.tooltip.titleFont.size = fontSize.tooltip;
        chart.options.plugins.tooltip.bodyFont.size = fontSize.tooltip;
        
        // Update the chart
        chart.update('none'); // 'none' for no animation during resize
    },

    // Setup resize observer for container changes
    setupResizeObserver() {
        if (!this.elements.chartContainer) return;
        
        // Use ResizeObserver if available
        if (window.ResizeObserver) {
            const resizeObserver = new ResizeObserver(entries => {
                for (let entry of entries) {
                    if (this.barChart) {
                        // Trigger chart resize
                        this.barChart.resize();
                    }
                }
            });
            
            resizeObserver.observe(this.elements.chartContainer);
        } else {
            // Fallback to window resize
            window.addEventListener('resize', () => {
                if (this.barChart) {
                    setTimeout(() => {
                        this.barChart.resize();
                    }, 100);
                }
            });
        }
    },

    applySettings: function() {
        const currentConfig = state.getConfig();
        if (!currentConfig) return;
        
        const { 
            logo, mainBackground, headerBackground, operationModes, 
            headerCaption, headerSubCaption, headerBackgroundColor, mainBackgroundColor, barChartStyling,
            showLogo, showHeaderBg, showMainBg, headerCaptionFontSize, headerSubcaptionFontSize
        } = currentConfig;
        
        // Logo settings
        this.elements.logo.style.display = showLogo ? 'block' : 'none';
        this.elements.logo.src = (logo && logo.value) || 'https://placehold.co/200x200/transparent/white?text=Logo';
        
        // Header settings
        this.elements.header.style.backgroundColor = headerBackgroundColor;
        this.elements.header.style.backgroundImage = (showHeaderBg && headerBackground && headerBackground.value) ? `url('${headerBackground.value}')` : 'none';
        
        // Background settings
        document.body.style.backgroundColor = mainBackgroundColor;
        this.elements.mainContainer.style.backgroundImage = (showMainBg && mainBackground && mainBackground.value) ? `url('${mainBackground.value}')` : 'none';
        
        // Text content and font sizes
        this.elements.title.textContent = headerCaption || 'Dashboard Title';
        this.elements.subtitle.textContent = headerSubCaption || 'Dashboard Subtitle';
        this.elements.title.style.fontSize = `${headerCaptionFontSize || 24}px`;
        this.elements.subtitle.style.fontSize = `${headerSubcaptionFontSize || 16}px`;
        
        // Operation modes setup
        if (operationModes && this.elements.operationModes) {
            this.elements.operationModes.innerHTML = '';
            operationModes.forEach(mode => {
                const modeDiv = document.createElement('div');
                modeDiv.className = 'operation-mode flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg';
                modeDiv.innerHTML = `
                    <div class="status-light" id="light-${mode.name}"></div>
                    <span class="text-sm font-medium">${mode.name}</span>
                `;
                this.elements.operationModes.appendChild(modeDiv);
            });
        }
    },

    updateDisplay: function(data, error = null) {
        const currentConfig = state.getConfig();
        if (!currentConfig || !currentConfig.params) return;
        
        const valueParams = currentConfig.params.filter(p => p.type === 'value');
        if (!valueParams.length) return;
        
        const styling = currentConfig.barChartStyling || {};
        const fontSize = this.getResponsiveFontSize();
        
        // Prepare chart data
        const labels = valueParams.map(p => p.displayName);
        const values = valueParams.map(p => data[p.jsonKey] ?? 0);
        const ranges = valueParams.map(p => `${p.min || 0} - ${p.max || 100}`);
        const displayValues = values.map(v => typeof v === 'number' ? v : parseFloat(v) || 0);
        
        // Calculate normalized values for chart display
        const normalizedValues = valueParams.map((p, i) => {
            const v = displayValues[i];
            const min = p.min || 0;
            const max = p.max || 100;
            if (max <= min) return 0;
            return Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100));
        });

        // Update chart data
        this.barChart.data.labels = labels;
        this.barChart.data.datasets[0].data = normalizedValues;
        this.barChart.data.datasets[0].backgroundColor = styling.barColor || '#3b82f6';
        
        // Update range labels (top axis)
        const rangeLabels = ranges;
        
        // Clear and rebuild values container with responsive font sizes
        this.elements.valuesContainer.innerHTML = '';
        displayValues.forEach((val, i) => {
            const unit = valueParams[i].unit || '';
            const valueDiv = document.createElement('div');
            valueDiv.className = 'flex-1 text-center';
            valueDiv.innerHTML = `
                <span class="font-bold block" style="font-size: ${fontSize.value}px; color: ${styling.valueTextColor || 'white'};">
                    ${val.toFixed(2)}
                </span> 
                <span class="block" style="font-size: ${fontSize.unit}px; color: ${styling.unitTextColor || '#d1d5db'};">
                    ${unit}
                </span>
            `;
            this.elements.valuesContainer.appendChild(valueDiv);
        });

        // Update chart styling
        this.barChart.options.scales.xTop.ticks.callback = (value, index) => rangeLabels[index];
        this.barChart.options.scales.xTop.ticks.color = styling.rangeTextColor || 'white';
        this.barChart.options.scales.x.ticks.color = styling.labelTextColor || 'white';
        
        // Update chart with responsive considerations
        this.barChart.update('none');

        // Update operation mode lights
        const { modeStatusKey, operationModes } = currentConfig;
        if(operationModes) {
            const currentModeValue = data[modeStatusKey];
            const matchedMode = (currentModeValue != null) ? operationModes.find(m => String(m.value) === String(currentModeValue)) : null;
            const activeModeName = matchedMode ? matchedMode.name : 'MEASURING';
            operationModes.forEach(m => {
                const lightEl = document.getElementById(`light-${m.name}`);
                if (lightEl) {
                    lightEl.classList.toggle('active', m.name === activeModeName);
                }
            });
        }
    },

    init() {
        this._cacheElements();
        this.initBarChart();
        
        // Add window resize listener for additional responsiveness
        window.addEventListener('resize', () => {
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => {
                if (this.barChart) {
                    const fontSize = this.getResponsiveFontSize();
                    this.handleChartResize(this.barChart, null);
                }
            }, 250);
        });
    }
};