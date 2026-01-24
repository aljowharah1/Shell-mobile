# PSU Racing - Mobile Dashboard

Real-time telemetry dashboard for electric racing car monitoring via MQTT.

**Live Demo**: [Deployed on Vercel](https://github.com/aljowharah1/Shell-mobile)

## Features

### Real-Time Monitoring
- **MQTT Telemetry**: Live data streaming from race car
- **Speedometer**: Animated speed display with smooth interpolation (0-50 km/h)
- **Current Monitor**: Live amperage draw visualization
- **Distance Tracking**: Dual display - GPS-based and joule meter odometer

### GPS & Tracking
- **Interactive Track Map**: Leaflet.js visualization with 82-point track outline
- **Heat Map**: Current draw visualization across track (color-coded intensity)
- **Lap Detection**: Automatic GPS-based lap counting (220m threshold)
- **GPS Fallback**: Automatic phone GPS backup when car GPS fails

### Race Management
- **Auto-Timer**: 35-minute countdown, auto-starts on movement, pauses after 15s idle
- **Lap Efficiency**: km/kWh tracking per lap with history
- **Start/Stop Lines**: Visual markers on track (green start, red stop)
- **Turn Guidance**: Directional arrows for track navigation

## Project Structure

```
dashboardPSU_ECOteam/
├── app/                          # Mobile Dashboard (Production)
│   ├── index.html               # Main dashboard interface
│   ├── style.css                # Dashboard styling
│   └── script.js                # MQTT + GPS + UI logic
├── data/                         # Telemetry Data
│   ├── 2025/data/               # 2025 race data
│   │   ├── Attempt1.csv         # First attempt telemetry
│   │   └── Attempt2.csv         # Second attempt telemetry
│   └── 2026/                    # 2026 test drive data
│       └── test_drive_1.csv     # Latest test drive
├── scripts/                      # Testing & Utilities
│   ├── replay_attempt1.py       # Replay 2025 Attempt1 to MQTT
│   ├── replay_attempt2.py       # Replay 2025 Attempt2 to MQTT
│   ├── replay_2026.py           # Replay 2026 test drive (improved)
│   ├── extract_single_lap.py    # Extract clean lap from CSV
│   ├── extract_track_outline.py # Generate track outline JSON
│   ├── find_stop_position.py    # Detect mandatory stop position
│   └── apply_single_lap_track.py # Update dashboard track data
└── utils/                        # Development Utilities
    ├── deprecated/              # Archived scripts (legacy)
    ├── find_midrace_stop_v2.py  # Stop detection (distance-filtered)
    ├── analyze_track_sections.py # Track analysis
    ├── extract.awk              # GPS coordinate extraction
    ├── extract_valid.awk        # Valid coordinate filtering
    └── process_coords.awk       # Coordinate processing
```

## Quick Start

### 1. Local Testing

Open the dashboard locally:

```bash
# Open in browser
open app/index.html
# or
file:///path/to/dashboardPSU_ECOteam/app/index.html
```

**Note**: Requires internet connection for CDN libraries (Leaflet, MQTT.js)

### 2. Test with Replay Data

Simulate live telemetry by replaying CSV data to MQTT:

```bash
# Install dependencies
pip install paho-mqtt pandas

# Replay 2026 test drive (recommended)
python scripts/replay_2026.py

# Or replay 2025 attempts
python scripts/replay_attempt1.py
python scripts/replay_attempt2.py
```

### 3. Deploy to Vercel

```bash
# Push to GitHub
git push origin main

# Vercel will auto-deploy from the app/ directory
```

## MQTT Configuration

Dashboard connects to HiveMQ Cloud by default. Edit `app/script.js` to change:

```javascript
const MQTT_URL = "wss://your-broker.hivemq.cloud:8884/mqtt";
const MQTT_USER = "your-username";
const MQTT_PASS = "your-password";
const TOPIC = "car/telemetry";
const GPS_BACKUP_TOPIC = "car/phone_gps";
```

### MQTT Message Format

```json
{
  "voltage": 48.5,
  "current": 12.3,
  "power": 596.55,
  "speed": 87.5,
  "rpm": 4375,
  "distance_km": 2.45,
  "latitude": 25.488435,
  "longitude": 51.450190
}
```

### GPS Backup Format (Phone Publishes)

When car GPS fails (0,0 or null), phone automatically publishes backup GPS:

```json
{
  "phone_latitude": 25.488435,
  "phone_longitude": 51.450190,
  "phone_speed_kmh": 87.5,
  "phone_accuracy_m": 5.2,
  "timestamp": 1737653400000
}
```

## Track Configuration

Track data in `app/script.js` (averaged from 2025 & 2026 data):

```javascript
const LUSAIL_SHORT = {
    center: [25.488495475, 51.4502024915],  // Start position
    stopLine: [25.491879583, 51.450886683],  // Mandatory stop (382m from start)
    zoom: 17,
    outline: [[...]]  // 82-point GPS track outline
};
```

## Development

### Extract Track from New Data

```bash
# Extract single clean lap from 2026 CSV
python scripts/extract_single_lap.py

# Generates: scripts/single_lap_track.json

# Apply to dashboard
python scripts/apply_single_lap_track.py
```

### Find Mandatory Stop Position

```bash
# Detect 4+ second stops in telemetry
python scripts/find_stop_position.py
```

### Analyze Track Sections

```bash
# Identify turns and track features
python utils/analyze_track_sections.py
```

## Mobile Deployment

### Option 1: Vercel (Current)
- Auto-deploys from GitHub
- Served from `app/` directory
- No build process required

### Option 2: Local WiFi Hotspot
```bash
# Serve locally
python -m http.server 8000 --directory app

# Access from phone on same WiFi
http://192.168.x.x:8000
```

### Option 3: Progressive Web App (PWA)
- Add manifest.json and service worker
- Enable offline caching
- Install as app on mobile device

## GPS Fallback System

The dashboard includes automatic GPS failover:

1. **Primary**: Car's GPS module (via MQTT)
2. **Fallback**: Phone's GPS (browser geolocation API)
3. **Trigger**: Car GPS sends (0,0) or null coordinates
4. **Behavior**:
   - Phone starts publishing GPS to `car/phone_gps`
   - Dashboard uses phone GPS for position/speed/laps
   - Seamless switch with no driver intervention
   - Auto-restores to car GPS when available

## Data Format Notes

### 2025 CSV Format
- Columns: `jm3_voltage` (mV), `jm3_current`, `gps_speed`, `dist` (m), `gps_latitude`, `gps_longitude`
- Units need conversion (voltage: mV→V, distance: m→km)

### 2026 CSV Format
- Columns: `voltage` (V), `current`, `power`, `speed`, `distance_km`, `latitude`, `longitude`
- Pre-converted units (ready to use)

## Requirements

### Runtime
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection (for CDN libraries)
- JavaScript enabled
- GPS access (for phone fallback mode)

### Development
- Python 3.x
- Libraries: `pip install paho-mqtt pandas`

## Troubleshooting

### Dashboard Shows NaN
- **Fixed**: All numeric displays now default to `0.0` when data is missing
- Safe number validation prevents NaN display

### Vercel Deployment 404
- **Fixed**: `vercel.json` configured with `outputDirectory: "app"`
- Cache-Control headers prevent stale deployments

### GPS Not Working
- Check browser permissions (Location access required)
- Ensure HTTPS or localhost (geolocation security requirement)
- Check console for GPS error messages

### MQTT Not Connecting
- Verify HiveMQ credentials in `app/script.js`
- Check firewall allows WebSocket connections (port 8884)
- Open browser console to see connection status

## Credits

**PSU Racing Team**
Electric Vehicle Racing Dashboard - 2025-2026

**Repository**: https://github.com/aljowharah1/Shell-mobile

---

*Built with Leaflet.js, MQTT.js, and ❤️ for electric racing*
