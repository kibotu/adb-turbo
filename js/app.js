/**
 * adb-turbo - Frontend Application
 * Professional web-based ADB command manager
 */

// ============================================
// Global State
// ============================================
const state = {
    selectedDevice: null,
    deviceInfo: null,
    categories: [],
    adbAvailable: false,
    collapsedSections: new Set(),
    refreshInterval: null,
    autoRefreshEnabled: true
};

// ============================================
// API Base URL
// ============================================
const API_BASE = window.location.origin;

// ============================================
// Utility Functions
// ============================================

/**
 * Make API request with error handling
 * Handles standardized API response format
 */
async function apiRequest(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        const result = await response.json();
        
        if (!response.ok || !result.success) {
            throw new Error(result.error || 'Request failed');
        }
        
        // Return the data portion of standardized response
        return result.data || result;
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

/**
 * Log message to console
 */
function logToConsole(message, type = 'info') {
    const console = document.getElementById('console');
    const timestamp = new Date().toLocaleTimeString();
    
    const line = document.createElement('div');
    line.className = `console__line console__line--${type}`;
    
    const prompt = document.createElement('span');
    prompt.className = 'console__prompt';
    prompt.textContent = type === 'error' ? '✗' : type === 'success' ? '✓' : '$';
    
    const text = document.createElement('span');
    text.className = 'console__text';
    text.textContent = message;
    
    const time = document.createElement('span');
    time.className = 'console__timestamp';
    time.textContent = timestamp;
    
    line.appendChild(prompt);
    line.appendChild(text);
    line.appendChild(time);
    
    console.appendChild(line);
    console.scrollTop = console.scrollHeight;
}

/**
 * Clear console output
 */
function clearConsole() {
    const console = document.getElementById('console');
    console.innerHTML = '<div class="console__line console__line--info"><span class="console__prompt">$</span><span class="console__text">Console cleared.</span></div>';
}

/**
 * Toggle section collapse
 */
function toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (!section) return;
    
    const content = section.querySelector('.card__content');
    const collapseIcon = section.querySelector('.collapse-icon');
    
    if (content.classList.contains('collapsed')) {
        content.classList.remove('collapsed');
        section.classList.remove('collapsed');
        state.collapsedSections.delete(sectionId);
    } else {
        content.classList.add('collapsed');
        section.classList.add('collapsed');
        state.collapsedSections.add(sectionId);
    }
    
    // Save to localStorage
    localStorage.setItem('collapsedSections', JSON.stringify([...state.collapsedSections]));
}

/**
 * Load collapsed sections from localStorage
 */
function loadCollapsedSections() {
    const saved = localStorage.getItem('collapsedSections');
    if (saved) {
        try {
            const sections = JSON.parse(saved);
            sections.forEach(sectionId => {
                state.collapsedSections.add(sectionId);
                const section = document.getElementById(sectionId);
                if (section) {
                    const content = section.querySelector('.card__content');
                    if (content) {
                        content.classList.add('collapsed');
                        section.classList.add('collapsed');
                    }
                }
            });
        } catch (e) {
            console.error('Failed to load collapsed sections:', e);
        }
    }
}

// ============================================
// ADB Setup Functions
// ============================================

/**
 * Check if ADB is available
 */
async function checkADB() {
    const statusIcon = document.getElementById('adb-status-icon');
    const content = document.getElementById('adb-check-content');
    
    try {
        const result = await apiRequest('/api/check-adb');
        
        if (result.available) {
            statusIcon.textContent = '✅';
            statusIcon.classList.add('success');
            statusIcon.classList.remove('error');
            content.innerHTML = `
                <p style="color: var(--color-success);">✓ ADB is installed and ready!</p>
                <p style="margin-top: 0.5rem; font-size: 0.875rem;">${result.message}</p>
            `;
            state.adbAvailable = true;
            logToConsole('ADB is available and ready', 'success');
            
            // Check for devices
            await checkDevices();
        } else {
            statusIcon.textContent = '❌';
            statusIcon.classList.add('error');
            statusIcon.classList.remove('success');
            content.innerHTML = generateADBInstallInstructions();
            state.adbAvailable = false;
            logToConsole('ADB not found. Please install ADB.', 'error');
        }
    } catch (error) {
        statusIcon.textContent = '❌';
        statusIcon.classList.add('error');
        content.innerHTML = `<p style="color: var(--color-danger);">Error checking ADB: ${error.message}</p>`;
        logToConsole(`Error checking ADB: ${error.message}`, 'error');
    }
}

/**
 * Generate ADB installation instructions based on OS
 */
