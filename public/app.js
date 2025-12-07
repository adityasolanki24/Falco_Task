/**
 * FALCOSENSE Gas Monitoring Dashboard
 * Real-time visualization of MQ2 sensor data
 */

// Socket.io connection
const socket = io();

// DOM Elements
const elements = {
    connectionStatus: document.getElementById('connectionStatus'),
    timestamp: document.getElementById('timestamp'),
    modeBadge: document.getElementById('modeBadge'),
    ppmValue: document.getElementById('ppmValue'),
    rawValue: document.getElementById('rawValue'),
    voltageValue: document.getElementById('voltageValue'),
    sensorType: document.getElementById('sensorType'),
    gaugeArc: document.getElementById('gaugeArc'),
    statusIndicator: document.getElementById('statusIndicator'),
    warningThreshold: document.getElementById('warningThreshold'),
    dangerThreshold: document.getElementById('dangerThreshold'),
    currentLevel: document.getElementById('currentLevel'),
    currentProgress: document.getElementById('currentProgress'),
    alertBanner: document.getElementById('alertBanner'),
    alertsList: document.getElementById('alertsList'),
    alertCount: document.getElementById('alertCount'),
    zone1Value: document.getElementById('zone1Value'),
    zone1: document.getElementById('zone1'),
    serverInfo: document.getElementById('serverInfo')
};

// Chart instance
let gasChart = null;
let chartData = {
    labels: [],
    datasets: [{
        label: 'Gas Level (Raw)',
        data: [],
        borderColor: '#00d9ff',
        backgroundColor: 'rgba(0, 217, 255, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2
    }, {
        label: 'Warning Threshold',
        data: [],
        borderColor: '#f59e0b',
        borderWidth: 1,
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false
    }, {
        label: 'Danger Threshold',
        data: [],
        borderColor: '#ef4444',
        borderWidth: 1,
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false
    }]
};

// State
let state = {
    isConnected: false,
    mockMode: false,
    thresholds: { warning: 300, danger: 500 },
    maxChartPoints: 50,
    alertsCount: 0
};

/**
 * Initialize the application
 */
function init() {
    initChart();
    setupSocketListeners();
    setupEventListeners();
    updateTimestamp();
    setInterval(updateTimestamp, 1000);
}

/**
 * Initialize Chart.js
 */
function initChart() {
    const ctx = document.getElementById('gasChart').getContext('2d');
    
    gasChart = new Chart(ctx, {
        type: 'line',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 300
            },
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#8b949e',
                        font: {
                            family: "'Outfit', sans-serif",
                            size: 11
                        },
                        boxWidth: 12,
                        padding: 15
                    }
                },
                tooltip: {
                    backgroundColor: '#161b22',
                    titleColor: '#f0f6fc',
                    bodyColor: '#8b949e',
                    borderColor: '#21262d',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + context.parsed.y.toFixed(0);
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    grid: {
                        color: 'rgba(33, 38, 45, 0.5)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#484f58',
                        font: {
                            family: "'JetBrains Mono', monospace",
                            size: 10
                        },
                        maxTicksLimit: 8
                    }
                },
                y: {
                    display: true,
                    min: 0,
                    max: 1023,
                    grid: {
                        color: 'rgba(33, 38, 45, 0.5)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#484f58',
                        font: {
                            family: "'JetBrains Mono', monospace",
                            size: 10
                        },
                        stepSize: 200
                    }
                }
            }
        }
    });
}

/**
 * Setup Socket.io event listeners
 */
function setupSocketListeners() {
    socket.on('connect', () => {
        console.log('Connected to server');
        state.isConnected = true;
        updateConnectionStatus(true);
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        state.isConnected = false;
        updateConnectionStatus(false);
    });

    socket.on('init', (data) => {
        console.log('Received init data:', data);
        
        // Update mode badge
        state.mockMode = data.config?.mockMode || false;
        elements.modeBadge.textContent = state.mockMode ? 'MOCK' : 'LIVE';
        elements.modeBadge.classList.toggle('mock', state.mockMode);
        
        // Update server info
        elements.serverInfo.textContent = state.mockMode 
            ? 'Mock Mode (Simulated Data)' 
            : `Serial: ${data.config?.serialPort || 'N/A'}`;
        
        // Load history into chart
        if (data.history && data.history.length > 0) {
            data.history.forEach(item => {
                addChartPoint(item.raw, item.timestamp);
            });
        }
        
        // Load alerts
        if (data.alerts && data.alerts.length > 0) {
            data.alerts.forEach(alert => addAlertToLog(alert, false));
            state.alertsCount = data.alerts.length;
            elements.alertCount.textContent = state.alertsCount;
        }
        
        // Update with current data
        if (data.current) {
            updateGasDisplay(data.current);
        }
    });

    socket.on('gasData', (data) => {
        updateGasDisplay(data);
        addChartPoint(data.raw, data.timestamp);
    });

    socket.on('alert', (alert) => {
        showAlertBanner(alert);
        addAlertToLog(alert);
        playAlertSound(alert.level);
    });

    socket.on('status', (data) => {
        console.log('Status update:', data);
        if (data.status === 'warming_up') {
            elements.serverInfo.textContent = `Sensor warming up... ${data.progress || 0}%`;
        } else if (data.status === 'ready') {
            elements.serverInfo.textContent = 'Sensor ready';
        }
    });
}

/**
 * Setup UI event listeners
 */
function setupEventListeners() {
    // Chart range buttons
    document.querySelectorAll('.chart-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const range = parseInt(e.target.dataset.range);
            state.maxChartPoints = range;
            
            document.querySelectorAll('.chart-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            // Trim chart data to new range
            while (chartData.labels.length > range) {
                chartData.labels.shift();
                chartData.datasets.forEach(ds => ds.data.shift());
            }
            gasChart.update('none');
        });
    });
}

