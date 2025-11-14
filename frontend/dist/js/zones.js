// zones.js - Zone management functionality

// Render zones to <select id="zoneSelect">
function renderZones(hierarchy) {
    const zones = _getZones(hierarchy);
    const zoneSelect = document.getElementById('zoneSelect');
    if (!zoneSelect) return;
    
    zoneSelect.innerHTML = '';

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '-- Select zone --';
    placeholder.disabled = true;
    zoneSelect.appendChild(placeholder);

    zones.forEach((z, i) => {
        const opt = document.createElement('option');
        opt.value = (typeof z.zone_id !== 'undefined') ? String(z.zone_id) : String(i);
        opt.textContent = z.zone_name || `Zone ${opt.value}`;
        zoneSelect.appendChild(opt);
    });

    if (zones.length > 0) {
        zoneSelect.selectedIndex = 1;
        zoneSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }
}

// Custom dropdown functions
function renderZoneDropdown(hierarchy) {
    const list = document.getElementById('zoneDropdownList');
    const label = document.getElementById('zoneDropdownLabel');
    const hidden = document.getElementById('zoneSelect');
    if (!list || !label || !hidden) return;
    
    list.innerHTML = '';

    const zones = _getZones(hierarchy);

    zones.forEach((z, i) => {
        const val = (typeof z.zone_id !== 'undefined') ? String(z.zone_id) : String(i);
        const li = document.createElement('li');
        li.setAttribute('role', 'option');
        li.tabIndex = 0;
        li.className = 'px-4 py-2 text-center hover:bg-cyan-100 cursor-pointer';
        li.dataset.value = val;
        li.textContent = z.zone_name || `Zone ${val}`;
        li.addEventListener('click', async () => {
            hidden.value = String(z.zone_id ?? '');
            label.textContent = li.textContent;
            hidden.dispatchEvent(new Event('change', { bubbles: true }));

            if (typeof loadGroupsForZone === 'function') {
                try {
                    await loadGroupsForZone(hidden.value);
                    const groups = window.currentGroups || [];
                    if (groups.length === 1) {
                        const gid = String(groups[0].group_id ?? '');
                        const groupHidden = document.getElementById('groupSelect');
                        const groupLabel = document.getElementById('groupDropdownLabel');
                        if (groupHidden) {
                            groupHidden.value = gid;
                            groupHidden.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                        if (groupLabel) {
                            groupLabel.textContent = groups[0].group_name || groupLabel.textContent;
                        }
                        if (typeof renderDevicesGrid === 'function') {
                            renderDevicesGrid(hidden.value, gid);
                        } else if (typeof renderDevicesForSelection === 'function') {
                            renderDevicesForSelection(hidden.value, gid);
                        }
                    }
                } catch (err) {
                    console.error('Failed to load groups for zone', err);
                }
            }

            const btn = document.getElementById('zoneDropdownBtn');
            const listEl = document.getElementById('zoneDropdownList');
            if (btn && listEl) {
                btn.setAttribute('aria-expanded', 'false');
                listEl.classList.add('hidden');
                btn.focus();
            }
        });
        list.appendChild(li);
    });

    if (!hidden.value) {
        if (zones.length) {
            // Auto-select first zone
            hidden.value = String(zones[0].zone_id ?? '');
            label.textContent = zones[0].zone_name || '-- Select zone --';
            // Trigger change event to load groups
            setTimeout(() => {
                hidden.dispatchEvent(new Event('change', { bubbles: true }));
            }, 0);
        } else {
            label.textContent = '-- No zones --';
        }
    } else {
        const sel = zones.find(z => String(z.zone_id) === String(hidden.value));
        if (sel) label.textContent = sel.zone_name || label.textContent;
    }

    // Update zone dropdown and Edit button state based on zone availability
    updateZoneUIState(zones.length > 0);
}

// Update zone dropdown and Edit button enabled/disabled state
function updateZoneUIState(hasZones) {
    const dropdownBtn = document.getElementById('zoneDropdownBtn');
    const editBtn = document.getElementById('editZoneBtn');
    
    if (dropdownBtn) {
        dropdownBtn.disabled = !hasZones;
    }
    if (editBtn) {
        editBtn.disabled = !hasZones;
    }
}

function wireZoneDropdown() {
    const btn = document.getElementById('zoneDropdownBtn');
    const list = document.getElementById('zoneDropdownList');
    const label = document.getElementById('zoneDropdownLabel');
    const hidden = document.getElementById('zoneSelect');
    if (!btn || !list || !label || !hidden) return;

    // Remove any existing event listeners by cloning the button
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);

    function openDropdown() {
        newBtn.setAttribute('aria-expanded', 'true');
        list.classList.remove('hidden');
        const first = list.querySelector('[role="option"]');
        if (first) first.focus();
    }
    
    function closeDropdown() {
        newBtn.setAttribute('aria-expanded', 'false');
        list.classList.add('hidden');
        newBtn.focus();
    }

    newBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const expanded = newBtn.getAttribute('aria-expanded') === 'true';
        if (expanded) closeDropdown(); 
        else openDropdown();
    });

    document.addEventListener('click', (e) => {
        if (!newBtn.contains(e.target) && !list.contains(e.target)) {
            closeDropdown();
        }
    });

    list.addEventListener('keydown', (e) => {
        const items = Array.from(list.querySelectorAll('[role="option"]'));
        if (!items.length) return;
        
        const idx = items.indexOf(document.activeElement);
        
        if (e.key === 'Escape') { 
            closeDropdown(); 
            e.preventDefault(); 
        }
        else if (e.key === 'ArrowDown') { 
            items[Math.min(items.length-1, Math.max(0, idx+1))]?.focus(); 
            e.preventDefault(); 
        }
        else if (e.key === 'ArrowUp') { 
            items[Math.max(0, idx-1)]?.focus(); 
            e.preventDefault(); 
        }
        else if (e.key === 'Enter' || e.key === ' ') { 
            document.activeElement?.click(); 
            e.preventDefault(); 
        }
    });
}

