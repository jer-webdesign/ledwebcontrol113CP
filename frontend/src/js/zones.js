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
    const editBtn = document.getElementById('editZoneBtn');
    const dropdownBtn = document.getElementById('zoneDropdownBtn');
    
    if (!list || !label || !hidden || !dropdownBtn) return;
    
    const zones = _getZones(hierarchy);
    const hasZones = zones.length > 0;

    // Show/hide edit button based on zones availability
    if (editBtn) {
        editBtn.style.display = hasZones ? '' : 'none';
    }

    if (!hasZones) {
        // No zones: button becomes "Create a new zone" button (not a dropdown)
        label.textContent = '+ Create a New Zone';
        hidden.value = '';
        list.innerHTML = '';
        
        // Hide the dropdown arrow
        const arrow = dropdownBtn.querySelector('svg');
        if (arrow) arrow.classList.add('hidden');
        
        // Update zone UI state
        updateZoneUIState(false);
        return;
    }

    // Has zones: show dropdown arrow
    const arrow = dropdownBtn.querySelector('svg');
    if (arrow) arrow.classList.remove('hidden');

    // Set default selection if nothing is selected
    if (!hidden.value && zones.length > 0) {
        hidden.value = String(zones[0].zone_id ?? '');
        label.textContent = zones[0].zone_name || '-- Select zone --';
    } else if (hidden.value) {
        // Update label to match current selection
        const sel = zones.find(z => String(z.zone_id) === String(hidden.value));
        if (sel) {
            label.textContent = sel.zone_name || label.textContent;
        }
    }

    // Now rebuild the dropdown list
    rebuildZoneDropdownList(hierarchy, hidden.value);

    // Update zone dropdown and Edit button state based on zone availability
    updateZoneUIState(hasZones);
}

// Helper function to rebuild the dropdown list
// Helper function to rebuild the dropdown list
function rebuildZoneDropdownList(hierarchy, currentZoneId) {
    const list = document.getElementById('zoneDropdownList');
    const hidden = document.getElementById('zoneSelect');
    const label = document.getElementById('zoneDropdownLabel');
    
    if (!list || !hidden || !label) return;
    
    list.innerHTML = '';
    
    const zones = _getZones(hierarchy);

    // Add existing zones to dropdown (excluding currently selected zone)
    zones.forEach((z, i) => {
        const val = (typeof z.zone_id !== 'undefined') ? String(z.zone_id) : String(i);
        
        // Skip the currently selected zone - compare as strings
        if (currentZoneId && String(val) === String(currentZoneId)) {
            return;
        }
        
        const li = document.createElement('li');
        li.setAttribute('role', 'option');
        li.tabIndex = 0;
        li.className = 'px-4 py-3 hover:bg-[#c9225e] cursor-pointer text-white transition-colors';        
        li.dataset.value = val;
        li.textContent = z.zone_name || `Zone ${val}`;
        li.addEventListener('click', async () => {
            // Update hidden value and label
            hidden.value = String(z.zone_id ?? '');
            label.textContent = z.zone_name || `Zone ${val}`;
            
            // Close dropdown first
            const btn = document.getElementById('zoneDropdownBtn');
            const listEl = document.getElementById('zoneDropdownList');
            if (btn && listEl) {
                btn.setAttribute('aria-expanded', 'false');
                listEl.classList.add('hidden');
            }
            
            // Trigger change event
            hidden.dispatchEvent(new Event('change', { bubbles: true }));

            // Load groups for the selected zone
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
        });
        list.appendChild(li);
    });

    // Always add "Create a new zone" option at the bottom
    const addLi = document.createElement('li');
    addLi.setAttribute('role', 'option');
    addLi.tabIndex = 0;
    addLi.className = 'px-4 py-3 hover:bg-gray-700 cursor-pointer text-white transition-colors flex items-center gap-3';
    addLi.innerHTML = `
        <div class="w-6 h-6 bg-[#db2a6a] rounded flex items-center justify-center flex-shrink-0">
            <i class="fas fa-plus text-white text-sm"></i>
        </div>
        <span>Create a new zone</span>
    `;
    addLi.addEventListener('click', () => {
        const btn = document.getElementById('zoneDropdownBtn');
        const listEl = document.getElementById('zoneDropdownList');
        if (btn && listEl) {
            btn.setAttribute('aria-expanded', 'false');
            listEl.classList.add('hidden');
        }
        openAddZoneModal();
    });
    list.appendChild(addLi);
}