function generateADBInstallInstructions() {
    const platform = navigator.platform.toLowerCase();
    let os = 'unknown';
    
    if (platform.includes('mac')) {
        os = 'mac';
    } else if (platform.includes('win')) {
        os = 'windows';
    } else if (platform.includes('linux')) {
        os = 'linux';
    }
    
    const instructions = {
        mac: {
            title: 'macOS Installation',
            steps: [
                'Install using Homebrew:',
                '<code>brew install android-platform-tools</code>',
                'Or download from: <a href="https://developer.android.com/studio/releases/platform-tools" target="_blank">Android SDK Platform Tools</a>'
            ]
        },
        windows: {
            title: 'Windows Installation',
            steps: [
                'Download Android SDK Platform Tools from:',
                '<a href="https://developer.android.com/studio/releases/platform-tools" target="_blank">https://developer.android.com/studio/releases/platform-tools</a>',
                'Extract the ZIP file',
                'Add the platform-tools folder to your PATH environment variable'
            ]
        },
        linux: {
            title: 'Linux Installation',
            steps: [
                'Install using package manager:',
                '<code>sudo apt install android-tools-adb</code> (Debian/Ubuntu)',
                '<code>sudo pacman -S android-tools</code> (Arch)',
                'Or download from: <a href="https://developer.android.com/studio/releases/platform-tools" target="_blank">Android SDK Platform Tools</a>'
            ]
        }
    };
    
    const inst = instructions[os] || instructions.linux;
    
    return `
        <p style="color: var(--color-danger);">✗ ADB is not installed or not in PATH</p>
        <div class="install-instructions">
            <h4>${inst.title}</h4>
            ${inst.steps.map(step => `<p>${step}</p>`).join('')}
            <p style="margin-top: 1rem;">After installation, restart this application.</p>
        </div>
    `;
}

/**
 * Check for connected devices
 */
async function checkDevices() {
    const statusIcon = document.getElementById('device-status-icon');
    const content = document.getElementById('device-check-content');
    
    try {
        const result = await apiRequest('/api/devices');
        const devices = result.devices || [];
        
        if (devices.length > 0) {
            statusIcon.textContent = '✅';
            statusIcon.classList.add('success');
            statusIcon.classList.remove('error');
            content.innerHTML = `
                <p style="color: var(--color-success);">✓ Found ${devices.length} device(s) connected</p>
                <p style="margin-top: 0.5rem; font-size: 0.875rem;">Select a device below to begin.</p>
            `;
            logToConsole(`Found ${devices.length} connected device(s)`, 'success');
        } else {
            statusIcon.textContent = '⚠️';
            content.innerHTML = `
                <p style="color: var(--color-warning);">No devices found</p>
                <div class="install-instructions">
                    <h4>Connect Your Device</h4>
                    <p>1. Enable <strong>Developer Options</strong> on your Android device</p>
                    <p>2. Enable <strong>USB Debugging</strong> in Developer Options</p>
                    <p>3. Connect your device via USB cable</p>
                    <p>4. Allow USB debugging when prompted on your device</p>
                    <p>5. Click the <strong>Refresh</strong> button below</p>
                </div>
            `;
            logToConsole('No devices connected. Please connect a device.', 'warning');
        }
        
        // Update device count stat
        document.getElementById('connected-devices').textContent = devices.length;
        
    } catch (error) {
        statusIcon.textContent = '❌';
        statusIcon.classList.add('error');
        content.innerHTML = `<p style="color: var(--color-danger);">Error checking devices: ${error.message}</p>`;
        logToConsole(`Error checking devices: ${error.message}`, 'error');
    }
}

// ============================================
// Device Management
// ============================================

/**
 * Refresh device list
 */
async function refreshDevices() {
    logToConsole('Refreshing device list...', 'info');
    
    try {
        const result = await apiRequest('/api/devices');
        const devices = result.devices || [];
        
        const select = document.getElementById('device-select');
        select.innerHTML = '<option value="">Select a device...</option>';
        
        devices.forEach(device => {
            const option = document.createElement('option');
            option.value = device.id;
            option.textContent = `${device.model} (${device.id})`;
            select.appendChild(option);
        });
        
        select.disabled = devices.length === 0;
        
        // Update stats
        document.getElementById('connected-devices').textContent = devices.length;
        
        logToConsole(`Found ${devices.length} device(s)`, 'success');
        
        // Re-check device connection status
        await checkDevices();
        
        // Restore previous selection if available
        const lastDevice = localStorage.getItem('lastSelectedDevice');
        if (lastDevice && devices.some(d => d.id === lastDevice)) {
            select.value = lastDevice;
            await onDeviceSelected();
        }
        
    } catch (error) {
        logToConsole(`Error refreshing devices: ${error.message}`, 'error');
    }
}

/**
 * Handle device selection
 */
