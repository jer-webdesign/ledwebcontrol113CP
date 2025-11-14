// main.js - Main application entry point
// NOTE: Requires zones.js, groups.js, and devices.js to be loaded first

document.addEventListener('DOMContentLoaded', function () {
    const API_BASE = (typeof window.__API_BASE__ !== 'undefined') ? window.__API_BASE__ : 'http://127.0.0.1:5000';

    // Make API utilities globally available
    window.buildUrl = function(path) {
        if (!path.startsWith('/')) path = '/' + path;
        return API_BASE.replace(/\/$/, '') + path;
    };

    window.apiFetch = async function(path, options = {}) {
        const url = buildUrl(path);
        try {
            const res = await fetch(url, options);
            if (!res.ok) {
                const text = await res.text().catch(() => null);
                const err = new Error(`HTTP ${res.status} ${url}`);
                err.status = res.status;
                err.body = text;
                throw err;
            }
            const ct = res.headers.get('content-type') || '';
            if (ct.includes('application/json')) return await res.json();
            return await res.text();
        } catch (err) {
            console.error('apiFetch error', url, err);
            throw err;
        }
    };

    // Utility functions
    function toArray(x) {
        if (x == null) return [];
        return Array.isArray(x) ? x : [x];
    }

    // Helpers for flexible JSON keys - make globally available
    window._getZones = function(h) {
        const z = h?.zones ?? h?.zone;
        return toArray(z);
    };

    window._getGroups = function(zone) {
        const g = zone?.groups ?? zone?.group;
        return toArray(g);
    };

    window._getLocations = function(group) {
        const l = group?.locations ?? group?.location;
        return toArray(l);
    };

    window._getDevicesFromLocation = function(loc) {
        const d = loc?.devices ?? loc?.device ?? loc?.device_id;
        return toArray(d);
    };

    // HTML escaping utility - make globally available
    window.escapeHtml = function(s) {
        if (s === null || s === undefined) return '';
        return String(s).replace(/[&<>"]/g, function (c) { 
            return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; 
        });
    };

    // Modal helper - make globally available
    window.createModal = function(contentHtml) {
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 modal-overlay';
        overlay.style.zIndex = '9999';
        
        const dlg = document.createElement('div');
        dlg.className = 'bg-white text-black rounded-lg shadow-xl w-full max-w-md mx-4';
        dlg.style.maxHeight = '90vh';
        dlg.style.overflowY = 'auto';
        dlg.style.position = 'relative';
        dlg.style.zIndex = '10000';
        
        const content = document.createElement('div');
        content.className = 'p-6';
        content.innerHTML = contentHtml;
        dlg.appendChild(content);
        
        overlay.appendChild(dlg);
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });
        
        dlg.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        document.body.appendChild(overlay);
        
        document.body.style.overflow = 'hidden';
        
        const originalRemove = overlay.remove;
        overlay.remove = function() {
            document.body.style.overflow = '';
            originalRemove.call(this);
        };
        
        return { overlay, dlg };
    };

    // Alert modal - make globally available
    window.showAlertModal = function(message, title = 'Notice', opts = {}) {
        const html = `
            <div>
              <div class="text-lg font-medium mb-2">${escapeHtml(title)}</div>
              <div class="mb-4 text-sm">${escapeHtml(message)}</div>
              <div class="flex justify-end">
                <button id="alertOkBtn" class="bg-cyan-500 hover:bg-cyan-600 text-white px-3 py-1 rounded-md">OK</button>
              </div>
            </div>
        `;
        const m = createModal(html);

        m.dlg.classList.remove('max-w-md');
        const sizeMap = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl' };
        if (opts.width) {
            m.dlg.style.width = opts.width;
        } else {
            const cls = sizeMap[opts.size] || sizeMap.sm;
            m.dlg.classList.add(cls);
        }

        if (opts.compact) {
            m.dlg.classList.remove('p-6');
            m.dlg.classList.add('p-4');
        }

        const ok = m.dlg.querySelector('#alertOkBtn');
        if (ok) ok.addEventListener('click', () => m.overlay.remove());

        return m;
    };

    // Set default zone and group
    function setDefaultZoneAndGroup(hierarchy) {
        if (!hierarchy || !Array.isArray(hierarchy.zones)) return;
        
        const zoneHidden = document.getElementById('zoneSelect');
        const zoneLabel = document.getElementById('zoneDropdownLabel');
        const groupHidden = document.getElementById('groupSelect');

        if (!zoneLabel || !zoneHidden || !groupHidden) return;

        if (hierarchy.zones.length === 0) {
            zoneHidden.value = '';
            zoneLabel.textContent = '-- No zones --';
            groupHidden.value = '';
            zoneHidden.dispatchEvent(new Event('change', { bubbles: true }));
            groupHidden.dispatchEvent(new Event('change', { bubbles: true }));
            return;
        }

        const firstZone = hierarchy.zones[0];
        if (!zoneHidden.value) {
            zoneHidden.value = String(firstZone.zone_id ?? '');
            zoneLabel.textContent = firstZone.zone_name || zoneLabel.textContent;
        }

        const firstGroups = Array.isArray(firstZone.groups) ? firstZone.groups : [];
        if (firstGroups.length > 0) {
            const firstGroup = firstGroups[0];
            if (!groupHidden.value) {
                groupHidden.value = String(firstGroup.group_id ?? '');
            }
        } else {
            if (!groupHidden.value) {
                groupHidden.value = '';
            }
        }

        zoneHidden.dispatchEvent(new Event('change', { bubbles: true }));
        groupHidden.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Main initialization
    async function initializeApp() {
        try {
            // Load initial hierarchy data
            window.currentHierarchy = await apiFetch('/api/hierarchy');
            
            // Render zones and groups (from zones.js and groups.js)
            renderZones(window.currentHierarchy);
            renderZoneDropdown(window.currentHierarchy);
            wireZoneDropdown();

            // Set default zone and group selections
            setDefaultZoneAndGroup(window.currentHierarchy);

            // Initialize event handlers from separate modules
            // console.log('🔧 main.js: About to call initZoneHandlers');
            initZoneHandlers();
            // console.log('🔧 main.js: About to call initGroupHandlers');
            initGroupHandlers();
            // console.log('🔧 main.js: About to call initDeviceHandlers');
            initDeviceHandlers();
            // console.log('🔧 main.js: initDeviceHandlers call completed');
            
            // Initialize Control Panel - ensure DOM is ready before calling
            if (typeof initializeControlPanel === 'function') {
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', () => {
                        try {
                            initializeControlPanel();
                        } catch (err) {
                            console.error('Control panel init error after DOMContentLoaded', err);
                        }
                    });
                } else {
                    try {
                        initializeControlPanel();
                    } catch (err) {
                        console.error('Control panel init error', err);
                    }
                }
            }
            
            // Initialize UI state for dropdowns and buttons
            const firstZone = (window.currentHierarchy.zones || [])[0];
            
            if (typeof updateZoneUIState === 'function') {
                updateZoneUIState((window.currentHierarchy.zones || []).length > 0);
            }
            if (typeof updateGroupUIState === 'function') {
                updateGroupUIState(firstZone ? (firstZone.groups || []).length > 0 : false);
            }
            if (typeof updateAddDevicesButtonState === 'function') {
                updateAddDevicesButtonState();
            }

            // Initial render of devices grid will happen automatically via change events
            // triggered by auto-selection in renderZoneDropdown and renderGroupButtons
        } catch (err) {
            console.error('Initialization error', err);
            showAlertModal('Failed to initialize application. See console for details.', 'Error');
        }
    }

    // Start the application
    initializeApp();
});