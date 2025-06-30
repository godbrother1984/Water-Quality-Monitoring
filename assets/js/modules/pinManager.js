import { state } from './state.js';

async function loadInitialConfig() {
    try {
        const response = await fetch('api/settings.php');
        if (!response.ok) {
            throw new Error(`Could not load settings. Status: ${response.status}`);
        }
        const configFromServer = await response.json();
        state.setConfig(configFromServer);
    } catch (error) {
        console.error("Error reloading config after PIN change:", error);
    }
}

export const pinManager = {
    elements: {},
    state: {
        resolvePromise: null,
        rejectPromise: null,
        isSettingPin: false,
    },

    _cacheElements() {
        this.elements = { 
            modal: document.getElementById('pin-modal'), 
            title: document.getElementById('pin-modal-title'), 
            subtitle: document.getElementById('pin-modal-subtitle'), 
            input: document.getElementById('pin-input'), 
            error: document.getElementById('pin-error'), 
            keypad: document.getElementById('pin-keypad'), 
            cancelBtn: document.getElementById('cancel-pin-btn') 
        };
    },

    reset() {
        if(this.elements.input) {
            this.elements.input.value = '';
            this.elements.error.textContent = '';
        }
    },
    show() {
        this.reset();
        this.elements.modal.classList.remove('hidden');
        this.elements.input.focus();
    },
    hide() {
        this.elements.modal.classList.add('hidden');
    },

    // Function to authorize initial access to settings
    requestPin() {
        return new Promise(async (resolve, reject) => {
            this.state.resolvePromise = resolve;
            this.state.rejectPromise = reject;

            const currentConfig = state.getConfig();
            const hasPin = currentConfig.pinHash && currentConfig.pinHash !== "";

            try {
                if (hasPin) {
                    const pin = await this.promptForPin('Enter PIN', 'to access settings.');
                    const result = await this.verifyPinOnServer(pin);
                    if (result.success) {
                        resolve();
                    } else {
                        this.elements.error.textContent = result.error || "Incorrect PIN.";
                        reject();
                    }
                } else {
                    const newPin = await this.promptForPin('Set a 6-digit PIN', 'This will be required to access settings.');
                    const confirmedPin = await this.promptForPin('Confirm New PIN', 'Please enter the new PIN again.');
                    if (newPin === confirmedPin) {
                        const result = await this.verifyPinOnServer(newPin); // This will create the hash
                        if(result.success) {
                             alert("PIN set successfully!");
                             resolve();
                        } else {
                            throw new Error(result.error);
                        }
                    } else {
                        alert("PINs do not match. Please try again.");
                        reject();
                    }
                }
            } catch(error) {
                // Catches cancellations (reject(null)) and other errors
                if (error) console.error(error.message);
                reject();
            }
        });
    },

    async requestPinChange() {
        try {
            const currentPin = await this.promptForPin('Enter Current PIN', 'to authorize the change.');
            const newPin = await this.promptForPin('Enter New 6-Digit PIN', 'This will be your new PIN.');
            const confirmedPin = await this.promptForPin('Confirm New PIN', 'Please enter the new PIN again.');

            if (newPin !== confirmedPin) {
                alert('New PINs do not match. Please try again.');
                return;
            }
            
            const response = await fetch('api/change_pin.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPin, newPin })
            });

            const result = await response.json();

            if (result.success) {
                alert('PIN changed successfully!');
            } else {
                throw new Error(result.error || 'Failed to change PIN.');
            }
        } catch (error) {
            if (error) {
               alert(`Error: ${error.message}`);
            }
        }
    },

    async verifyPinOnServer(pin) {
        const response = await fetch("api/verify_pin.php", { 
            method: "POST", 
            headers: { "Content-Type": "application/json" }, 
            body: JSON.stringify({ pin }) 
        });
        return response.json();
    },
    
    promptForPin(title, subtitle) {
        return new Promise((resolve, reject) => {
            const onComplete = (pin) => {
                this.hide();
                resolve(pin);
                cleanup();
            };
            const onCancel = () => {
                this.hide();
                reject(null); // Reject with null to signify user cancellation
                cleanup();
            };
            const onPinEntered = (e) => onComplete(e.detail.pin);
            
            const cleanup = () => {
                 this.elements.input.removeEventListener('pin-entered', onPinEntered);
                 this.elements.cancelBtn.removeEventListener('click', onCancel);
            };
            
            this.elements.input.addEventListener('pin-entered', onPinEntered, { once: true });
            this.elements.cancelBtn.addEventListener('click', onCancel, { once: true });
            
            this.elements.title.textContent = title;
            this.elements.subtitle.textContent = subtitle;
            this.show();
        });
    },

    handlePinComplete() {
        const pin = this.elements.input.value;
        const event = new CustomEvent('pin-entered', { detail: { pin } });
        this.elements.input.dispatchEvent(event);
        this.reset();
    },

    init() {
        this._cacheElements();
        this.elements.input.addEventListener("input", () => {
            this.elements.error.textContent = "";
            this.elements.input.value = this.elements.input.value.replace(/[^0-9]/g, "");
            if (this.elements.input.value.length === 6) {
                this.handlePinComplete();
            }
        });
        
        this.elements.keypad.innerHTML = '';
        const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];
        keys.forEach(key => {
            const btn = document.createElement("button");
            if (key === 'del') {
                btn.innerHTML = `<svg class="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 002.828 0L21 12M3 12l6.414-6.414a2 2 0 012.828 0L21 12"></path></svg>`;
            } else {
                btn.textContent = key;
            }
            if (key !== "") {
                btn.className = "keypad-btn bg-gray-200 text-gray-800 rounded-lg text-2xl font-bold flex items-center justify-center transition-colors duration-100 h-16";
                btn.addEventListener("click", () => {
                    if (this.elements.input.value.length < 6 || key === 'del') {
                        if (key === 'del') {
                            this.elements.input.value = this.elements.input.value.slice(0, -1);
                        } else {
                            this.elements.input.value += key;
                        }
                        this.elements.input.dispatchEvent(new Event("input"));
                    }
                });
            }
            this.elements.keypad.appendChild(btn);
        });
    }
};