async function onDeviceSelected() {
    const select = document.getElementById('device-select');
    const deviceId = select.value;
    
    if (!deviceId) {
        state.selectedDevice = null;
        state.deviceInfo = null;
        document.getElementById('device-info').style.display = 'none';
        document.getElementById('device-details-card').style.display = 'none';
        document.getElementById('profiles-card').style.display = 'none';
        stopAutoRefresh();
        return;
    }
    
    state.selectedDevice = deviceId;
    localStorage.setItem('lastSelectedDevice', deviceId);
    
    logToConsole(`Selected device: ${deviceId}`, 'info');
    
    // Load device info
    await loadDeviceInfo(deviceId);
    
    // Show profiles card
    document.getElementById('profiles-card').style.display = 'block';
    
    // Load backups list
    await loadBackupsList();
    
    // Start auto-refresh
    startAutoRefresh();
}

/**
 * Load device information
 */
async function loadDeviceInfo(deviceId, silent = false) {
    try {
        const result = await apiRequest(`/api/device-info/${deviceId}`);
        state.deviceInfo = result;
        
        // Update device info display
        document.getElementById('device-model').textContent = result.model;
        document.getElementById('device-manufacturer').textContent = result.manufacturer;
        document.getElementById('device-android').textContent = `${result.android_version} (SDK ${result.sdk_version})`;
        
        // Update location display
        const locationElement = document.getElementById('device-location');
        if (result.location && result.location.available) {
            const lat = result.location.latitude.toFixed(6);
            const lon = result.location.longitude.toFixed(6);
            locationElement.innerHTML = `<a href="https://www.google.com/maps?q=${lat},${lon}" target="_blank" rel="noopener" style="color: var(--color-primary); text-decoration: none;">${lat}, ${lon} 🗺️</a>`;
        } else {
            locationElement.textContent = 'Not available';
        }
        
        document.getElementById('device-info').style.display = 'block';
        
        // Display comprehensive device details
        if (result.details) {
            displayDeviceDetails(result.details);
            document.getElementById('device-details-card').style.display = 'block';
        }
        
        // Filter Samsung-only commands if not Samsung device
        filterCommandsByDevice(result.is_samsung);
        
        // Load command states
        await loadCommandStates(deviceId, silent);
        
    } catch (error) {
        logToConsole(`Error loading device info: ${error.message}`, 'error');
    }
}

/**
 * Load command states from device
 */
async function loadCommandStates(deviceId, silent = false) {
    try {
        if (!silent) {
            logToConsole('Reading current toggle states from device...', 'info');
        }
        
        const result = await apiRequest(`/api/command-states/${deviceId}`);
        
        // apiRequest already extracts the data, so result.states is directly available
        if (result && result.states) {
            // Update toggle switches based on actual device state
            let updatedCount = 0;
            Object.entries(result.states).forEach(([commandName, isEnabled]) => {
                // Find the toggle element for this command
                const toggles = document.querySelectorAll('.toggle-switch');
                toggles.forEach(toggle => {
                    const command = JSON.parse(toggle.dataset.command);
                    if (command.name === commandName && isEnabled !== null) {
                        // Update toggle state based on device state
                        if (isEnabled) {
                            toggle.classList.add('active');
                        } else {
                            toggle.classList.remove('active');
                        }
                        updatedCount++;
                    }
                });
            });
            
            if (!silent) {
                logToConsole(`✓ Loaded ${updatedCount} toggle states from device`, 'success');
            }
        }
    } catch (error) {
        if (!silent) {
            logToConsole(`Error loading command states: ${error.message}`, 'error');
        }
    }
}

/**
 * Start auto-refresh of device details
 */
function startAutoRefresh() {
    // Clear any existing interval
    stopAutoRefresh();
    
    if (state.autoRefreshEnabled && state.selectedDevice) {
        state.refreshInterval = setInterval(async () => {
            if (state.selectedDevice) {
                await refreshDeviceDetails();
            }
        }, 8000); // Refresh every 8 seconds
        
        logToConsole('Auto-refresh enabled (every 8 seconds)', 'info');
    }
}

/**
 * Stop auto-refresh
 */
function stopAutoRefresh() {
    if (state.refreshInterval) {
        clearInterval(state.refreshInterval);
        state.refreshInterval = null;
    }
}

/**
 * Refresh device details (silent, no console spam)
 */
async function refreshDeviceDetails() {
    if (!state.selectedDevice) return;
    
    try {
        const result = await apiRequest(`/api/device-info/${state.selectedDevice}`);
        
        // Update location if changed
        const locationElement = document.getElementById('device-location');
        if (result.location && result.location.available) {
            const lat = result.location.latitude.toFixed(6);
            const lon = result.location.longitude.toFixed(6);
            locationElement.innerHTML = `<a href="https://www.google.com/maps?q=${lat},${lon}" target="_blank" rel="noopener" style="color: var(--color-primary); text-decoration: none;">${lat}, ${lon} 🗺️</a>`;
        }
        
        // Update comprehensive device details
        if (result.details) {
            displayDeviceDetails(result.details);
        }
        
        // Refresh command states silently
        await loadCommandStates(state.selectedDevice, true);
        
    } catch (error) {
        // Silent fail - don't spam console on refresh errors
        console.debug('Auto-refresh failed:', error);
    }
}

