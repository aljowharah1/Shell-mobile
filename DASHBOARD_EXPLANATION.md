# PSU Racing Dashboard - Complete Explanation

## Heat Map Colors

### What the Colors Mean:
The heat map shows **current draw** (battery current consumption) at each location on the track.

| Color | Meaning | Current Range (Typical) | What's Happening |
|-------|---------|------------------------|------------------|
| 🟢 **Green** | Low current draw | **0-2 A** | Coasting, idle, regenerative braking |
| 🟡 **Yellow** | Medium current draw | **2-4 A** | Gentle acceleration, steady speed |
| 🟠 **Orange** | High current draw | **4-6 A** | Hard acceleration, climbing |
| 🔴 **Red** | Maximum current draw | **6-9+ A** | Peak acceleration, maximum power |

### Actual Data from Mishal 29 Dec:
- **Minimum**: 0.059 A (almost idle)
- **Average**: 2.963 A (typical running)
- **Maximum**: 8.646 A (peak acceleration)
- **50th percentile**: 2.661 A (median usage)

### How It Works:
- **HSL Color Scale**: `hue = (1 - intensity) * 120`
  - Hue 120° = Green (low current)
  - Hue 0° = Red (high current)
- **Intensity**: `currentAbs / maxCurrent`
  - Normalized to the maximum current seen in the current lap
- **Dynamic Scaling**: Colors adjust based on the peak current of each lap

### What This Shows You:
- **Green zones**: Coasting, regenerative braking, or low-speed sections
- **Red zones**: Acceleration points, uphill sections, high-speed straights
- **Pattern analysis**: Consistent color patterns indicate driving consistency

---

## Efficiency Calculation

### Formula:
```
Efficiency (km/kWh) = Distance Traveled (km) / Energy Consumed (kWh)
```

### Step-by-Step Calculation:

1. **Energy Integration** (script.js:585-587):
   ```javascript
   energyWhAbs += power * dtH
   ```
   - Power (W) × Time (hours) = Energy (Wh)
   - Accumulated over entire run

2. **Per-Lap Energy** (script.js:337-338):
   ```javascript
   energyWhSinceLapStart = energyWhAbs - lapStartEnergy
   energyKwhSinceLapStart = energyWhSinceLapStart / 1000  // Wh → kWh
   ```

3. **Per-Lap Distance** (script.js:339):
   ```javascript
   distSinceLapStart = distKmAbs - lapStartDist
   ```

4. **Final Efficiency** (script.js:342):
   ```javascript
   efficiency = distSinceLapStart / energyKwhSinceLapStart
   ```
   - Result in **km/kWh** (kilometers per kilowatt-hour)
   - Higher = better efficiency

### Example:
- **Distance**: 1.5 km
- **Energy Used**: 0.05 kWh (50 Wh)
- **Efficiency**: 1.5 / 0.05 = **30 km/kWh**

### What Good Efficiency Looks Like:
- **20-40 km/kWh**: Excellent (gentle acceleration, optimal speed)
- **10-20 km/kWh**: Good (normal driving)
- **< 10 km/kWh**: Poor (aggressive acceleration, high speeds)

---

## Lap Detection & Start Position

### Start Position:
- **Center coordinates**: `[24.7346, 46.6991]` (script.js:30)
- **First outline point**: `[24.734488, 46.699482]` (script.js:37)
- **These are the same location** - the start/finish line

### Lap Detection Algorithm (script.js:317-376):

1. **Starting Position**:
   ```javascript
   START_LAT = 24.7346
   START_LON = 46.6991
   START_THRESHOLD = 0.0003  // ~33 meters radius
   ```

2. **Leave Detection**:
   ```javascript
   if (!hasLeftStart && distFromStart > 33m) {
       hasLeftStart = true  // Car has left the start area
   }
   ```

3. **Return Detection**:
   ```javascript
   if (hasLeftStart && distFromStart < 33m) {
       // LAP COMPLETED!
       - Calculate efficiency
       - Update lap counter
       - Reset lap counters
       - Clear heat map
   }
   ```

### Consistency Check:
✅ **Start position is consistent**:
- Track center = `[24.7346, 46.6991]`
- First outline point = `[24.734488, 46.699482]`
- Distance between them = **~12 meters** (within start threshold)
- The outline forms a **closed loop** - last point returns to first point

---

## Other Calculations

### Speed (from GPS or sensor):
- Provided directly in telemetry data
- Unit: km/h

### Distance (from sensor):
- Accumulated odometer reading
- Unit: km
- Used for lap distance calculation

### Power:
```javascript
power = voltage × current
```
- Unit: Watts (W)
- Instantaneous power consumption

### Energy:
```javascript
energyWhAbs += power × (timeElapsed / 3600000)
```
- Power (W) × Time (hours)
- Unit: Watt-hours (Wh)
- Converted to kWh for efficiency calculation

### Current Draw:
- Provided directly in telemetry
- Unit: Amperes (A)
- Displayed on speedometer gauge
- Visualized on heat map

---

## Speedometer Configuration

### Current Settings:
- **Maximum speed**: 50 km/h (script.js:683)
- **Start position**: 9 o'clock (left middle) - rotation 180° (index.html:73)
- **Arc circumference**: 754 pixels (2πr where r=120)
- **Fill direction**: Clockwise from left

### Visual Behavior:
- **0 km/h**: Empty (starts at 9 o'clock)
- **25 km/h**: Half-filled (reaches 6 o'clock bottom)
- **50 km/h**: Fully filled (reaches 3 o'clock right)

---

## Data Flow Summary

```
CSV File (Mishal29dec01-uni.csv)
    ↓
MQTT Replay Script (replay_mishal_mqtt.py)
    ↓
MQTT Broker (HiveMQ Cloud)
    ↓
Dashboard (index.html + script.js)
    ↓
Real-time Visualization:
    - Speedometer (0-50 km/h)
    - Current gauge
    - GPS position on map
    - Heat map (current draw)
    - Timer (auto-start on movement)
    - Lap counter
    - Efficiency per lap
```

---

## Quality Metrics

### Mishal 29 Dec Lap Data:
- **Total points**: 1,972 telemetry messages
- **Track points**: 56 GPS coordinates (sampled)
- **Lap closure**: 12 meters (excellent)
- **Track shape**: Closed loop, consistent path
- **Data quality**: Clean GPS data, no jumps

---

## Tips for Best Results

1. **Consistent Driving**: Smooth acceleration/braking = better efficiency
2. **Watch Heat Map**: Red zones show where power is consumed most
3. **Monitor Efficiency**: Track improvement lap-over-lap
4. **Start Position**: Always cross start line cleanly for accurate lap detection
5. **Speed Management**: Stay within optimal range for best km/kWh

---

*Dashboard Version: University Test Track *