// Update zone dropdown and Edit button enabled/disabled state
function updateZoneUIState(hasZones) {
    const dropdownBtn = document.getElementById('zoneDropdownBtn');
    const editBtn = document.getElementById('editZoneBtn');
    
    // Dropdown button is always enabled
    if (dropdownBtn) {
        dropdownBtn.disabled = false;
        
        // Update button styling based on zones
        if (hasZones) {
            // Restore dropdown styling
            dropdownBtn.classList.add('bg-[#db2a6a]', 'hover:bg-[#c9225e]');
        } else {
            // Keep button styling for create action
            dropdownBtn.classList.add('bg-[#db2a6a]', 'hover:bg-[#c9225e]');
        }
    }
    
    // Edit button visibility based on zones
    if (editBtn) {
        editBtn.style.display = hasZones ? '' : 'none';
    }

    // If there are no zones, hide group-related UI and display the warning.
    (function enforceNoZonesUI() {
        // Ensure Add Group plus icon and warning span exist in the DOM so we can reliably toggle them.
        try {
            const addNewGroupBtn = document.getElementById('addNewGroup');
            if (addNewGroupBtn) {
                // Ensure the plus icon has the id 'addGroupPlus'
                let plusIcon = document.getElementById('addGroupPlus');
                if (!plusIcon) {
                    // Try to find an <i> element with fa-plus inside the button
                    const found = addNewGroupBtn.querySelector('i.fas.fa-plus, i.fa-plus');
                    if (found) {
                        found.id = 'addGroupPlus';
                        plusIcon = found;
                    }
                }

                // Ensure the warning tip bubble exists (if the HTML didn't include it)
                let warn = document.getElementById('addGroupWarning');
                if (!warn) {
                    warn = document.createElement('div');
                    warn.id = 'addGroupWarning';
                    warn.className = 'tip-bubble hidden ml-3';
                    warn.setAttribute('role', 'status');
                    warn.setAttribute('aria-live', 'polite');
                    warn.innerHTML = `<strong>Tip:</strong><span class="tip-text">Create your first group to start organizing devices in this zone.</span>`;
                    // Insert after the button
                    if (addNewGroupBtn.parentNode) addNewGroupBtn.parentNode.insertBefore(warn, addNewGroupBtn.nextSibling);
                }
            }
        } catch (e) {
            console.debug('ensureAddGroupElements failed', e);
        }
        const groupEditIcon = document.getElementById('groupEditIcon');
        const devicesSection = document.getElementById('devicesSection');
        const addNewGroupBtn = document.getElementById('addNewGroup');

        if (!hasZones) {
            if (groupEditIcon) groupEditIcon.classList.add('hidden');
            if (devicesSection) devicesSection.classList.add('hidden');
            if (addNewGroupBtn) {
                const plusIcon = document.getElementById('addGroupPlus') || addNewGroupBtn.querySelector('i.fas.fa-plus');
                if (plusIcon) plusIcon.classList.add('hidden');
            }
            const warn = document.getElementById('addGroupWarning');
            if (warn) warn.classList.remove('hidden');
        } else {
            if (groupEditIcon) groupEditIcon.classList.remove('hidden');
            if (devicesSection) devicesSection.classList.remove('hidden');
            if (addNewGroupBtn) {
                const plusIcon = document.getElementById('addGroupPlus') || addNewGroupBtn.querySelector('i.fas.fa-plus');
                if (plusIcon) plusIcon.classList.remove('hidden');
            }
            const warn = document.getElementById('addGroupWarning');
            if (warn) warn.classList.add('hidden');
        }
        // Also set a body data attribute which the CSS rules use to hide/show
        try {
            document.body && document.body.setAttribute('data-has-zones', hasZones ? 'true' : 'false');
        } catch (e) {
            // ignore
        }
    })();
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
        // Rebuild the dropdown list with current selection before opening
        if (window.currentHierarchy) {
            rebuildZoneDropdownList(window.currentHierarchy, hidden.value);
        }
        
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
        
        // Check if there are zones
        const zones = window.currentHierarchy ? _getZones(window.currentHierarchy) : [];
        
        // If no zones exist, directly open Add Zone modal (button behavior)
        if (zones.length === 0) {
            openAddZoneModal();
            return;
        }
        
        // If zones exist, toggle dropdown (dropdown behavior)
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

// Check if backend's network_devices.json exists; if not, hide group edit and devices section
async function enforceUIWhenNoNetworkFile() {
    let exists = false;
    try {
        if (typeof window !== 'undefined' && typeof window.apiFetch === 'function') {
            // apiFetch will throw on non-OK
            await window.apiFetch('/data/network_devices.json', { timeout: 1000, retry: 0 });
            exists = true;
        } else {
            const res = await fetch('/data/network_devices.json', { method: 'GET' });
            exists = res && res.ok;
        }
    } catch (err) {
        exists = false;
    }
    // store latest status so observers can re-apply if nodes are replaced later
    window.__networkDevicesExists = !!exists;

    console.debug('enforceUIWhenNoNetworkFile: network_devices.json exists=', window.__networkDevicesExists);

    function applyNetworkUIState(existsVal) {
        const groupEditIcon = document.getElementById('groupEditIcon');
        const devicesSection = document.getElementById('devicesSection');
        const addNewGroupBtn = document.getElementById('addNewGroup');
        const plusIcon = document.getElementById('addGroupPlus') || (addNewGroupBtn ? addNewGroupBtn.querySelector('i.fas.fa-plus') : null);
        const warn = document.getElementById('addGroupWarning');

        if (!existsVal) {
            if (groupEditIcon) groupEditIcon.classList.add('hidden');
            if (devicesSection) devicesSection.classList.add('hidden');
            if (plusIcon) plusIcon.classList.add('hidden');
            if (warn) warn.classList.remove('hidden');
        } else {
            if (groupEditIcon) groupEditIcon.classList.remove('hidden');
            if (devicesSection) devicesSection.classList.remove('hidden');
            if (plusIcon) plusIcon.classList.remove('hidden');
            if (warn) warn.classList.add('hidden');
        }
    }

    // Apply right away
    applyNetworkUIState(window.__networkDevicesExists);

    // Observe DOM for node replacements (some modules clone/replace nodes)
    try {
        if (!window.__networkDevicesObserver) {
            window.__networkDevicesObserver = new MutationObserver((mutations) => {
                // When new nodes are added, re-apply our UI state
                for (const m of mutations) {
                    if (m.addedNodes && m.addedNodes.length) {
                        // small debounce: apply once per batch
                        applyNetworkUIState(window.__networkDevicesExists);
                        break;
                    }
                }
            });
            window.__networkDevicesObserver.observe(document.body, { childList: true, subtree: true });
        }
    } catch (obsErr) {
        console.debug('Failed to attach networkDevices MutationObserver', obsErr);
    }
}

// Run on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        enforceUIWhenNoNetworkFile().catch(e => console.debug('enforceUIWhenNoNetworkFile err', e));
    });
} else {
    enforceUIWhenNoNetworkFile().catch(e => console.debug('enforceUIWhenNoNetworkFile err', e));
}
// Add New Zone Modal

