# Falco Task - Gas Monitoring Dashboard

A real-time gas monitoring system for warehouses and industrial plants using Arduino with MQ2 sensor. Features a beautiful, industrial-themed dashboard with live data visualization, alerts, and multi-zone support.

![Dashboard Preview](https://img.shields.io/badge/Status-Active-success?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-v18+-green?style=for-the-badge&logo=node.js)
![Arduino](https://img.shields.io/badge/Arduino-Compatible-blue?style=for-the-badge&logo=arduino)

##  Dashboard Preview

![Falco Task Dashboard](assets/Screenshot%202025-12-07%20204553.png)

##  System Architecture

```
┌─────────────┐     USB Serial      ┌─────────────┐     WebSocket      ┌─────────────┐
│   Arduino   │ ──────────────────► │   Node.js   │ ──────────────────► │   Browser   │
│  + MQ2 Sensor│   SerialPort lib   │   Server    │    Socket.io       │  Dashboard  │
└─────────────┘                     └─────────────┘                     └─────────────┘
```

##  Features

- **Real-time Monitoring** - Live gas level readings updated every 500ms
- **Visual Gauges** - Animated gauge showing PPM levels with color-coded status
- **Historical Charts** - Interactive Chart.js visualization of sensor history
- **Alert System** - Visual and audio alerts for warning/danger levels
- **Multi-zone Support** - Prepared for multiple sensor zones (expandable)
- **Mock Mode** - Test the dashboard without actual hardware
- **Responsive Design** - Works on desktop and mobile devices

##  Hardware Requirements

- Arduino Uno/Nano/Mega (or compatible)
- MQ2 Gas Sensor Module
- USB Cable for Arduino
- Optional: Buzzer, LED

### Wiring Diagram

```
MQ2 Sensor          Arduino
─────────────────────────────
   VCC        →     5V
   GND        →     GND
   AOUT       →     A0
   DOUT       →     D2 (optional)
   
Buzzer (optional)
─────────────────────────────
   +          →     D8
   -          →     GND
```

##  Quick Start

### 1. Clone and Install

```bash
# Navigate to project directory
cd gas-monitoring-dashboard

# Install dependencies
npm install
```

### 2. Upload Arduino Code

1. Open `arduino/gas_sensor.ino` in Arduino IDE
2. Select your Arduino board and port
3. Click Upload

### 3. Configure Serial Port

Edit `server.js` and update the serial port:

```javascript
const CONFIG = {
  serialPort: 'COM3',  // Windows: 'COM3', 'COM4', etc.
                       // Mac: '/dev/tty.usbmodem...'
                       // Linux: '/dev/ttyUSB0', '/dev/ttyACM0'
  baudRate: 9600,
  httpPort: 3000
};
```

Or set via environment variable:
```bash
set SERIAL_PORT=COM4   # Windows
export SERIAL_PORT=/dev/ttyUSB0   # Linux/Mac
```

### 4. Start the Server

```bash
# With Arduino connected
npm start

# OR run in mock mode (no Arduino needed)
npm run dev
```

### 5. Open Dashboard

Navigate to: **http://localhost:3000**

##  Dashboard Features

### Main Display
- **Large Gauge** - Real-time PPM visualization with gradient coloring
- **Status Indicator** - NORMAL / WARNING / DANGER with animations
- **Quick Stats** - Raw value, voltage, and sensor type

### Chart
- **Real-time Graph** - Scrolling historical view of gas levels
- **Threshold Lines** - Visual warning and danger level indicators
- **Time Range** - Toggle between 1 and 2 minute views

### Alerts
- **Banner Alerts** - Full-width notifications for warnings/dangers
- **Alert Log** - Historical record of all triggered alerts
- **Audio Alerts** - Sound notification for danger levels

### Zones
- **Zone A** - Active sensor zone (connected to MQ2)
- **Zones B-D** - Placeholder for additional sensors

## ⚙️ Configuration

### Threshold Levels

Edit in `arduino/gas_sensor.ino`:

```cpp
const int GAS_THRESHOLD_WARNING = 300;   // Warning level (raw value)
const int GAS_THRESHOLD_DANGER = 500;    // Danger level (raw value)
```

### Sensor Warm-up

The MQ2 sensor requires a 2-minute warm-up period for accurate readings. The dashboard shows warm-up progress during this time.

##  API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Dashboard UI |
| `/api/current` | GET | Latest sensor reading |
| `/api/history` | GET | Historical readings (last 100) |
| `/api/alerts` | GET | Alert log (last 50) |
| `/api/config` | GET | Server configuration |

## WebSocket Events

### Client → Server
- `updateThresholds` - Update warning/danger thresholds

### Server → Client
- `init` - Initial data on connection (history, config, alerts)
- `gasData` - Real-time gas sensor readings
- `alert` - Alert notifications
- `status` - Sensor status updates (warming up, ready)

##  Project Structure

```
gas-monitoring-dashboard/
├── arduino/
│   └── gas_sensor.ino     # Arduino code for MQ2 sensor
├── public/
│   ├── index.html         # Dashboard HTML
│   ├── styles.css         # Styles (dark industrial theme)
│   └── app.js             # Frontend JavaScript
├── server.js              # Node.js server (SerialPort + Socket.io)
├── package.json           # Dependencies
└── README.md              # This file
```


##  Troubleshooting

### Serial Port Not Found

1. Check Arduino is connected via USB
2. Verify the correct port in Device Manager (Windows) or `ls /dev/tty*` (Mac/Linux)
3. Run `npm run dev` to test in mock mode

### Permission Denied (Linux)

```bash
sudo usermod -a -G dialout $USER
# Then log out and back in
```

### Sensor Readings Unstable

- Allow 2+ minutes for MQ2 warm-up
- Ensure proper ventilation
- Check wiring connections

##  License

MIT License - Feel free to use and modify for your projects!



