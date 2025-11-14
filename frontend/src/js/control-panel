// Control Panel State
let selectedDeviceData = null;

/**
 * Initialize Control Panel event listeners
 */
function initializeControlPanel() {
    // Since we removed the old control panel and replaced it with modal-based controls,
    // we only need to initialize elements that still exist in the main page
    
    // The main control panel functionality is now handled by the modal
    // Modal initialization happens when openControlPanelModal() is called
    
    // Ensure the static modal elements exist and initialize them if needed
    try {
        // Check if DOM is ready
        if (document.readyState === 'loading') {
            console.log('DOM not ready, skipping control panel initialization');
            return;
        }
        
        const modal = document.getElementById('controlPanelModal');
        if (modal) {
            // Initialize the static modal if it exists
            initializeControlPanelModal();
        } else {
            console.log('Control panel modal not found in DOM, will initialize when opened');
        }
    } catch (error) {
        console.error('Error initializing control panel:', error);
    }
}

/**
 * Initialize a custom dropdown (legacy function - kept for compatibility)
 */
function initializeCustomDropdown(type) {
    // This function is no longer needed since we removed the old control panel
    // Dropdowns are now handled within the modal
}

/**
 * Handle device card click for selection
 */
function handleDeviceCardClick(event) {
    const card = event.currentTarget;
    const deviceId = card.dataset.deviceId;
    
    // Remove focus from any focused elements (e.g., dropdown buttons)
    if (document.activeElement) {
        document.activeElement.blur();
    }
    
    if (!deviceId) {
        return;
    }

    // Find device data in hierarchy
    const zoneId = document.getElementById('zoneSelect').value;
    const groupId = document.getElementById('groupSelect').value;
    
    if (!zoneId || !groupId) {
        return;
    }

    if (!window.currentHierarchy || !window.currentHierarchy.zones) {
        return;
    }

    const zone = window.currentHierarchy.zones.find(z => String(z.zone_id) === String(zoneId));
    if (!zone) {
        return;
    }

    const group = zone.groups?.find(g => String(g.group_id) === String(groupId));
    if (!group) {
        return;
    }

    const location = group.location?.find(loc => 
        loc.device?.some(d => String(d.device_id) === String(deviceId))
    );
    if (!location) {
        return;
    }

    const device = location.device.find(d => String(d.device_id) === String(deviceId));
    if (!device) {
        return;
    }
    
    // Update selection
    selectDevice(device, card);
}

/**
 * Select a device and update UI
 */
function selectDevice(deviceData, cardElement) {
    // Remove selection from all cards
    document.querySelectorAll('.device-card-selected').forEach(card => {
        card.classList.remove('device-card-selected');
    });

    // Add selection to clicked card
    cardElement.classList.add('device-card-selected');

    // Store selected device data
    selectedDeviceData = deviceData;

    // Update Control Panel
    updateControlPanel(deviceData);
}

/**
 * Update Control Panel with device data (legacy function - simplified)
 */
function updateControlPanel(device) {
    // Since we removed the old control panel, this function now just stores the device data
    // The actual control panel UI is now in the modal
    selectedDeviceData = device;
}

/**
 * Clear device selection (legacy function - simplified)
 */
function clearDeviceSelection() {
    // Remove selection from all cards
    document.querySelectorAll('.device-card-selected').forEach(card => {
        card.classList.remove('device-card-selected');
    });

    selectedDeviceData = null;
}

/**
 * Handle preset selection (legacy function)
 */
function handlePresetSelect(value, label) {
    // This function is no longer used since the old control panel was removed
}

/**
 * Handle effect selection (legacy function for dropdown)
 */
function handleEffectSelectLegacy(value, label) {
    // This function is no longer used since the old control panel was removed
}

/**
 * Handle Set Color button click (legacy function - simplified)
 */
async function handleSetColor() {
    // This function is no longer used since the old control panel was removed
    // Color setting is now handled in the modal
}

/**
 * Handle Sync Group button click (legacy function - simplified)
 */
