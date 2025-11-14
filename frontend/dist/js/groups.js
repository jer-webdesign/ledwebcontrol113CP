// groups.js - Group management functionality

// Render groups for selected zone
function renderGroupsForZone(hierarchy, zoneId) {
    const container = document.getElementById('groupsContainer');
    if (!container) return;
    container.innerHTML = '';

    const zones = _getZones(hierarchy);
    const zone = zones.find(z => String(z.zone_id) === String(zoneId)) || zones[0];
    if (!zone) return;
    
    const groups = _getGroups(zone) || [];

    groups.forEach(g => {
        const id = (typeof g.group_id !== 'undefined') ? String(g.group_id) : (g.group_name || '');
        const name = g.group_name || `Group ${id}`;
        const btn = document.createElement('button');
        btn.className = 'group-tab px-4 py-2 rounded-md font-medium';
        btn.dataset.groupId = id;
        btn.dataset.zoneId = String(zone.zone_id || '');
        btn.textContent = name;
        btn.addEventListener('click', function () {
            document.querySelectorAll('.group-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderDevicesForGroup(hierarchy, btn.dataset.zoneId, btn.dataset.groupId);
        });
        container.appendChild(btn);
    });
    const first = container.querySelector('.group-tab');
    if (first) {
        first.classList.add('active');
        first.click();
    } else {
        const devicesContainer = document.getElementById('devicesContainer');
        if (devicesContainer) {
            devicesContainer.innerHTML = '<div class="text-sm text-gray-400">No groups in this zone.</div>';
        }
    }
}

// Load groups for a given zone from backend API
async function loadGroupsForZone(zoneId) {
    const hidden = document.getElementById('groupSelect');
    if (!hidden) return;

    hidden.value = '';

    if (!zoneId) {
        renderGroupButtons([]);
        return;
    }

    try {
        const res = await apiFetch(`/api/groups?zone_id=${encodeURIComponent(zoneId)}`);
        const groups = res && (res.groups || res) || [];
        window.currentGroups = groups;

        renderGroupButtons(groups);
    } catch (err) {
        console.error('loadGroupsForZone failed', err);
        renderGroupButtons([]);
    }
}

// Render group buttons for selected zone
function renderGroupButtons(groups) {
    const container = document.getElementById('groupButtonsContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!Array.isArray(groups) || groups.length === 0) {
        return;
    }
    
    // Render group buttons
    groups.forEach((g) => {
        const btn = document.createElement('button');
        btn.className = 'px-4 py-2 rounded-md bg-[#038bbf] hover:bg-[#2696c6] text-white text-sm font-medium border border-[#c3e8f3]';
        btn.dataset.groupId = String(g.group_id ?? '');
        btn.textContent = g.group_name || 'Button';
        btn.addEventListener('click', function() {
            // Remove active state from all group buttons
            container.querySelectorAll('button').forEach(b => {
                b.classList.remove('bg-[#038bbf]', 'hover:bg-[#2696c6]', 'border-[#c3e8f3]', 'active-group-btn');
                b.classList.add('bg-[#038bbf]', 'hover:bg-[#2696c6]', 'border-[#038bbf]');
            });
            btn.classList.remove('bg-[#038bbf]', 'hover:bg-[#2696c6]', 'border-[#038bbf]');
            btn.classList.add('bg-[#038bbf]', 'hover:bg-[#2696c6]', 'border-[#c3e8f3]', 'active-group-btn');
            
            // Update hidden input for compatibility
            const groupHidden = document.getElementById('groupSelect');
            if (groupHidden) {
                groupHidden.value = btn.dataset.groupId;
                groupHidden.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
        container.appendChild(btn);
    });

    // Auto-select first group button
    const firstBtn = container.querySelector('button');
    if (firstBtn) {
        firstBtn.classList.remove('bg-[#038bbf]', 'hover:bg-[#2696c6]', 'border-[#038bbf]');
        firstBtn.classList.add('bg-[#038bbf]', 'hover:bg-[#2696c6]', 'border-[#c3e8f3]', 'active-group-btn');
        firstBtn.click();
    }

    // No dynamic Edit icon. The static SVG in the HTML will be made clickable below.
}

// Make renderGroupButtons globally accessible
window.renderGroupButtons = renderGroupButtons;

// Ensure group buttons are rendered on page load for the default zone
document.addEventListener('DOMContentLoaded', function() {
    // Always fetch groups from backend for default zone on load
    async function fetchHierarchyAndRenderGroups() {
        try {
            // Fetch hierarchy from backend API
            const hierarchy = await apiFetch('/api/hierarchy');
            if (hierarchy && hierarchy.zones && hierarchy.zones.length > 0) {
                window.currentHierarchy = hierarchy;
                const defaultZone = hierarchy.zones[0];
                if (defaultZone) {
                    // Set zoneSelect value to first zone id
                    const zoneSelect = document.getElementById('zoneSelect');
                    if (zoneSelect) {
                        zoneSelect.value = defaultZone.zone_id;
                    }
                    // Try to fetch groups for default zone
                    await loadGroupsForZone(defaultZone.zone_id);
                }
            }
        } catch (err) {
            console.error('Failed to fetch hierarchy from backend', err);
        }
    }
    fetchHierarchyAndRenderGroups();
    // Make the static Edit icon/button next to 'Groups' clickable
    const groupEditBtn = document.getElementById('groupEditBtn');
    const groupEditSvg = document.getElementById('groupEditIcon');
    const editElement = groupEditBtn || groupEditSvg;
    if (editElement) {
        // if it's an <img> or button, ensure pointer cursor
        editElement.style.cursor = 'pointer';
        if (editElement.title === '') editElement.title = 'Edit Selected Group';
        editElement.addEventListener('click', function(e) {
            e.stopPropagation();
            const container = document.getElementById('groupButtonsContainer');
            const activeBtn = container && container.querySelector('button.active-group-btn');
            if (!activeBtn) {
                showAlertModal('Please select a group first.', 'Notice', { size: 'sm' });
                return;
            }
            // Find the group data from the current group list
            let groups = window.currentGroups;
            if (!groups) {
                // fallback: try to get from the default zone
                if (window.currentHierarchy && window.currentHierarchy.zones && window.currentHierarchy.zones.length > 0) {
                    const defaultZone = window.currentHierarchy.zones[0];
                    groups = defaultZone.groups;
                }
            }
            if (!groups) return;
            const groupId = activeBtn.dataset.groupId;
            const group = groups.find(g => String(g.group_id) === String(groupId));
            if (group) {
                const zoneSelect = document.getElementById('zoneSelect');
                const zoneId = zoneSelect ? zoneSelect.value : null;
                const zone = zoneId && window.currentHierarchy && window.currentHierarchy.zones 
                    ? window.currentHierarchy.zones.find(z => String(z.zone_id) === String(zoneId))
                    : null;
                if (zone) {
                    openEditGroupModal(zone, group);
                }
            }
        });
    }
});

// Update group UI state
function updateGroupUIState(hasGroups) {
    // Only update Add Devices button state (needs both zone and group)
    if (typeof updateAddDevicesButtonState === 'function') {
        updateAddDevicesButtonState();
    }
}

function wireGroupDropdown() {
    // No longer needed - using buttons instead
    // Keep function for compatibility but make it empty
}

// Add New Group Modal
function openAddGroupModal() {
    const zoneSelect = document.getElementById('zoneSelect');
    if (!zoneSelect || !zoneSelect.value) {
        showAlertModal('Select a zone first to add a group.', 'Notice', { size: 'sm' });
        return;
    }
    
    const zid = zoneSelect.value;
    const zone = (window.currentHierarchy && window.currentHierarchy.zones || []).find(z => String(z.zone_id) === String(zid));
    if (!zone) {
        showAlertModal('Selected zone not found.', 'Error', { size: 'sm' });
        return;
    }

    const html = `
        <h2 class="text-lg font-semibold mb-3">Add New Group</h2>
        <div class="mb-3">
            <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input type="text" id="groupNameInput" class="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Enter group name" autocomplete="off">
        </div>
        <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea id="groupDescInput" rows="3" class="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical" placeholder="Enter group description" autocomplete="off"></textarea>
        </div>
        <div class="flex justify-end space-x-2">
            <button type="button" id="groupCancel" class="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium">Cancel</button>
            <button type="button" id="groupSave" class="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium">Add Group</button>
        </div>
    `;
    const m = createModal(html);
    
    m.dlg.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    
    setTimeout(() => {
        const nameInput = m.dlg.querySelector('#groupNameInput');
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
    
    m.dlg.querySelector('#groupCancel').addEventListener('click', () => {
        m.overlay.remove();
        document.removeEventListener('keydown', handleKeyDown);
    });

    m.dlg.querySelector('#groupSave').addEventListener('click', async () => {
        const nameInput = m.dlg.querySelector('#groupNameInput');
        const descInput = m.dlg.querySelector('#groupDescInput');
        
        const name = nameInput.value.trim();
        const desc = descInput.value.trim();

        if (!name) {
            showAlertModal('Group name is required.', 'Validation Error', { size: 'sm' });
            nameInput.focus();
            return;
        }

        const saveBtn = m.dlg.querySelector('#groupSave');
        const originalText = saveBtn.textContent;
        saveBtn.disabled = true;
        saveBtn.textContent = 'Adding...';

        try {
            // Generate new group ID
            const existingGroups = zone.groups || [];
            const maxId = existingGroups.reduce((max, g) => Math.max(max, parseInt(g.group_id) || 0), 0);
            const newGroupId = maxId + 1;

            // Create new group object
            const newGroup = {
                group_id: newGroupId,
                group_name: name,
                group_description: desc,
                location: []
            };

            // Add to zone
            if (!zone.groups) {
                zone.groups = [];
            }
            zone.groups.push(newGroup);

            // Clean up hierarchy structure before saving
            if (typeof cleanupHierarchy === 'function') {
                cleanupHierarchy(window.currentHierarchy);
            }

            // Save to API
            await apiFetch('/api/hierarchy', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(window.currentHierarchy)
            });

            // Close modal first
            m.overlay.remove();
            document.removeEventListener('keydown', handleKeyDown);

            // Small delay to ensure modal is fully removed
            setTimeout(() => {
                // Update UI
                renderGroupsForZone(window.currentHierarchy, String(zid));
                renderGroupButtons(zone.groups || []);
                wireGroupDropdown();
                
                // Update group UI state
                updateGroupUIState((zone.groups || []).length > 0);

                // Select the newly created group
                const groupSelect = document.getElementById('groupSelect');
                
                if (groupSelect) {
                    groupSelect.value = String(newGroupId);
                    groupSelect.dispatchEvent(new Event('change', { bubbles: true }));
                }

                // Highlight the new button
                const container = document.getElementById('groupButtonsContainer');
                if (container) {
                    const newBtn = container.querySelector(`button[data-group-id="${newGroupId}"]`);
                    if (newBtn) {
                        newBtn.click();
                    }
                }

                // Clear devices grid
                if (typeof renderDevicesGrid === 'function') {
                    const container = document.getElementById('devicesContainer');
                    if (container) container.innerHTML = '';
                }

                showAlertModal('Group added successfully!', 'Success', { size: 'sm' });
            }, 50);
            
        } catch (err) {
            console.error('Failed to add group', err);
            showAlertModal('Failed to add group. See console for details.', 'Error', { size: 'sm' });
            
            saveBtn.disabled = false;
            saveBtn.textContent = originalText;
        }
    });
}

// Delete Group Confirmation Modal
function openDeleteGroupModal(zone, group) {
    const html = `
        <h2 class="text-lg font-semibold mb-3 text-red-600">Delete Group</h2>
        <div class="mb-4">
            <p class="text-sm text-gray-700 mb-2">Are you sure you want to delete this group?</p>
            <div class="bg-gray-100 p-3 rounded border border-gray-300">
                <div class="font-medium">${escapeHtml(group.group_name || '')}</div>
                ${group.group_description ? `<div class="text-sm text-gray-600 mt-1">${escapeHtml(group.group_description)}</div>` : ''}
            </div>
            <p class="text-sm text-red-600 mt-3 font-medium">Warning: This will also delete all locations and devices within this group.</p>
        </div>
        <div class="flex justify-end space-x-2">
            <button type="button" id="deleteCancel" class="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium">Cancel</button>
            <button type="button" id="deleteConfirm" class="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white font-medium">Delete Group</button>
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

        const zones = window.currentHierarchy && window.currentHierarchy.zones || [];
        const z = zones.find(z => String(z.zone_id) === String(zone.zone_id));
        
        if (!z) {
            showAlertModal('Zone not found.', 'Error', { size: 'sm' });
            m.overlay.remove();
            document.removeEventListener('keydown', handleKeyDown);
            return;
        }
        
        z.groups = (z.groups || []).filter(gr => String(gr.group_id) !== String(group.group_id));

        try {
            // Clean up hierarchy structure before saving
            if (typeof cleanupHierarchy === 'function') {
                cleanupHierarchy(window.currentHierarchy);
            }

            await apiFetch('/api/hierarchy', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(window.currentHierarchy)
            });

            renderGroupsForZone(window.currentHierarchy, String(zone.zone_id));
            renderGroupButtons(window.currentHierarchy.zones ? (z.groups || []) : []);
            wireGroupDropdown();
            
            // Update group UI state
            updateGroupUIState((z.groups || []).length > 0);

            // Clear selection and update buttons
            const hidden = document.getElementById('groupSelect');
            if (hidden) {
                hidden.value = '';
                // Trigger change event to update dependent UI (like devices grid)
                hidden.dispatchEvent(new Event('change', { bubbles: true }));
            }

            m.overlay.remove();
            document.removeEventListener('keydown', handleKeyDown);
            showAlertModal('Group deleted successfully!', 'Success', { size: 'sm' });
        } catch (err) {
            console.error('Failed to delete group', err);
            showAlertModal('Failed to delete group. See console for details.', 'Error', { size: 'sm' });
            
            deleteBtn.disabled = false;
            deleteBtn.textContent = originalText;
        }
    });
}

// Edit Group Modal (group name is shown as non-editable text)
function openEditGroupModal(zone, group) {
    const html = `
        <h2 class="text-lg font-semibold mb-4 text-white">Edit Group</h2>
        <div class="mb-3">
            <label class="block text-sm font-medium text-gray-300 mb-1">Name</label>
            <div class="w-full border border-gray-600 rounded px-3 py-2 bg-gray-900 text-white">${escapeHtml(group.group_name || '')}</div>
        </div>
        <div class="mb-4">
            <label class="block text-sm font-medium text-gray-300 mb-1">Description</label>
            <textarea id="editGroupDescInput" rows="3" class="w-full border border-gray-600 rounded px-3 py-2 bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical">${escapeHtml(group.group_description || '')}</textarea>
        </div>
        <div class="flex justify-end space-x-2">
            <button type="button" id="editGroupCancel" class="px-4 py-2 rounded bg-gray-600 hover:bg-gray-700 text-white font-medium">Cancel</button>
            <button type="button" id="editGroupDelete" class="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white font-medium">Delete</button>
            <button type="button" id="editGroupSave" class="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium">Save</button>
        </div>
    `;
    const m = createModal(html);
    
    // Override modal styling for dark theme
    m.dlg.classList.remove('bg-white', 'text-black');
    m.dlg.classList.add('bg-gray-800', 'text-white');
    
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
    
    // Cancel
    m.dlg.querySelector('#editGroupCancel').addEventListener('click', () => {
        m.overlay.remove();
        document.removeEventListener('keydown', handleKeyDown);
    });
    
    // Save
    m.dlg.querySelector('#editGroupSave').addEventListener('click', async () => {
        const descInput = m.dlg.querySelector('#editGroupDescInput');
        const desc = descInput.value.trim();
        
        const saveBtn = m.dlg.querySelector('#editGroupSave');
        const originalText = saveBtn.textContent;
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
        
        try {
            // Update group description
            group.group_description = desc;
            
            // Clean up hierarchy structure before saving
            if (typeof cleanupHierarchy === 'function') {
                cleanupHierarchy(window.currentHierarchy);
            }
            
            // Save to API
            await apiFetch('/api/hierarchy', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(window.currentHierarchy)
            });
            
            m.overlay.remove();
            document.removeEventListener('keydown', handleKeyDown);
            showAlertModal('Group updated successfully!', 'Success', { size: 'sm' });
        } catch (err) {
            console.error('Failed to update group', err);
            showAlertModal('Failed to update group. See console for details.', 'Error', { size: 'sm' });
            
            saveBtn.disabled = false;
            saveBtn.textContent = originalText;
        }
    });
    
    // Delete
    m.dlg.querySelector('#editGroupDelete').addEventListener('click', () => {
        m.overlay.remove();
        document.removeEventListener('keydown', handleKeyDown);
        openDeleteGroupModal(zone, group);
    });
}

// Initialize group-related event handlers
function initGroupHandlers() {
    const zoneHidden = document.getElementById('zoneSelect');
    if (zoneHidden) {
        zoneHidden.addEventListener('change', (e) => {
            const zid = zoneHidden.value;
            if (zid) {
                loadGroupsForZone(zid);
            } else {
                renderGroupButtons([]);
            }
        });
        // Initial load if zone is already selected
        if (zoneHidden.value) {
            loadGroupsForZone(zoneHidden.value);
        }
    }

    // Global Add New (main page) handler - opens the Add Group modal
    const addNewGroupBtn = document.getElementById('addNewGroup');
    if (addNewGroupBtn) {
        // remove existing listeners by cloning
        const clone = addNewGroupBtn.cloneNode(true);
        addNewGroupBtn.parentNode.replaceChild(clone, addNewGroupBtn);
        clone.addEventListener('click', function () {addNewGroup
            openAddGroupModal();
        });
    }

    wireGroupDropdown();

    // Add right-click context menu for group buttons
    document.addEventListener('contextmenu', function(e) {
        const btn = e.target.closest('#groupButtonsContainer button');
        if (btn && btn.dataset.groupId) {
            e.preventDefault();
            
            const zoneSelect = document.getElementById('zoneSelect');
            if (!zoneSelect || !zoneSelect.value) return;
            
            const zid = zoneSelect.value;
            const zone = (window.currentHierarchy && window.currentHierarchy.zones || []).find(z => String(z.zone_id) === String(zid));
            if (!zone) return;
            
            const group = (zone.groups || []).find(g => String(g.group_id) === String(btn.dataset.groupId));
            if (!group) return;
            
            openEditGroupModal(zone, group);
        }
    });
}