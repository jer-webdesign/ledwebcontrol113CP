// devices.js - Device management functionality

// Cleanup and normalize hierarchy structure
function cleanupHierarchy(hierarchy) {
    if (!hierarchy || !hierarchy.zones) return hierarchy;
    
    hierarchy.zones.forEach(zone => {
        if (!zone.groups) return;
        
        zone.groups.forEach(group => {
            // Normalize to use 'location' (singular) only
            if (!group.location && group.locations) {
                group.location = group.locations;
            }
            
            // Remove empty 'locations' array if it exists
            if (group.locations && Array.isArray(group.locations)) {
                if (group.locations.length === 0) {
                    delete group.locations;
                } else if (group.location && group.location.length > 0) {
                    // If both exist and location has data, remove locations
                    delete group.locations;
                }
            }
            
            // Ensure location array exists
            if (!group.location) {
                group.location = [];
            }
            
            // Remove locations with no devices
            group.location = (group.location || []).filter(loc => {
                const devices = loc.device || loc.devices || [];
                return devices.length > 0;
            });
            
            // Normalize device arrays in locations (use 'device' singular)
            group.location.forEach(loc => {
                if (!loc.device && loc.devices) {
                    loc.device = loc.devices;
                }
                if (loc.devices && Array.isArray(loc.devices)) {
                    if (loc.device && loc.device.length > 0) {
                        delete loc.devices;
                    }
                }
                if (!loc.device) {
                    loc.device = [];
                }
            });
        });
    });
    
    return hierarchy;
}

// Show a standardized modal when a user-initiated Power action fails because the
// physical device appears to be without power. This helper centralizes the
// message so it can only be invoked from explicit power-button handlers.
function showPowerOfflineModal() {
    if (typeof showAlertModal === 'function') {
        showAlertModal('The device is not physically connected to power outlet.', 'Notice', { size: 'sm' });
    } else {
        alert('The device is not physically connected to power outlet.');
    }
}

// Format a MAC address by inserting ':' every two hex characters.
// Accepts strings like '206ef16df478' or '20:6e:f1:6d:f4:78' and
// returns the normalized lower-case form '20:6e:f1:6d:f4:78'.
function formatMac(raw) {
    if (raw === null || raw === undefined) return raw;
    const s = String(raw).replace(/[^a-fA-F0-9]/g, '').toLowerCase();
    if (!s) return raw;
    // Split into pairs of two characters
    const pairs = s.match(/.{1,2}/g) || [];
    return pairs.join(':');
}

// Update Add Devices button state based on zone and group availability
function updateAddDevicesButtonState() {
    const addDevicesCTA = document.getElementById('addDevicesCTA');
    if (!addDevicesCTA) return;

    const zoneSelect = document.getElementById('zoneSelect');
    const groupSelect = document.getElementById('groupSelect');
    
    const hasZone = zoneSelect && zoneSelect.value;
    const hasGroup = groupSelect && groupSelect.value;
    
    // Enable Add Devices button only if both zone and group are selected
    addDevicesCTA.disabled = !(hasZone && hasGroup);
}

// Collect devices for zone+group
function collectDevices(hierarchy, zoneId, groupId) {
    const zones = _getZones(hierarchy) || [];
    const zone = zones.find(z => String(z.zone_id) === String(zoneId));
    if (!zone) return [];
    
    const groups = _getGroups(zone) || [];
    const group = groups.find(g => String(g.group_id) === String(groupId));
    if (!group) return [];
    
    const locs = _getLocations(group) || [];
    const devices = [];
    
    locs.forEach(loc => {
        const devList = _getDevicesFromLocation(loc) || [];
        devList.forEach(d => {
            devices.push(Object.assign({}, d, {
                location_name: loc.location_name || '',
                group_name: group.group_name || '',
                zone_name: zone.zone_name || ''
            }));
        });
    });
    
    return devices;
}

// Render devices for selected group
function renderDevicesForGroup(hierarchy, zoneId, groupId) {
    const container = document.getElementById('devicesContainer');
    if (!container) return;
    container.innerHTML = '';

    const devices = collectDevices(hierarchy, zoneId, groupId);
    if (!devices.length) {
        container.innerHTML = '<div class="text-sm text-gray-400">No devices found for this group.</div>';
        return;
    }

    devices.forEach(dev => {
        const card = document.createElement('div');
        card.className = 'device-card bg-gray-900 rounded p-4 mb-6';
    const ip = dev.device_ip || '';
    const color = dev.device_current_color || '';
    const mac = dev.device_mac || 'N/A';
    // Determine offline status from known device properties (backend may set 'status')
    const isOffline = dev.status === 'offline' || dev.device_status === 'offline' || dev.offline === true;
        
        card.innerHTML = `
            <div class="flex items-start justify-between space-x-4">
                <div class="flex-1">
                    <div class="flex items-center justify-between">
                        <div>
                            <div class="text-white font-semibold">${escapeHtml(dev.device_name || 'Unnamed Device')}</div>
                            <div class="text-sm text-gray-400">${escapeHtml(dev.location_name || '')} • ${escapeHtml(ip)}</div>
                            <div class="text-xs text-gray-400">MAC: ${escapeHtml(formatMac(mac))}</div>
                        </div>
                        <div class="ml-4">
                            <div class="w-8 h-8 rounded-full" style="background:${escapeHtml(color || '#444')}" title="${escapeHtml(color || '')}"></div>
                        </div>
                    </div>
                    <div class="mt-3 text-sm text-gray-300">${escapeHtml(dev.device_description || '')}</div>
                </div>

                <div class="control-panel ml-4 flex flex-col items-end space-y-2">
                    <div class="flex items-center space-x-2">
                        <button class="btn-onoff bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded" data-device-id="${escapeHtml(dev.device_id)}" data-action="on">On</button>
                        <button class="btn-onoff bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded" data-device-id="${escapeHtml(dev.device_id)}" data-action="off">Off</button>
                    </div>
                    <div class="w-40">
                        <input type="range" min="0" max="255" value="128" class="brightness-slider w-full" data-device-id="${escapeHtml(dev.device_id)}">
                    </div>
                    <div>
                        <button class="btn-settings bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded" data-device-id="${escapeHtml(dev.device_id)}">Settings</button>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(card);

        const onOffBtns = card.querySelectorAll('.btn-onoff');
        onOffBtns.forEach(b => {
            b.addEventListener('click', async function (ev) {
                const did = this.dataset.deviceId;
                const action = this.dataset.action;
                console.info(`Control: ${action} device`, did);
                
                this.classList.add('opacity-75');
                setTimeout(() => this.classList.remove('opacity-75'), 300);
            });
        });

        const sliders = card.querySelectorAll('.brightness-slider');
        sliders.forEach(s => {
            s.addEventListener('input', function () {
                const did = this.dataset.deviceId;
                const val = this.value;
                console.info(`Brightness ${val} for device`, did);
            });
        });

        const settingsBtn = card.querySelector('.btn-settings');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', function () {
                const did = this.dataset.deviceId;
                console.info('Open settings for', did);
            });
        }
    });
}

// Render devices for currently selected zone+group
async function renderDevicesForSelection(zoneId, groupId) {
    const containerId = 'devicesContainer';
    let container = document.getElementById(containerId);
    if (!container) {
        container = document.createElement('div');
        container.id = containerId;
        const parent = document.querySelector('#groupDropdown')?.parentElement || document.body;
        parent.appendChild(container);
    }

    container.innerHTML = '<div class="text-sm text-gray-400">Loading devices…</div>';

    if (!window.currentHierarchy) {
        try {
            window.currentHierarchy = await apiFetch('/api/hierarchy');
        } catch (err) {
            console.error('Failed to load hierarchy for devices', err);
            container.innerHTML = '<div class="text-sm text-red-500">Failed to load devices.</div>';
            return;
        }
    }

    const zones = Array.isArray(window.currentHierarchy.zones) ? window.currentHierarchy.zones : [];
    const zone = zones.find(z => String(z.zone_id) === String(zoneId));
    if (!zone) {
        container.innerHTML = '<div class="text-sm text-gray-500">No zone selected or zone not found.</div>';
        return;
    }

    const groups = Array.isArray(zone.groups) ? zone.groups : (Array.isArray(zone.group) ? zone.group : []);
    const group = groups.find(g => String(g.group_id) === String(groupId));
    if (!group) {
        container.innerHTML = '<div class="text-sm text-gray-500">No group selected or group not found.</div>';
        return;
    }

    const locations = Array.isArray(group.location) ? group.location :
                      Array.isArray(group.locations) ? group.locations : [];
    const rows = [];
    locations.forEach(loc => {
        const devices = Array.isArray(loc.device) ? loc.device :
                        Array.isArray(loc.devices) ? loc.devices : [];
        devices.forEach(dev => {
            rows.push({
                device_id: dev.device_id ?? '',
                device_ip: dev.device_ip ?? '',
                device_mac: dev.device_mac ?? '',
                device_hostname: dev.device_hostname ?? '',
                location_name: loc.location_name ?? loc.location_id ?? '',
                device_description: dev.device_description ?? ''
            });
        });
    });

    if (!rows.length) {
        container.innerHTML = '<div class="text-sm text-gray-500">No devices for selected zone/group.</div>';
        return;
    }

    const table = document.createElement('table');
    table.className = 'min-w-full text-sm border-collapse';
    table.innerHTML = `
        <thead>
          <tr class="text-left bg-gray-100">
            <th class="px-3 py-2 border">device_id</th>
            <th class="px-3 py-2 border">device_ip</th>
            <th class="px-3 py-2 border">device_mac</th>
            <th class="px-3 py-2 border">device_hostname</th>
            <th class="px-3 py-2 border">location_name</th>
            <th class="px-3 py-2 border">device_description</th>
          </tr>
        </thead>
        <tbody></tbody>
    `;
    const tbody = table.querySelector('tbody');
    rows.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="px-3 py-2 border align-top">${escapeHtml(String(r.device_id))}</td>
            <td class="px-3 py-2 border align-top">${escapeHtml(String(r.device_ip))}</td>
            <td class="px-3 py-2 border align-top">${escapeHtml(formatMac(String(r.device_mac)))}</td>
            <td class="px-3 py-2 border align-top">${escapeHtml(String(r.device_hostname))}</td>
            <td class="px-3 py-2 border align-top">${escapeHtml(String(r.location_name))}</td>
            <td class="px-3 py-2 border align-top">${escapeHtml(String(r.device_description))}</td>
        `;
        tbody.appendChild(tr);
    });

    container.innerHTML = '';
    container.appendChild(table);
}

