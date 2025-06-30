import { state } from './state.js';
import { pinManager } from './pinManager.js';
import { dashboard } from './dashboard.js';
import { graph } from './graph.js';
import { settings } from './settings.js';

const views = document.querySelectorAll('.view');
const nav = document.querySelector('nav');
const navButtons = document.querySelectorAll('button[data-view]');
let hideNavTimer;

// **NEW**: Function to fetch and build the changelog dynamically
async function buildChangelog() {
    const contentDiv = document.getElementById('changelog-content');
    try {
        const response = await fetch('api/get_changelog.php');
        const data = await response.json();

        if (data && data.versions) {
            contentDiv.innerHTML = ''; // Clear existing static content
            data.versions.forEach(release => {
                const versionDiv = document.createElement('div');
                const tagSpan = release.tag ? `<span class="text-xs text-gray-500 font-normal">(${release.tag})</span>` : '';
                
                const notesList = release.notes.map(note => `<li>${note}</li>`).join('');

                versionDiv.innerHTML = `
                    <h4 class="font-bold">Version ${release.version} ${tagSpan}</h4>
                    <ul class="list-disc list-inside mt-1 space-y-1">
                        ${notesList}
                    </ul>
                `;
                contentDiv.appendChild(versionDiv);
            });
        }
    } catch (error) {
        console.error('Failed to load changelog:', error);
        contentDiv.innerHTML = '<p>Could not load changelog data.</p>';
    }
}


export const ui = {
    showView: async function(viewId) {
        views.forEach(view => view.classList.remove('active'));
        const viewEl = document.getElementById(`view-${viewId}`);
        if(viewEl) viewEl.classList.add('active');

        navButtons.forEach(btn => btn.classList.remove('active'));
        const navBtnEl = document.querySelector(`button[data-view="${viewId}`);
        if(navBtnEl) navBtnEl.classList.add('active');
        
        if (viewId === 'settings') {
            document.body.classList.remove('ad-mode');
            const currentConfig = state.getConfig();
            settings.applyConfigToUI(currentConfig);
        }
        
        if (viewId === 'graph') {
            document.body.classList.remove('ad-mode');
            const currentConfig = state.getConfig();
            document.getElementById('graph-title').textContent = `Real-time Graph (Last ${currentConfig.retentionHours || 48} Hours)`;
            if (!graph.isInitialized) {
                await graph.init(); 
            } else {
                await graph.resetView(true);
            }
        }

        if(viewId === 'dashboard') {
            dashboard.applySettings();
            const lastData = state.getLastData();
            if (lastData) {
                dashboard.updateDisplay(lastData);
            }
        }
        
        if (viewId === 'settings') {
            nav.classList.add('visible');
        } else {
             setTimeout(() => { if (!nav.matches(':hover')) nav.classList.remove('visible'); }, 500);
        }
    },
    handleNavigation: async function(viewId) {
        const currentViewEl = document.querySelector('.view.active');
        if (!currentViewEl) return;
        const currentViewId = currentViewEl.id;

        if (currentViewId === 'view-settings' && viewId !== 'settings' && state.haveSettingsChanged()) {
            this.showUnsavedChangesDialog(() => {
                state.setSettingsChanged(false);
                this.handleNavigation(viewId);
            });
            return;
        }
        if (viewId === 'settings') {
            try {
                await pinManager.requestPin();
                await this.showView('settings');
            } catch {
                console.log("PIN entry cancelled.");
            }
        } else {
            await this.showView(viewId);
        }
    },
    updateClock: function() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
        const dateString = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        // Update all elements with these IDs, as they might appear in multiple views
        document.querySelectorAll('#status-current-time').forEach(el => el.textContent = timeString);
        document.querySelectorAll('#status-current-date').forEach(el => el.textContent = dateString);
    },
    showUnsavedChangesDialog: function(onConfirm) {
        // Implement your own beautiful modal here later
        if (confirm("You have unsaved changes. Are you sure you want to leave this page?")) {
            onConfirm();
        }
    },
    init: function() {
        navButtons.forEach(btn => btn.addEventListener('click', (e) => this.handleNavigation(e.currentTarget.dataset.view)));
    
        document.addEventListener('mousemove', (e) => {
            if (e.clientY < 60) {
                clearTimeout(hideNavTimer);
                nav.classList.add('visible');
            } else {
                if (!document.getElementById('view-settings').classList.contains('active') && !nav.matches(':hover')) {
                    clearTimeout(hideNavTimer);
                    hideNavTimer = setTimeout(() => { nav.classList.remove('visible'); }, 500);
                }
            }
        });
        nav.addEventListener('mouseenter', () => clearTimeout(hideNavTimer));
        nav.addEventListener('mouseleave', () => {
            if (!document.getElementById('view-settings').classList.contains('active')){
                 hideNavTimer = setTimeout(() => { nav.classList.remove('visible'); }, 500);
            }
        });

        // Initialize modals
        const appVersionBtn = document.getElementById('app-version-btn');
        const changelogModal = document.getElementById('changelog-modal');
        const closeChangelogBtn = document.getElementById('close-changelog-btn');
        
        // **MODIFIED**: Fetch changelog when the button is clicked
        appVersionBtn.addEventListener('click', () => {
            buildChangelog();
            changelogModal.classList.remove('hidden');
        });
        
        closeChangelogBtn.addEventListener('click', () => changelogModal.classList.add('hidden'));
        changelogModal.addEventListener('click', (e) => {
            if (e.target === changelogModal) changelogModal.classList.add('hidden');
        });
    }
}
