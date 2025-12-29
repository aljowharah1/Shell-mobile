# MQTT Replay Instructions

## Playing Back Mishal 29 Dec Test Drive Data

This guide explains how to replay the Mishal 29 Dec university test drive data through MQTT to the dashboard.

---

## Prerequisites

1. **Python 3** installed on your system
2. **paho-mqtt** library installed

### Install Required Library

```bash
pip install paho-mqtt
```

---

## How to Run the Replay

### Step 1: Navigate to the Dashboard Directory

```bash
cd "c:\Users\Juju\Desktop\shell - Copy\dashboardPSU_ECOteam"
```

### Step 2: Run the Replay Script

```bash
python replay_mishal_mqtt.py
```

### Step 3: Open the Dashboard

Open `app/index.html` in your web browser. The dashboard will automatically connect to MQTT and receive the replayed data.

---

## What the Script Does

1. **Reads** the `Mishal29dec01-uni.csv` file
2. **Parses** all telemetry data (voltage, current, power, speed, GPS, etc.)
3. **Publishes** each data point to the MQTT broker at `car/telemetry` topic
4. **Maintains timing** - respects the original timestamps for realistic playback
5. **Shows progress** - prints status every 100 messages

---

## Playback Configuration

You can modify the playback speed by editing `replay_mishal_mqtt.py`:

```python
# Line 20 in the script
PLAYBACK_SPEED = 1.0  # Change this value
```

- `1.0` = Real-time playback
- `2.0` = 2x speed (faster)
- `0.5` = Half speed (slower)
- `10.0` = 10x speed (very fast for testing)

---

## Expected Output

When running the script, you should see:

```
============================================================
MQTT Replay: Mishal 29 Dec Test Drive
============================================================
Connecting to 8fac0c92ea0a49b8b56f39536ba2fd78.s1.eu.hivemq.cloud:8883...
✅ Connected to MQTT broker

📂 Reading Mishal29dec01-uni.csv...
⚡ Playback speed: 1.0x
📡 Publishing to topic: car/telemetry

============================================================
📤 Sent 100 messages | Speed: 0.0 km/h | Lat: 24.734488, Lon: 46.699482
📤 Sent 200 messages | Speed: 3.4 km/h | Lat: 24.734491, Lon: 46.699478
📤 Sent 300 messages | Speed: 12.5 km/h | Lat: 24.734324, Lon: 46.699505
...
============================================================
✅ Replay complete! Sent 1972 telemetry messages
============================================================
```

---

## Dashboard Features During Playback

The dashboard will show:

- **Real-time speed** updates on the speedometer
- **Current draw** visualization
- **GPS position** - car marker moving on the track
- **Lap tracking** - automatic lap detection
- **Timer** - starts when car begins moving
- **Heat map** - showing current consumption across the track
- **Efficiency metrics** - per lap and overall

---

## Troubleshooting

### "Module not found: paho.mqtt"
```bash
pip install paho-mqtt
```

### "File not found: Mishal29dec01-uni.csv"
Make sure you're running the script from the `dashboardPSU_ECOteam` directory.

### "Connection failed"
- Check your internet connection
- Verify MQTT credentials are correct
- The broker might be temporarily unavailable

### Dashboard not updating
1. Open browser console (F12)
2. Check for MQTT connection messages
3. Verify the dashboard is connecting to the correct broker
4. Make sure the replay script is running

---

## Stopping the Replay

Press `Ctrl+C` in the terminal to stop the replay at any time.

---

## Files

- **replay_mishal_mqtt.py** - Main replay script
- **Mishal29dec01-uni.csv** - Source data file (1972 data points)
- **app/script.js** - Dashboard code (MQTT enabled)
- **app/index.html** - Dashboard web page

---

## Notes

- The replay will send all 1972 telemetry messages from the test drive
- GPS coordinates will match the track outline shown on the map
- The car marker will follow the actual driven path
- All telemetry data (voltage, current, power, speed) is from the real test drive