/**
 * Toggle auto-refresh on/off
 */
function toggleAutoRefresh() {
    state.autoRefreshEnabled = !state.autoRefreshEnabled;
    
    const indicator = document.getElementById('refresh-indicator');
    const icon = document.getElementById('auto-refresh-icon');
    
    if (state.autoRefreshEnabled) {
        indicator.classList.remove('paused');
        icon.textContent = '⏸️';
        startAutoRefresh();
        logToConsole('Auto-refresh enabled', 'info');
    } else {
        indicator.classList.add('paused');
        icon.textContent = '▶️';
        stopAutoRefresh();
        logToConsole('Auto-refresh paused', 'info');
    }
    
    // Save preference
    localStorage.setItem('autoRefreshEnabled', state.autoRefreshEnabled);
}

/**
 * Display comprehensive device details
 */
function displayDeviceDetails(details) {
    const grid = document.getElementById('device-details-grid');
    grid.innerHTML = '';
    
    const sections = [
        {
            title: '🔋 Battery',
            icon: '🔋',
            data: details.battery,
            items: [
                { key: 'level', label: 'Level', suffix: '%' },
                { key: 'temperature', label: 'Temperature' },
                { key: 'health', label: 'Health' },
                { key: 'status', label: 'Status' }
            ]
        },
        {
            title: '📡 Network',
            icon: '📡',
            data: details.network,
            items: [
                { key: 'ip_address', label: 'IP Address' }
            ]
        },
        {
            title: '🖥️ Display',
            icon: '🖥️',
            data: details.display,
            items: [
                { key: 'resolution', label: 'Resolution' },
                { key: 'density', label: 'Density' }
            ]
        },
        {
            title: '💾 Memory',
            icon: '💾',
            data: details.memory,
            items: [
                { key: 'total', label: 'Total' },
                { key: 'available', label: 'Available' }
            ]
        },
        {
            title: '⚙️ CPU',
            icon: '⚙️',
            data: details.cpu,
            items: [
                { key: 'cores', label: 'Cores' },
                { key: 'hardware', label: 'Hardware' }
            ]
        },
        {
            title: '💿 Storage',
            icon: '💿',
            data: details.storage,
            items: [
                { key: 'total', label: 'Total' },
                { key: 'used', label: 'Used' },
                { key: 'available', label: 'Available' }
            ]
        }
    ];
    
    sections.forEach(section => {
        if (section.data && Object.keys(section.data).length > 0) {
            const sectionEl = createDetailSection(section);
            grid.appendChild(sectionEl);
        }
    });
    
    // Add uptime and current app if available
    if (details.uptime) {
        const uptimeSection = document.createElement('div');
        uptimeSection.className = 'detail-section';
        uptimeSection.innerHTML = `
            <h3 class="detail-section__title">⏱️ Uptime</h3>
            <div class="detail-section__content">
                <div class="detail-item">
                    <span class="detail-item__value">${details.uptime}</span>
                </div>
            </div>
        `;
        grid.appendChild(uptimeSection);
    }
    
    if (details.current_app) {
        const appSection = document.createElement('div');
        appSection.className = 'detail-section';
        appSection.innerHTML = `
            <h3 class="detail-section__title">📱 Current App</h3>
            <div class="detail-section__content">
                <div class="detail-item">
                    <span class="detail-item__value">${details.current_app}</span>
                </div>
            </div>
        `;
        grid.appendChild(appSection);
    }
}

/**
 * Create detail section element
 */
function createDetailSection(section) {
    const sectionEl = document.createElement('div');
    sectionEl.className = 'detail-section';
    
    const title = document.createElement('h3');
    title.className = 'detail-section__title';
    title.textContent = section.title;
    
    const content = document.createElement('div');
    content.className = 'detail-section__content';
    
    section.items.forEach(item => {
        if (section.data[item.key]) {
            const detailItem = document.createElement('div');
            detailItem.className = 'detail-item';
            
            const label = document.createElement('span');
            label.className = 'detail-item__label';
            label.textContent = item.label;
            
            const value = document.createElement('span');
            value.className = 'detail-item__value';
            value.textContent = section.data[item.key] + (item.suffix || '');
            
            detailItem.appendChild(label);
            detailItem.appendChild(value);
            content.appendChild(detailItem);
        }
    });
    
    sectionEl.appendChild(title);
    sectionEl.appendChild(content);
    
    return sectionEl;
}

/**
 * Filter commands based on device compatibility
 */
