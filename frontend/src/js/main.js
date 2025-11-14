// main.js - Main application entry point
// NOTE: Requires zones.js, groups.js, and devices.js to be loaded first

document.addEventListener('DOMContentLoaded', function () {
    const API_BASE = (typeof window.__API_BASE__ !== 'undefined') ? window.__API_BASE__ : 'http://127.0.0.1:5000';

    // Make API utilities globally available
    window.buildUrl = function(path) {
        if (!path.startsWith('/')) path = '/' + path;
        return API_BASE.replace(/\/$/, '') + path;
    };

    // Enhanced fetch helper with optional timeout (ms) and retry support.
    // Usage: apiFetch(path, { timeout: 2000, retry: 1, signal: existingSignal, ...fetchOptions })
    window.apiFetch = async function(path, options = {}) {
        const url = buildUrl(path);
        // Extract our special options and leave the rest for fetch
        const timeoutMs = typeof options.timeout === 'number' ? options.timeout : 0;
        const retries = typeof options.retry === 'number' ? options.retry : 0;
        const userSignal = options.signal;

        // Build fetch options without our custom keys (we'll attach signal per-attempt)
        const fetchOpts = Object.assign({}, options);
        delete fetchOpts.timeout;
        delete fetchOpts.retry;
        delete fetchOpts.signal;

        let lastErr = null;
        for (let attempt = 0; attempt <= retries; attempt++) {
            const controller = new AbortController();
            const combinedSignal = controller.signal;

            // If caller provided their own signal, forward its abort to our controller
            let forwarded = false;
            const onUserAbort = () => controller.abort();
            try {
                if (userSignal) {
                    if (userSignal.aborted) {
                        controller.abort();
                    } else if (typeof userSignal.addEventListener === 'function') {
                        userSignal.addEventListener('abort', onUserAbort, { once: true });
                        forwarded = true;
                    }
                }

                let timeoutId = null;
                if (timeoutMs > 0) {
                    timeoutId = setTimeout(() => controller.abort(), timeoutMs);
                }

                try {
                    const res = await fetch(url, Object.assign({}, fetchOpts, { signal: combinedSignal }));
                    if (timeoutId) clearTimeout(timeoutId);
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
                    if (timeoutId) clearTimeout(timeoutId);
                    lastErr = err;
                    // If this was an AbortError or network-level error and we have retries left, retry
                    const isAbort = err && (err.name === 'AbortError' || /aborted|timeout/i.test(String(err && (err.message || err))));
                    const isNetwork = err instanceof TypeError || /Failed to fetch|NetworkError/i.test(String(err && err.message || ''));
                    if (attempt < retries && (isAbort || isNetwork)) {
                        // small backoff before retrying
                        await new Promise(r => setTimeout(r, 150));
                        continue;
                    }
                    // Otherwise rethrow
                    throw err;
                }
            } finally {
                // Clean up forwarded listener if attached
                try {
                    if (userSignal && forwarded && typeof userSignal.removeEventListener === 'function') {
                        userSignal.removeEventListener('abort', onUserAbort);
                    }
                } catch (e) {
                    // ignore
                }
            }
        }

        // If we exhaust retries, throw the last error
        if (lastErr) {
            // Treat AbortError as expected fast-fail (log as debug)
            if (lastErr && (lastErr.name === 'AbortError' || /aborted|timeout/i.test(String(lastErr && (lastErr.message || lastErr))))) {
                if (window.console && typeof window.console.debug === 'function') {
                    console.debug('apiFetch aborted or timed out', url, lastErr && lastErr.name ? lastErr.name : lastErr);
                }
            } else {
                console.error('apiFetch error', url, lastErr);
            }
            throw lastErr;
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
        // Remove any existing modal overlays so multiple stacked modals don't accumulate
        document.querySelectorAll('.modal-overlay').forEach(el => el.remove());

        const overlay = document.createElement('div');
        // Keep the overlay element so clicks outside the dialog can still close it,
        // but don't darken the background or trap scrolling.
        overlay.className = 'fixed inset-0 z-50 flex items-center justify-center modal-overlay';
        overlay.style.zIndex = '9999';
        overlay.style.background = 'transparent';
        
        const dlg = document.createElement('div');
        dlg.className = 'bg-[#1e1e1e] text-[#f3f4f1] rounded-xl border border-[#6c757d] shadow-xl w-full max-w-lg mx-4 px-6 py-4';
        dlg.style.maxHeight = '100vh';
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
        
        // Append overlay but do not modify body overflow (avoid scroll-locking)
        document.body.appendChild(overlay);
        
        return { overlay, dlg };
    };

    // Toast notification - make globally available
    window.showAlertModal = function(message, title = 'Notice', opts = {}) {
        // Create toast container if it doesn't exist
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.className = 'fixed text-center top-24 py-24 left-1/2 -translate-x-1/2 z-[10000] flex flex-col gap-2';
            document.body.appendChild(toastContainer);
        }

        // Create toast element
        const toast = document.createElement('div');
        toast.className = 'bg-[#1c4d19] border border-[#6c757d] rounded-xl shadow-xl p-4 min-w-[300px] max-w-md transform transition-all duration-300 ease-in-out translate-x-0 opacity-100';
        
        // Determine icon and color based on title
        // let iconHtml = '';
        // let iconColor = 'text-blue-500';
        // const titleLower = title.toLowerCase();
        
        // if (titleLower.includes('success')) {
        //     iconColor = 'text-green-500';
        //     iconHtml = '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>';
        // } else if (titleLower.includes('error') || titleLower.includes('failed')) {
        //     iconColor = 'text-red-500';
        //     iconHtml = '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>';
        // } else if (titleLower.includes('warning')) {
        //     iconColor = 'text-yellow-500';
        //     iconHtml = '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>';
        // } else {
        //     iconColor = 'text-blue-500';
        //     iconHtml = '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>';
        // }

        // <div class="${iconColor} flex-shrink-0 mt-0.5">
        //     ${iconHtml}
        // </div>        

        // <button class="toast-close flex-shrink-0 text-gray-400 hover:text-white transition-colors ml-2">
        //     <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        //         <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
        //     </svg>
        // </button>        

        toast.innerHTML = `
            <div class="flex items-start gap-3">
                <div class="flex-1 min-w-0">
                    <div class="text-sm font-semibold text-[#f3f4f1] mb-1">${escapeHtml(title)}</div>
                    <div class="text-sm text-[#c0c5c8]">${escapeHtml(message)}</div>
                </div>
            </div>
        `;

        // Add slide-in animation
        toast.style.transform = 'translateY(-100px)';
        toast.style.opacity = '0';
        
        toastContainer.appendChild(toast);

        // Trigger animation
        setTimeout(() => {
            toast.style.transform = 'translateY(0)';
            toast.style.opacity = '1';
        }, 10);

        // Auto-dismiss after duration (default 3 seconds)
        const duration = opts.duration !== undefined ? opts.duration : 3000;
        let timeoutId;
        
        const removeToast = () => {
            toast.style.transform = 'translateY(-100px)';
            toast.style.opacity = '0';
            setTimeout(() => {
                toast.remove();
                // Remove container if empty
                if (toastContainer.children.length === 0) {
                    toastContainer.remove();
                }
            }, 300);
        };

        if (duration > 0) {
            timeoutId = setTimeout(removeToast, duration);
        }

        // Close button handler
        const closeBtn = toast.querySelector('.toast-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                if (timeoutId) clearTimeout(timeoutId);
                removeToast();
            });
        }

        // Pause auto-dismiss on hover
        toast.addEventListener('mouseenter', () => {
            if (timeoutId) clearTimeout(timeoutId);
        });

        toast.addEventListener('mouseleave', () => {
            if (duration > 0) {
                timeoutId = setTimeout(removeToast, duration);
            }
        });

        return { toast, remove: removeToast };
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
            zoneLabel.textContent = '+ Create a New Zone';
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
            // showAlertModal('Failed to initialize application. See console for details.', 'Error');
        }
    }

    // Start the application
    initializeApp();
});