// Add New Zone Modal
function openAddZoneModal() {
    const html = `
        <h2 class="text-lg font-semibold mb-3">Add New Zone</h2>
        <div class="mb-3">
            <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input type="text" id="zoneNameInput" class="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Enter zone name" autocomplete="off">
        </div>
        <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea id="zoneDescInput" rows="3" class="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical" placeholder="Enter zone description" autocomplete="off"></textarea>
        </div>
        <div class="flex justify-end space-x-2">
            <button type="button" id="zoneCancel" class="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium">Cancel</button>
            <button type="button" id="zoneSave" class="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium">Add Zone</button>
        </div>
    `;
    const m = createModal(html);
    
    m.dlg.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    
    setTimeout(() => {
        const nameInput = m.dlg.querySelector('#zoneNameInput');
        if (nameInput) {
            nameInput.focus();
        }
    }, 100);
    
    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            m.overlay.remove();
            document.removeEventListener('keydown', handleKeyDown);
        }
    };
    document.addEventListener('keydown', handleKeyDown);
    
    m.dlg.querySelector('#zoneCancel').addEventListener('click', () => {
        m.overlay.remove();
        document.removeEventListener('keydown', handleKeyDown);
    });

    m.dlg.querySelector('#zoneSave').addEventListener('click', async () => {
        const nameInput = m.dlg.querySelector('#zoneNameInput');
        const descInput = m.dlg.querySelector('#zoneDescInput');
        
        const name = nameInput.value.trim();
        const desc = descInput.value.trim();

        if (!name) {
            showAlertModal('Zone name is required.', 'Validation Error', { size: 'sm' });
            nameInput.focus();
            return;
        }

        const saveBtn = m.dlg.querySelector('#zoneSave');
        const originalText = saveBtn.textContent;
        saveBtn.disabled = true;
        saveBtn.textContent = 'Adding...';

        try {
            // Generate new zone ID
            const existingZones = window.currentHierarchy.zones || [];
            const maxId = existingZones.reduce((max, z) => Math.max(max, parseInt(z.zone_id) || 0), 0);
            const newZoneId = maxId + 1;

            // Create new zone object
            const newZone = {
                zone_id: newZoneId,
                zone_name: name,
                zone_description: desc,
                groups: []
            };

            // Add to hierarchy
            if (!window.currentHierarchy.zones) {
                window.currentHierarchy.zones = [];
            }
            window.currentHierarchy.zones.push(newZone);

            // Save to API
            await apiFetch('/api/hierarchy', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(window.currentHierarchy)
            });

            // Close modal first to remove any interference
            m.overlay.remove();
            document.removeEventListener('keydown', handleKeyDown);

            // Small delay to ensure modal is fully removed
            setTimeout(() => {
                // Update UI - important to do this in the right order
                renderZones(window.currentHierarchy);
                renderZoneDropdown(window.currentHierarchy);
                wireZoneDropdown();
                
                // Update zone UI state
                updateZoneUIState(window.currentHierarchy.zones.length > 0);

                // Select the newly created zone
                const zoneSelect = document.getElementById('zoneSelect');
                const label = document.getElementById('zoneDropdownLabel');
                
                if (zoneSelect && label) {
                    zoneSelect.value = String(newZoneId);
                    label.textContent = name;
                    // Dispatch change event to load groups for this zone
                    zoneSelect.dispatchEvent(new Event('change', { bubbles: true }));
                }

                // The zone change event will trigger loadGroupsForZone
                // which will set "-- No groups --" and update the group UI state
                // which in turn will update the Add Devices button state
                
                // Render empty device grid (shows "No Device" with disabled "Add Devices")
                const grid = document.getElementById('devicesGrid');
                if (grid) {
                    grid.classList.add('grid');
                    grid.innerHTML = `
                        <div class="bg-gray-800 rounded-lg p-6 device-card border border-gray-700 border-dashed col-span-1 md:col-span-1">
                            <div class="flex flex-col items-center justify-center h-full min-h-[200px] text-center">
                                <h3 class="text-xl font-medium mb-2">No Device</h3>
                                <p class="text-gray-400 mb-6">There are currently no devices</p>
                                <button id="addDevicesCTA" class="bg-pink-500 hover:bg-pink-600 text-white px-6 py-2 rounded-md font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed" disabled title="Add a new WLED device to this group (create a group first)">
                                    <i class="fas fa-plus mr-2"></i>Add Devices
                                </button>
                            </div>
                        </div>`;
                    
                    // Wire the button and update its state
                    const cta = document.getElementById('addDevicesCTA');
                    if (cta) {
                        if (typeof updateAddDevicesButtonState === 'function') {
                            updateAddDevicesButtonState();
                        }
                        cta.addEventListener('click', (e) => {
                            try {
                                e.preventDefault();
                                e.stopPropagation();
                                if (typeof openAddDeviceModal === 'function') {
                                    openAddDeviceModal();
                                }
                            } catch (err) {
                                console.error('openAddDeviceModal failed', err);
                                if (typeof showAlertModal === 'function') {
                                    showAlertModal('Failed to open Add Device dialog. See console.', 'Error', { size: 'sm' });
                                }
                            }
                        });
                    }
                }

                showAlertModal('Zone added successfully!', 'Success', { size: 'sm' });
            }, 50);
            
        } catch (err) {
            console.error('Failed to add zone', err);
            showAlertModal('Failed to add zone. See console for details.', 'Error', { size: 'sm' });
            
            saveBtn.disabled = false;
            saveBtn.textContent = originalText;
        }
    });
}