function filterCommandsByDevice(isSamsung) {
    // Enable all toggles first
    const allToggles = document.querySelectorAll('.toggle-switch');
    allToggles.forEach(toggle => {
        toggle.classList.remove('disabled');
    });
    
    // Enable all command items
    const allCommands = document.querySelectorAll('.command-item');
    allCommands.forEach(cmd => {
        cmd.style.opacity = '1';
        cmd.style.pointerEvents = 'auto';
    });
    
    // Then disable Samsung-only commands if not Samsung device
    const samsungCommands = document.querySelectorAll('.command-item.samsung-only');
    samsungCommands.forEach(cmd => {
        if (!isSamsung) {
            cmd.style.opacity = '0.5';
            cmd.style.pointerEvents = 'none';
            const toggle = cmd.querySelector('.toggle-switch');
            if (toggle) {
                toggle.classList.add('disabled');
            }
        } else {
            cmd.style.opacity = '1';
            cmd.style.pointerEvents = 'auto';
            const toggle = cmd.querySelector('.toggle-switch');
            if (toggle) {
                toggle.classList.remove('disabled');
            }
        }
    });
}

// ============================================
// Command Categories
// ============================================

/**
 * Load command categories
 */
async function loadCategories() {
    try {
        const result = await apiRequest('/api/categories');
        state.categories = result.categories || [];
        
        renderCategories();
        
        // Update stats
        const totalCommands = state.categories.reduce((sum, cat) => sum + cat.commands.length, 0);
        const highImpactCategories = state.categories.filter(cat => cat.impact === 'high').length;
        
        document.getElementById('total-commands').textContent = totalCommands;
        document.getElementById('high-impact').textContent = highImpactCategories;
        
        logToConsole(`Loaded ${state.categories.length} command categories`, 'success');
        
    } catch (error) {
        logToConsole(`Error loading categories: ${error.message}`, 'error');
    }
}

/**
 * Render command categories
 */
function renderCategories() {
    const container = document.getElementById('categories-container');
    container.innerHTML = '';
    
    state.categories.forEach((category, index) => {
        const categoryCard = createCategoryCard(category, index);
        container.appendChild(categoryCard);
    });
}

/**
 * Create category card element
 */
function createCategoryCard(category, index) {
    const card = document.createElement('section');
    card.className = 'card category';
    card.id = `category-${category.id}`;
    card.style.animationDelay = `${index * 0.1}s`;
    
    const header = document.createElement('div');
    header.className = 'card__header';
    header.onclick = () => toggleSection(`category-${category.id}`);
    
    const title = document.createElement('h2');
    title.className = 'card__title';
    title.innerHTML = `
        <span class="icon">${getCategoryIcon(category.id)}</span>
        ${category.name}
        <span class="impact-badge impact-badge--${category.impact}">${category.impact} impact</span>
    `;
    
    const collapseBtn = document.createElement('button');
    collapseBtn.className = 'collapse-btn';
    collapseBtn.setAttribute('aria-label', 'Toggle category');
    collapseBtn.innerHTML = '<span class="collapse-icon">▼</span>';
    
    header.appendChild(title);
    header.appendChild(collapseBtn);
    
    const content = document.createElement('div');
    content.className = 'card__content';
    
    const description = document.createElement('p');
    description.className = 'category__description';
    description.textContent = category.description;
    
    const commandsGrid = document.createElement('div');
    commandsGrid.className = 'commands-grid';
    
    category.commands.forEach(command => {
        const commandItem = createCommandItem(command, category.id);
        commandsGrid.appendChild(commandItem);
    });
    
    content.appendChild(description);
    content.appendChild(commandsGrid);
    
    card.appendChild(header);
    card.appendChild(content);
    
    return card;
}

/**
 * Get icon for category
 */
function getCategoryIcon(categoryId) {
    const icons = {
        animation_settings: '⚡',
        background_processes: '🔄',
        fixed_performance: '🚀',
        ram_plus: '💾',
        refresh_rate: '🖥️',
        app_launch_speed: '⏱️',
        game_optimization_samsung: '🎮',
        audio_quality: '🔊',
        touchscreen_latency: '👆',
        system_optimization: '⚙️',
        private_dns: '🔒',
        network_performance: '📡',
        power_management: '🔋'
    };
    return icons[categoryId] || '📋';
}

/**
 * Create command item element
 */
