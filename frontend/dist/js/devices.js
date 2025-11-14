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
        
        card.innerHTML = `
            <div class="flex items-start justify-between space-x-4">
                <div class="flex-1">
                    <div class="flex items-center justify-between">
                        <div>
                            <div class="text-white font-semibold">${escapeHtml(dev.device_name || 'Unnamed Device')}</div>
                            <div class="text-sm text-gray-400">${escapeHtml(dev.location_name || '')} • ${escapeHtml(ip)}</div>
                            <div class="text-xs text-gray-400">MAC: ${escapeHtml(mac)}</div>
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
            <td class="px-3 py-2 border align-top">${escapeHtml(String(r.device_mac))}</td>
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
                    <button id="addDevicesCTA" class="bg-pink-500 hover:bg-pink-600 text-white px-6 py-2 rounded-md font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed" disabled title="Add a new WLED device to this group (select a zone and group first)">
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
            <div class="bg-[#242424] rounded-lg p-6 device-card border border-gray-500 border-dashed col-span-1 md:col-span-1">
                <div class="flex flex-col items-center justify-center h-full min-h-[200px] text-center">
                    <h3 class="text-xl font-medium mb-2">No Device</h3>
                    <p class="text-gray-400 mb-6">There are currently no devices</p>
                    <button id="addDevicesCTA" class="bg-pink-500 hover:bg-pink-600 text-white px-6 py-2 rounded-md font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed" title="Add a new WLED device to this group">
                        <i class="fas fa-plus mr-2"></i>Add Devices
                    </button>
                </div>
            </div>`;
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
        const segmentsHtml = segments.map(col => `<div class="color-part" style="flex:1;height:14px;background-color:${escapeHtml(col || '#111')};"></div>`).join('');

        const card = document.createElement('div');
        card.className = 'bg-[#242424] rounded-lg p-6 device-card border border-gray-500 cursor-pointer hover:border-gray-400 transition-colors';
        card.dataset.deviceId = dev.device_id;
        card.innerHTML = `
            <div class="flex items-center justify-between mb-4">
                <div class="flex items-center">
                    <span class="w-3 h-3 ${dev.device_current_color ? 'bg-green-500' : 'bg-gray-600'} rounded-full mr-3"></span>
                    <span class="text-lg font-medium">${escapeHtml(String(dev.device_name || dev.device_id || 'Device'))}</span>
                </div>
                <button class="text-gray-400 hover:bg-gray-400 edit-device-btn" data-device-id="${escapeHtml(String(dev.device_id))}" title="Edit or delete this device">
                    <img src="assets/images/edit.svg" class="w-6 h-6 brightness-0 saturate-100 invert-[1.0]" alt="Edit icon"/>
                </button>
            </div>

            <div class="color-strip mb-4 border border-gray-600 rounded overflow-hidden">
                <div class="flex">${segmentsHtml}</div>
            </div>

            <div class="space-y-2 text-sm">
                <div><span class="text-gray-400">ID:</span> ${escapeHtml(String(dev.device_id))}</div>
                <div><span class="text-gray-400">IP:</span> ${escapeHtml(String(dev.device_ip))}</div>
                <div><span class="text-gray-400">MAC:</span> ${escapeHtml(String(dev.device_mac))}</div>
                <div><span class="text-gray-400">Hostname:</span> ${escapeHtml(String(dev.device_hostname))}</div>
            </div>

            <div class="mt-4 pt-4 border-t border-gray-700">
                <div class="mb-2">
                    <span class="text-gray-400">Location:</span> 
                    <span class="ml-1 text-white">${escapeHtml(String(dev.location_name))}</span>
                </div>
                <div class="text-gray-400 mb-4">Description: <span class="text-white ml-1">${escapeHtml(String(dev.device_description))}</span></div>
                <button class="control-panel-btn bg-[#30383d] hover:bg-[#30383d] text-white px-4 py-2 rounded-md font-medium transition-colors w-full" data-device-id="${escapeHtml(String(dev.device_id))}" data-device-name="${escapeHtml(String(dev.device_name || dev.device_id || 'Device'))}" title="Open Control Panel for this device">
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
    addDeviceCard.className = 'bg-[#242424] rounded-lg p-6 device-card border border-gray-500';
    addDeviceCard.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full min-h-[200px] text-center">
            <p class="text-gray-400 mb-6">You currently have no devices in this location.</p>
            <button id="addDevicesCTA" class="bg-[#038bbf] hover:bg-[#2696c6] text-white text-sm font-medium border border-[#c3e8f3] px-6 py-2 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed" title="Add a new WLED device to this group">
                <i class="fas fa-plus mr-2"></i>Add Devices
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

            showAlertModal('Device deleted successfully!', 'Success', { size: 'sm' });
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
        <h2 class="text-lg font-semibold mb-3">Edit Device</h2>
        <div style="max-height: 70vh; overflow-y: auto; padding-right: 8px;">
            <div class="mb-3">
                <label class="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <select id="editDevLocation" class="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    ${locationOptions}
                    <option value="__NEW__">+ Create New Location</option>
                </select>
            </div>

            <div id="newLocationFields" class="mb-3 hidden">
                <label class="block text-sm font-medium text-gray-700 mb-1">New Location Name</label>
                <input id="newLocationName" type="text" class="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter location name">
            </div>

            <div class="mb-3">
                <label class="block text-sm font-medium text-gray-700 mb-1">Device Name *</label>
                <input id="editDevName" type="text" class="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" value="${escapeHtml(device.device_name || '')}" autocomplete="off">
            </div>

            <div class="mb-3">
                <label class="block text-sm font-medium text-gray-700 mb-1">Device Description</label>
                <textarea id="editDevDesc" class="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical" rows="2" autocomplete="off">${escapeHtml(device.device_description || '')}</textarea>
            </div>

            <div class="grid grid-cols-2 gap-3 mb-3">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Hostname</label>
                    <input id="editDevHost" type="text" class="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" value="${escapeHtml(device.device_hostname || '')}" autocomplete="off">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">IP Address</label>
                    <input id="editDevIP" type="text" class="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" value="${escapeHtml(device.device_ip || '')}" autocomplete="off">
                </div>
            </div>

            <div class="mb-3">
                <label class="block text-sm font-medium text-gray-700 mb-1">MAC Address</label>
                <input id="editDevMAC" type="text" class="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" value="${escapeHtml(device.device_mac || '')}" autocomplete="off">
            </div>

            <div class="mb-3">
                <label class="block text-sm font-medium text-gray-700 mb-1">Current Color (Hex)</label>
                <div class="flex items-center space-x-2">
                    <input id="editDevColor" type="color" class="h-10 w-16 border border-gray-300 rounded cursor-pointer" value="${escapeHtml(device.device_current_color || '#ffffff')}">
                    <input id="editDevColorText" type="text" class="flex-1 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" value="${escapeHtml(device.device_current_color || '#ffffff')}" autocomplete="off">
                </div>
            </div>

            <div class="mb-3">
                <label class="block text-sm font-medium text-gray-700 mb-1">Number of LED Segments</label>
                <input id="numSegments" type="number" min="0" max="20" class="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" value="${segmentColors.length}" placeholder="0">
                <p class="text-xs text-gray-500 mt-1">Set to 0 for no segments, or specify the number of segments (max 20)</p>
            </div>

            <div id="segmentColorsContainer" class="mb-3">
                <!-- Segment color inputs will be generated here -->
            </div>
        </div>

        <div class="flex justify-end items-center mt-4 pt-3 border-t space-x-2">
                <button id="editDevCancel" class="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium">Cancel</button>
                <button id="editDevDelete" class="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white font-medium">Delete</button>                
                <button id="editDevSave" class="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium">Save</button>
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
        header.className = 'block text-sm font-medium text-gray-700 mb-2';
        header.textContent = `Segment Colors (${count} segment${count > 1 ? 's' : ''})`;
        segmentColorsContainer.appendChild(header);

        for (let i = 0; i < count; i++) {
            const existingColor = existingColors[i] || '#ffffff';
            const segmentDiv = document.createElement('div');
            segmentDiv.className = 'flex items-center space-x-2 mb-2';
            segmentDiv.innerHTML = `
                <span class="text-sm text-gray-600 w-20">Segment ${i + 1}:</span>
                <input type="color" class="segment-color-picker h-10 w-16 border border-gray-300 rounded cursor-pointer" value="${escapeHtml(existingColor)}" data-index="${i}">
                <input type="text" class="segment-color-text flex-1 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" value="${escapeHtml(existingColor)}" data-index="${i}" autocomplete="off">
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
        if (count > 20) count = 20;
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

            // Close modal
            m.overlay.remove();
            document.removeEventListener('keydown', handleKeyDown);

            // Refresh devices display
            if (typeof renderDevicesGrid === 'function') {
                renderDevicesGrid(zoneId, groupId);
            }

            showAlertModal('Device updated successfully!', 'Success', { size: 'sm' });
            
        } catch (err) {
            console.error('Failed to update device', err);
            showAlertModal('Failed to update device. See console for details.', 'Error', { size: 'sm' });
            
            saveBtn.disabled = false;
            saveBtn.textContent = originalText;
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
        <h2 class="text-lg font-semibold mb-3">Add Device</h2>
        <div style="max-height: 70vh; overflow-y: auto; padding-right: 8px;">
            <div class="mb-3">
                <label class="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <select id="addDevLocation" class="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">-- Select or create location --</option>
                    ${buildOptions(locations, 'location_id', 'location_name')}
                    <option value="__NEW__">+ Create New Location</option>
                </select>
            </div>

            <div id="newLocationFields" class="mb-3 hidden">
                <label class="block text-sm font-medium text-gray-700 mb-1">New Location Name</label>
                <input id="newLocationName" type="text" class="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter location name">
            </div>

            <div class="mb-3">
                <label class="block text-sm font-medium text-gray-700 mb-1">Device Name *</label>
                <input id="addDevName" type="text" class="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g., Living Room Strip" autocomplete="off">
            </div>

            <div class="mb-3">
                <label class="block text-sm font-medium text-gray-700 mb-1">Device Description</label>
                <textarea id="addDevDesc" class="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical" rows="2" placeholder="Optional description" autocomplete="off"></textarea>
            </div>

            <div class="grid grid-cols-2 gap-3 mb-3">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Hostname</label>
                    <input id="addDevHost" type="text" class="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g., wled-device" autocomplete="off">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">IP Address</label>
                    <input id="addDevIP" type="text" class="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="192.168.1.100" autocomplete="off">
                </div>
            </div>

            <div class="mb-3">
                <label class="block text-sm font-medium text-gray-700 mb-1">MAC Address</label>
                <input id="addDevMAC" type="text" class="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="AA:BB:CC:DD:EE:FF" autocomplete="off">
            </div>

            <div class="mb-3">
                <label class="block text-sm font-medium text-gray-700 mb-1">Current Color (Hex)</label>
                <div class="flex items-center space-x-2">
                    <input id="addDevColor" type="color" class="h-10 w-16 border border-gray-300 rounded cursor-pointer" value="#ffffff">
                    <input id="addDevColorText" type="text" class="flex-1 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="#ffffff" value="#ffffff" autocomplete="off">
                </div>
            </div>

            <div class="mb-3">
                <label class="block text-sm font-medium text-gray-700 mb-1">Number of LED Segments</label>
                <input id="numSegments" type="number" min="0" max="20" class="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" value="0" placeholder="0">
                <p class="text-xs text-gray-500 mt-1">Set to 0 for no segments, or specify the number of segments (max 20)</p>
            </div>

            <div id="segmentColorsContainer" class="mb-3">
                <!-- Segment color inputs will be generated here -->
            </div>
        </div>

        <div class="flex justify-end space-x-2 mt-4 pt-3 border-t">
            <button id="addDevCancel" class="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium">Cancel</button>
            <button id="addDevSave" class="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium">Add Device</button>
        </div>
    `;

    const m = createModal(html);

    const locationSelect = m.dlg.querySelector('#addDevLocation');
    const newLocationFields = m.dlg.querySelector('#newLocationFields');
    const colorPicker = m.dlg.querySelector('#addDevColor');
    const colorText = m.dlg.querySelector('#addDevColorText');
    const numSegmentsInput = m.dlg.querySelector('#numSegments');
    const segmentColorsContainer = m.dlg.querySelector('#segmentColorsContainer');

    // Auto-focus device name input
    setTimeout(() => {
        const nameInput = m.dlg.querySelector('#addDevName');
        if (nameInput) nameInput.focus();
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
    function generateSegmentInputs(count) {
        segmentColorsContainer.innerHTML = '';
        
        if (count <= 0) {
            return;
        }

        const header = document.createElement('label');
        header.className = 'block text-sm font-medium text-gray-700 mb-2';
        header.textContent = `Segment Colors (${count} segment${count > 1 ? 's' : ''})`;
        segmentColorsContainer.appendChild(header);

        for (let i = 0; i < count; i++) {
            const segmentDiv = document.createElement('div');
            segmentDiv.className = 'flex items-center space-x-2 mb-2';
            segmentDiv.innerHTML = `
                <span class="text-sm text-gray-600 w-20">Segment ${i + 1}:</span>
                <input type="color" class="segment-color-picker h-10 w-16 border border-gray-300 rounded cursor-pointer" value="#ffffff" data-index="${i}">
                <input type="text" class="segment-color-text flex-1 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="#ffffff" value="#ffffff" data-index="${i}" autocomplete="off">
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

    numSegmentsInput.addEventListener('input', () => {
        let count = parseInt(numSegmentsInput.value) || 0;
        if (count < 0) count = 0;
        if (count > 20) count = 20;
        numSegmentsInput.value = count;
        generateSegmentInputs(count);
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
    m.dlg.querySelector('#addDevCancel').addEventListener('click', () => {
        m.overlay.remove();
        document.removeEventListener('keydown', handleKeyDown);
    });

    // Save button
    m.dlg.querySelector('#addDevSave').addEventListener('click', async () => {
        const name = m.dlg.querySelector('#addDevName').value.trim();
        const desc = m.dlg.querySelector('#addDevDesc').value.trim();
        const host = m.dlg.querySelector('#addDevHost').value.trim();
        const ip = m.dlg.querySelector('#addDevIP').value.trim();
        const mac = m.dlg.querySelector('#addDevMAC').value.trim();
        const color = colorText.value.trim();
        
        let lid = locationSelect.value;

        // Validation
        if (!name) {
            showAlertModal('Device name is required.', 'Validation Error', { size: 'sm' });
            m.dlg.querySelector('#addDevName').focus();
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
        }

        if (!lid) {
            showAlertModal('Please select or create a location.', 'Validation Error', { size: 'sm' });
            return;
        }

        // Collect segment colors
        const segmentColors = [];
        const segmentTextInputs = m.dlg.querySelectorAll('.segment-color-text');
        segmentTextInputs.forEach(input => {
            const val = input.value.trim();
            if (val) segmentColors.push(val);
        });

        const saveBtn = m.dlg.querySelector('#addDevSave');
        const originalText = saveBtn.textContent;
        saveBtn.disabled = true;
        saveBtn.textContent = 'Adding...';

        try {
            // Generate device ID
            const allDevices = [];
            (group.location || []).forEach(loc => {
                (loc.device || loc.devices || []).forEach(dev => allDevices.push(dev));
            });
            const maxDevId = allDevices.reduce((max, dev) => Math.max(max, parseInt(dev.device_id) || 0), 0);
            const newDeviceId = maxDevId + 1;

            const devObj = {
                device_id: newDeviceId,
                device_name: name,
                device_description: desc,
                device_hostname: host,
                device_ip: ip,
                device_mac: mac,
                device_current_color: color,
                device_segment_colors: segmentColors
            };

            // Find location and add device
            let location = group.location.find(l => String(l.location_id) === String(lid));
            if (!location) {
                showAlertModal('Location not found.', 'Error', { size: 'sm' });
                saveBtn.disabled = false;
                saveBtn.textContent = originalText;
                return;
            }
            
            if (!location.device) location.device = [];
            location.device.push(devObj);

            // Clean up and normalize the entire hierarchy before saving
            cleanupHierarchy(window.currentHierarchy);

            // Save to API
            await apiFetch('/api/hierarchy', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(window.currentHierarchy)
            });

            // Close modal
            m.overlay.remove();
            document.removeEventListener('keydown', handleKeyDown);

            // Refresh devices display
            if (typeof renderDevicesGrid === 'function') {
                renderDevicesGrid(currentZoneId, currentGroupId);
            }

            showAlertModal('Device added successfully!', 'Success', { size: 'sm' });
            
        } catch (err) {
            console.error('Failed to add device', err);
            showAlertModal('Failed to add device. See console for details.', 'Error', { size: 'sm' });
            
            saveBtn.disabled = false;
            saveBtn.textContent = originalText;
        }
    });
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