// Delete Zone Confirmation Modal
function openDeleteZoneModal(zone) {
    const html = `
        <h2 class="text-lg font-semibold mb-3 text-red-600">Delete Zone</h2>
        <div class="mb-4">
            <p class="text-sm text-gray-700 mb-2">Are you sure you want to delete this zone?</p>
            <div class="bg-gray-100 p-3 rounded border border-gray-300">
                <div class="font-medium">${escapeHtml(zone.zone_name)}</div>
                ${zone.zone_description ? `<div class="text-sm text-gray-600 mt-1">${escapeHtml(zone.zone_description)}</div>` : ''}
            </div>
            <p class="text-sm text-red-600 mt-3 font-medium">Warning: This will also delete all groups and devices within this zone.</p>
        </div>
        <div class="flex justify-end space-x-2">
            <button type="button" id="deleteCancel" class="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium">Cancel</button>
            <button type="button" id="deleteConfirm" class="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white font-medium">Delete Zone</button>
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
            // Remove zone from hierarchy
            window.currentHierarchy.zones = window.currentHierarchy.zones.filter(
                z => String(z.zone_id) !== String(zone.zone_id)
            );

            // Save to API
            await apiFetch('/api/hierarchy', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(window.currentHierarchy)
            });

            // Update UI
            renderZones(window.currentHierarchy);
            renderZoneDropdown(window.currentHierarchy);
            wireZoneDropdown();
            
            // Update zone UI state
            updateZoneUIState(window.currentHierarchy.zones.length > 0);

            // Select first available zone or clear selection
            const zoneSelect = document.getElementById('zoneSelect');
            const label = document.getElementById('zoneDropdownLabel');
            
            if (window.currentHierarchy.zones && window.currentHierarchy.zones.length > 0) {
                const firstZone = window.currentHierarchy.zones[0];
                if (zoneSelect) {
                    zoneSelect.value = String(firstZone.zone_id);
                    if (label) {
                        label.textContent = firstZone.zone_name;
                    }
                    zoneSelect.dispatchEvent(new Event('change', { bubbles: true }));
                }
            } else {
                if (zoneSelect) {
                    zoneSelect.value = '';
                    if (label) {
                        label.textContent = '-- No zones --';
                    }
                    zoneSelect.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }

            m.overlay.remove();
            document.removeEventListener('keydown', handleKeyDown);
            showAlertModal('Zone deleted successfully!', 'Success', { size: 'sm' });
            
        } catch (err) {
            console.error('Failed to delete zone', err);
            showAlertModal('Failed to delete zone. See console for details.', 'Error', { size: 'sm' });
            
            deleteBtn.disabled = false;
            deleteBtn.textContent = originalText;
        }
    });
}

// Edit Zone Modal
function openEditZoneModal(zone) {
    const html = `
        <h2 class="text-lg font-semibold mb-3">Edit Zone</h2>
        <div class="mb-3">
            <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input type="text" id="zoneNameInput" class="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value="${escapeHtml(zone.zone_name || '')}" autocomplete="off">
        </div>
        <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea id="zoneDescInput" rows="3" class="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical" autocomplete="off">${escapeHtml(zone.zone_description || '')}</textarea>
        </div>
        <div class="flex justify-between">
            <div class="space-x-2"></div>
            <div class="space-x-2">
                <button type="button" id="zoneCancel" class="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium">Cancel</button>
                <button type="button" id="deleteZone" class="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white font-medium">Delete</button>
                <button type="button" id="zoneSave" class="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium">Save</button>
            </div>
        </div>
    `;
    const m = createModal(html);
    
    m.dlg.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    
    setTimeout(() => {
        const nameInput = m.dlg.querySelector('#zoneNameInput');
        if (nameInput) {
            nameInput.focus();
            nameInput.select();
        }
    }, 100);
    
    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            m.overlay.remove();
            document.removeEventListener('keydown', handleKeyDown);
        }
    };
    document.addEventListener('keydown', handleKeyDown);
    
    // Note: 'Add New' button is on the main page now and wired in initZoneHandlers

    // Delete button handler
    m.dlg.querySelector('#deleteZone').addEventListener('click', () => {
        m.overlay.remove();
        document.removeEventListener('keydown', handleKeyDown);
        openDeleteZoneModal(zone);
    });
    
    m.dlg.querySelector('#zoneCancel').addEventListener('click', () => {
        m.overlay.remove();
        document.removeEventListener('keydown', handleKeyDown);
    });

    m.dlg.querySelector('#zoneSave').addEventListener('click', async () => {
        const nameInput = m.dlg.querySelector('#zoneNameInput');
        const descInput = m.dlg.querySelector('#zoneDescInput');
        
        const name = nameInput.value.trim();
        const desc = descInput.value.trim();

        if (!name) {
            showAlertModal('Zone name is required.', 'Validation Error', { size: 'sm' });
            nameInput.focus();
            return;
        }

        const saveBtn = m.dlg.querySelector('#zoneSave');
        const originalText = saveBtn.textContent;
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        const currentZoneId = zone.zone_id;
        const currentZoneSelect = document.getElementById('zoneSelect');
        const currentSelectedZoneId = currentZoneSelect ? currentZoneSelect.value : null;

        try {
            const targetZone = window.currentHierarchy.zones.find(z => String(z.zone_id) === String(currentZoneId));
            if (targetZone) {
                targetZone.zone_name = name;
                targetZone.zone_description = desc;
            }

            await apiFetch('/api/hierarchy', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(window.currentHierarchy)
            });

            zone.zone_name = name;
            zone.zone_description = desc;

            renderZones(window.currentHierarchy);
            renderZoneDropdown(window.currentHierarchy);
            wireZoneDropdown();
            
            // Update zone UI state
            updateZoneUIState(window.currentHierarchy.zones.length > 0);

            const zoneSelect = document.getElementById('zoneSelect');
            const label = document.getElementById('zoneDropdownLabel');
            
            if (zoneSelect && currentSelectedZoneId) {
                zoneSelect.value = currentSelectedZoneId;
                
                if (String(currentSelectedZoneId) === String(currentZoneId)) {
                    const updatedZone = window.currentHierarchy.zones.find(z => String(z.zone_id) === String(currentZoneId));
                    if (label && updatedZone) {
                        label.textContent = updatedZone.zone_name;
                    }
                }
                
                if (typeof renderGroupsForZone === 'function') {
                    renderGroupsForZone(window.currentHierarchy, currentSelectedZoneId);
                }
            }

            m.overlay.remove();
            document.removeEventListener('keydown', handleKeyDown);
            showAlertModal('Zone saved successfully!', 'Success', { size: 'sm' });
            
        } catch (err) {
            console.error('Failed to save zone', err);
            showAlertModal('Failed to save zone. See console for details.', 'Error', { size: 'sm' });
            
            saveBtn.disabled = false;
            saveBtn.textContent = originalText;
        }
    });
}

// Initialize zone-related event handlers
function initZoneHandlers() {
    const editZoneBtn = document.getElementById('editZoneBtn');
    if (editZoneBtn) {
        editZoneBtn.addEventListener('click', function () {
            const zoneSelect = document.getElementById('zoneSelect');
            if (!zoneSelect || !zoneSelect.value) {
                showAlertModal('Select a zone first.');
                return;
            }
            const zid = zoneSelect.value;
            const zone = (window.currentHierarchy && window.currentHierarchy.zones || [])
                .find(z => String(z.zone_id) === String(zid));
            if (zone) {
                openEditZoneModal(zone);
            }
        });
    }

    // Global Add New (main page) handler - opens the Add Zone modal
    const addNewMainBtn = document.getElementById('addNewZone');
    if (addNewMainBtn) {
        // remove existing listeners by cloning
        const clone = addNewMainBtn.cloneNode(true);
        addNewMainBtn.parentNode.replaceChild(clone, addNewMainBtn);
        clone.addEventListener('click', function () {
            openAddZoneModal();
        });
    }
}