// Render devices into the styled devicesGrid
async function renderDevicesGrid(zoneId, groupId) {
    // console.log('renderDevicesGrid called with:', zoneId, groupId);
    const grid = document.getElementById('devicesGrid');
    if (!grid) {
        console.error('devicesGrid element not found');
        return;
    }

    // console.log('Grid element found, clearing device selection');
    // Clear device selection when grid is re-rendered
    clearDeviceSelection();

    if (!zoneId || !groupId) {
        // Show "No Device" card with disabled "Add Devices" button
        grid.classList.add('grid');
        grid.innerHTML = `
            <div class="bg-gray-800 rounded-lg p-6 device-card border border-gray-700 border-dashed col-span-1 md:col-span-1">
                <div class="flex flex-col items-center justify-center h-full min-h-[200px] text-center">
                    <h3 class="text-xl font-medium mb-2">No Device</h3>
                    <p class="text-gray-400 mb-6">There are currently no devices</p>
                    <button id="addDevicesCTA" class="bg-[#038bbf] hover:bg-[#2696c6] text-white px-6 py-2 rounded-md font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed" disabled data-tip="Add a new device card (select a zone and group first)">
                        <i class="fas fa-plus mr-2"></i>Add Devices
                    </button>
                </div>
            </div>`;
        
        const cta = document.getElementById('addDevicesCTA');
        if (cta) {
            updateAddDevicesButtonState();
            cta.addEventListener('click', (e) => {
                try {
                    e.preventDefault();
                    e.stopPropagation();
                    openAddDeviceModal();
                } catch (err) {
                    console.error('openAddDeviceModal failed', err);
                    showAlertModal('Failed to open Add Device dialog. See console.', 'Error', { size: 'sm' });
                }
            });
        }
        return;
    }

    grid.classList.add('grid');
    grid.innerHTML = `<div class="text-sm text-gray-400 col-span-1">Loading devices…</div>`;

    try {
        if (!window.currentHierarchy) window.currentHierarchy = await apiFetch('/api/hierarchy');
    } catch (err) {
        console.error('Failed to load hierarchy for devices', err);
        grid.innerHTML = '<div class="text-sm text-red-500">Failed to load devices.</div>';
        return;
    }

    const zones = Array.isArray(window.currentHierarchy.zones) ? window.currentHierarchy.zones : [];
    const zone = zones.find(z => String(z.zone_id) === String(zoneId));
    if (!zone) {
        grid.innerHTML = '<div class="text-sm text-gray-500">No zone selected or zone not found.</div>';
        return;
    }

    const groups = Array.isArray(zone.groups) ? zone.groups : (Array.isArray(zone.group) ? zone.group : []);
    const group = groups.find(g => String(g.group_id) === String(groupId));
    if (!group) {
        grid.innerHTML = '<div class="text-sm text-gray-500">No group selected or group not found.</div>';
        return;
    }

    const locations = Array.isArray(group.location) ? group.location : (Array.isArray(group.locations) ? group.locations : []);
    const devices = [];
    locations.forEach(loc => {
        const devs = Array.isArray(loc.device) ? loc.device : (Array.isArray(loc.devices) ? loc.devices : []);
        devs.forEach(d => {
            devices.push({
                device_id: d.device_id ?? '',
                device_name: d.device_name ?? '',
                device_ip: d.device_ip ?? '',
                device_mac: d.device_mac ?? '',
                device_hostname: d.device_hostname ?? '',
                location_name: loc.location_name ?? loc.location_id ?? '',
                device_description: d.device_description ?? '',
                device_segment_colors: Array.isArray(d.device_segment_colors) ? d.device_segment_colors : [],
                device_current_color: d.device_current_color ?? ''
            });
        });
    });

    if (!devices.length) {
        // console.log('No devices found for zone/group:', zoneId, groupId);
        grid.innerHTML = `
        <div class="mx-auto bg-[#242424] rounded-lg p-6 device-card border border-[#f3f4f1]">
            <div class="flex flex-col items-center justify-center h-full min-h-[22rem] text-center">
                <img src="assets/icons/bulb-off.svg" class="w-10 h-10 brightness-5 saturate-100" alt="Bulb Off" />        
                <p class="pt-8 text-xs text-[#f3f4f1] mb-6">Add a device card to begin setting up your lights.</p>
                <button id="addDevicesCTA" class="bg-[#038bbf] hover:bg-[#2696c6] text-[#f3f4f1] text-sm font-medium px-8 py-2 rounded-xl transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed" data-tip="Add a new device card.">
                    + Add Device Card
                </button>
            </div>
        `;
            // <div class="bg-[#242424] rounded-lg p-6 device-card border border-gray-500 border-dashed col-span-1 md:col-span-1">
            //     <div class="flex flex-col items-center justify-center h-full min-h-[200px] text-center">
            //         <h3 class="text-xl font-medium mb-2">No Device</h3>
            //         <p class="text-gray-400 mb-6">There are currently no devices</p>
            //         <button id="addDevicesCTA" class="bg-pink-500 hover:bg-pink-600 text-white px-6 py-2 rounded-md font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed" title="Add a new WLED device to this group">
            //             <i class="fas fa-plus mr-2"></i>Add Devices
            //         </button>
            //     </div>
            // </div>`;
        const cta = document.getElementById('addDevicesCTA');
        if (cta) {
            // Update button state
            updateAddDevicesButtonState();
            
            cta.addEventListener('click', (e) => {
                try {
                    e.preventDefault();
                    e.stopPropagation();
                    openAddDeviceModal();
                } catch (err) {
                    console.error('openAddDeviceModal failed', err);
                    showAlertModal('Failed to open Add Device dialog. See console.', 'Error', { size: 'sm' });
                }
            });
        }
        return;
    }

    // console.log('Found devices:', devices.length, devices);
    grid.innerHTML = '';
    devices.forEach(dev => {
        const segments = (dev.device_segment_colors && dev.device_segment_colors.length) ? dev.device_segment_colors
            : (dev.device_current_color ? [dev.device_current_color] : []);
        const isOffline = dev.status === 'offline' || dev.device_status === 'offline' || dev.offline === true;
        const segmentsHtml = segments.map(col => `<div class="color-part" style="flex:1;height:14px;background-color:${escapeHtml(col || '#111')};"></div>`).join('');

        const card = document.createElement('div');
        card.className = 'bg-[#242424] rounded-xl p-6 device-card border border-gray-500 cursor-pointer hover:border-gray-400 transition-colors';
        card.dataset.deviceId = dev.device_id;
        card.innerHTML = `
            <div class="flex items-center justify-between mb-4">
                <div id="device-info" class="flex items-center">
                    <span class="text-lg font-bold">${escapeHtml(String(dev.device_name || dev.device_id || 'Device'))}</span>
                </div>
            <div class="flex items-center space-x-2">
                    <button class="power-toggle-btn mr-4" data-device-id="${escapeHtml(String(dev.device_id))}" title="Toggle Power">
                        <img src="assets/images/power_off.png" alt="Power" class="w-20 h-20 object-contain power-icon" />
                    </button>
                    <button class="text-gray-400 hover:bg-gray-400 edit-device-btn" data-device-id="${escapeHtml(String(dev.device_id))}" data-tip="Edit or delete this device">
                        <img src="assets/images/edit.svg" class="w-6 h-6 brightness-0 saturate-100 invert-[1.0]" alt="Edit icon"/>
                    </button>
                </div>
            </div>

            <div class="color-strip mb-4 border border-gray-600 rounded overflow-hidden">
                <div class="flex">${segmentsHtml}</div>
            </div>

            <div class="space-y-2 text-sm">
                <div><span class="text-gray-400">ID:</span> ${escapeHtml(String(dev.device_id))}</div>
                <div><span class="text-gray-400">IP:</span> ${escapeHtml(String(dev.device_ip))}</div>
                <div><span class="text-gray-400">MAC:</span> ${escapeHtml(formatMac(String(dev.device_mac)))}</div>
                <div><span class="text-gray-400">Hostname:</span> ${escapeHtml(String(dev.device_hostname))}</div>
            </div>

            <div class="mt-4 pt-4 border-t border-gray-700">
                <button class="control-panel-btn bg-[#30383d] hover:bg-[#30383d] text-white px-4 py-2 rounded-md font-medium transition-colors w-full" data-device-id="${escapeHtml(String(dev.device_id))}" data-device-name="${escapeHtml(String(dev.device_name || dev.device_id || 'Device'))}" data-tip="Open Control Panel for this device">
                    Control Panel
                </button>
            </div>
        `;
        
        // console.log('Created device card with Control Panel button for device:', dev.device_id);
        
        // Add click handler for device selection
        card.addEventListener('click', handleDeviceCardClick);
        
        grid.appendChild(card);
    });

    // Add "Add Devices" card at the end
    const addDeviceCard = document.createElement('div');
    addDeviceCard.className = 'bg-[#242424] rounded-xl p-6 device-card border border-gray-500';
    addDeviceCard.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full min-h-[22rem] text-center">
            <img src="assets/icons/bulb-off.svg" class="w-10 h-10 brightness-5 saturate-100" alt="Bulb Off" />        
            <p class="pt-8 text-sm text-gray-400 mb-6">Add a device card to begin setting up your lights.</p>
            <button id="addDevicesCTA" class="bg-[#038bbf] hover:bg-[#2696c6] text-white text-sm font-medium border px-6 py-2 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed" data-tip="Add a new device card.">
                + Add Device Card
            </button>
        </div>
    `;
    grid.appendChild(addDeviceCard);

    // Wire the Add Devices button
    const cta = document.getElementById('addDevicesCTA');
    if (cta) {
        updateAddDevicesButtonState();
        cta.addEventListener('click', (e) => {
            try {
                e.preventDefault();
                e.stopPropagation();
                openAddDeviceModal();
            } catch (err) {
                console.error('openAddDeviceModal failed', err);
                showAlertModal('Failed to open Add Device dialog. See console.', 'Error', { size: 'sm' });
            }
        });
    }

    // Wire edit buttons
    grid.querySelectorAll('.edit-device-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent card selection when clicking edit button
            const did = btn.dataset.deviceId;
            if (typeof openEditDeviceModal === 'function') openEditDeviceModal(did, zoneId, groupId);
            else console.log('Edit device', did);
        });
    });

    // Wire power toggle buttons (delegated) and perform an initial state fetch
    const powerButtons = grid.querySelectorAll('.power-toggle-btn');

    // Delegated click handler for power toggle buttons
    grid.addEventListener('click', async (e) => {
        const btn = e.target.closest('.power-toggle-btn');
        if (!btn || !grid.contains(btn)) return;
        e.stopPropagation();

        const did = btn.dataset.deviceId;
        console.debug('delegated power-toggle click', did);
        const img = btn.querySelector('.power-icon');
        if (!img) return;

        const src = img.getAttribute('src') || '';
        const isOn = src.includes('power_on');
        const newState = !isOn;

        // Optimistic UI
        img.src = `assets/images/${newState ? 'power_on' : 'power_off'}.png`;
        btn.classList.add('opacity-80');
        btn.title = newState ? 'Power: On (click to turn off)' : 'Power: Off (click to turn on)';

        try {
            // Make the POST request abortable and show the offline modal quickly if the
            // device does not respond within a short timeout. This avoids long waits
            // when a device is physically powered off.
            const controller = new AbortController();
            // Increase timeout to 800ms to reduce spurious AbortError logs while
            // still providing reasonably fast feedback when devices are truly offline.
            const timeoutMs = 800;
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

            let resp;
            try {
                resp = await apiFetch(`/api/devices/${encodeURIComponent(did)}/power`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ on: newState }),
                    signal: controller.signal
                });
            } finally {
                clearTimeout(timeoutId);
            }

            // If we just powered the device ON, ask the backend to read the
            // authoritative network_devices.json and apply the saved state to the
            // device. Do this only when the power POST succeeded (no exception)
            // and the requested new state is ON.
            if (newState) {
                try {
                    const applyResp = await apiFetch(`/api/devices/${encodeURIComponent(did)}/apply_saved`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                    });
                    if (!(applyResp && applyResp.status === 'success')) {
                        // Not fatal: device may be offline; log for visibility
                        console.warn('apply_saved did not apply saved state (device may be offline)', did, applyResp);
                    } else {
                        console.debug('apply_saved applied saved state for device', did);
                    }
                } catch (applyErr) {
                    // Don't surface this as an error to the user here; device may be offline
                    console.warn('Failed to apply saved state after power-on (device may be offline)', did, applyErr && applyErr.name ? applyErr.name : applyErr);
                }
            }

            if (resp && resp.status && String(resp.status).toLowerCase() === 'error') {
                console.warn('Power API returned error:', resp);
                img.src = `assets/images/${isOn ? 'power_on' : 'power_off'}.png`;
                btn.title = isOn ? 'Power: On (click to turn off)' : 'Power: Off (click to turn on)';

                const msg = (resp.message || '').toString();
                if (/not found|unreachable|not reachable|not powered/i.test(msg)) {
                    showPowerOfflineModal();
                }
            }

        } catch (err) {
            // Fast-fail cases (AbortError when timed out) should immediately show the
            // offline modal so the user isn't left waiting. Other errors are handled
            // similarly to before. Log AbortError as debug to avoid noisy stacks.
            if (err && (err.name === 'AbortError' || /aborted|timeout/i.test(String(err && (err.message || err))))) {
                console.debug('Failed to set power state (abort/timeout)', err && err.name ? err.name : err);
            } else {
                console.error('Failed to set power state', err);
            }
            img.src = `assets/images/${isOn ? 'power_on' : 'power_off'}.png`;
            btn.title = isOn ? 'Power: On (click to turn off)' : 'Power: Off (click to turn on)';

            const status = err && (err.status || (err.response && err.response.status));
            const msg = err && (err.message || (err.response && err.response.statusText)) ? String(err.message || err.response.statusText || '') : '';

            // Detect abort/timeout errors (modern browsers throw an AbortError)
            if (err && (err.name === 'AbortError' || /aborted|timeout/i.test(msg) || status === 0)) {
                showPowerOfflineModal();
            } else if (status === 404 || /\b404\b/.test(msg) || /not found|unreachable|not reachable|not powered/i.test(msg)) {
                showPowerOfflineModal();
            }
        }         
        finally {
            setTimeout(() => btn.classList.remove('opacity-80'), 250);
        }
    });

    // Initial fetch: update button icons and titles according to device state
    powerButtons.forEach(async (btn) => {
        const did = btn.dataset.deviceId;
        const img = btn.querySelector('.power-icon');
        if (!img) return;

        try {
            // Use a slightly longer timeout for state probes and allow one retry to tolerate transient failures
            const res = await apiFetch(`/api/devices/${encodeURIComponent(did)}/state`, { timeout: 2000, retry: 1 });
            console.debug('initial device state fetched', { device: did, res });
            if (res && res.status === 'success' && res.state && typeof res.state.on !== 'undefined') {
                const on = !!res.state.on;
                img.src = `assets/images/${on ? 'power_on' : 'power_off'}.png`;
                btn.title = on ? 'Power: On (click to turn off)' : 'Power: Off (click to turn on)';
                btn.disabled = false;
                btn.classList.remove('opacity-50', 'cursor-not-allowed');
                const existingLabel = btn.parentElement.querySelector('.device-offline-label');
                if (existingLabel) existingLabel.remove();
            } else {
                img.src = `assets/images/power_off.png`;
                btn.title = 'Power: Off (click to turn on)';
                btn.disabled = false;
                btn.classList.remove('opacity-50', 'cursor-not-allowed');
                const existingLabel = btn.parentElement.querySelector('.device-offline-label');
                if (existingLabel) existingLabel.remove();
            }
        } catch (err) {
            console.error('Failed to fetch device state', err);
            img.src = `assets/images/power_off.png`;
            btn.title = 'Power: Off (click to turn on)';
            btn.disabled = false;
            btn.classList.remove('opacity-50', 'cursor-not-allowed');
            const existingLabel = btn.parentElement.querySelector('.device-offline-label');
            if (existingLabel) existingLabel.remove();
        }
    });

    // Polling: refresh device states periodically and update UI
    // async function refreshAllDeviceStates() {
    //     try {
    //         const res = await apiFetch('/api/devices/states');
    //         if (res && res.status === 'success' && res.states) {
    //             const states = res.states;
    //             // states is a map of device_ip -> state; update UI buttons by matching device_ip
    //             document.querySelectorAll('.power-toggle-btn').forEach(btn => {
    //                 const did = btn.dataset.deviceId;
    //                 const state = states && (states[did] || states[String(did)]);
    //                 const img = btn.querySelector('.power-icon');
    //                 if (!img) return;
    //                     if (state) {
    //                         const on = !!state.on;
    //                         img.src = `assets/images/${on ? 'power_on' : 'power_off'}.png`;
    //                         btn.disabled = false;
    //                         btn.classList.remove('opacity-50', 'cursor-not-allowed');
    //                         const existingLabel = btn.parentElement.querySelector('.device-offline-label');
    //                         if (existingLabel) existingLabel.remove();
    //                     } else {
                            // Null/unknown state: show powered-off icon but keep button enabled
    //                         img.src = `assets/images/power_off.png`;
    //                         btn.disabled = false;
    //                         btn.classList.remove('opacity-50', 'cursor-not-allowed');
    //                         const existingLabel = btn.parentElement.querySelector('.device-offline-label');
    //                         if (existingLabel) existingLabel.remove();
    //                     }
    //             });
    //         }
    //     } catch (err) {
    //         console.error('Polling device states failed', err);
    //     }
    // }

    // Start polling every 5 seconds
    // setInterval(refreshAllDeviceStates, 5000);

    // Immediately refresh once on initial render so a page reload (Ctrl+F5)
    // updates online/offline state right away instead of waiting 5s.
    // try {
    //     refreshAllDeviceStates();
    // } catch (err) {
    //     console.error('Initial refreshAllDeviceStates failed', err);
    // }

    // Wire Control Panel buttons
    const controlPanelButtons = grid.querySelectorAll('.control-panel-btn');
    // console.log('Found Control Panel buttons:', controlPanelButtons.length);
    
    controlPanelButtons.forEach((btn, index) => {
        // console.log(`Attaching event listener to Control Panel button ${index}:`, btn);
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent card selection when clicking control panel button
            // console.log('Control Panel button clicked - event triggered');
            const deviceId = btn.dataset.deviceId;
            const deviceName = btn.dataset.deviceName;
            // console.log('Control Panel button clicked:', deviceId, deviceName);
            // console.log('openControlPanelModal function exists:', typeof openControlPanelModal);
            
            try {
                if (typeof openControlPanelModal === 'function') {
                    openControlPanelModal(deviceId, deviceName);
                } else {
                    // console.error('openControlPanelModal function not found');
                    // Try again after a short delay in case of loading race condition
                    setTimeout(() => {
                        if (typeof openControlPanelModal === 'function') {
                            // console.log('Retrying openControlPanelModal after delay');
                            openControlPanelModal(deviceId, deviceName);
                        } else {
                            console.error('openControlPanelModal still not available after delay');
                        }
                    }, 100);
                }
            } catch (error) {
                console.error('Error calling openControlPanelModal:', error);
            }
        });
    });
}

// Ensure one-time fetch runs on initial page load (covers Ctrl+F5 / full reload)
// (Removed one-time DOMContentLoaded handler per design change)

// Delete Device Confirmation Modal
function openDeleteDeviceModal(zone, group, location, device) {
    const html = `
        <h2 class="text-lg font-semibold mb-3 text-red-600">Delete Device</h2>
        <div class="mb-4">
            <p class="text-sm text-gray-700 mb-2">Are you sure you want to delete this device?</p>
            <div class="bg-gray-100 p-3 rounded border border-gray-300">
                <div class="font-medium">${escapeHtml(device.device_name || device.device_id || 'Unnamed Device')}</div>
                ${device.device_description ? `<div class="text-sm text-gray-600 mt-1">${escapeHtml(device.device_description)}</div>` : ''}
                <div class="text-sm text-gray-600 mt-1">IP: ${escapeHtml(device.device_ip || 'N/A')}</div>
            </div>
            <p class="text-sm text-red-600 mt-3 font-medium">Warning: This action cannot be undone.</p>
        </div>
        <div class="flex justify-end space-x-2">
            <button type="button" id="deleteCancel" class="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium">Cancel</button>
            <button type="button" id="deleteConfirm" class="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white font-medium">Delete Device</button>
        </div>
    `;
    const m = createModal(html);
    
    m.dlg.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    
    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            m.overlay.remove();
            document.removeEventListener('keydown', handleKeyDown);
        }
    };
    document.addEventListener('keydown', handleKeyDown);
    
    m.dlg.querySelector('#deleteCancel').addEventListener('click', () => {
        m.overlay.remove();
        document.removeEventListener('keydown', handleKeyDown);
    });

    m.dlg.querySelector('#deleteConfirm').addEventListener('click', async () => {
        const deleteBtn = m.dlg.querySelector('#deleteConfirm');
        const originalText = deleteBtn.textContent;
        deleteBtn.disabled = true;
        deleteBtn.textContent = 'Deleting...';

        try {
            // Remove device from location
            location.device = (location.device || location.devices || []).filter(
                d => String(d.device_id) !== String(device.device_id)
            );
            
            // Also update devices array if it exists
            if (location.devices) {
                location.devices = location.devices.filter(
                    d => String(d.device_id) !== String(device.device_id)
                );
            }

            // Clean up empty locations from the group
            const locationArray = group.location || group.locations || [];
            
            // Remove locations that have no devices
            const cleanedLocations = locationArray.filter(loc => {
                const devices = loc.device || loc.devices || [];
                return devices.length > 0;
            });
            
            // Update group's location array
            if (group.location) {
                group.location = cleanedLocations;
            }
            
            // Remove the legacy 'locations' array if it exists and is empty
            if (group.locations && Array.isArray(group.locations) && group.locations.length === 0) {
                delete group.locations;
            }

            // Clean up and normalize the entire hierarchy before saving
            cleanupHierarchy(window.currentHierarchy);

            // Save to API
            await apiFetch('/api/hierarchy', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(window.currentHierarchy)
            });

            m.overlay.remove();
            document.removeEventListener('keydown', handleKeyDown);

            // Refresh devices display
            if (typeof renderDevicesGrid === 'function') {
                renderDevicesGrid(zone.zone_id, group.group_id);
            }

            showAlertModal('Device deleted successfully!', '', { size: 'sm' });
        } catch (err) {
            console.error('Failed to delete device', err);
            showAlertModal('Failed to delete device. See console for details.', 'Error', { size: 'sm' });
            
            deleteBtn.disabled = false;
            deleteBtn.textContent = originalText;
        }
    });
}

// Edit Device Modal
function openEditDeviceModal(deviceId, zoneId, groupId) {
    const hierarchy = window.currentHierarchy || { zones: [] };
    const zone = (hierarchy.zones || []).find(z => String(z.zone_id) === String(zoneId));
    if (!zone) {
        showAlertModal('Zone not found.', 'Error', { size: 'sm' });
        return;
    }

    const group = (zone.groups || []).find(g => String(g.group_id) === String(groupId));
    if (!group) {
        showAlertModal('Group not found.', 'Error', { size: 'sm' });
        return;
    }

    const locations = group.location || group.locations || [];
    let device = null;
    let location = null;

    // Find device and its location
    for (const loc of locations) {
        const devices = loc.device || loc.devices || [];
        const found = devices.find(d => String(d.device_id) === String(deviceId));
        if (found) {
            device = found;
            location = loc;
            break;
        }
    }

    if (!device || !location) {
        showAlertModal('Device not found.', 'Error', { size: 'sm' });
        return;
    }

    function buildOptions(list, idKey, nameKey, selectedId) {
        return (list || []).map(it => {
            const selected = String(it[idKey]) === String(selectedId) ? 'selected' : '';
            return `<option value="${escapeHtml(String(it[idKey] ?? ''))}" ${selected}>${escapeHtml(String(it[nameKey] ?? '(unnamed)'))}</option>`;
        }).join('');
    }

    const locationOptions = buildOptions(locations, 'location_id', 'location_name', location.location_id);
    const segmentColors = device.device_segment_colors || [];

    const html = `
        <h2 class="text-lg text-center font-semibold mb-3 py-6">Edit Device</h2>
        <div style="max-height: 70vh; overflow-y: auto; padding-right: 8px;">
            <div class="mb-6">
                <label class="block text-sm font-medium text-[#f3f4f1] mb-1">Location</label>
                <select id="editDevLocation" class="w-full bg-[#2b3236] border border-[#6c757d] rounded-lg px-3 py-2 focus:outline-none focus:border-white"">
                    ${locationOptions}
                    <option value="__NEW__">+ Create New Location</option>
                </select>
            </div>

            <div id="newLocationFields" class="mb-3 hidden">
                <label class="block text-sm font-medium text-[#f3f4f1] mb-1">New Location Name</label>
                <input id="newLocationName" type="text" class="w-full bg-[#2b3236] border border-[#6c757d] rounded-lg px-3 py-2 focus:outline-none focus:border-white"" placeholder="Enter location name">
            </div>

            <div class="mb-6">
                <label class="block text-sm font-medium text-[#f3f4f1] mb-1">Device Name *</label>
                <input id="editDevName" type="text" class="w-full bg-[#2b3236] border border-[#6c757d] rounded-lg px-3 py-2 focus:outline-none focus:border-white"" value="${escapeHtml(device.device_name || '')}" autocomplete="off">
            </div>

            <div class="mb-6">
                <label class="block text-sm font-medium text-[#f3f4f1] mb-1">Device Description</label>
                <textarea id="editDevDesc" class="w-full bg-[#2b3236] border border-[#6c757d] rounded-lg px-3 py-2 focus:outline-none focus:border-white" resize-vertical" rows="2" autocomplete="off">${escapeHtml(device.device_description || '')}</textarea>
            </div>

            <div class="grid grid-cols-2 gap-3 mb-6">
                <div>
                    <label class="block text-sm font-medium text-[#f3f4f1] mb-1">Hostname</label>
                    <input id="editDevHost" type="text" class="w-full bg-[#2b3236] border border-[#6c757d] rounded-lg px-3 py-2 focus:outline-none focus:border-white" value="${escapeHtml(device.device_hostname || '')}" autocomplete="off">
                </div>
                <div>
                    <label class="block text-sm font-medium text-[#f3f4f1] mb-1">IP Address</label>
                    <input id="editDevIP" type="text" class="w-full bg-[#2b3236] border border-[#6c757d] rounded-lg px-3 py-2 focus:outline-none focus:border-white" value="${escapeHtml(device.device_ip || '')}" autocomplete="off">
                </div>
            </div>

            <div class="mb-6">
                <label class="block text-sm font-medium text-[#f3f4f1] mb-1">MAC Address</label>
                <input id="editDevMAC" type="text" class="w-full bg-[#2b3236] border border-[#6c757d] rounded-lg px-3 py-2 focus:outline-none focus:border-white" value="${escapeHtml(device.device_mac || '')}" autocomplete="off">
            </div>

            <div class="mb-6">
                <label class="block text-sm font-medium text-[#f3f4f1] mb-1">Current Color (Hex)</label>
                <div class="flex items-center space-x-2">
                    <input id="editDevColor" type="color" class="h-10 w-16 bg-[#2b3236] border border-[#6c757d] rounded-lg cursor-pointer" value="${escapeHtml(device.device_current_color || '#ffffff')}">
                    <input id="editDevColorText" type="text" class="flex-1 bg-[#2b3236] border border-[#6c757d] rounded-lg px-3 py-2 focus:outline-none focus:border-white" value="${escapeHtml(device.device_current_color || '#ffffff')}" autocomplete="off">
                </div>
            </div>

            <div class="mb-6">
                <label class="block text-sm font-medium text-[#f3f4f1] mb-1">Number of Segment Colors</label>
                <input id="numSegments" type="number" min="0" max="10000" class="w-full bg-[#2b3236] border border-[#6c757d] rounded-lg px-3 py-2 focus:outline-none focus:border-white" value="${segmentColors.length}" placeholder="0">
            </div>

            <div id="segmentColorsContainer" class="mb-6">
                <!-- Segment color inputs will be generated here -->
            </div>
        </div>

        <div class="flex items-center justify-between mt-6 mb-6 space-x-2 pb-4">
            <button type="button" id="editDevDelete" class="py-2">
                <img src="assets/icons/trash.svg" class="w-7 h-7 brightness-5 saturate-100" alt="Delete Zone" />
            </button>  
            <div class="flex items-center space-x-4">
                <button type="button" id="editDevCancel" class="px-4 py-2 rounded-lg bg-[#ed0973] hover:bg-[#b70558] text-[#f3f4f1] font-medium">Cancel</button>
                <button type="button" id="editDevSave" class="px-5 py-2 rounded-lg bg-[#008bbf] hover:bg-[#006b94] text-[#f3f4f1] font-medium">Save</button>
            </div>
        </div>    
    `;

    const m = createModal(html);

    const locationSelect = m.dlg.querySelector('#editDevLocation');
    const newLocationFields = m.dlg.querySelector('#newLocationFields');
    const colorPicker = m.dlg.querySelector('#editDevColor');
    const colorText = m.dlg.querySelector('#editDevColorText');
    const numSegmentsInput = m.dlg.querySelector('#numSegments');
    const segmentColorsContainer = m.dlg.querySelector('#segmentColorsContainer');

    // Auto-focus device name input
    setTimeout(() => {
        const nameInput = m.dlg.querySelector('#editDevName');
        if (nameInput) {
            nameInput.focus();
            nameInput.select();
        }
    }, 100);

    // Location selection handler
    locationSelect.addEventListener('change', () => {
        if (locationSelect.value === '__NEW__') {
            newLocationFields.classList.remove('hidden');
        } else {
            newLocationFields.classList.add('hidden');
        }
    });

    // Color picker sync
    colorPicker.addEventListener('input', () => {
        colorText.value = colorPicker.value;
    });
    
    colorText.addEventListener('input', () => {
        const val = colorText.value.trim();
        if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
            colorPicker.value = val;
        }
    });

    // Generate segment color inputs
    function generateSegmentInputs(count, existingColors = []) {
        segmentColorsContainer.innerHTML = '';
        
        if (count <= 0) {
            return;
        }

        const header = document.createElement('label');
        header.className = 'block text-sm font-medium text-[#f3f4f1] mb-2';
        header.textContent = `Segment Colors (${count} segment${count > 1 ? 's' : ''})`;
        segmentColorsContainer.appendChild(header);

        for (let i = 0; i < count; i++) {
            const existingColor = existingColors[i] || '#ffffff';
            const segmentDiv = document.createElement('div');
            segmentDiv.className = 'flex items-center space-x-2 mb-2';
            segmentDiv.innerHTML = `
                <span class="text-sm text-[#f3f4f1] w-20">Segment ${i + 1}:</span>
                <input type="color" class="bg-[#2b3236] segment-color-picker h-10 w-16 border border-gray-300 rounded-lg cursor-pointer" value="${escapeHtml(existingColor)}" data-index="${i}">
                <input type="text" class="bg-[#2b3236] segment-color-text flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" value="${escapeHtml(existingColor)}" data-index="${i}" autocomplete="off">
            `;
            segmentColorsContainer.appendChild(segmentDiv);

            // Sync color picker and text input
            const picker = segmentDiv.querySelector('.segment-color-picker');
            const text = segmentDiv.querySelector('.segment-color-text');
            
            picker.addEventListener('input', () => {
                text.value = picker.value;
            });
            
            text.addEventListener('input', () => {
                const val = text.value.trim();
                if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                    picker.value = val;
                }
            });
        }
    }

    // Initialize with existing segments
    generateSegmentInputs(segmentColors.length, segmentColors);

    numSegmentsInput.addEventListener('input', () => {
        let count = parseInt(numSegmentsInput.value) || 0;
        if (count < 0) count = 0;
    const maxSeg = parseInt(numSegmentsInput.max) || 120;
    if (count > maxSeg) count = maxSeg;
    // Try to determine actual LED count from device state and update max
    // NOTE: do not reduce the existing max value — only increase it if the
    // device reports a larger LED count. This prevents the UI from clamping
    // to an erroneously low device-reported value (e.g., 30) while still
    // allowing the input to reflect a correct larger count when available.
    (async function setMaxSegmentsFromDevice() {
        try {
            // Request device state with a 2s timeout and one retry to avoid transient fetch errors
            const ds = await apiFetch(`/api/devices/${encodeURIComponent(device.device_id)}/state`, { timeout: 2000, retry: 1 });
            let reported = null; // reported LED count from device
            if (ds && ds.status === 'success' && ds.state) {
                const st = ds.state;
                if (st.info && st.info.leds && typeof st.info.leds.count === 'number') {
                    reported = st.info.leds.count;
                } else if (Array.isArray(st.seg) && st.seg.length && st.seg.every(s => typeof s.len === 'number')) {
                    reported = st.seg.reduce((acc, s) => acc + (s.len || 0), 0) || null;
                } else if (typeof st.leds === 'number') {
                    reported = st.leds;
                }
            }

            if (reported && Number.isFinite(reported) && reported > 0) {
                const currentMax = parseInt(numSegmentsInput.max) || 10000;
                // Only update if device reports a larger count than current max
                if (reported > currentMax) {
                    numSegmentsInput.max = reported;
                    const help = m.dlg.querySelector('#editNumSegmentsHelp');
                    if (help) help.textContent = `Set to 0 for no segments, or specify the number of segments (max ${reported})`;
                    console.debug(`Edit modal: increased numSegments max to device-reported ${reported}`);
                } else {
                    console.debug(`Edit modal: device reported ${reported} LEDs; keeping current max ${currentMax}`);
                }
            } else {
                console.debug('Edit modal: device did not report a valid LED count');
            }
        } catch (err) {
            console.debug('Could not determine LED count for device; leaving max as-is', err);
        }
    })();
        numSegmentsInput.value = count;
        
        // Preserve existing colors when changing segment count
        const existingColors = [];
        const textInputs = m.dlg.querySelectorAll('.segment-color-text');
        textInputs.forEach(input => {
            existingColors.push(input.value.trim());
        });
        
        generateSegmentInputs(count, existingColors);
    });

    // Escape key handler
    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            m.overlay.remove();
            document.removeEventListener('keydown', handleKeyDown);
        }
    };
    document.addEventListener('keydown', handleKeyDown);

    // Cancel button
    m.dlg.querySelector('#editDevCancel').addEventListener('click', () => {
        m.overlay.remove();
        document.removeEventListener('keydown', handleKeyDown);
    });

    // Delete button
    m.dlg.querySelector('#editDevDelete').addEventListener('click', () => {
        m.overlay.remove();
        document.removeEventListener('keydown', handleKeyDown);
        openDeleteDeviceModal(zone, group, location, device);
    });

    // Save button
    m.dlg.querySelector('#editDevSave').addEventListener('click', async () => {
        const name = m.dlg.querySelector('#editDevName').value.trim();
        const desc = m.dlg.querySelector('#editDevDesc').value.trim();
        const host = m.dlg.querySelector('#editDevHost').value.trim();
        const ip = m.dlg.querySelector('#editDevIP').value.trim();
        const mac = m.dlg.querySelector('#editDevMAC').value.trim();
        const color = colorText.value.trim();
        
        let lid = locationSelect.value;

        // Validation
        if (!name) {
            showAlertModal('Device name is required.', 'Validation Error', { size: 'sm' });
            m.dlg.querySelector('#editDevName').focus();
            return;
        }

        // Handle new location creation
        if (lid === '__NEW__') {
            const newLocName = m.dlg.querySelector('#newLocationName').value.trim();
            if (!newLocName) {
                showAlertModal('Please enter a name for the new location.', 'Validation Error', { size: 'sm' });
                m.dlg.querySelector('#newLocationName').focus();
                return;
            }
            // Generate new location ID
            const maxLocId = locations.reduce((max, loc) => Math.max(max, parseInt(loc.location_id) || 0), 0);
            lid = String(maxLocId + 1);
            
            // Create new location
            const newLocation = {
                location_id: lid,
                location_name: newLocName,
                location_description: '',
                device: []
            };
            
            if (!group.location) group.location = [];
            group.location.push(newLocation);
            
            // Remove device from old location
            location.device = (location.device || []).filter(d => String(d.device_id) !== String(device.device_id));
            
            // Update location reference
            location = newLocation;
        } else if (String(lid) !== String(location.location_id)) {
            // Moving to a different existing location
            const newLoc = locations.find(l => String(l.location_id) === String(lid));
            if (newLoc) {
                // Remove from old location
                location.device = (location.device || []).filter(d => String(d.device_id) !== String(device.device_id));
                location = newLoc;
            }
        }

        // Collect segment colors
        const newSegmentColors = [];
        const segmentTextInputs = m.dlg.querySelectorAll('.segment-color-text');
        segmentTextInputs.forEach(input => {
            const val = input.value.trim();
            if (val) newSegmentColors.push(val);
        });

        const saveBtn = m.dlg.querySelector('#editDevSave');
        const originalText = saveBtn.textContent;
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        try {
            // Update device properties
            device.device_name = name;
            device.device_description = desc;
            device.device_hostname = host;
            device.device_ip = ip;
            device.device_mac = mac;
            device.device_current_color = color;
            device.device_segment_colors = newSegmentColors;

            // Ensure device is in the location's device array
            if (!location.device) location.device = [];
            const deviceExists = location.device.some(d => String(d.device_id) === String(device.device_id));
            if (!deviceExists) {
                location.device.push(device);
            }

            // Clean up and normalize the entire hierarchy before saving
            cleanupHierarchy(window.currentHierarchy);

            // Save to API
            await apiFetch('/api/hierarchy', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(window.currentHierarchy)
            });

            // Ask backend to read the saved network_devices.json and apply state
            try {
                const resp = await apiFetch(`/api/devices/${encodeURIComponent(device.device_id)}/apply_saved`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                if (resp && resp.status === 'success') {
                    showAlertModal('Saved and applied configuration to device (if reachable).', 'Success', { size: 'sm' });
                } else {
                    showAlertModal('Saved configuration. Device may be offline or apply failed.', 'Notice', { size: 'sm' });
                }
            } catch (applyErr) {
                console.warn('Applying saved state failed or device unreachable', applyErr);
                showAlertModal('Saved configuration, but failed to apply to device (device may be offline).', 'Notice', { size: 'sm' });
            }

            // Close modal
            m.overlay.remove();
            document.removeEventListener('keydown', handleKeyDown);

            // Refresh devices display
            if (typeof renderDevicesGrid === 'function') {
                renderDevicesGrid(zoneId, groupId);
            }

            showAlertModal('Device updated successfully!', '', { size: 'sm' });
            
        } catch (err) {
            console.error('Failed to update device', err);
            showAlertModal('Failed to update device. See console for details.', 'Error', { size: 'sm' });
            
            nextBtn.disabled = false;
            nextBtn.textContent = originalText;
        }
    });
}

// Add Device Modal
function openAddDeviceModal() {
    const zoneSelect = document.getElementById('zoneSelect');
    const groupSelect = document.getElementById('groupSelect');
    
    if (!zoneSelect || !zoneSelect.value) {
        showAlertModal('Please select a zone first.', 'Notice', { size: 'sm' });
        return;
    }
    
    if (!groupSelect || !groupSelect.value) {
        showAlertModal('Please select a group first.', 'Notice', { size: 'sm' });
        return;
    }

    const hierarchy = window.currentHierarchy || { zones: [] };
    const currentZoneId = zoneSelect.value;
    const currentGroupId = groupSelect.value;
    
    function buildOptions(list, idKey, nameKey) {
        return (list || []).map(it => `<option value="${escapeHtml(String(it[idKey] ?? ''))}">${escapeHtml(String(it[nameKey] ?? '(unnamed)'))}</option>`).join('');
    }
    
    const zone = (hierarchy.zones || []).find(z => String(z.zone_id) === String(currentZoneId));
    const group = zone ? (zone.groups || []).find(g => String(g.group_id) === String(currentGroupId)) : null;
    const locations = group ? (group.location || group.locations || []) : [];

    const html = `
            <h4 class="text-md text-center text-xs">
            <span class="font-thin">Give your device card a name so it's easier to recognize.</span>
            </h4>
            <div class ="mb-6">
                <div class="text-center font-thin text-xs">You can always rename it later.</div>
            </div>
            <div class="mb-6">
                <label class="block text-sm font-medium text-[#f3f4f1] mb-1">Device Card Name *</label>
                <input id="addDevName" type="text" class="w-full border bg-[#2b3236] border-[#6c757d] rounded-lg px-3 py-2 focus:outline-none focus:border-[#008bbf]" placeholder="e.g., Living Room Strip" autocomplete="off" maxlength="32" required>
                <div id="addDevNameCharLimit" class="text-sm mt-1 hidden" style="color: #ffd969;">
                    <img src="assets/icons/alert-triangle.svg" class="inline w-4 h-4 mr-1 mb-1" alt="Warning" />
                    <span class="text-[#ffd969]">Oops! Youâ€™ve hit the character limit. Try a shorter name.</span>
                </div>
                <div id="addDevNameRequired" class="text-sm mt-1 hidden" style="color: #ffd969;">
                    <img src="assets/icons/alert-triangle.svg" class="inline w-4 h-4 mr-1 mb-1" alt="Warning" />
                    <span class="text-[#ffd969]">Device name is required.</span>
                </div>
            </div>
            <div class="mb-6">
                <label class="block text-sm font-medium text-[#f3f4f1] mb-1">Description (Optional)</label>
                <textarea id="addDevDesc" class="w-full bg-[#2b3236] border border-[#6c757d] rounded-lg px-3 py-2 focus:outline-none focus:border-[#008bbf] resize-vertical" rows="2" placeholder="Optional description" autocomplete="off" maxlength="255"></textarea>
                <div id="addDevDescCharLimit" class="text-sm mt-1 hidden" style="color: #ffd969;">
                    <img src="assets/icons/alert-triangle.svg" class="inline w-4 h-4 mr-1 mb-1" alt="Warning" />
                    <span class="text-[#ffd969]">Oops! Youâ€™ve hit the character limit. Try fewer characters.</span>
                </div>
            </div>
            <div class="flex justify-end space-x-4">
                <button id="addDevCancel" class="px-6 py-2 rounded-xl bg-[#008bbf] hover:bg-[#006b94] text-[#f3f4f1] font-medium">Back</button>
                <button id="addDevNext" class="px-6 py-2 rounded-xl bg-[#ed0973] hover:bg-[#b70558] text-[#f3f4f1] font-medium disabled:opacity-50 disabled:cursor-not-allowed" disabled>Next</button>
            </div>
        `;

    const m = createModal(html);

    // Auto-focus device name input
    setTimeout(() => {
        const nameInput = m.dlg.querySelector('#addDevName');
        if (nameInput) {
            nameInput.focus();
            nameInput.select();
        }
    }, 100);

    // Real-time validation on name and description inputs
    const nameInput = m.dlg.querySelector('#addDevName');
    const charLimitMessage = m.dlg.querySelector('#addDevNameCharLimit');
    const nameRequiredMessage = m.dlg.querySelector('#addDevNameRequired');
    const descInput = m.dlg.querySelector('#addDevDesc');
    const descCharLimitMessage = m.dlg.querySelector('#addDevDescCharLimit');
    const nextBtn = m.dlg.querySelector('#addDevNext');

    // Ensure Next is disabled by default
    if (nextBtn) nextBtn.disabled = true;

    function updateAddDevNextState() {
        const hasName = nameInput && String(nameInput.value || '').trim().length > 0;
        if (nextBtn) nextBtn.disabled = !hasName;
        // Hide required indicator when name present
        if (nameRequiredMessage) {
            if (hasName) nameRequiredMessage.classList.add('hidden');
            else nameRequiredMessage.classList.remove('hidden');
        }
    }

    if (nameInput) {
        nameInput.addEventListener('input', () => {
            // Check character limit (32 max - show warning at exactly 32)
            if (nameInput.value.length >= 32) {
                if (charLimitMessage) charLimitMessage.classList.remove('hidden');
                nameInput.classList.add('border-[#ffd969]');
            } else {
                if (charLimitMessage) charLimitMessage.classList.add('hidden');
                nameInput.classList.remove('border-[#ffd969]');
            }
            updateAddDevNextState();
        });

        // Prevent Enter from closing modal when name empty; when name present, Enter acts like Next
        nameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const hasName = String(nameInput.value || '').trim().length > 0;
                if (hasName && nextBtn && !nextBtn.disabled) {
                    nextBtn.click();
                } else {
                    if (nameRequiredMessage) nameRequiredMessage.classList.remove('hidden');
                    nameInput.classList.add('border-[#ffd969]');
                }
            }
        });
    }

    // Real-time validation on description input
    if (descInput && descCharLimitMessage) {
        descInput.addEventListener('input', () => {
            // Check character limit (255 max - show warning at exactly 255)
            if (descInput.value.length >= 255) {
                descCharLimitMessage.classList.remove('hidden');
                descInput.classList.add('border-[#ffd969]');
            } else {
                descCharLimitMessage.classList.add('hidden');
                descInput.classList.remove('border-[#ffd969]');
            }
            // Description doesn't control Next enabling in current requirement, but keep UX consistent
            updateAddDevNextState();
        });

        descInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                // Treat Enter inside description same as name: try to submit only if name present
                e.preventDefault();
                const hasName = nameInput && String(nameInput.value || '').trim().length > 0;
                if (hasName && nextBtn && !nextBtn.disabled) {
                    nextBtn.click();
                } else if (nameRequiredMessage) {
                    nameRequiredMessage.classList.remove('hidden');
                    if (nameInput) nameInput.classList.add('border-[#ffd969]');
                }
            }
        });
    }

    // Initialize state on open
    updateAddDevNextState();

    // Escape key handler
    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            m.overlay.remove();
            document.removeEventListener('keydown', handleKeyDown);
        }
    };
    document.addEventListener('keydown', handleKeyDown);

    // Cancel button
    m.dlg.querySelector('#addDevCancel').addEventListener('click', () => {
        m.overlay.remove();
        document.removeEventListener('keydown', handleKeyDown);
    });

    // Next button: show scanning devices as a full page within the app (not a modal)
    m.dlg.querySelector('#addDevNext').addEventListener('click', () => {
        m.overlay.remove();
        document.removeEventListener('keydown', handleKeyDown);
        openScanDevicesPage();
    });

// Render the scanning/devices UI as a new page inside the main Devices section
function openScanDevicesPage() {
    const container = document.getElementById('devicesSection') || document.body;

    // Save current content to restore when user navigates back
    if (!container.dataset._prevHtml) container.dataset._prevHtml = container.innerHTML;

    // Hide zone and group UI (store previous display values so we can restore later)
    const zoneDropdown = document.getElementById('zoneDropdown');
    const zoneContainer = zoneDropdown ? zoneDropdown.closest('.container-lg') : null;
    if (zoneContainer) {
        if (typeof zoneContainer.dataset._prevDisplay === 'undefined') zoneContainer.dataset._prevDisplay = zoneContainer.style.display || '';
        zoneContainer.style.display = 'none';
    }
    const groupEditBtn = document.getElementById('groupEditBtn');
    const groupContainer = groupEditBtn ? groupEditBtn.closest('.container-lg') : null;
    if (groupContainer) {
        if (typeof groupContainer.dataset._prevDisplay === 'undefined') groupContainer.dataset._prevDisplay = groupContainer.style.display || '';
        groupContainer.style.display = 'none';
    }
    // Also hide the group buttons row (the actual buttons container) and its wrapper
    const groupButtonsContainer = document.getElementById('groupButtonsContainer');
    let groupButtonsWrapper = null;
    if (groupButtonsContainer) {
        if (typeof groupButtonsContainer.dataset._prevDisplay === 'undefined') groupButtonsContainer.dataset._prevDisplay = groupButtonsContainer.style.display || '';
        groupButtonsContainer.style.display = 'none';
        // The surrounding wrapper has class "container-lg mb-20" — hide that too
        groupButtonsWrapper = groupButtonsContainer.closest('.container-lg.mb-20') || document.querySelector('.container-lg.mb-20');
        if (groupButtonsWrapper) {
            if (typeof groupButtonsWrapper.dataset._prevDisplay === 'undefined') groupButtonsWrapper.dataset._prevDisplay = groupButtonsWrapper.style.display || '';
            groupButtonsWrapper.style.display = 'none';
        }
    }

    // Scanning UI: call backend to discover devices and render results
    const html = `
        <div class="container mx-auto py-10" id="scanDevicesPage">
            <div class="flex items-center justify-between mb-6">
                <div class="flex items-center">
                    <button id="scanBack" class="mr-4 text-xl text-[#f3f4f1] bg-transparent border-none" style="background:none;border:0;padding:0;cursor:pointer;">&larr;</button>
                    <h1 class="text-2xl font-semibold text-[#f3f4f1]">Available Devices</h1>
                </div>
                <div class="flex items-center space-x-3">
                        <input id="scanIpRange" class="px-3 py-2 rounded bg-[#2b3236] border border-[#6c757d] text-sm text-[#f3f4f1]" placeholder="IP base (e.g. 192.168.1)" value="">
                    <button id="rescanBtn" class="px-4 py-2 rounded bg-[#008bbf] hover:bg-[#006b94] text-[#f3f4f1] text-sm">Rescan</button>
                </div>
            </div>

            <p class="text-sm text-[#f3f4f1] max-w-8xl mb-6">Select a device from the list below. If your device isn't listed, you can set up your location first to add your light controls and connect your device later.</p>

            <div id="scanResults" class="w-full">
                <div class="text-sm text-[#f3f4f1]">Scanning for devices… <span id="scanSpinner" class="inline-block ml-2 animate-spin" style="width:14px;height:14px;border:3px solid #008bbf;border-top-color:transparent;border-radius:9999px"></span></div>
            </div>

            <!-- Skip button styled to match app design: rounded pill, pink, shadowed, bottom-right within page content -->
            <button id="skipDevices" class="skip-devices-btn">Skip Devices</button>

            <style>
            .animate-spin { animation: spin 1s linear infinite; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            /* Skip Devices button visuals */
            .skip-devices-btn {
                position: fixed;
                bottom: 100px;
                right: 315px; /* offset from viewport right to align with main content area */
                z-index: 9999;
                padding: 8px 18px;
                border-radius: 10px;
                background: #ed0973;
                color: #f3f4f1;
                font-weight: 600;
                box-shadow: 0 8px 20px rgba(0,0,0,0.5);
                border: none;
                cursor: pointer;
                transition: background-color .12s ease, transform .06s ease;
            }
            .skip-devices-btn:hover { background: #b70558; transform: translateY(-1px); }
            .skip-devices-btn:active { transform: translateY(0); }
            .scan-item { background:#23272a;border:1px solid #6c757d;padding:15px;border-radius:8px;margin:8px;display:inline-block;vertical-align:top;cursor:pointer; width:370px; height:239px; box-sizing:border-box }
            .scan-item .meta { font-size:13px;color:#f3f4f1 }
            .scan-item .actions button { margin-left:8px }
            .scan-item.selected { box-shadow: 0 0 0 2px rgba(3,155,229,0.6); border-color: rgba(3,155,229,0.8); }
            .scan-item .meta { display:flex; align-items:center; justify-content:space-between; }
            .scan-item .mac { font-size:14px; color:#f3f4f1 }
            .status-dot { width:10px; height:10px; border-radius:50%; background:#9ca3af; margin-left:8px; flex:0 0 auto }
            .status-dot.online { background:#4ade80 }
            .scan-item .bar { height:10px; background:#2b2f31; border-radius:6px; margin:10px 0 }
            .scan-item .bar-inner { height:100%; width:80%; background:#cbd5e1; border-radius:6px }
            .scan-footer { display:flex; gap:12px; justify-content:flex-end; margin-top:18px }
            .btn-back { background:#00a7d6; color:#fff; padding:8px 14px; border-radius:8px; }
            .btn-choose { background:#ed0973; color:#fff; padding:8px 14px; border-radius:8px; }
            </style>
        </div>
    `;

    container.innerHTML = html;

    // Helper: render discovered IPs into results area
    async function runScan(ipBase) {
        const resultsEl = document.getElementById('scanResults');
        if (!resultsEl) return;
        // Validate ipBase: length 7-15 and basic IPv4 octet rules (allow 2-4 octets like 192.168.1 or 192.168.0.1)
        function isValidIpBase(s) {
            if (!s || typeof s !== 'string') return false;
            const trimmed = s.trim();
            if (trimmed.length < 7 || trimmed.length > 15) return false;
            const parts = trimmed.split('.');
            if (parts.length < 2 || parts.length > 4) return false;
            for (const p of parts) {
                if (!/^[0-9]{1,3}$/.test(p)) return false;
                const n = Number(p);
                if (Number.isNaN(n) || n < 0 || n > 255) return false;
            }
            return true;
        }

        if (!isValidIpBase(String(ipBase || ''))) {
            resultsEl.innerHTML = `<div class="text-sm text-yellow-400">Invalid IP base. Example valid values: <code>192.168.1</code> or <code>192.168.0.1</code> (7–15 chars).</div>`;
            return;
        }

        resultsEl.innerHTML = `<div class="text-sm text-[#f3f4f1]">Scanning for devices… <span id="scanSpinner" class="inline-block ml-2 animate-spin" style="width:14px;height:14px;border:3px solid #008bbf;border-top-color:transparent;border-radius:9999px"></span></div>`;
        try {
            // If ipBase is a full IP (4 octets) probe that single IP instead of scanning 1..254
            const parts = String(ipBase || '').trim().split('.').filter(Boolean);
            let list = [];
            if (parts.length === 4) {
                // Probe exact IP
                const probe = await apiFetch('/api/devices/probe', { method: 'POST', timeout: 5000, retry: 0, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ip: ipBase }) });
                if (probe && probe.status === 'success') {
                    list = [ipBase];
                } else {
                    resultsEl.innerHTML = `<div class="text-sm text-gray-400">No device responded at ${escapeHtml(ipBase)}</div>`;
                    return;
                }
            } else {
                const resp = await apiFetch('/api/devices/discover', { method: 'POST', timeout: 10000, retry: 1, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ip_range: ipBase }) });
                if (!resp || resp.status !== 'success' || !Array.isArray(resp.discovered_devices)) {
                    resultsEl.innerHTML = `<div class="text-sm text-yellow-400">No devices discovered or an error occurred.</div>`;
                    return;
                }
                list = resp.discovered_devices;
            }
            if (!list.length) {
                resultsEl.innerHTML = `<div class="text-sm text-gray-400">No new devices found on ${ipBase}.*</div>`;
                return;
            }

            // Render each discovered IP as a selectable device card (no Add/Probe buttons)
            resultsEl.innerHTML = '';
            const nodes = list.map(ip => {
                const div = document.createElement('div');
                div.className = 'scan-item';
                div.dataset.ip = ip;
                // Basic skeleton; we'll probe each IP to populate richer info
                div.innerHTML = `
                    <div class="meta"><div class="mac">MAC: <span class="mac-value">${escapeHtml(ip)}</span></div><div class="status-dot" aria-hidden="true"></div></div>
                    <div class="bar"><div class="bar-inner"></div></div>
                    <div class="details text-sm text-[#f3f4f1]">
                        <div>IP: <strong>${escapeHtml(ip)}</strong></div>
                        <div class="info text-xs text-gray-400">Loading device info…</div>
                    </div>
                `;

                // Probe the device for additional info and update the card (don't block rendering)
                (async () => {
                    try {
                        const probeResp = await apiFetch('/api/devices/probe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ip }), timeout: 5000, retry: 0 });
                        if (probeResp && probeResp.status === 'success' && probeResp.info) {
                            const info = probeResp.info || {};
                            const host = info.name || info.hostname || info.device_name || '';
                            const rawMac = info.mac || info.mac_address || info.device_mac || '';
                            const formattedMac = formatMac(rawMac) || '';
                            const id = info.id || info.device_id || '';
                            const type = info.type || info.device_type || 'WLED';
                            const macHtml = formattedMac ? escapeHtml(formattedMac) : escapeHtml(rawMac || '');
                            const metaEl = div.querySelector('.meta');
                            if (metaEl) {
                                const macVal = metaEl.querySelector('.mac-value');
                                if (macVal) macVal.textContent = macHtml;
                                const dot = metaEl.querySelector('.status-dot');
                                if (dot) dot.classList.add('online');
                            }
                            const infoEl = div.querySelector('.info');
                            if (infoEl) infoEl.innerHTML = `${host ? `Name: ${escapeHtml(host)}<br/>` : ''}ID: ${escapeHtml(String(id))}<br/>Type: ${escapeHtml(type)}`;
                        } else {
                            const infoEl = div.querySelector('.info');
                            if (infoEl) infoEl.textContent = 'No device info';
                        }
                    } catch (err) {
                        console.warn('Probe error for', ip, err);
                        const infoEl = div.querySelector('.info');
                        if (infoEl) infoEl.textContent = 'Probe failed';
                    }
                })();

                return div;
            });
            nodes.forEach(n => resultsEl.appendChild(n));

            // Enable item selection and update footer buttons
            const items = resultsEl.querySelectorAll('.scan-item');
            items.forEach(it => {
                it.addEventListener('click', (e) => {
                    // Toggle selection on the whole card
                    it.classList.toggle('selected');
                    updateFooterButtons();
                });
            });

            function updateFooterButtons() {
                const footerExisting = document.getElementById('scanFooterButtons');
                const skipExisting = document.getElementById('skipDevices');
                const anySelected = resultsEl.querySelectorAll('.scan-item.selected').length > 0;
                if (list.length > 0) {
                    // Replace skip button with Back + Choose
                    if (skipExisting) {
                        const wrapper = document.createElement('div');
                        wrapper.id = 'scanFooterButtons';
                        wrapper.className = 'scan-footer';
                        wrapper.innerHTML = `
                            <button id="scanBackBtn" class="btn-back">Back</button>
                            <button id="chooseDeviceBtn" class="btn-choose" ${anySelected ? '' : 'disabled'}>Choose Device</button>
                        `;
                        skipExisting.replaceWith(wrapper);
                    } else if (!footerExisting) {
                        // If neither exists, append footer
                        const wrapper = document.createElement('div');
                        wrapper.id = 'scanFooterButtons';
                        wrapper.className = 'scan-footer';
                        wrapper.innerHTML = `
                            <button id="scanBackBtn" class="btn-back">Back</button>
                            <button id="chooseDeviceBtn" class="btn-choose" ${anySelected ? '' : 'disabled'}>Choose Device</button>
                        `;
                        const parent = document.getElementById('scanDevicesPage');
                        if (parent) parent.appendChild(wrapper);
                    } else {
                        // Footer exists - toggle disabled state
                        const chooseBtn = document.getElementById('chooseDeviceBtn');
                        if (chooseBtn) chooseBtn.disabled = !anySelected;
                    }

                    // Wire new buttons
                    const scanBackBtn = document.getElementById('scanBackBtn');
                    if (scanBackBtn) {
                        scanBackBtn.addEventListener('click', () => {
                            if (container.dataset._prevHtml) {
                                container.innerHTML = container.dataset._prevHtml;
                                delete container.dataset._prevHtml;
                            }
                            if (zoneContainer) {
                                zoneContainer.style.display = zoneContainer.dataset._prevDisplay || '';
                                delete zoneContainer.dataset._prevDisplay;
                            }
                            if (groupContainer) {
                                groupContainer.style.display = groupContainer.dataset._prevDisplay || '';
                                delete groupContainer.dataset._prevDisplay;
                            }
                            if (groupButtonsContainer) {
                                groupButtonsContainer.style.display = groupButtonsContainer.dataset._prevDisplay || '';
                                delete groupButtonsContainer.dataset._prevDisplay;
                            }
                            if (groupButtonsWrapper) {
                                groupButtonsWrapper.style.display = groupButtonsWrapper.dataset._prevDisplay || '';
                                delete groupButtonsWrapper.dataset._prevDisplay;
                            }
                            try { if (typeof initDeviceHandlers === 'function') initDeviceHandlers(); } catch (e) { console.warn(e); }
                            // Also trigger a targeted re-render of the devices grid so data appears immediately
                            try {
                                const zid = document.getElementById('zoneSelect')?.value;
                                const gid = document.getElementById('groupSelect')?.value;
                                if (zid && gid && typeof renderDevicesGrid === 'function') {
                                    renderDevicesGrid(zid, gid);
                                }
                            } catch (re) { console.warn('renderDevicesGrid failed', re); }
                            // After restoring UI, perform a cache-busting reload to ensure updated devices are shown
                            setTimeout(() => {
                                try {
                                    console.debug('Performing cache-busting reload...');
                                    const path = window.location.pathname || '/';
                                    const search = window.location.search || '';
                                    const sep = search ? '&' : '?';
                                    window.location.replace(path + search + sep + '_=' + Date.now());
                                } catch (reloadErr) {
                                    console.debug('Reload failed, falling back to reload()');
                                    try { window.location.reload(); } catch (e) { /* ignore */ }
                                }
                            }, 300);
                            // After restoring UI, perform a cache-busting reload to ensure updated devices are shown
                            setTimeout(() => {
                                try {
                                    console.debug('Performing cache-busting reload...');
                                    const path = window.location.pathname || '/';
                                    const search = window.location.search || '';
                                    const sep = search ? '&' : '?';
                                    window.location.replace(path + search + sep + '_=' + Date.now());
                                } catch (reloadErr) {
                                    console.debug('Reload failed, falling back to reload()');
                                    try { window.location.reload(); } catch (e) { /* ignore */ }
                                }
                            }, 300);
                        });
                    }

                    const chooseBtn = document.getElementById('chooseDeviceBtn');
                    if (chooseBtn) {
                        chooseBtn.addEventListener('click', async () => {
                            const selected = resultsEl.querySelectorAll('.scan-item.selected');
                            const nodes = Array.from(selected);
                            if (!nodes.length) return;
                            chooseBtn.disabled = true;
                            chooseBtn.textContent = 'Adding...';
                            for (const node of nodes) {
                                const ip = node.dataset.ip;
                                try {
                                    // Probe the device to collect richer metadata before adding
                                    let probeInfo = null;
                                    try {
                                        const probeResp = await apiFetch('/api/devices/probe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ip }), timeout: 5000, retry: 0 });
                                        if (probeResp && probeResp.status === 'success' && probeResp.info) probeInfo = probeResp.info;
                                    } catch (pErr) {
                                        console.warn('Probe before add failed for', ip, pErr);
                                    }

                                    const name = (probeInfo && (probeInfo.name || probeInfo.device_name)) ? (probeInfo.name || probeInfo.device_name) : `New Device ${ip}`;
                                    const hostname = probeInfo && (probeInfo.hostname || probeInfo.host) ? (probeInfo.hostname || probeInfo.host) : '';
                                    const rawMac = probeInfo && (probeInfo.mac || probeInfo.mac_address || probeInfo.device_mac) ? (probeInfo.mac || probeInfo.mac_address || probeInfo.device_mac) : '';
                                    const formattedMac = rawMac ? formatMac(rawMac) : '';

                                    const payload = {
                                        name,
                                        ip_address: ip,
                                        mac_address: formattedMac || undefined,
                                        hostname: hostname || undefined
                                    };

                                    // Prefer adding to the currently-selected Zone/Group/Location if available
                                    try {
                                        const zoneSelectEl = document.getElementById('zoneSelect');
                                        const groupSelectEl = document.getElementById('groupSelect');
                                        const zid = zoneSelectEl && zoneSelectEl.value ? zoneSelectEl.value : null;
                                        const gid = groupSelectEl && groupSelectEl.value ? groupSelectEl.value : null;
                                        let added = false;
                                        if (zid && gid && window.currentHierarchy && Array.isArray(window.currentHierarchy.zones)) {
                                            const zoneObj = window.currentHierarchy.zones.find(z => String(z.zone_id) === String(zid));
                                            if (zoneObj) {
                                                const groups = Array.isArray(zoneObj.groups) ? zoneObj.groups : (Array.isArray(zoneObj.group) ? zoneObj.group : []);
                                                const groupObj = groups.find(g => String(g.group_id) === String(gid));
                                                if (groupObj) {
                                                        let locs = Array.isArray(groupObj.location) ? groupObj.location : (Array.isArray(groupObj.locations) ? groupObj.locations : []);
                                                        if (!locs || !locs.length) {
                                                            // No location exists - create one under this group so the device can be placed there
                                                            try {
                                                                const newLocName = `${groupObj.group_name || 'Location'} Location`;
                                                                const createResp = await apiFetch(`/api/zones/${encodeURIComponent(zid)}/groups/${encodeURIComponent(gid)}/locations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newLocName, description: '', create_default_device: false }), timeout: 8000, retry: 1 });
                                                                if (createResp && createResp.status === 'success' && createResp.location) {
                                                                    // update local hierarchy representation if present
                                                                    window.currentHierarchy = window.currentHierarchy || {};
                                                                    // reload hierarchy from backend to ensure consistency
                                                                    try { window.currentHierarchy = await apiFetch('/api/hierarchy'); } catch (e) { /* ignore */ }
                                                                    locs = Array.isArray(groupObj.location) ? groupObj.location : (Array.isArray(groupObj.locations) ? groupObj.locations : []);
                                                                }
                                                            } catch (createErr) {
                                                                console.warn('Failed to create location for group, will fallback to legacy add', createErr);
                                                                locs = [];
                                                            }
                                                        }
                                                        if (locs && locs.length) {
                                                            const loc = locs[0];
                                                            const locationId = loc.location_id ?? loc.locationId ?? loc.id;
                                                            if (typeof locationId !== 'undefined') {
                                                                const url = `/api/zones/${encodeURIComponent(zid)}/groups/${encodeURIComponent(gid)}/locations/${encodeURIComponent(locationId)}/devices`;
                                                                await apiFetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: payload.name, description: '', hostname: payload.hostname, ip_address: payload.ip_address, mac_address: payload.mac_address, current_color: payload.current_color, segment_colors: payload.segment_colors || [] }), timeout: 8000, retry: 1 });
                                                                added = true;
                                                            }
                                                        }
                                                }
                                            }
                                        }
                                        if (!added) {
                                            // Fallback to legacy endpoint
                                            await apiFetch('/add_device', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, body: JSON.stringify(payload), timeout: 8000, retry: 1 });
                                        }
                                    } catch (eAdd) {
                                        console.warn('Add to selected zone/group failed, falling back to /add_device', eAdd);
                                        try { await apiFetch('/add_device', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, body: JSON.stringify(payload), timeout: 8000, retry: 1 }); } catch (e2) { console.error('Fallback add_device also failed', e2); }
                                    }
                                } catch (err) {
                                    console.error('Add device failed', err);
                                }
                            }

                            // Refresh hierarchy after adding
                            try { window.currentHierarchy = await apiFetch('/api/hierarchy'); } catch(e){/*ignore*/}
                            // Restore previous view and unhide zone/group UI like Back/Skip
                            if (container.dataset._prevHtml) {
                                container.innerHTML = container.dataset._prevHtml;
                                delete container.dataset._prevHtml;
                            }
                            if (zoneContainer) {
                                zoneContainer.style.display = zoneContainer.dataset._prevDisplay || '';
                                delete zoneContainer.dataset._prevDisplay;
                            }
                            if (groupContainer) {
                                groupContainer.style.display = groupContainer.dataset._prevDisplay || '';
                                delete groupContainer.dataset._prevDisplay;
                            }
                            if (groupButtonsContainer) {
                                groupButtonsContainer.style.display = groupButtonsContainer.dataset._prevDisplay || '';
                                delete groupButtonsContainer.dataset._prevDisplay;
                            }
                            if (groupButtonsWrapper) {
                                groupButtonsWrapper.style.display = groupButtonsWrapper.dataset._prevDisplay || '';
                                delete groupButtonsWrapper.dataset._prevDisplay;
                            }
                            try { if (typeof initDeviceHandlers === 'function') initDeviceHandlers(); } catch (e) { console.warn(e); }
                        });
                    }
                } else {
                    // No results, ensure the skip button exists
                    if (!skipExisting && !footerExisting) {
                        const parent = document.getElementById('scanDevicesPage');
                        if (parent) {
                            const btn = document.createElement('button');
                            btn.id = 'skipDevices';
                            btn.className = 'skip-devices-btn';
                            btn.textContent = 'Skip Devices';
                            parent.appendChild(btn);
                            btn.addEventListener('click', () => {
                                if (container.dataset._prevHtml) {
                                    container.innerHTML = container.dataset._prevHtml;
                                    delete container.dataset._prevHtml;
                                }
                                try { if (typeof initDeviceHandlers === 'function') initDeviceHandlers(); } catch (e) { console.warn(e); }
                            });
                        }
                    }
                }
            }

            // Initialize footer state once items rendered
            updateFooterButtons();

        } catch (err) {
            console.error('Scan failed', err);
            resultsEl.innerHTML = `<div class="text-sm text-red-500">Scan failed: ${escapeHtml(String(err && err.message || err))}</div>`;
        }
    }

    // Kick off initial scan — fetch backend WLED_IP to use as default if available
    const ipInput = document.getElementById('scanIpRange');
    (async function initScanDefault() {
        let defaultIp = '10.0.0.140';
        try {
            const cfg = await apiFetch('/api/wled/ip', { timeout: 2000, retry: 0 });
            if (cfg && cfg.status === 'success' && cfg.wled_ip) defaultIp = cfg.wled_ip;
        } catch (err) {
            // ignore — use fallback
        }
        if (ipInput) ipInput.value = defaultIp;
        setTimeout(() => runScan(ipInput ? ipInput.value : defaultIp), 50);
    })();

    // Rescan button
    const rescanBtn = document.getElementById('rescanBtn');
    if (rescanBtn) rescanBtn.addEventListener('click', () => {
        const base = (document.getElementById('scanIpRange') || {}).value || '192.168.1';
        runScan(base);
    });

    // Back restores previous content and unhides zone/group UI
    const backBtn = document.getElementById('scanBack');
    if (backBtn) backBtn.addEventListener('click', () => {
        if (container.dataset._prevHtml) {
            container.innerHTML = container.dataset._prevHtml;
            delete container.dataset._prevHtml;
        }
        if (zoneContainer) {
            zoneContainer.style.display = zoneContainer.dataset._prevDisplay || '';
            delete zoneContainer.dataset._prevDisplay;
        }
        if (groupContainer) {
            groupContainer.style.display = groupContainer.dataset._prevDisplay || '';
            delete groupContainer.dataset._prevDisplay;
        }
        if (groupButtonsContainer) {
            groupButtonsContainer.style.display = groupButtonsContainer.dataset._prevDisplay || '';
            delete groupButtonsContainer.dataset._prevDisplay;
        }
        if (groupButtonsWrapper) {
            groupButtonsWrapper.style.display = groupButtonsWrapper.dataset._prevDisplay || '';
            delete groupButtonsWrapper.dataset._prevDisplay;
        }
        // Re-init device handlers so previous UI works again
        try { if (typeof initDeviceHandlers === 'function') initDeviceHandlers(); } catch (e) { console.warn(e); }
    });

    // Skip Devices restores previous content (could advance workflow)
    const skipBtn = document.getElementById('skipDevices');
    if (skipBtn) skipBtn.addEventListener('click', () => {
        if (container.dataset._prevHtml) {
            container.innerHTML = container.dataset._prevHtml;
            delete container.dataset._prevHtml;
        }
        if (zoneContainer) {
            zoneContainer.style.display = zoneContainer.dataset._prevDisplay || '';
            delete zoneContainer.dataset._prevDisplay;
        }
        if (groupContainer) {
            groupContainer.style.display = groupContainer.dataset._prevDisplay || '';
            delete groupContainer.dataset._prevDisplay;
        }
        if (groupButtonsContainer) {
            groupButtonsContainer.style.display = groupButtonsContainer.dataset._prevDisplay || '';
            delete groupButtonsContainer.dataset._prevDisplay;
        }
        if (groupButtonsWrapper) {
            groupButtonsWrapper.style.display = groupButtonsWrapper.dataset._prevDisplay || '';
            delete groupButtonsWrapper.dataset._prevDisplay;
        }
        try { if (typeof initDeviceHandlers === 'function') initDeviceHandlers(); } catch (e) { console.warn(e); }
        // TODO: advance to next step in setup if applicable
    });
}
}

