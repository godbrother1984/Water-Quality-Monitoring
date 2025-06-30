import { state } from './state.js';
import { mediaPicker } from './mediaPicker.js';

export const settingsUI = {
    elements: null,

    init(elements) {
        this.elements = elements;
    },

    updateStorageEstimate() {
        if (!this.elements || !this.elements.storageEstimate) return;
        this.elements.storageEstimate.textContent = `Graph history is stored on the server.`;
        this.elements.storageEstimate.style.color = '';
    },
    
    createParameterRow(config = {}, addToTop = false) {
        if (!this.elements || !this.elements.paramRowTemplate) return;
        const content = this.elements.paramRowTemplate.content.cloneNode(true);
        const row = content.querySelector('.parameter-row');
        
        // Helper to safely set input values
        const setInput = (selector, value) => {
            const el = row.querySelector(selector);
            if (el) el.value = value ?? '';
        };

        setInput('.param-displayName', config.displayName);
        setInput('.param-jsonKey', config.jsonKey);
        setInput('.param-unit', config.unit);
        setInput('.param-formula', config.formula || 'x');
        setInput('.param-icon', config.icon);

        // Thresholds
        setInput('.param-criticalLow', config.criticalLow);
        setInput('.param-warningLow', config.warningLow);
        setInput('.param-warningHigh', config.warningHigh);
        setInput('.param-criticalHigh', config.criticalHigh);

        // Simulation
        setInput('.param-sim-initial', config.sim_initial ?? 50);
        setInput('.param-sim-range', config.sim_range ?? 2);
        setInput('.param-sim-min', config.sim_min ?? 0);
        setInput('.param-sim-max', config.sim_max ?? 100);
        
        const modeInput = row.querySelector('.param-mode');
        const simSettingsDiv = row.querySelector('.sim-settings');
        if (modeInput && simSettingsDiv) {
            modeInput.value = config.mode || "real";
            simSettingsDiv.classList.toggle("hidden", "simulated" !== modeInput.value);
            modeInput.addEventListener("change", (e) => simSettingsDiv.classList.toggle("hidden", "simulated" !== e.target.value));
        }
        
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
    },

    updateParameterLiveValues(rawValues, calculatedValues) {
        if(!this.elements || !this.elements.parameterList) return;
        this.elements.parameterList.querySelectorAll('.parameter-row').forEach(row => {
            const jsonKey = row.querySelector('.param-jsonKey').value;
            const rawValueInput = row.querySelector('.param-rawValue');
            const calculatedValueInput = row.querySelector('.param-calculatedValue');
            
            if(rawValueInput) rawValueInput.value = '';
            if(calculatedValueInput) calculatedValueInput.value = '';

            if (rawValues.hasOwnProperty(jsonKey)) {
                const raw = rawValues[jsonKey];
                if (rawValueInput) rawValueInput.value = typeof raw === 'number' ? raw.toFixed(2) : raw;
            }
            if (calculatedValues.hasOwnProperty(jsonKey)) {
                const calc = calculatedValues[jsonKey];
                 if (calculatedValueInput) calculatedValueInput.value = typeof calc === 'number' ? calc.toFixed(2) : calc;
            }
        });
    },

    createRotationRow(itemConfig) {
        if (!this.elements || !this.elements.rotationList) return;
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
            mediaPicker.createImagePicker(pickerContainer, `${pickerType}-rotation`, pickerType);
            mediaPicker.setImagePickerValue(pickerContainer, itemConfig.source);
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
    }
};
