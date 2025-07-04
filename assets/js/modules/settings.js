import { state } from './state.js';
import { superParse, getYoutubeVideoId } from './helpers.js';
import { pinManager } from './pinManager.js';

// --- Constants ---
const MAX_FILE_SIZE_MB = 20;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

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

    updateStorageEstimate() {
        this.elements.storageEstimate.textContent = `Graph history is stored on the server.`;
        this.elements.storageEstimate.style.color = '';
    },
    
    createParameterRow(config = {}, addToTop = false) {
        const content = this.elements.paramRowTemplate.content.cloneNode(true);
        const row = content.querySelector('.parameter-row');
        const displayNameInput = row.querySelector('.param-displayName');
        const jsonKeyInput = row.querySelector('.param-jsonKey');
        const unitInput = row.querySelector('.param-unit');
        const rangeTextInput = row.querySelector('.param-rangeText');
        const minInput = row.querySelector('.param-min');
        const maxInput = row.querySelector('.param-max');
        const displayMaxInput = row.querySelector('.param-displayMax');
        const typeInput = row.querySelector('.param-type');
        const modeInput = row.querySelector('.param-mode');
        const formulaInput = row.querySelector('.param-formula');
        const simSettingsDiv = row.querySelector('.sim-settings');
        const simInitialInput = row.querySelector('.param-sim-initial');
        const simRangeInput = row.querySelector('.param-sim-range');
        const simMinInput = row.querySelector('.param-sim-min');
        const simMaxInput = row.querySelector('.param-sim-max');
        displayNameInput.value = config.displayName || '';
        jsonKeyInput.value = config.jsonKey || '';
        unitInput.value = config.unit || '';
        minInput.value = config.min ?? 0;
        maxInput.value = config.max || 100;
        displayMaxInput.value = config.displayMax ?? config.max ?? 100;
        typeInput.value = config.type || "value";
        modeInput.value = config.mode || "real";
        formulaInput.value = config.formula || "x";
        simInitialInput.value = config.sim_initial ?? 50;
        simRangeInput.value = config.sim_range ?? 2;
        simMinInput.value = config.sim_min ?? 0;
        simMaxInput.value = config.sim_max ?? 100;
        const updateRangeText = () => {
            const min = minInput.value;
            const max = maxInput.value;
            const unit = unitInput.value.trim();
            rangeTextInput.value = `${min}-${max} ${unit}`.trim();
        };
        minInput.addEventListener("input", updateRangeText);
        maxInput.addEventListener("input", updateRangeText);
        unitInput.addEventListener("input", updateRangeText);
        simSettingsDiv.classList.toggle("hidden", "simulated" !== (config.mode || "real"));
        modeInput.addEventListener("change", (e) => simSettingsDiv.classList.toggle("hidden", "simulated" !== e.target.value));
        row.querySelector(".remove-param-btn").addEventListener("click", () => {
            row.remove();
            state.setSettingsChanged(true);
            this.updateStorageEstimate();
        });
        if (addToTop) {
            this.elements.parameterList.prepend(row);
        } else {
            this.elements.parameterList.appendChild(row);
        }
        updateRangeText();
    },

    createImagePicker(containerEl, configKey, mediaType = 'image') {
        const id_suffix = `${configKey}-${Math.random().toString(36).substring(2, 9)}`;
        const acceptType = mediaType === 'video' ? 'video/*' : 'image/*,video/*';

        containerEl.innerHTML = `
            <div class="image-picker-container border p-4 rounded-lg bg-gray-50 space-y-3">
                <div class="preview-container hidden w-full h-48 bg-gray-200 rounded-md flex items-center justify-center overflow-hidden">
                    <img class="preview-image max-w-full max-h-full object-contain" src="">
                    <video class="preview-video max-w-full max-h-full" controls src=""></video>
                    <span class="preview-message text-gray-500"></span>
                </div>
                <div class="input-area">
                     <label class="block text-sm font-medium mb-1">Upload File</label>
                     <input type="file" class="image-picker-input-file block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none" accept="${acceptType}">
                     <p class="text-xs text-gray-500 mt-1">ขนาดสูงสุด: ${MAX_FILE_SIZE_MB}MB</p>
                </div>
                <div class="progress-container hidden mt-2">
                    <div class="w-full bg-gray-200 rounded-full h-2.5">
                        <div class="progress-bar bg-blue-600 h-2.5 rounded-full" style="width: 0%"></div>
                    </div>
                    <span class="progress-text text-xs text-gray-600"></span>
                </div>
                <div>
                     <label class="block text-sm font-medium mb-1">Or enter URL</label>
                     <input type="url" class="settings-input image-picker-input-url w-full" placeholder="https://example.com/media.png">
                </div>
                <input type="hidden" class="final-media-url" data-type="url" value="">
                 <p class="error-message text-xs text-red-600 h-4"></p>
            </div>
        `;
        
        const fileInput = containerEl.querySelector('.image-picker-input-file');
        const urlInput = containerEl.querySelector('.image-picker-input-url');
        const hiddenUrlInput = containerEl.querySelector('.final-media-url');

        urlInput.addEventListener('input', () => {
            hiddenUrlInput.value = urlInput.value;
            hiddenUrlInput.dataset.type = 'url';
            this.updatePreview(containerEl);
            state.setSettingsChanged(true);
        });

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const errorMessageEl = containerEl.querySelector('.error-message');
            errorMessageEl.textContent = '';
            if (file.size > MAX_FILE_SIZE_BYTES) {
                errorMessageEl.textContent = `ไฟล์มีขนาดใหญ่เกิน ${MAX_FILE_SIZE_MB}MB`;
                fileInput.value = '';
                return;
            }
            this.updatePreview(containerEl, file);
            this.uploadFile(containerEl, file);
            state.setSettingsChanged(true);
        });
    },

    updatePreview(containerEl, file = null) {
        const previewContainer = containerEl.querySelector('.preview-container');
        const imgEl = containerEl.querySelector('.preview-image');
        const videoEl = containerEl.querySelector('.preview-video');
        const msgEl = containerEl.querySelector('.preview-message');
        const hiddenUrlInput = containerEl.querySelector('.final-media-url');
        const urlInput = containerEl.querySelector('.image-picker-input-url');
        
        imgEl.style.display = 'none';
        videoEl.style.display = 'none';
        videoEl.src = '';
        imgEl.src = '';
        msgEl.textContent = '';
        previewContainer.classList.add('hidden');

        let source = file ? URL.createObjectURL(file) : urlInput.value || hiddenUrlInput.value;
        if (!source) return;

        previewContainer.classList.remove('hidden');
        const youtubeId = getYoutubeVideoId(source);

        if (youtubeId) {
            imgEl.style.display = 'block';
            imgEl.src = `https://i.ytimg.com/vi/${youtubeId}/mqdefault.jpg`;
            videoEl.style.display = 'none';
        } else if (file ? file.type.startsWith('video/') : /\.(mp4|webm|ogg)$/i.test(source)) {
            videoEl.style.display = 'block';
            videoEl.src = source;
            imgEl.style.display = 'none';
        } else {
            imgEl.style.display = 'block';
            imgEl.src = source;
            videoEl.style.display = 'none';
        }
    },

    uploadFile(containerEl, file) {
        const progressContainer = containerEl.querySelector('.progress-container');
        const progressBar = containerEl.querySelector('.progress-bar');
        const progressText = containerEl.querySelector('.progress-text');
        const errorMessageEl = containerEl.querySelector('.error-message');
        const hiddenUrlInput = containerEl.querySelector('.final-media-url');
        progressContainer.classList.remove('hidden');
        errorMessageEl.textContent = '';
        const formData = new FormData();
        formData.append('file', file);
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                progressBar.style.width = percentComplete + '%';
                progressText.textContent = `Uploading... ${Math.round(percentComplete)}%`;
            }
        });
        xhr.addEventListener('load', () => {
            progressText.textContent = 'Processing...';
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (response.success) {
                        progressText.textContent = 'Upload complete!';
                        hiddenUrlInput.value = response.url;
                        hiddenUrlInput.dataset.type = 'uploaded';
                    } else {
                        throw new Error(response.error || 'Unknown server error.');
                    }
                } catch (err) {
                     errorMessageEl.textContent = 'Error parsing server response.';
                     progressContainer.classList.add('hidden');
                }
            } else {
                errorMessageEl.textContent = `Upload failed: ${xhr.statusText}`;
                progressContainer.classList.add('hidden');
            }
        });
        xhr.addEventListener('error', () => {
            errorMessageEl.textContent = 'Network error during upload.';
            progressContainer.classList.add('hidden');
        });
        xhr.open('POST', 'api/upload_handler.php', true);
        xhr.send(formData);
    },

    // THIS IS THE ORIGINAL, PROBLEMATIC FUNCTION. WE WILL NOT USE IT.
    // async getImagePickerValue(containerEl) {
    //     const hiddenUrlInput = containerEl.querySelector('.final-media-url');
    //     if (!hiddenUrlInput) return { type: 'url', value: '' };
    //     return { type: 'url', value: hiddenUrlInput.value };
    // },
    
    // THIS IS THE REPLACEMENT FUNCTION THAT WILL BE USED INSTEAD.
    /**
     * Gets the final URL from an image picker for saving. This is the core of the fix.
     * @param {HTMLElement} container - The picker's container element.
     * @returns {Promise<{type: string, value: string}>} A promise that resolves with the object to be saved.
     */
    async getFinalImagePickerValue(container) {
        const fileInput = container.querySelector('.image-picker-input-file');
        const urlInput = container.querySelector('.image-picker-input-url');
        const hiddenUrlInput = container.querySelector('.final-media-url');
        
        // If a new file was selected, upload it first.
        if (fileInput && fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const formData = new FormData();
            formData.append('file', file);
            try {
                const response = await fetch('api/upload_handler.php', { method: 'POST', body: formData });
                const result = await response.json();
                if (result.success && result.url) {
                    return { type: 'url', value: result.url }; // On success, return the new URL.
                } else {
                    console.error('File upload failed on server:', result.error);
                    // Fallback: If upload fails, try to return the URL from the text input to avoid data loss.
                    return { type: 'url', value: urlInput.value };
                }
            } catch (error) {
                console.error('Upload request failed:', error);
                return { type: 'url', value: urlInput.value }; // Fallback on network error.
            }
        }
        
        // If no new file, simply return the value from the URL text input.
        // The hidden input should be kept in sync with this by the 'input' event listener.
        return { type: 'url', value: urlInput.value };
    },


    setImagePickerValue(containerEl, config) {
        if (!config || !containerEl) return;
        const hiddenUrlInput = containerEl.querySelector('.final-media-url');
        const urlInput = containerEl.querySelector('.image-picker-input-url');

        if (hiddenUrlInput && urlInput) {
            const value = config.value || '';
            hiddenUrlInput.value = value;
            urlInput.value = value;
            hiddenUrlInput.dataset.type = config.type || 'url';
            this.updatePreview(containerEl);
        }
    },
    
    updateParameterLiveValues(rawValues, calculatedValues) {
        this.elements.parameterList.querySelectorAll('.parameter-row').forEach(row => {
            const jsonKey = row.querySelector('.param-jsonKey').value;
            const rawValueInput = row.querySelector('.param-rawValue');
            const calculatedValueInput = row.querySelector('.param-calculatedValue');
            if (rawValues.hasOwnProperty(jsonKey)) {
                const raw = rawValues[jsonKey];
                rawValueInput.value = typeof raw === 'number' ? raw.toFixed(2) : raw;
            }
            if (calculatedValues.hasOwnProperty(jsonKey)) {
                const calc = calculatedValues[jsonKey];
                calculatedValueInput.value = typeof calc === 'number' ? calc.toFixed(2) : calc;
            }
        });
    },

    createRotationRow(itemConfig) {
        const row = document.createElement('div');
        row.className = 'rotation-row p-4 border rounded-lg bg-white shadow-sm relative space-y-4';
        row.setAttribute('draggable', 'true');
        row.dataset.type = itemConfig.type;
        let sourcePickerHTML = '';
        if (itemConfig.type !== 'graph') {
            sourcePickerHTML = `<div class="image-picker-container mt-4"></div>`;
        }
        let tooltipHTML = '';
        if (itemConfig.type === 'video') {
            tooltipHTML = `<span class="tooltip-trigger"><svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><span class="tooltip-content"><b>Supported Sources:</b><br>- Direct video URL (MP4, WebM, Ogg)<br>- YouTube Link (e.g., watch?v=... or youtu.be/...)<br>- Uploaded video file</span></span>`;
        } else if (itemConfig.type === 'image') {
            tooltipHTML = `<span class="tooltip-trigger"><svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><span class="tooltip-content"><b>Supported Sources:</b><br>- Direct image URL (JPG, PNG, GIF, SVG)<br>- Uploaded image file</span></span>`;
        }
        row.innerHTML = ` <div class="flex items-center justify-between"> <div class="flex items-center"> <div class="drag-handle" title="Drag to reorder"> <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"> <path d="M7 2a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm4 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM7 6a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm4 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-4 4a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm4 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-4 4a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm4 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/> </svg> </div> <input type="checkbox" class="rotation-enabled h-4 w-4 rounded" ${itemConfig.enabled ? 'checked' : ''}> <label class="ml-3 font-semibold text-gray-700 capitalize">${itemConfig.type}</label> ${tooltipHTML} </div> <div class="flex items-center gap-2"> <label class="text-sm">Duration (s):</label> <input type="number" class="rotation-duration settings-input w-20" value="${itemConfig.duration}"> <button class="remove-rotation-btn text-red-500 hover:text-red-700 p-1"> <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" /></svg> </button> </div> </div> ${sourcePickerHTML} `;
        this.elements.rotationList.appendChild(row);
        row.querySelector('.remove-rotation-btn').addEventListener('click', () => row.remove());
        const pickerContainer = row.querySelector('.image-picker-container');
        if (pickerContainer) {
            const pickerType = itemConfig.type;
            this.createImagePicker(pickerContainer, `${pickerType}-rotation`, pickerType);
            this.setImagePickerValue(pickerContainer, itemConfig.source);
        }
    },
    
    async getCurrentUIConfig() {
        const currentConfig = state.getConfig();
        const newConfig = { 
            pinHash: currentConfig.pinHash,
            
            // ** MODIFIED TO USE THE NEW FUNCTION **
            logo: await this.getFinalImagePickerValue(this.elements.logoPickerContainer),
            headerBackground: await this.getFinalImagePickerValue(this.elements.headerBgPickerContainer),
            mainBackground: await this.getFinalImagePickerValue(this.elements.mainBgPickerContainer),
            
            // Your original code for other settings
            apiUrl: this.elements.apiUrlInput.value.trim(),
            interval: parseInt(this.elements.intervalInput.value, 10) || 30,
            retentionHours: parseInt(this.elements.retentionInput.value, 10) || 48,
            headerCaption: this.elements.headerCaptionInput.value.trim(),
            headerSubCaption: this.elements.headerSubCaptionInput.value.trim(),
            headerCaptionFontSize: parseInt(this.elements.headerCaptionFontsizeInput.value, 10),
            headerSubcaptionFontSize: parseInt(this.elements.headerSubcaptionFontsizeInput.value, 10),
            headerBackgroundColor: this.elements.headerBgColorInput.value,
            mainBackgroundColor: this.elements.mainBgColorInput.value,
            showLogo: this.elements.showLogoCheckbox.checked,
            showHeaderBg: this.elements.showHeaderBgCheckbox.checked,
            showMainBg: this.elements.showMainBgCheckbox.checked,
            contentRotation: { enabled: this.elements.rotationEnabledCheckbox.checked, sequence: [] },
            barChartStyling: { barColor: this.elements.barColorInput.value, rangeTextColor: this.elements.barRangeTextColorInput.value, labelTextColor: this.elements.barLabelTextColorInput.value, valueTextColor: this.elements.barValueTextColorInput.value, unitTextColor: this.elements.barUnitTextColorInput.value, rangeFontSize: parseInt(this.elements.barRangeFontSizeInput.value, 10), labelFontSize: parseInt(this.elements.barLabelFontSizeInput.value, 10), valueFontSize: parseInt(this.elements.barValueFontSizeInput.value, 10), unitFontSize: parseInt(this.elements.barUnitFontSizeInput.value, 10) },
            modeStatusKey: this.elements.modeKeyInput.value.trim(),
            operationModes: [],
            params: [] 
        };
        
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
                itemConfig.source = await this.getFinalImagePickerValue(pickerContainer);
            }
            return itemConfig;
        });
        newConfig.contentRotation.sequence = await Promise.all(sequencePromises);
        
        this.elements.modeValuesContainer.querySelectorAll('.mode-value-row').forEach(row => { const name = row.querySelector('label').textContent; const value = row.querySelector('input').value.trim(); newConfig.operationModes.push({ name, value }); });
        this.elements.parameterList.querySelectorAll('.parameter-row').forEach(row => { newConfig.params.push({ displayName: row.querySelector('.param-displayName').value.trim(), jsonKey: row.querySelector('.param-jsonKey').value.trim(), unit: row.querySelector('.param-unit').value.trim(), type: row.querySelector('.param-type').value, mode: row.querySelector('.param-mode').value, formula: row.querySelector('.param-formula').value.trim() || 'x', min: parseFloat(row.querySelector('.param-min').value) || 0, max: parseFloat(row.querySelector('.param-max').value) || 100, displayMax: parseFloat(row.querySelector('.param-displayMax').value) || null, sim_initial: parseFloat(row.querySelector('.param-sim-initial').value), sim_range: parseFloat(row.querySelector('.param-sim-range').value), sim_min: parseFloat(row.querySelector('.param-sim-min').value), sim_max: parseFloat(row.querySelector('.param-sim-max').value) }); });
        
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
        
        // ** MODIFIED TO USE THE NEW UI AND LOGIC **
        this.createImagePicker(this.elements.logoPickerContainer, "logo", "image");
        this.setImagePickerValue(this.elements.logoPickerContainer, config.logo);
        this.createImagePicker(this.elements.headerBgPickerContainer, "headerBg", "image");
        this.setImagePickerValue(this.elements.headerBgPickerContainer, config.headerBackground);
        this.createImagePicker(this.elements.mainBgPickerContainer, "mainBg", "image");
        this.setImagePickerValue(this.elements.mainBgPickerContainer, config.mainBackground);
        
        const rotationConfig = config.contentRotation;
        if (rotationConfig) {
            this.elements.rotationEnabledCheckbox.checked = rotationConfig.enabled;
            this.elements.rotationList.innerHTML = "";
            rotationConfig.sequence.forEach((item) => this.createRotationRow(item));
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
            config.params.forEach((p) => this.createParameterRow(p));
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
        this.updateStorageEstimate();
        state.setSettingsChanged(false);
    },

    async save() {
        this.elements.feedback.textContent = 'Saving to server...';
        this.elements.saveBtn.disabled = true;
        
        try {
            const newConfig = await this.getCurrentUIConfig();
            
            const response = await fetch('api/settings.php', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(newConfig) 
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to save settings.');
            }

            state.setConfig(newConfig);
            this.elements.feedback.textContent = 'Settings saved successfully!';
            state.setSettingsChanged(false);
            
            // Re-populate the form to update the UI and the data attributes
            this.applyConfigToUI(newConfig);
            
            setTimeout(() => { this.elements.feedback.textContent = ''; }, 4000);
            
            if (this._initializeDashboardCallback) {
                await this._initializeDashboardCallback(true);
            }

        } catch (error) {
            console.error("Save Error:", error);
            this.elements.feedback.textContent = `Error: ${error.message}`;
        } finally {
            this.elements.saveBtn.disabled = false;
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
            const settingsResponse = await fetch('api/settings.php?action=reset', { method: 'GET' });
            const settingsResult = await settingsResponse.json();
            if (!settingsResult.success) throw new Error(settingsResult.error || 'Server failed to restore settings.');

            const graphResponse = await fetch('api/graph_data.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'clear_history' })
            });
            const graphResult = await graphResponse.json();
             if (!graphResult.success) console.error('Could not clear graph history on server.');

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
    
    initDragAndDrop(containerSelector, itemSelector) {
        const container = document.querySelector(containerSelector);
        if (!container) return;
        let draggingElement = null;
        
        function getDragAfterElement(container, y) {
            const draggableElements = [...container.querySelectorAll(`${itemSelector}:not(.dragging)`)];
            return draggableElements.reduce((closest, child) => {
                const box = child.getBoundingClientRect();
                const offset = y - box.top - box.height / 2;
                if (offset < 0 && offset > closest.offset) {
                    return { offset: offset, element: child };
                } else {
                    return closest;
                }
            }, { offset: Number.NEGATIVE_INFINITY }).element;
        }

        container.addEventListener('dragstart', e => {
            const target = e.target.closest(itemSelector);
            if (target) {
                draggingElement = target;
                setTimeout(() => { draggingElement.classList.add('dragging'); }, 0);
            }
        });
        container.addEventListener('dragend', () => {
            if (draggingElement) {
                draggingElement.classList.remove('dragging');
                draggingElement = null;
                state.setSettingsChanged(true);
            }
        });
        container.addEventListener('dragover', e => {
            e.preventDefault();
            if (!draggingElement) return;
            const afterElement = getDragAfterElement(container, e.clientY);
            if (afterElement == null) {
                container.appendChild(draggingElement);
            } else {
                container.insertBefore(draggingElement, afterElement);
            }
        });
    },

    init(initializeDashboardCallback) {
        this._initializeDashboardCallback = initializeDashboardCallback;

        const inputFieldClasses = "w-full bg-gray-200 border border-gray-300 text-gray-900 text-sm rounded-lg p-2.5 disabled:bg-gray-400 focus:ring-1 focus:border-indigo-500";
        document.querySelectorAll(".settings-input").forEach(el => {
            if (el.type !== "file" && el.type !== "color") el.className = inputFieldClasses
        });
        this.initDragAndDrop("#settings-parameter-list", ".parameter-row");
        this.initDragAndDrop("#settings-rotation-list", ".rotation-row");
        const estimateListener = () => this.updateStorageEstimate();
        this.elements.retentionInput.addEventListener("input", estimateListener);
        this.elements.parameterList.addEventListener("DOMSubtreeModified", estimateListener);
        this.elements.formContainer.addEventListener("input", (e) => { 
            if(e.target.type !== 'file') {
                state.setSettingsChanged(true); 
            }
        });
        this.elements.addParamBtn.addEventListener("click", () => { this.createParameterRow({}, true); state.setSettingsChanged(true); this.updateStorageEstimate(); });
        document.querySelectorAll(".add-slide-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const type = btn.dataset.type;
                const defaultConfig = { type: type, duration: 10, enabled: true };
                if (type !== 'graph') defaultConfig.source = { type: 'url', value: '' };
                this.createRotationRow(defaultConfig);
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
        
        this.elements.changePinBtn.addEventListener('click', () => {
            pinManager.requestPinChange();
        });
    }
};