function createCommandItem(command, categoryId) {
    const item = document.createElement('div');
    item.className = `command-item ${command.samsung_only ? 'samsung-only' : ''}`;
    item.id = `command-${categoryId}-${command.name.replace(/\s+/g, '-').toLowerCase()}`;
    
    const header = document.createElement('div');
    header.className = 'command-header';
    
    const info = document.createElement('div');
    info.className = 'command-info';
    
    const name = document.createElement('h3');
    name.className = 'command-name';
    name.innerHTML = command.name;
    if (command.samsung_only) {
        name.innerHTML += ' <span class="samsung-badge">Samsung Only</span>';
    }
    
    const description = document.createElement('p');
    description.className = 'command-description';
    description.textContent = command.description;
    
    info.appendChild(name);
    info.appendChild(description);
    
    const actions = document.createElement('div');
    actions.className = 'command-actions';
    
    const expandBtn = document.createElement('button');
    expandBtn.className = 'expand-btn';
    expandBtn.textContent = 'Details';
    expandBtn.onclick = () => toggleCommandDetails(item.id);
    
    const toggle = createToggleSwitch(command, categoryId);
    
    actions.appendChild(expandBtn);
    actions.appendChild(toggle);
    
    header.appendChild(info);
    header.appendChild(actions);
    
    const explanation = document.createElement('div');
    explanation.className = 'command-explanation collapsed';
    explanation.id = `${item.id}-explanation`;
    explanation.innerHTML = `
        <p>${command.explanation}</p>
        ${command.disable_cmd ? `<div class="command-code">Disable: adb ${command.disable_cmd}</div>` : ''}
        ${command.enable_cmd ? `<div class="command-code">Enable: adb ${command.enable_cmd}</div>` : ''}
    `;
    
    item.appendChild(header);
    item.appendChild(explanation);
    
    return item;
}

/**
 * Toggle command details
 */
function toggleCommandDetails(itemId) {
    const explanation = document.getElementById(`${itemId}-explanation`);
    if (explanation) {
        explanation.classList.toggle('collapsed');
    }
}

/**
 * Create toggle switch
 */
function createToggleSwitch(command, categoryId) {
    const toggle = document.createElement('div');
    // Start disabled until device is selected
    toggle.className = state.selectedDevice ? 'toggle-switch' : 'toggle-switch disabled';
    toggle.dataset.command = JSON.stringify(command);
    toggle.dataset.categoryId = categoryId;
    toggle.onclick = () => handleToggle(toggle);
    
    const slider = document.createElement('div');
    slider.className = 'toggle-switch__slider';
    
    toggle.appendChild(slider);
    
    return toggle;
}

/**
 * Handle toggle switch click
 */
async function handleToggle(toggleElement) {
    if (!state.selectedDevice) {
        logToConsole('Please select a device first', 'warning');
        return;
    }
    
    if (toggleElement.classList.contains('disabled') || toggleElement.classList.contains('loading')) {
        return;
    }
    
    const command = JSON.parse(toggleElement.dataset.command);
    const isActive = toggleElement.classList.contains('active');
    const action = isActive ? 'disable' : 'enable';
    const cmd = isActive ? command.disable_cmd : command.enable_cmd;
    
    if (!cmd) {
        logToConsole(`No ${action} command available for ${command.name}`, 'warning');
        return;
    }
    
    // Set loading state
    toggleElement.classList.add('loading');
    
    logToConsole(`Executing: ${command.name} (${action})...`, 'info');
    
    try {
        const result = await apiRequest('/api/execute', {
            method: 'POST',
            body: JSON.stringify({
                device_id: state.selectedDevice,
                command: cmd,
                action: action
            })
        });
        
        if (result.success) {
            // Toggle state
            toggleElement.classList.toggle('active');
            
            logToConsole(`✓ ${command.name}: ${action}d successfully`, 'success');
            
            if (result.output && result.output.trim()) {
                logToConsole(`Output: ${result.output.trim()}`, 'info');
            }
        } else {
            logToConsole(`✗ ${command.name} failed: ${result.error || 'Unknown error'}`, 'error');
        }
        
    } catch (error) {
        logToConsole(`✗ Error executing ${command.name}: ${error.message}`, 'error');
    } finally {
        toggleElement.classList.remove('loading');
    }
}

// ============================================
// Profile Management
// ============================================

/**
 * Backup current device settings
 */
async function backupCurrentSettings() {
    if (!state.selectedDevice || !state.deviceInfo) {
        logToConsole('Please select a device first', 'warning');
        return;
    }
    
    logToConsole('Backing up device settings...', 'info');
    
    try {
        const result = await apiRequest('/api/profiles/backup', {
            method: 'POST',
            body: JSON.stringify({
                device_id: state.selectedDevice,
                manufacturer: state.deviceInfo.manufacturer,
                model: state.deviceInfo.model
            })
        });
        
        logToConsole(`✓ Backup created: ${result.profile.settings ? Object.keys(result.profile.settings).length : 0} settings saved`, 'success');
        
        // Refresh backups list
        await loadBackupsList();
        
    } catch (error) {
        logToConsole(`✗ Backup failed: ${error.message}`, 'error');
    }
}

/**
 * Load backups list for current device
 */