async function handleSyncGroup() {
    // This function is no longer used since the old control panel was removed
    // Group sync is now handled in the modal
}

/**
 * Get currently selected device data
 */
function getSelectedDevice() {
    return selectedDeviceData;
}

/**
 * Open Control Panel Modal for a specific device
 */
function openControlPanelModal(deviceId, deviceName) {
    // Remove any existing modal first
    const existingModal = document.getElementById('dynamicControlPanelModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Create modal dynamically
    const modalHtml = `
        <div id="dynamicControlPanelModal" style="
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.75);
            backdrop-filter: blur(4px);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px;
        ">
            <div style="
                background-color: #1f2937;
                border-radius: 16px;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                width: 100%;
                max-width: 1152px;
                max-height: 90vh;
                overflow-y: auto;
                position: relative;
                color: white;
            ">
                <!-- Close Button -->
                <button id="dynamicCloseBtn" style="
                    position: absolute;
                    top: 16px;
                    right: 16px;
                    background: none;
                    border: none;
                    color: #9ca3af;
                    cursor: pointer;
                    z-index: 10;
                    padding: 8px;
                    border-radius: 8px;
                " onmouseover="this.style.color='white'" onmouseout="this.style.color='#9ca3af'">
                    <svg style="width: 32px; height: 32px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>

                <!-- Header Tabs -->
                <div style="
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 16px;
                    border-bottom: 1px solid #374151;
                ">
                    <button style="padding: 12px; background-color: #374151; border: none; border-radius: 8px; color: #d1d5db; cursor: pointer; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='#4b5563'" onmouseout="this.style.backgroundColor='#374151'" title="Power">
                        <svg style="width: 24px; height: 24px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z"/>
                        </svg>
                    </button>
                    <button style="padding: 12px; background-color: #374151; border: none; border-radius: 8px; color: #d1d5db; cursor: pointer; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='#4b5563'" onmouseout="this.style.backgroundColor='#374151'" title="Timer">
                        <svg style="width: 24px; height: 24px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                    </button>
                    <button style="padding: 12px; background-color: #374151; border: none; border-radius: 8px; color: #d1d5db; cursor: pointer; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='#4b5563'" onmouseout="this.style.backgroundColor='#374151'" title="Sync">
                        <svg style="width: 24px; height: 24px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                        </svg>
                    </button>
                    <button style="padding: 12px; background-color: #374151; border: none; border-radius: 8px; color: #d1d5db; cursor: pointer; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='#4b5563'" onmouseout="this.style.backgroundColor='#374151'" title="Peek">
                        <svg style="width: 24px; height: 24px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                        </svg>
                    </button>
                    <button style="padding: 12px; background-color: #374151; border: none; border-radius: 8px; color: #d1d5db; cursor: pointer; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='#4b5563'" onmouseout="this.style.backgroundColor='#374151'" title="Info">
                        <svg style="width: 24px; height: 24px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                    </button>
                    <button style="padding: 12px; background-color: #374151; border: none; border-radius: 8px; color: #d1d5db; cursor: pointer; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='#4b5563'" onmouseout="this.style.backgroundColor='#374151'" title="Config">
                        <svg style="width: 24px; height: 24px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                        </svg>
                    </button>
                    <div style="margin: 0 auto;">
                        <span style="color: white; font-weight: 600; font-size: 18px;">${deviceName} - Control Panel</span>
                    </div>
                </div>

                <!-- Main Content Grid -->
                <div style="
                    display: grid;
                    grid-template-columns: 1fr 1fr 1fr;
                    gap: 24px;
                    padding: 24px;
                ">
                    
                    <!-- Left Panel - Color Picker -->
                    <div style="display: flex; flex-direction: column; gap: 16px;">
                        <div style="display: flex; justify-content: center;">
                            <div style="
                                width: 200px;
                                height: 200px;
                                border-radius: 50%;
                                background: conic-gradient(from 0deg, red 0deg, yellow 60deg, lime 120deg, cyan 180deg, blue 240deg, magenta 300deg, red 360deg);
                                position: relative;
                                cursor: pointer;
                            " id="dynamicColorWheel">
                                <div style="
                                    width: 16px;
                                    height: 16px;
                                    border: 2px solid white;
                                    border-radius: 50%;
                                    position: absolute;
                                    top: 50%;
                                    left: 85%;
                                    transform: translate(-50%, -50%);
                                    pointer-events: none;
                                " id="dynamicColorSelector"></div>
                            </div>
                        </div>
                        
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                            <input type="range" style="width: 100%;" min="0" max="100" value="50">
                            <input type="range" style="width: 100%;" min="0" max="100" value="50">
                        </div>
                        
                        <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
                            <button style="width: 32px; height: 32px; border-radius: 50%; background-color: #ef4444; border: 2px solid #374151; cursor: pointer;" data-color="#ff0000"></button>
                            <button style="width: 32px; height: 32px; border-radius: 50%; background-color: #f97316; border: 2px solid #374151; cursor: pointer;" data-color="#ff8800"></button>
                            <button style="width: 32px; height: 32px; border-radius: 50%; background-color: #eab308; border: 2px solid #374151; cursor: pointer;" data-color="#ffff00"></button>
                            <button style="width: 32px; height: 32px; border-radius: 50%; background-color: #fde047; border: 2px solid #374151; cursor: pointer;" data-color="#ffff88"></button>
                            <button style="width: 32px; height: 32px; border-radius: 50%; background-color: #ffffff; border: 2px solid #374151; cursor: pointer;" data-color="#ffffff"></button>
                            <button style="width: 32px; height: 32px; border-radius: 50%; background-color: #1f2937; border: 2px solid #374151; cursor: pointer;" data-color="#333333"></button>
                        </div>
                        
                        <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
                            <button style="width: 32px; height: 32px; border-radius: 50%; background-color: #ec4899; border: 2px solid #374151; cursor: pointer;" data-color="#ff00ff"></button>
                            <button style="width: 32px; height: 32px; border-radius: 50%; background-color: #2563eb; border: 2px solid #374151; cursor: pointer;" data-color="#0066ff"></button>
                            <button style="width: 32px; height: 32px; border-radius: 50%; background-color: #06b6d4; border: 2px solid #374151; cursor: pointer;" data-color="#00ffff"></button>
                            <button style="width: 32px; height: 32px; border-radius: 50%; background-color: #22c55e; border: 2px solid #374151; cursor: pointer;" data-color="#00ff00"></button>
                            <button style="width: 32px; height: 32px; border-radius: 50%; background-color: #60a5fa; border: 2px solid white; cursor: pointer;" data-color="#4488ff"></button>
                        </div>
                        
                        <div style="display: flex; gap: 8px; justify-content: center;">
                            <button style="padding: 12px; background-color: #374151; border: none; border-radius: 8px; color: #d1d5db; cursor: pointer; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='#4b5563'" onmouseout="this.style.backgroundColor='#374151'">
                                <svg style="width: 20px; height: 20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                                </svg>
                            </button>
                            <button style="padding: 12px; background-color: #374151; border: none; border-radius: 8px; color: #d1d5db; cursor: pointer; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='#4b5563'" onmouseout="this.style.backgroundColor='#374151'">
                                <svg style="width: 20px; height: 20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                                </svg>
                            </button>
                        </div>
                        
                        <div style="background-color: #374151; border-radius: 8px; padding: 12px;">
                            <div style="display: flex; align-items: center; gap: 8px; color: #d1d5db; font-size: 14px; margin-bottom: 8px;">
                                <svg style="width: 20px; height: 20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/>
                                </svg>
                                <span>Color palette</span>
                            </div>
                            <input type="text" placeholder="Search" style="
                                width: 100%;
                                background-color: #1f2937;
                                color: #d1d5db;
                                border-radius: 4px;
                                padding: 8px 12px;
                                border: none;
                                outline: none;
                                font-size: 14px;
                            ">
                        </div>
                        
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                            <div style="background-color: #374151; border-radius: 8px; padding: 8px;">
                                <div style="color: #9ca3af; font-size: 12px; margin-bottom: 4px;">Default</div>
                                <div style="height: 8px; border-radius: 4px; background: linear-gradient(to right, #dc2626, #7c3aed, #2563eb);"></div>
                            </div>
                            <div style="background-color: #374151; border-radius: 8px; padding: 8px;">
                                <div style="color: #9ca3af; font-size: 12px; margin-bottom: 4px;">* Color 1</div>
                                <div style="height: 8px; border-radius: 4px; background: linear-gradient(to right, #4ade80, #16a34a);"></div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Middle Panel - Effects -->
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <h3 style="color: white; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">Effect mode</h3>
                        <input type="text" placeholder="Search" style="
                            width: 100%;
                            background-color: #374151;
                            color: #d1d5db;
                            border-radius: 8px;
                            padding: 8px 16px;
                            border: none;
                            outline: none;
                        ">
                        
                        <button style="width: 100%; background-color: #374151; color: white; border-radius: 8px; padding: 12px 16px; text-align: left; border: none; cursor: pointer; transition: background-color 0.2s;" data-effect="solid" onmouseover="this.style.backgroundColor='#4b5563'" onmouseout="this.style.backgroundColor='#374151'">Solid</button>
                        
                        <button style="width: 100%; background-color: #374151; color: white; border-radius: 8px; padding: 12px 16px; text-align: left; border: none; cursor: pointer; transition: background-color 0.2s; display: flex; justify-content: space-between; align-items: center;" data-effect="android" onmouseover="this.style.backgroundColor='#4b5563'" onmouseout="this.style.backgroundColor='#374151'">
                            <span>Android</span>
                            <span style="color: #6b7280;">🎨:</span>
                        </button>
                        
                        <button style="width: 100%; background-color: #374151; color: white; border-radius: 8px; padding: 12px 16px; text-align: left; border: none; cursor: pointer; transition: background-color 0.2s; display: flex; justify-content: space-between; align-items: center;" data-effect="aurora" onmouseover="this.style.backgroundColor='#4b5563'" onmouseout="this.style.backgroundColor='#374151'">
                            <span>Aurora</span>
                            <span style="color: #6b7280;">🎨:</span>
                        </button>
                        
                        <button style="width: 100%; background-color: #4b5563; color: white; border-radius: 8px; padding: 12px 16px; text-align: left; border: none; cursor: pointer; display: flex; justify-content: space-between; align-items: center;" data-effect="blends">
                            <span>Blends</span>
                            <span style="color: #6b7280;">🎨:</span>
                        </button>
                        
                        <button style="width: 100%; background-color: #374151; color: white; border-radius: 8px; padding: 12px 16px; text-align: left; border: none; cursor: pointer; transition: background-color 0.2s; display: flex; justify-content: space-between; align-items: center;" data-effect="blink" onmouseover="this.style.backgroundColor='#4b5563'" onmouseout="this.style.backgroundColor='#374151'">
                            <span>Blink</span>
                            <span style="color: #6b7280;">🎨+:</span>
                        </button>
                        
                        <button style="width: 100%; background-color: #374151; color: white; border-radius: 8px; padding: 12px 16px; text-align: left; border: none; cursor: pointer; transition: background-color 0.2s; display: flex; justify-content: space-between; align-items: center;" data-effect="blink-rainbow" onmouseover="this.style.backgroundColor='#4b5563'" onmouseout="this.style.backgroundColor='#374151'">
                            <span>Blink Rainbow</span>
                            <span style="color: #6b7280;">🎨+:</span>
                        </button>
                        
                        <button style="width: 100%; background-color: #374151; color: white; border-radius: 8px; padding: 12px 16px; text-align: left; border: none; cursor: pointer; transition: background-color 0.2s; display: flex; justify-content: space-between; align-items: center;" data-effect="blurz" onmouseover="this.style.backgroundColor='#4b5563'" onmouseout="this.style.backgroundColor='#374151'">
                            <span>Blurz</span>
                            <span style="color: #6b7280;">🎨♪:</span>
                        </button>
                        
                        <button style="width: 100%; background-color: #374151; color: white; border-radius: 8px; padding: 12px 16px; text-align: left; border: none; cursor: pointer; transition: background-color 0.2s; display: flex; justify-content: space-between; align-items: center;" data-effect="bouncing-balls" onmouseover="this.style.backgroundColor='#4b5563'" onmouseout="this.style.backgroundColor='#374151'">
                            <span>Bouncing Balls</span>
                            <span style="color: #6b7280;">🎨:</span>
                        </button>
                        
                        <button style="width: 100%; background-color: #374151; color: white; border-radius: 8px; padding: 12px 16px; text-align: left; border: none; cursor: pointer; transition: background-color 0.2s; display: flex; justify-content: space-between; align-items: center;" data-effect="bpm" onmouseover="this.style.backgroundColor='#4b5563'" onmouseout="this.style.backgroundColor='#374151'">
                            <span>Bpm</span>
                            <span style="color: #6b7280;">🎨:</span>
                        </button>
                        
                        <button style="width: 100%; background-color: #374151; color: white; border-radius: 8px; padding: 12px 16px; text-align: left; border: none; cursor: pointer; transition: background-color 0.2s; display: flex; justify-content: space-between; align-items: center;" data-effect="breathe" onmouseover="this.style.backgroundColor='#4b5563'" onmouseout="this.style.backgroundColor='#374151'">
                            <span>Breathe</span>
                            <span style="color: #6b7280;">🎨+:</span>
                        </button>
                        
                        <button style="width: 100%; background-color: #374151; color: white; border-radius: 8px; padding: 12px 16px; text-align: left; border: none; cursor: pointer; transition: background-color 0.2s; display: flex; justify-content: space-between; align-items: center;" data-effect="candle" onmouseover="this.style.backgroundColor='#4b5563'" onmouseout="this.style.backgroundColor='#374151'">
                            <span>Candle</span>
                            <span style="color: #6b7280;">🎨+:</span>
                        </button>
                    </div>
                    
                    <!-- Right Panel - Segments -->
                    <div style="display: flex; flex-direction: column; gap: 16px;">
                        <h3 style="color: white; font-size: 18px; font-weight: 600; margin: 0;">Segments</h3>
                        
                        <div style="background-color: #374151; border-radius: 8px; padding: 12px; display: flex; align-items: center; justify-content: space-between;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <input type="checkbox" checked style="width: 20px; height: 20px;">
                                <svg style="width: 20px; height: 20px; color: #9ca3af;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                                <span style="color: white;">Segment 0</span>
                            </div>
                            <svg style="width: 20px; height: 20px; color: #9ca3af;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                            </svg>
                        </div>
                        
                        <button style="width: 100%; background-color: #374151; color: white; border-radius: 8px; padding: 12px 16px; border: none; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='#4b5563'" onmouseout="this.style.backgroundColor='#374151'">
                            <input type="checkbox" checked style="width: 20px; height: 20px;">
                            <span>+ Add segment</span>
                        </button>
                        
                        <div style="background-color: #374151; border-radius: 8px; padding: 16px;">
                            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                                <span style="color: #9ca3af; font-size: 14px;">Transition:</span>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <input type="number" value="0.7" step="0.1" style="background-color: #1f2937; color: white; border-radius: 4px; padding: 4px 8px; width: 64px; text-align: center; border: none; outline: none;">
                                    <span style="color: #9ca3af; font-size: 14px;">s</span>
                                </div>
                            </div>
                        </div>
                        
                        <div style="background-color: #374151; border-radius: 8px; padding: 16px; display: flex; flex-direction: column; gap: 12px;">
                            <h4 style="color: white; font-weight: 600; margin: 0;">Quick Actions</h4>
                            <button style="width: 100%; background-color: #2563eb; color: white; border-radius: 8px; padding: 8px 16px; border: none; cursor: pointer; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='#1d4ed8'" onmouseout="this.style.backgroundColor='#2563eb'">Apply Effect</button>
                            <button style="width: 100%; background-color: #16a34a; color: white; border-radius: 8px; padding: 8px 16px; border: none; cursor: pointer; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='#15803d'" onmouseout="this.style.backgroundColor='#16a34a'">Save Preset</button>
                            <button style="width: 100%; background-color: #7c3aed; color: white; border-radius: 8px; padding: 8px 16px; border: none; cursor: pointer; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='#6d28d9'" onmouseout="this.style.backgroundColor='#7c3aed'">Random Effect</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Insert modal into body
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.body.style.overflow = 'hidden';
    
    // Store current device data
    selectedDeviceData = { device_id: deviceId, device_name: deviceName };
    
    // Add close button event listener
    const closeBtn = document.getElementById('dynamicCloseBtn');
    const modal = document.getElementById('dynamicControlPanelModal');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.remove();
            document.body.style.overflow = 'auto';
        });
    }
    
    // Add backdrop click listener
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                document.body.style.overflow = 'auto';
            }
        });
    }
    
    // Add escape key listener
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            const currentModal = document.getElementById('dynamicControlPanelModal');
            if (currentModal) {
                currentModal.remove();
                document.body.style.overflow = 'auto';
                document.removeEventListener('keydown', handleEscape);
            }
        }
    };
    document.addEventListener('keydown', handleEscape);
}

// Make function globally accessible
window.openControlPanelModal = openControlPanelModal;

/**
 * Close Control Panel Modal
 */
function closeControlPanelModal() {
    const modal = document.getElementById('controlPanelModal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
}

// Make function globally accessible
window.closeControlPanelModal = closeControlPanelModal;

/**
 * Initialize Control Panel Modal event listeners
 */
function initializeControlPanelModal() {
    const modal = document.getElementById('controlPanelModal');
    const closeBtn = document.getElementById('closeControlPanel');
    const backdrop = document.getElementById('controlPanelBackdrop');
    
    // Only proceed if modal exists
    if (!modal) {
        console.log('Control panel modal not found in DOM');
        return;
    }
    
    // Close button
    if (closeBtn) {
        closeBtn.removeEventListener('click', closeControlPanelModal); // Remove existing
        closeBtn.addEventListener('click', closeControlPanelModal);
    }
    
    // Backdrop click
    if (backdrop) {
        backdrop.removeEventListener('click', closeControlPanelModal); // Remove existing
        backdrop.addEventListener('click', closeControlPanelModal);
    }
    
    // Escape key
    document.removeEventListener('keydown', handleModalEscape); // Remove existing
    document.addEventListener('keydown', handleModalEscape);
    
    // Color wheel interaction
    initializeColorWheel();
    
    // Color preset buttons
    initializeColorPresets();
    
    // Effect buttons
    initializeEffectButtons();
    
    // Quick action buttons
    initializeQuickActions();
}

/**
 * Handle escape key for modal
 */
function handleModalEscape(e) {
    if (e.key === 'Escape') {
        const modal = document.getElementById('controlPanelModal');
        if (modal && !modal.classList.contains('hidden')) {
            closeControlPanelModal();
        }
    }
}

/**
 * Initialize color wheel interaction
 */
function initializeColorWheel() {
    const colorWheel = document.getElementById('colorWheel');
    const colorSelector = document.getElementById('colorSelector');
    
    if (!colorWheel || !colorSelector) {
        console.log('Color wheel elements not found in DOM');
        return;
    }
    
    colorWheel.removeEventListener('click', handleColorWheelClick); // Remove existing
    colorWheel.addEventListener('click', handleColorWheelClick);
}

function handleColorWheelClick(e) {
    const colorWheel = document.getElementById('colorWheel');
    const colorSelector = document.getElementById('colorSelector');
    
    const rect = colorWheel.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const angle = Math.atan2(y - centerY, x - centerX);
    const distance = Math.min(Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)), rect.width / 2);
    
    const percentX = ((Math.cos(angle) * distance) / (rect.width / 2)) * 50 + 50;
    const percentY = ((Math.sin(angle) * distance) / (rect.height / 2)) * 50 + 50;
    
    colorSelector.style.left = percentX + '%';
    colorSelector.style.top = percentY + '%';
    
    // Convert to HSV and then to RGB
    const hue = (Math.atan2(y - centerY, x - centerX) * 180 / Math.PI + 360) % 360;
    const saturation = Math.min(distance / (rect.width / 2), 1);
    const value = 1; // Full brightness for color wheel
    
    const rgb = hsvToRgb(hue, saturation, value);
    const hexColor = rgbToHex(rgb.r, rgb.g, rgb.b);
    
    // TODO: Apply color to device
}

/**
 * Initialize color preset buttons
 */
function initializeColorPresets() {
    const presetButtons = document.querySelectorAll('.color-preset');
    presetButtons.forEach(btn => {
        btn.removeEventListener('click', handleColorPreset); // Remove existing
        btn.addEventListener('click', handleColorPreset);
    });
}

function handleColorPreset(e) {
    const color = e.target.dataset.color;
    // TODO: Apply preset color to device
}

/**
 * Initialize effect buttons
 */
function initializeEffectButtons() {
    const effectButtons = document.querySelectorAll('.effect-btn');
    effectButtons.forEach(btn => {
        btn.removeEventListener('click', handleModalEffectSelect); // Remove existing
        btn.addEventListener('click', handleModalEffectSelect);
    });
}

function handleModalEffectSelect(e) {
    // Remove active state from all buttons
    document.querySelectorAll('.effect-btn').forEach(btn => {
        btn.classList.remove('bg-gray-700');
        btn.classList.add('bg-gray-800');
    });
    
    // Add active state to clicked button
    e.target.classList.remove('bg-gray-800');
    e.target.classList.add('bg-gray-700');
    
    const effect = e.target.dataset.effect;
    // TODO: Apply effect to device
}

/**
 * Initialize quick action buttons
 */
function initializeQuickActions() {
    const applyBtn = document.getElementById('applyEffectBtn');
    const saveBtn = document.getElementById('savePresetBtn');
    const randomBtn = document.getElementById('randomEffectBtn');
    
    if (applyBtn) {
        applyBtn.removeEventListener('click', handleApplyEffect);
        applyBtn.addEventListener('click', handleApplyEffect);
    }
    
    if (saveBtn) {
        saveBtn.removeEventListener('click', handleSavePreset);
        saveBtn.addEventListener('click', handleSavePreset);
    }
    
    if (randomBtn) {
        randomBtn.removeEventListener('click', handleRandomEffect);
        randomBtn.addEventListener('click', handleRandomEffect);
    }
}

function handleApplyEffect() {
    // TODO: Apply current settings to device
}

function handleSavePreset() {
    // TODO: Save current settings as preset
}

function handleRandomEffect() {
    // TODO: Apply random effect to device
}

/**
 * Utility functions for color conversion
 */
function hsvToRgb(h, s, v) {
    let r, g, b;
    const i = Math.floor(h / 60) % 6;
    const f = h / 60 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);

    switch (i) {
        case 0: [r, g, b] = [v, t, p]; break;
        case 1: [r, g, b] = [q, v, p]; break;
        case 2: [r, g, b] = [p, v, t]; break;
        case 3: [r, g, b] = [p, q, v]; break;
        case 4: [r, g, b] = [t, p, v]; break;
        case 5: [r, g, b] = [v, p, q]; break;
    }

    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255)
    };
}

function rgbToHex(r, g, b) {
    return "#" + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    }).join("");
}