function openAddZoneModal() {
    const html = `
        <h4 class="text-md text-center mb-3 text-sm">
        <span class="font-bold">Zones</span><span class="font-thin"> are big areas where all your devices live</span>
        <br>
        <div class="text-center font-thin">(ex. A building)</div>
        </h4>
        <div class="py-1 mb-3">
            <span class="font-thin text-sm">You will organize them into smaller groups in the next step</span>
        </div>
        <div class="mb-6">
            <label class="block text-sm font-medium text-[#f3f4f1] mb-1">Name</label>
            <input type="text" id="zoneNameInput" class="w-full bg-[#2b3236] border border-[#6c757d] rounded-lg px-3 py-2 focus:outline-none focus:border-[#008bbf] placeholder="Enter group name" autocomplete="off" maxlength="32">
            <div id="zoneNameCharLimit" class="text-sm mt-1 hidden" style="color: #fa7a7a;">You have exceeded the maximum 32 characters.</div>
        </div>
        <div class="mb-6">
            <label class="block text-sm font-medium text-[#f3f4f1] mb-1">Description</label>
            <textarea id="zoneDescInput" rows="3" class="w-full bg-[#2b3236] border border-[#6c757d] rounded-lg px-3 py-2 focus:outline-none focus:border-[#008bbf] resize-vertical" placeholder="Enter zone description" autocomplete="off" maxlength="255"></textarea>
            <div id="zoneDescCharLimit" class="text-sm mt-1 hidden" style="color: #fa7a7a;">You have exceeded the maximum 255 characters.</div>
            <div id="zoneValidationMessage" class="text-[#ff7a7a] text-sm mt-1 hidden"></div>
        </div>
        <div class="flex justify-end space-x-4">
            <button type="button" id="zoneCancel" class="px-4 py-2 rounded-xl bg-[#008bbf] hover:bg-[#0079bf] text-white font-medium">Back</button>
            <button type="button" id="zoneSave" class="px-4 py-2 rounded-xl bg-[#ed0973] hover:bg-[#c9225e] text-white font-medium">Add Zone</button>
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
    
    // Real-time validation on name input
    const nameInput = m.dlg.querySelector('#zoneNameInput');
    const validationMessage = m.dlg.querySelector('#zoneValidationMessage');
    const charLimitMessage = m.dlg.querySelector('#zoneNameCharLimit');
    const descInput = m.dlg.querySelector('#zoneDescInput');
    const descCharLimitMessage = m.dlg.querySelector('#zoneDescCharLimit');
    
    if (nameInput && validationMessage) {
        nameInput.addEventListener('input', () => {
            const name = nameInput.value.trim();
            
            // Check character limit (32 max - show warning at exactly 32)
            if (nameInput.value.length >= 32) {
                if (charLimitMessage) {
                    charLimitMessage.classList.remove('hidden');
                }
                nameInput.classList.add('border-[#ff7a7a]');
            } else {
                if (charLimitMessage) {
                    charLimitMessage.classList.add('hidden');
                }
            }
            
            if (name) {
                // Check for duplicate zone name
                const existingZones = window.currentHierarchy?.zones || [];
                const duplicate = existingZones.find(z => 
                    z.zone_name && z.zone_name.toLowerCase() === name.toLowerCase()
                );
                
                if (duplicate) {
                    validationMessage.textContent = 'A zone with this name already exists.';
                    validationMessage.classList.remove('hidden');
                    nameInput.classList.add('border-[#ff7a7a]');
                } else {
                    validationMessage.classList.add('hidden');
                    if (nameInput.value.length < 32) {
                        nameInput.classList.remove('border-[#ff7a7a]');
                    }
                }
            } else {
                validationMessage.classList.add('hidden');
                if (nameInput.value.length < 32) {
                    nameInput.classList.remove('border-[#ff7a7a]');
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
                descInput.classList.add('border-[#ff7a7a]');
            } else {
                descCharLimitMessage.classList.add('hidden');
                descInput.classList.remove('border-[#ff7a7a]');
            }
        });
    }
    
    m.dlg.querySelector('#zoneCancel').addEventListener('click', () => {
        m.overlay.remove();
        document.removeEventListener('keydown', handleKeyDown);
    });

    m.dlg.querySelector('#zoneSave').addEventListener('click', async () => {
        const nameInput = m.dlg.querySelector('#zoneNameInput');
        const descInput = m.dlg.querySelector('#zoneDescInput');
        const validationMessage = m.dlg.querySelector('#zoneValidationMessage');
        
        const name = nameInput.value.trim();
        const desc = descInput.value.trim();

        if (!name) {
            validationMessage.textContent = 'Zone name is required.';
            validationMessage.classList.remove('hidden');
            nameInput.classList.add('border-[#ff7a7a]');
            nameInput.focus();
            return;
        }

        // Check for duplicate zone name
        const existingZones = window.currentHierarchy?.zones || [];
        const duplicate = existingZones.find(z => 
            z.zone_name && z.zone_name.toLowerCase() === name.toLowerCase()
        );
        
        if (duplicate) {
            validationMessage.textContent = 'A zone with this name already exists.';
            validationMessage.classList.remove('hidden');
            nameInput.classList.add('border-[#ff7a7a]');
            nameInput.focus();
            return;
        }

        const saveBtn = m.dlg.querySelector('#zoneSave');
        const originalText = saveBtn.textContent;
        saveBtn.disabled = true;
        saveBtn.textContent = 'Adding...';

        try {
            // Generate new zone ID
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
                                <button id="addDevicesCTA" class="bg-pink-500 hover:bg-pink-600 text-white px-6 py-2 rounded-md font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed" disabled data-tip="Add a new WLED device to this group (create a group first)">
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

                // showAlertModal('Zone added successfully!', 'Success', { size: 'sm' });

                // Auto-reload after creating a new zone so the UI and backend state are fully synchronized.
                // Small delay to allow any UI transitions to complete.
                setTimeout(() => {
                    try {
                        window.location.reload();
                    } catch (e) {
                        console.debug('Auto-reload failed', e);
                    }
                }, 300);
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
                        label.textContent = '+ Create a New Zone';
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
        <h2 class="text-lg text-center font-medium mb-3 py-6">Edit Zone</h2>
        <div class="mb-6">
            <label class="block text-sm font-medium text-[#f3f4f1] mb-1">Name</label>
            <input type="text" id="zoneNameInput" class="w-full bg-[#2b3236] border border-[#6c757d] text-[#c0c5c8] rounded-lg px-1 py-2 focus:outline-none focus:border-white" value="${escapeHtml(zone.zone_name || '')}" autocomplete="off" maxlength="32">
            <div id="zoneNameCharLimit" class="text-sm mt-1 hidden" style="color: #fa7a7a;">You have exceeded the maximum 32 characters.</div>
        </div>
        <div class="mb-4">
            <label class="block text-sm font-medium text-[#f3f4f1] mb-1">Description</label>
            <textarea id="zoneDescInput" rows="3" class="w-full bg-[#2b3236] border border-[#6c757d] text-[#c0c5c8] rounded-lg px-1 py-2 focus:outline-none focus:border-white resize-vertical" autocomplete="off" maxlength="255">${escapeHtml(zone.zone_description || '')}</textarea>
            <div id="zoneDescCharLimit" class="text-sm mt-1 hidden" style="color: #fa7a7a;">You have exceeded the maximum 255 characters.</div>
        </div>
        <div class="flex items-center justify-between mb-4 space-x-2 pb-4">
            <button type="button" id="deleteZone" class="py-2">
                <img src="assets/icons/trash.svg" class="w-7 h-7 brightness-5 saturate-100" alt="Delete Zone" />
            </button>  
            <div class="flex items-center space-x-4">
                <button type="button" id="zoneCancel" class="px-4 py-2 rounded-lg bg-[#ed0973] hover:bg-[#b70558] text-[#f3f4f1] font-medium">Cancel</button>
                <button type="button" id="zoneSave" class="px-5 py-2 rounded-lg bg-[#008bbf] hover:bg-[#006b94] text-[#f3f4f1] font-medium">Save</button>
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
    
    // Real-time validation on name input
    const nameInput = m.dlg.querySelector('#zoneNameInput');
    const charLimitMessage = m.dlg.querySelector('#zoneNameCharLimit');
    const descInput = m.dlg.querySelector('#zoneDescInput');
    const descCharLimitMessage = m.dlg.querySelector('#zoneDescCharLimit');
    
    if (nameInput && charLimitMessage) {
        nameInput.addEventListener('input', () => {
            // Check character limit (32 max - show warning at exactly 32)
            if (nameInput.value.length >= 32) {
                charLimitMessage.classList.remove('hidden');
                nameInput.classList.add('border-[#ff7a7a]');
            } else {
                charLimitMessage.classList.add('hidden');
                nameInput.classList.remove('border-[#ff7a7a]');
            }
        });
    }
    
    // Real-time validation on description input
    if (descInput && descCharLimitMessage) {
        descInput.addEventListener('input', () => {
            // Check character limit (255 max - show warning at exactly 255)
            if (descInput.value.length >= 255) {
                descCharLimitMessage.classList.remove('hidden');
                descInput.classList.add('border-[#ff7a7a]');
            } else {
                descCharLimitMessage.classList.add('hidden');
                descInput.classList.remove('border-[#ff7a7a]');
            }
        });
    }
    
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

    // Remove the global Add New button handler since it's now inside the dropdown
}
// Ensure zoneSelect changes hide/show the addGroupWarning reliably
document.addEventListener('DOMContentLoaded', () => {
    try {
        const zoneHidden = document.getElementById('zoneSelect');
        const apply = () => {
            const hasZone = !!(zoneHidden && zoneHidden.value);
            try { document.body && document.body.setAttribute('data-has-zones', hasZone ? 'true' : 'false'); } catch (e) {}
            const warn = document.getElementById('addGroupWarning');
            const plus = document.getElementById('addGroupPlus');
            if (warn) {
                if (hasZone) warn.classList.add('hidden');
                else warn.classList.remove('hidden');
            }
            if (plus) {
                if (hasZone) plus.classList.remove('hidden');
                else plus.classList.add('hidden');
            }
        };
        if (zoneHidden) {
            zoneHidden.addEventListener('change', apply);
            // apply once to set initial state
            apply();
        }
    } catch (e) {
        console.debug('zoneSelect change wiring failed', e);
    }
});