/**
 * Update connection status display
 */
function updateConnectionStatus(connected) {
    elements.connectionStatus.classList.toggle('connected', connected);
    elements.connectionStatus.querySelector('.status-text').textContent = 
        connected ? 'Connected' : 'Disconnected';
}

/**
 * Update timestamp display
 */
function updateTimestamp() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    elements.timestamp.textContent = timeStr;
}

/**
 * Update gas display with new data
 */
function updateGasDisplay(data) {
    // Update values
    elements.ppmValue.textContent = formatNumber(data.ppm);
    elements.rawValue.textContent = data.raw;
    elements.voltageValue.textContent = data.voltage.toFixed(2) + 'V';
    elements.sensorType.textContent = data.sensor || 'MQ2';
    elements.currentLevel.textContent = data.raw;
    
    // Update thresholds
    if (data.thresholds) {
        state.thresholds = data.thresholds;
        elements.warningThreshold.textContent = data.thresholds.warning;
        elements.dangerThreshold.textContent = data.thresholds.danger;
    }
    
    // Update gauge arc (0-1023 mapped to 0-251.2 dashoffset)
    const percentage = Math.min(data.raw / 1023, 1);
    const dashOffset = 251.2 * (1 - percentage);
    elements.gaugeArc.style.strokeDashoffset = dashOffset;
    
    // Update current progress bar
    const progressPercentage = (data.raw / 1023) * 100;
    elements.currentProgress.style.width = progressPercentage + '%';
    
    // Update status indicator
    updateStatusIndicator(data.alert);
    
    // Update Zone A
    elements.zone1Value.textContent = formatNumber(data.ppm) + ' PPM';
    updateZoneStatus('zone1', data.alert);
}

/**
 * Update status indicator based on alert level
 */
function updateStatusIndicator(alertLevel) {
    const indicator = elements.statusIndicator;
    const label = indicator.querySelector('.status-label');
    
    indicator.classList.remove('warning', 'danger');
    
    switch (alertLevel) {
        case 'danger':
            indicator.classList.add('danger');
            label.textContent = 'DANGER';
            break;
        case 'warning':
            indicator.classList.add('warning');
            label.textContent = 'WARNING';
            break;
        default:
            label.textContent = 'NORMAL';
    }
}

/**
 * Update zone card status
 */
function updateZoneStatus(zoneId, alertLevel) {
    const zone = document.getElementById(zoneId);
    const statusDot = zone.querySelector('.zone-status');
    
    statusDot.classList.remove('normal', 'warning', 'danger', 'offline');
    statusDot.classList.add(alertLevel || 'normal');
}

/**
 * Add data point to chart
 */
function addChartPoint(value, timestamp) {
    const time = new Date(timestamp);
    const label = time.toLocaleTimeString('en-US', { 
        hour12: false,
        minute: '2-digit',
        second: '2-digit'
    });
    
    chartData.labels.push(label);
    chartData.datasets[0].data.push(value);
    chartData.datasets[1].data.push(state.thresholds.warning);
    chartData.datasets[2].data.push(state.thresholds.danger);
    
    // Trim if over max points
    while (chartData.labels.length > state.maxChartPoints) {
        chartData.labels.shift();
        chartData.datasets.forEach(ds => ds.data.shift());
    }
    
    gasChart.update('none');
}

/**
 * Show alert banner
 */
function showAlertBanner(alert) {
    const banner = elements.alertBanner;
    const message = banner.querySelector('.alert-message');
    
    banner.classList.remove('hidden', 'warning', 'danger');
    banner.classList.add(alert.level);
    message.textContent = alert.message;
    
    // Auto-hide after 10 seconds for warnings
    if (alert.level === 'warning') {
        setTimeout(() => {
            dismissAlert();
        }, 10000);
    }
}

/**
 * Dismiss alert banner
 */
function dismissAlert() {
    elements.alertBanner.classList.add('hidden');
}

/**
 * Add alert to log
 */
function addAlertToLog(alert, animate = true) {
    // Remove "no alerts" message if present
    const noAlerts = elements.alertsList.querySelector('.no-alerts');
    if (noAlerts) {
        noAlerts.remove();
    }
    
    const alertItem = document.createElement('div');
    alertItem.className = `alert-item ${alert.level}`;
    if (!animate) alertItem.style.animation = 'none';
    
    const time = new Date(alert.timestamp);
    const timeStr = time.toLocaleTimeString('en-US', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    alertItem.innerHTML = `
        <span class="alert-item-icon">${alert.level === 'danger' ? '🚨' : '⚠️'}</span>
        <div class="alert-item-content">
            <div class="alert-item-message">${alert.level === 'danger' ? 'DANGER' : 'WARNING'}: ${alert.ppm} PPM detected</div>
            <div class="alert-item-time">${timeStr}</div>
        </div>
    `;
    
    elements.alertsList.insertBefore(alertItem, elements.alertsList.firstChild);
    
    // Update count
    state.alertsCount++;
    elements.alertCount.textContent = state.alertsCount;
    
    // Limit visible alerts
    while (elements.alertsList.children.length > 20) {
        elements.alertsList.lastChild.remove();
    }
}

/**
 * Play alert sound
 */
function playAlertSound(level) {
    if (level === 'danger') {
        const sound = document.getElementById('alertSound');
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(e => console.log('Audio play blocked:', e));
        }
    }
}

/**
 * Format number with commas
 */
function formatNumber(num) {
    return Math.round(num).toLocaleString();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);

// Expose dismissAlert globally for onclick handler
window.dismissAlert = dismissAlert;