async function loadBackupsList() {
    if (!state.deviceInfo) return;
    
    try {
        const result = await apiRequest('/api/profiles/list', {
            method: 'POST',
            body: JSON.stringify({
                manufacturer: state.deviceInfo.manufacturer,
                model: state.deviceInfo.model
            })
        });
        
        const backups = result.backups || [];
        const container = document.getElementById('backups-container');
        const listSection = document.getElementById('backups-list');
        
        if (backups.length === 0) {
            listSection.style.display = 'none';
            return;
        }
        
        listSection.style.display = 'block';
        container.innerHTML = '';
        
        backups.forEach((backup, index) => {
            const item = createBackupItem(backup, index);
            container.appendChild(item);
        });
        
    } catch (error) {
        console.error('Failed to load backups:', error);
    }
}

/**
 * Create backup item element
 */
function createBackupItem(backup, index) {
    const item = document.createElement('div');
    item.className = 'backup-item';
    
    const info = document.createElement('div');
    info.className = 'backup-item__info';
    
    const label = document.createElement('div');
    label.className = 'backup-item__label';
    const date = new Date(backup.timestamp);
    label.textContent = `Backup ${index + 1} - ${date.toLocaleString()}`;
    
    const meta = document.createElement('div');
    meta.className = 'backup-item__meta';
    const settingsCount = backup.settings ? Object.keys(backup.settings).length : 0;
    meta.textContent = `${settingsCount} settings • ${backup.backup_type || 'manual'}`;
    
    info.appendChild(label);
    info.appendChild(meta);
    
    const actions = document.createElement('div');
    actions.className = 'backup-item__actions';
    
    const restoreBtn = document.createElement('button');
    restoreBtn.className = 'btn btn--small btn--primary';
    restoreBtn.innerHTML = '<span class="btn__icon">📥</span> Restore';
    restoreBtn.onclick = () => restoreBackup(index);
    
    const exportBtn = document.createElement('button');
    exportBtn.className = 'btn btn--small btn--secondary';
    exportBtn.innerHTML = '<span class="btn__icon">📤</span> Export';
    exportBtn.onclick = () => exportBackup(index);
    
    actions.appendChild(restoreBtn);
    actions.appendChild(exportBtn);
    
    item.appendChild(info);
    item.appendChild(actions);
    
    return item;
}

/**
 * Restore backup by index
 */
async function restoreBackup(backupIndex) {
    if (!state.selectedDevice || !state.deviceInfo) {
        logToConsole('Please select a device first', 'warning');
        return;
    }
    
    if (!confirm(`Restore backup ${backupIndex + 1}? This will change your device settings.`)) {
        return;
    }
    
    logToConsole(`Restoring backup ${backupIndex + 1}...`, 'info');
    
    try {
        const result = await apiRequest('/api/profiles/restore', {
            method: 'POST',
            body: JSON.stringify({
                device_id: state.selectedDevice,
                manufacturer: state.deviceInfo.manufacturer,
                model: state.deviceInfo.model,
                backup_index: backupIndex
            })
        });
        
        const results = result.results;
        logToConsole(`✓ Restore complete: ${results.success.length} success, ${results.failed.length} failed, ${results.skipped.length} skipped`, 'success');
        
        if (results.failed.length > 0) {
            logToConsole(`Failed settings: ${results.failed.map(f => f.name).join(', ')}`, 'warning');
        }
        
        // Refresh command states
        await loadCommandStates(state.selectedDevice, false);
        
    } catch (error) {
        logToConsole(`✗ Restore failed: ${error.message}`, 'error');
    }
}

/**
 * Export backup by index
 */
