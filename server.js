/**
 * Gas Monitoring Server
 * 
 * Reads data from Arduino via SerialPort and broadcasts to browser via Socket.io
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// Check if running in mock mode (for testing without Arduino)
const MOCK_MODE = process.argv.includes('--mock');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from public folder
app.use(express.static(path.join(__dirname, 'public')));

// Store latest sensor data
let latestData = {
  type: 'gas_reading',
  sensor: 'MQ2',
  raw: 0,
  voltage: 0,
  ppm: 0,
  digital: 0,
  alert: 'normal',
  thresholds: { warning: 300, danger: 500 },
  timestamp: Date.now()
};

// Store historical data (last 100 readings)
let history = [];
const MAX_HISTORY = 100;

// Alert log
let alertLog = [];
const MAX_ALERTS = 50;

// Configuration
const CONFIG = {
  serialPort: process.env.SERIAL_PORT || 'COM3', // Change this to your Arduino port
  baudRate: 9600,
  httpPort: process.env.PORT || 3000
};

/**
 * Initialize Serial Port connection to Arduino
 */
function initSerialPort() {
  if (MOCK_MODE) {
    console.log('🔧 Running in MOCK mode - simulating sensor data');
    startMockDataGenerator();
    return;
  }

  try {
    const { SerialPort } = require('serialport');
    const { ReadlineParser } = require('@serialport/parser-readline');

    const port = new SerialPort({
      path: CONFIG.serialPort,
      baudRate: CONFIG.baudRate
    });

    const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

    port.on('open', () => {
      console.log(`📟 Serial port ${CONFIG.serialPort} opened`);
    });

    port.on('error', (err) => {
      console.error('❌ Serial port error:', err.message);
      console.log('💡 Tip: Check your COM port or run with --mock flag for testing');
    });

    parser.on('data', (data) => {
      try {
        const parsed = JSON.parse(data);
        processGasData(parsed);
      } catch (e) {
        console.log('📥 Raw data:', data);
      }
    });

  } catch (error) {
    console.error('❌ Failed to initialize serial port:', error.message);
    console.log('💡 Starting mock mode instead...');
    startMockDataGenerator();
  }
}

/**
 * Process incoming gas sensor data
 */
function processGasData(data) {
  if (data.type === 'gas_reading') {
    // Add timestamp
    data.timestamp = Date.now();
    latestData = data;

    // Add to history
    history.push({
      timestamp: data.timestamp,
      raw: data.raw,
      ppm: data.ppm,
      alert: data.alert
    });

    // Trim history if needed
    if (history.length > MAX_HISTORY) {
      history.shift();
    }

    // Check for alerts
    if (data.alert !== 'normal') {
      const alertEntry = {
        timestamp: data.timestamp,
        level: data.alert,
        ppm: data.ppm,
        raw: data.raw,
        message: data.alert === 'danger' 
          ? '🚨 DANGER: High gas concentration detected!'
          : '⚠️ WARNING: Elevated gas levels detected'
      };
      alertLog.unshift(alertEntry);
      
      if (alertLog.length > MAX_ALERTS) {
        alertLog.pop();
      }

      // Broadcast alert
      io.emit('alert', alertEntry);
    }

    // Broadcast to all connected clients
    io.emit('gasData', data);
  } else if (data.status) {
    // Status update (warming up, ready, etc.)
    io.emit('status', data);
    console.log('📊 Status:', data);
  }
}

/**
 * Mock data generator for testing without Arduino
 */
function startMockDataGenerator() {
  let baseValue = 150;
  let trend = 1;
  let spikeChance = 0.02; // 2% chance of spike

  setInterval(() => {
    // Random walk with occasional spikes
    if (Math.random() < spikeChance) {
      baseValue = Math.random() * 600 + 200; // Spike to 200-800
    } else {
      baseValue += (Math.random() - 0.5) * 20 * trend;
      
      // Tendency to return to normal
      if (baseValue > 400) trend = -1;
      if (baseValue < 100) trend = 1;
    }

    // Clamp values
    baseValue = Math.max(50, Math.min(800, baseValue));
    
    const raw = Math.round(baseValue + (Math.random() - 0.5) * 10);
    const voltage = (raw / 1023 * 5).toFixed(2);
    const ppm = Math.round(raw * 9.8);
    
    let alert = 'normal';
    if (raw >= 500) alert = 'danger';
    else if (raw >= 300) alert = 'warning';

    const mockData = {
      type: 'gas_reading',
      sensor: 'MQ2',
      raw: raw,
      voltage: parseFloat(voltage),
      ppm: ppm,
      digital: alert !== 'normal' ? 1 : 0,
      alert: alert,
      thresholds: { warning: 300, danger: 500 }
    };

    processGasData(mockData);
  }, 500);
}

/**
 * Socket.io connection handling
 */
io.on('connection', (socket) => {
  console.log(' Client connected:', socket.id);

  // Send current data and history to new client
  socket.emit('init', {
    current: latestData,
    history: history,
    alerts: alertLog.slice(0, 10),
    config: {
      mockMode: MOCK_MODE,
      serialPort: CONFIG.serialPort
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });

  // Handle threshold updates from client
  socket.on('updateThresholds', (thresholds) => {
    latestData.thresholds = thresholds;
    console.log('Thresholds updated:', thresholds);
  });
});

/**
 * API Routes
 */
app.get('/api/current', (req, res) => {
  res.json(latestData);
});

app.get('/api/history', (req, res) => {
  res.json(history);
});

app.get('/api/alerts', (req, res) => {
  res.json(alertLog);
});

app.get('/api/config', (req, res) => {
  res.json({
    mockMode: MOCK_MODE,
    serialPort: CONFIG.serialPort,
    baudRate: CONFIG.baudRate
  });
});

/**
 * Start the server
 */
server.listen(CONFIG.httpPort, () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('      Falco Task - Gas Monitoring Server  ');
  console.log('═══════════════════════════════════════════════════');
  console.log(`      Server running at: http://localhost:${CONFIG.httpPort}`);
  console.log(`      Serial Port: ${CONFIG.serialPort}`);
  console.log(`      Mock Mode: ${MOCK_MODE ? 'ENABLED' : 'DISABLED'}`);
  console.log('═══════════════════════════════════════════════════');
  console.log('');
});

// Initialize serial port connection
initSerialPort();

