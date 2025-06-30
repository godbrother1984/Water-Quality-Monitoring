import { state } from './state.js';
import { superParse } from './helpers.js';
import { pinManager } from './pinManager.js';
import { settingsUI } from './settingsUI.js';
import { mediaPicker } from './mediaPicker.js';

export const settings = {
    elements: {
        formContainer: document.getElementById('settings-form-container'),
        apiUrlInput: document.getElementById('settings-api-url'),
        intervalInput: document.getElementById('settings-interval'),
        retentionInput: document.getElementById('settings-retention'),
        storageEstimate: document.getElementById('storage-estimate'),
        headerCaptionInput: document.getElementById('settings-header-caption'),
        headerSubCaptionInput: document.getElementById('settings-header-subcaption'),
        headerBgColorInput: document.getElementById('settings-header-bg-color'),
        mainBgColorInput: document.getElementById('settings-main-bg-color'),
        headerCaptionFontsizeInput: document.getElementById('settings-header-caption-fontsize'),
        headerSubcaptionFontsizeInput: document.getElementById('settings-header-subcaption-fontsize'),
        showLogoCheckbox: document.getElementById('settings-show-logo'),
        logoPickerContainer: document.getElementById('logo-picker-container'),
        headerBgPickerContainer: document.getElementById('header-bg-picker-container'),
        mainBgPickerContainer: document.getElementById('main-bg-picker-container'),
        showHeaderBgCheckbox: document.getElementById('settings-show-header-bg'),
        showMainBgCheckbox: document.getElementById('settings-show-main-bg'),
        rotationEnabledCheckbox: document.getElementById('settings-rotation-enabled'),
        rotationList: document.getElementById('settings-rotation-list'),
        barColorInput: document.getElementById('settings-bar-color'),
        barRangeTextColorInput: document.getElementById('settings-bar-range-text-color'),
        barLabelTextColorInput: document.getElementById('settings-bar-label-text-color'),
        barValueTextColorInput: document.getElementById('settings-bar-value-text-color'),
        barUnitTextColorInput: document.getElementById('settings-bar-unit-text-color'),
        barRangeFontSizeInput: document.getElementById('settings-bar-range-font-size'),
        barLabelFontSizeInput: document.getElementById('settings-bar-label-font-size'),
        barValueFontSizeInput: document.getElementById('settings-bar-value-font-size'),
        barUnitFontSizeInput: document.getElementById('settings-bar-unit-font-size'),
        modeKeyInput: document.getElementById('settings-mode-key'),
        modeValuesContainer: document.getElementById('settings-mode-values'),
        parameterList: document.getElementById('settings-parameter-list'),
        addParamBtn: document.getElementById('settings-add-param-btn'),
        saveBtn: document.getElementById('settings-save-btn'),
        feedback: document.getElementById('settings-feedback'),
        paramRowTemplate: document.getElementById('settings-param-row-template'),
        testConnectionBtn: document.getElementById('settings-test-connection-btn'),
        rawResultDisplay: document.getElementById('settings-raw-result'),
        refreshDataBtn: document.getElementById('settings-refresh-data-btn'),
        exportBtn: document.getElementById('settings-export-btn'),
        importBtn: document.getElementById('settings-import-btn'),
        importFileInput: document.getElementById('settings-import-file-input'),
        importForm: document.getElementById('import-form'),
        restoreBtn: document.getElementById('settings-restore-btn'),
        restoreDefaultsModal: document.getElementById('restore-defaults-modal'),
        confirmRestoreBtn: document.getElementById('confirm-restore-btn'),
        cancelRestoreBtn: document.getElementById('cancel-restore-btn'),
        changePinBtn: document.getElementById('settings-change-pin-btn'),
    },
    _initializeDashboardCallback: null,

    async getCurrentUIConfig() {
        const currentConfig = state.getConfig();
        const newConfig = { pinHash: currentConfig.pinHash };

        newConfig.apiUrl = this.elements.apiUrlInput.value.trim();
        newConfig.interval = parseInt(this.elements.intervalInput.value, 10) || 30;
        newConfig.retentionHours = parseInt(this.elements.retentionInput.value, 10) || 48;
        newConfig.headerCaption = this.elements.headerCaptionInput.value.trim();
        newConfig.headerSubCaption = this.elements.headerSubCaptionInput.value.trim();
        newConfig.headerCaptionFontSize = parseInt(this.elements.headerCaptionFontsizeInput.value, 10);
        newConfig.headerSubcaptionFontSize = parseInt(this.elements.headerSubcaptionFontsizeInput.value, 10);
        newConfig.headerBackgroundColor = this.elements.headerBgColorInput.value;
        newConfig.mainBackgroundColor = this.elements.mainBgColorInput.value;
        newConfig.showLogo = this.elements.showLogoCheckbox.checked;
        newConfig.showHeaderBg = this.elements.showHeaderBgCheckbox.checked;
        newConfig.showMainBg = this.elements.showMainBgCheckbox.checked;

        newConfig.logo = await mediaPicker.getImagePickerValue(this.elements.logoPickerContainer);
        newConfig.headerBackground = await mediaPicker.getImagePickerValue(this.elements.headerBgPickerContainer);
        newConfig.mainBackground = await mediaPicker.getImagePickerValue(this.elements.mainBgPickerContainer);

        newConfig.contentRotation = { enabled: this.elements.rotationEnabledCheckbox.checked, sequence: [] };
        const rotationItems = Array.from(this.elements.rotationList.querySelectorAll('.rotation-row'));
        const sequencePromises = rotationItems.map(async (row) => {
            const type = row.dataset.type;
            const itemConfig = {
                type: type,
                enabled: row.querySelector('.rotation-enabled').checked,
                duration: parseInt(row.querySelector('.rotation-duration').value, 10) || 10,
            };
            if (type !== 'graph') {
                const pickerContainer = row.querySelector('.image-picker-container');
                itemConfig.source = await mediaPicker.getImagePickerValue(pickerContainer);
            }
            return itemConfig;
        });
        newConfig.contentRotation.sequence = await Promise.all(sequencePromises);

        newConfig.barChartStyling = { 
            barColor: this.elements.barColorInput.value, 
            rangeTextColor: this.elements.barRangeTextColorInput.value, 
            labelTextColor: this.elements.barLabelTextColorInput.value, 
            valueTextColor: this.elements.barValueTextColorInput.value, 
            unitTextColor: this.elements.barUnitTextColorInput.value, 
            rangeFontSize: parseInt(this.elements.barRangeFontSizeInput.value, 10), 
            labelFontSize: parseInt(this.elements.barLabelFontSizeInput.value, 10), 
            valueFontSize: parseInt(this.elements.barValueFontSizeInput.value, 10), 
            unitFontSize: parseInt(this.elements.barUnitFontSizeInput.value, 10) 
        };
        
        newConfig.modeStatusKey = this.elements.modeKeyInput.value.trim();
        newConfig.operationModes = [];
        this.elements.modeValuesContainer.querySelectorAll('.mode-value-row').forEach(row => { 
            const name = row.querySelector('label').textContent; 
            const value = row.querySelector('input').value.trim(); 
            newConfig.operationModes.push({ name, value }); 
        });

        newConfig.params = [];
        this.elements.parameterList.querySelectorAll('.parameter-row').forEach(row => {
            const getFloatValue = (selector) => {
                const el = row.querySelector(selector);
                const val = el ? el.value : '';
                return val !== '' ? parseFloat(val) : null;
            };

            newConfig.params.push({ 
                displayName: row.querySelector('.param-displayName').value.trim(), 
                jsonKey: row.querySelector('.param-jsonKey').value.trim(), 
                unit: row.querySelector('.param-unit').value.trim(), 
                icon: row.querySelector('.param-icon').value.trim(),
                formula: row.querySelector('.param-formula').value.trim() || 'x', 
                mode: row.querySelector('.param-mode').value,
                
                criticalLow: getFloatValue('.param-criticalLow'),
                warningLow: getFloatValue('.param-warningLow'),
                warningHigh: getFloatValue('.param-warningHigh'),
                criticalHigh: getFloatValue('.param-criticalHigh'),
                
                sim_initial: getFloatValue('.param-sim-initial'), 
                sim_range: getFloatValue('.param-sim-range'), 
                sim_min: getFloatValue('.param-sim-min'), 
                sim_max: getFloatValue('.param-sim-max') 
            }); 
        });
        return newConfig;
    },

    applyConfigToUI(config) {
        if (!config) return;
        this.elements.apiUrlInput.value = config.apiUrl || "";
        this.elements.intervalInput.value = config.interval || 30;
        this.elements.retentionInput.value = config.retentionHours || 48;
        this.elements.headerCaptionInput.value = config.headerCaption || "";
        this.elements.headerSubCaptionInput.value = config.headerSubCaption || "";
        this.elements.headerCaptionFontsizeInput.value = config.headerCaptionFontSize || 24;
        this.elements.headerSubcaptionFontsizeInput.value = config.headerSubcaptionFontSize || 18;
        this.elements.headerBgColorInput.value = config.headerBackgroundColor || '#1f2937';
        this.elements.mainBgColorInput.value = config.mainBackgroundColor || '#000000';
        this.elements.showLogoCheckbox.checked = config.showLogo ?? true;
        this.elements.showHeaderBgCheckbox.checked = config.showHeaderBg ?? true;
        this.elements.showMainBgCheckbox.checked = config.showMainBg ?? true;
        
        mediaPicker.setImagePickerValue(this.elements.logoPickerContainer, config.logo);
        mediaPicker.setImagePickerValue(this.elements.headerBgPickerContainer, config.headerBackground);
        mediaPicker.setImagePickerValue(this.elements.mainBgPickerContainer, config.mainBackground);
        
        const rotationConfig = config.contentRotation;
        if (rotationConfig) {
            this.elements.rotationEnabledCheckbox.checked = rotationConfig.enabled;
            this.elements.rotationList.innerHTML = "";
            rotationConfig.sequence.forEach((item) => settingsUI.createRotationRow(item));
        }
        
        this.elements.modeKeyInput.value = config.modeStatusKey || "";
        this.elements.modeValuesContainer.innerHTML = "";
        if (config.operationModes) {
            config.operationModes.forEach((mode) => {
                const row = document.createElement("div");
                row.className = "mode-value-row flex justify-between items-center";
                row.innerHTML = ` <label class="text-sm font-medium">${mode.name}</label> <input type="text" value="${mode.value}" class="settings-input w-32 text-center"> `;
                this.elements.modeValuesContainer.appendChild(row);
            });
        }
        
        if (config.params && Array.isArray(config.params)) {
            this.elements.parameterList.innerHTML = "";
            config.params.forEach((p) => settingsUI.createParameterRow(p));
        }

        const styling = config.barChartStyling;
        if (styling) {
            this.elements.barColorInput.value = styling.barColor || '#f6995a';
            this.elements.barRangeTextColorInput.value = styling.rangeTextColor || '#ffffff';
            this.elements.barLabelTextColorInput.value = styling.labelTextColor || '#ffffff';
            this.elements.barValueTextColorInput.value = styling.valueTextColor || '#ffffff';
            this.elements.barUnitTextColorInput.value = styling.unitTextColor || '#d1d5db';
            this.elements.barRangeFontSizeInput.value = styling.rangeFontSize || 18;
            this.elements.barLabelFontSizeInput.value = styling.labelFontSize || 18;
            this.elements.barValueFontSizeInput.value = styling.valueFontSize || 18;
            this.elements.barUnitFontSizeInput.value = styling.unitFontSize || 18;
        }
        
        settingsUI.updateStorageEstimate();
        state.setSettingsChanged(false);
    },

    async save() {
        this.elements.feedback.textContent = 'Saving to server...';
        const newConfig = await this.getCurrentUIConfig();

        try {
            const response = await fetch('api/settings.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newConfig) });
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || 'Failed to save settings.');
            }
            state.setConfig(newConfig);
            this.elements.feedback.textContent = 'Settings saved to server!';
            state.setSettingsChanged(false);
            setTimeout(() => { this.elements.feedback.textContent = ''; }, 4000);
            
            if (this._initializeDashboardCallback) {
                await this._initializeDashboardCallback(true);
            }

        } catch (error) {
            console.error("Save Error:", error);
            this.elements.feedback.textContent = `Error: ${error.message}`;
        }
    },
    
    showRestoreConfirmation() {
        this.elements.restoreDefaultsModal.classList.remove('hidden');
        const confirmHandler = () => {
            this.elements.restoreDefaultsModal.classList.add('hidden');
            this.restoreDefaults();
            cleanup();
        };
        const cancelHandler = () => {
            this.elements.restoreDefaultsModal.classList.add('hidden');
            cleanup();
        };
        const cleanup = () => {
            this.elements.confirmRestoreBtn.removeEventListener('click', confirmHandler);
            this.elements.cancelRestoreBtn.removeEventListener('click', cancelHandler);
        }
        this.elements.confirmRestoreBtn.addEventListener('click', confirmHandler);
        this.elements.cancelRestoreBtn.addEventListener('click', cancelHandler);
    },

    async restoreDefaults() {
        this.elements.feedback.textContent = 'Restoring defaults...';
        try {
            const settingsResponse = await fetch('api/settings.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'restore_defaults' }) });
            if (!settingsResponse.ok) { throw new Error('Server failed to restore defaults.'); }

            const graphResponse = await fetch('api/graph_data.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'clear_history' })
            });
            if (!graphResponse.ok) { console.error('Could not clear graph history on server.'); }

            location.reload();
        } catch (error) {
            this.elements.feedback.textContent = `Error: ${error.message}`;
        }
    },

    async testConnection() {
        const resultDisplay = this.elements.rawResultDisplay;
        resultDisplay.textContent = 'Testing connection via server...\n';
        try {
            const response = await fetch('api/fetch_data.php');
            const rawText = await response.text();
            if (!response.ok) {
                throw new Error(`Connection failed: ${response.status} ${response.statusText}\n\nServer Response:\n${rawText}`);
            }
            resultDisplay.textContent = `--- Raw Response from Server ---\n${rawText || '(Received empty response)'}`;
            const parsedData = superParse(rawText);
            resultDisplay.textContent += `\n\n--- Parsed Data (Result of superParse) ---\n${JSON.stringify(parsedData, null, 2) || '(Parsing failed)'}`;
        } catch (err) {
            resultDisplay.textContent = `--- ERROR ---\n${err.message}`;
        }
    },

    updateParameterLiveValues(rawValues, calculatedValues) {
        settingsUI.updateParameterLiveValues(rawValues, calculatedValues);
    },

    init(initializeDashboardCallback) {
        this._initializeDashboardCallback = initializeDashboardCallback;

        settingsUI.init(this.elements);

        mediaPicker.createImagePicker(this.elements.logoPickerContainer, "logo", "image");
        mediaPicker.createImagePicker(this.elements.headerBgPickerContainer, "headerBg", "image");
        mediaPicker.createImagePicker(this.elements.mainBgPickerContainer, "mainBg", "image");

        const inputFieldClasses = "w-full bg-gray-200 border border-gray-300 text-gray-900 text-sm rounded-lg p-2.5 disabled:bg-gray-400 focus:ring-1 focus:border-indigo-500";
        document.querySelectorAll(".settings-input").forEach(el => {
            if (el.type !== "file" && el.type !== "color") el.className = inputFieldClasses
        });

        settingsUI.initDragAndDrop("#settings-parameter-list", ".parameter-row");
        settingsUI.initDragAndDrop("#settings-rotation-list", ".rotation-row");

        const estimateListener = () => settingsUI.updateStorageEstimate();
        this.elements.retentionInput.addEventListener("input", estimateListener);
        this.elements.parameterList.addEventListener("DOMSubtreeModified", estimateListener);
        
        this.elements.formContainer.addEventListener("input", (e) => { 
            if(e.target.type !== 'file') {
                state.setSettingsChanged(true); 
            }
        });

        this.elements.addParamBtn.addEventListener("click", () => { 
            settingsUI.createParameterRow({}, true); 
            state.setSettingsChanged(true); 
            settingsUI.updateStorageEstimate(); 
        });

        document.querySelectorAll(".add-slide-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const type = btn.dataset.type;
                const defaultConfig = { type: type, duration: 10, enabled: true };
                if (type !== 'graph') defaultConfig.source = { type: 'url', value: '' };
                settingsUI.createRotationRow(defaultConfig);
            });
        });

        this.elements.saveBtn.addEventListener("click", () => this.save());
        this.elements.testConnectionBtn.addEventListener("click", () => this.testConnection());
        this.elements.refreshDataBtn.addEventListener("click", async () => {
            this.elements.feedback.textContent = "Saving settings and refreshing...";
            await this.save();
        });
        this.elements.restoreBtn.addEventListener("click", () => this.showRestoreConfirmation());
        this.elements.exportBtn.addEventListener("click", () => { window.location.href = "api/export.php"; });
        this.elements.importBtn.addEventListener("click", () => this.elements.importFileInput.click());
        this.elements.importFileInput.addEventListener("change", async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const formData = new FormData(this.elements.importForm);
            this.elements.feedback.textContent = "Importing...";
            try {
                const response = await fetch('api/import.php', { method: 'POST', body: formData });
                const result = await response.json();
                if (!result.success) throw new Error(result.message);
                this.elements.feedback.textContent = result.message;
                location.reload();
            } catch (error) {
                this.elements.feedback.textContent = `Import failed: ${error.message}`;
            } finally {
                e.target.value = '';
            }
        });
        
        this.elements.changePinBtn.addEventListener("click", () => {
            pinManager.requestPinChange();
        });
    }
};