async function exportBackup(backupIndex) {
    if (!state.deviceInfo) {
        logToConsole('Please select a device first', 'warning');
        return;
    }
    
    try {
        const result = await apiRequest('/api/profiles/export', {
            method: 'POST',
            body: JSON.stringify({
                manufacturer: state.deviceInfo.manufacturer,
                model: state.deviceInfo.model,
                backup_index: backupIndex
            })
        });
        
        const profile = result.profile;
        
        // Create download
        const dataStr = JSON.stringify(profile, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `adb-turbo-profile-${state.deviceInfo.manufacturer}-${state.deviceInfo.model}-${Date.now()}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
        
        logToConsole('✓ Profile exported successfully', 'success');
        
    } catch (error) {
        logToConsole(`✗ Export failed: ${error.message}`, 'error');
    }
}

/**
 * Export current profile (latest backup)
 */
async function exportProfile() {
    await exportBackup(0);
}

/**
 * Show restore dialog
 */
function showRestoreDialog() {
    if (!state.deviceInfo) {
        logToConsole('Please select a device first', 'warning');
        return;
    }
    
    // Scroll to backups list
    const backupsList = document.getElementById('backups-list');
    if (backupsList.style.display === 'none') {
        logToConsole('No backups available. Create a backup first.', 'warning');
        return;
    }
    
    backupsList.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Show import dialog
 */
function showImportDialog() {
    if (!state.selectedDevice) {
        logToConsole('Please select a device first', 'warning');
        return;
    }
    
    // Create modal
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.onclick = (e) => {
        if (e.target === overlay) {
            document.body.removeChild(overlay);
        }
    };
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    
    modal.innerHTML = `
        <div class="modal__header">
            <h3 class="modal__title">Import Profile</h3>
            <button class="modal__close" onclick="this.closest('.modal-overlay').remove()">×</button>
        </div>
        <div class="modal__content">
            <p style="color: var(--color-text-secondary); margin-bottom: var(--spacing-lg);">
                Select a profile JSON file to import. The profile will be added to your backups list.
            </p>
            <div class="file-input-wrapper">
                <input type="file" id="profile-file-input" accept=".json" />
                <label for="profile-file-input" class="file-input-label">
                    <span>📁</span>
                    <span id="file-label-text">Click to select profile file</span>
                </label>
            </div>
        </div>
        <div class="modal__footer">
            <button class="btn btn--secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
            <button class="btn btn--primary" id="import-confirm-btn" disabled>Import</button>
        </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Setup file input handler
    const fileInput = document.getElementById('profile-file-input');
    const fileLabel = document.getElementById('file-label-text');
    const fileLabelWrapper = fileInput.nextElementSibling;
    const importBtn = document.getElementById('import-confirm-btn');
    
    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            fileLabel.textContent = file.name;
            fileLabelWrapper.classList.add('has-file');
            importBtn.disabled = false;
        }
    };
    
    importBtn.onclick = async () => {
        const file = fileInput.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            const profileData = JSON.parse(text);
            
            const result = await apiRequest('/api/profiles/import', {
                method: 'POST',
                body: JSON.stringify({
                    profile: profileData,
                    device_id: state.selectedDevice
                })
            });
            
            logToConsole('✓ Profile imported successfully', 'success');
            overlay.remove();
            
            // Refresh backups list
            await loadBackupsList();
            
        } catch (error) {
            logToConsole(`✗ Import failed: ${error.message}`, 'error');
        }
    };
}

/**
 * Apply preset configuration
 */
async function applyPreset(presetName) {
    if (!state.selectedDevice) {
        logToConsole('Please select a device first', 'warning');
        return;
    }
    
    const presetNames = {
        'high_performance': 'High Performance',
        'medium_performance': 'Medium Performance',
        'max_battery': 'Max Battery',
        'max_quality': 'Max Quality',
        'recommended': 'Recommended'
    };
    
    const displayName = presetNames[presetName] || presetName;
    
    if (!confirm(`Apply "${displayName}" preset? This will change multiple device settings.`)) {
        return;
    }
    
    logToConsole(`Applying "${displayName}" preset...`, 'info');
    
    try {
        const result = await apiRequest('/api/profiles/apply-preset', {
            method: 'POST',
            body: JSON.stringify({
                device_id: state.selectedDevice,
                preset_name: presetName
            })
        });
        
        const results = result.results;
        logToConsole(`✓ Preset applied: ${results.success.length} settings changed`, 'success');
        
        if (results.failed.length > 0) {
            logToConsole(`Failed: ${results.failed.map(f => f.name).join(', ')}`, 'warning');
        }
        
        // Refresh command states
        await loadCommandStates(state.selectedDevice, false);
        
        // Auto-backup after applying preset
        logToConsole('Creating automatic backup...', 'info');
        await backupCurrentSettings();
        
    } catch (error) {
        logToConsole(`✗ Failed to apply preset: ${error.message}`, 'error');
    }
}

// ============================================
// Initialization
// ============================================

/**
 * Initialize application
 */
async function init() {
    logToConsole('Initializing adb-turbo...', 'info');
    
    // Load collapsed sections from localStorage
    loadCollapsedSections();
    
    // Load auto-refresh preference
    const savedAutoRefresh = localStorage.getItem('autoRefreshEnabled');
    if (savedAutoRefresh !== null) {
        state.autoRefreshEnabled = savedAutoRefresh === 'true';
    }
    
    // Update UI to reflect auto-refresh state
    const indicator = document.getElementById('refresh-indicator');
    const icon = document.getElementById('auto-refresh-icon');
    if (indicator && icon) {
        if (!state.autoRefreshEnabled) {
            indicator.classList.add('paused');
            icon.textContent = '▶️';
        }
    }
    
    // Check ADB availability
    await checkADB();
    
    // Load categories
    await loadCategories();
    
    // Load devices
    await refreshDevices();
    
    // Setup device selector event listener
    document.getElementById('device-select').addEventListener('change', onDeviceSelected);
    
    logToConsole('Application ready!', 'success');
}

// ============================================
// Start Application
// ============================================

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