// Initialize device-related event handlers
function initDeviceHandlers() {
    // console.log('🔧 initDeviceHandlers: Setting up device handlers');
    
    const refresh = document.getElementById('refreshDevices');
    if (refresh) refresh.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            window.currentHierarchy = await apiFetch('/api/hierarchy');
            const zid = document.getElementById('zoneSelect')?.value;
            const gid = document.getElementById('groupSelect')?.value;
            if (zid && gid) renderDevicesGrid(zid, gid);
        } catch (err) {
            console.error('Failed to refresh devices', err);
            showAlertModal && showAlertModal('Failed to refresh devices. See console.', 'Error');
        }
    });

    const zoneHidden = document.getElementById('zoneSelect');
    const groupHidden = document.getElementById('groupSelect');
    
    // console.log('🔧 initDeviceHandlers: Found zoneHidden:', zoneHidden);
    // console.log('🔧 initDeviceHandlers: Found groupHidden:', groupHidden);
    
    function selChanged() {
        const zid = zoneHidden?.value;
        const gid = groupHidden?.value;
        // console.log('🔧 selChanged: Zone ID:', zid, 'Group ID:', gid);
        // Always call renderDevicesGrid - it will show "No Device" when no group selected
        renderDevicesGrid(zid, gid);
        // Update Add Devices button state
        updateAddDevicesButtonState();
    }
    
    if (zoneHidden) {
        // console.log('🔧 initDeviceHandlers: Adding change listener to zoneHidden');
        zoneHidden.addEventListener('change', selChanged);
    // } else {
        // console.log('❌ initDeviceHandlers: zoneHidden element not found');
    }
    
    if (groupHidden) {
        // console.log('🔧 initDeviceHandlers: Adding change listener to groupHidden');
        groupHidden.addEventListener('change', selChanged);
    // } else {
        // console.log('❌ initDeviceHandlers: groupHidden element not found');
    }

    // console.log('🔧 initDeviceHandlers: Calling selChanged() for initial render');
    selChanged();
    // console.log('🔧 initDeviceHandlers: Initial selChanged() call completed');
}

// (Removed one-time initial device fetch per design change)