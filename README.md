# JM Racing Telemetry Dashboard

A real-time racing telemetry dashboard that displays live data from CSV files.

## Features

- **Real-time Data Display**: Shows live telemetry data from CSV files
- **Combined Metrics**: Speed (current + average), Time & Laps, Power (voltage + current)
- **Energy Monitoring**: Efficiency and consumption tracking
- **Location Tracking**: GPS-based position display
- **Responsive Design**: Works on desktop and mobile devices
- **F1-style Theme**: Black and orange racing aesthetics

## Data Mapping

The dashboard reads data from CSV files with the following column mappings:

- **Speed**: `gps_speed` (km/h)
- **Voltage**: `jm3_voltage` (V)
- **Current**: `jm3_current` (A) - absolute value
- **Laps**: `lap_lap` (lap number)
- **Distance**: `dist` (total distance)
- **Location**: `gps_latitude`, `gps_longitude` (GPS coordinates)
- **Time**: `obc_timestamp` (race time)

## How to Run

1. **Start the server**:
   ```bash
   python3 server.py
   ```

2. **Open your browser** and go to:
   ```
   http://localhost:8000
   ```

3. **The dashboard will automatically**:
   - Load the CSV data from `2025/attempt1/705 2025-02-10 09_59_50.csv`
   - Start displaying real-time telemetry data
   - Fall back to simulation if CSV loading fails

## File Structure

```
JM_dashboard/
├── index.html          # Main dashboard HTML
├── style.css           # Dashboard styling
├── scripts.js          # Data loading and display logic
├── server.py           # HTTP server for CSV access
├── shellLogo.png       # Team logo
├── README.md           # This file
└── 2025/
    └── attempt1/
        └── 705 2025-02-10 09_59_50.csv  # Telemetry data
```

## Data Processing

- **Real-time Streaming**: Data points are processed sequentially every 100ms
- **Automatic Loop**: When reaching the end of data, it loops back to the beginning
- **Error Handling**: Falls back to simulation if CSV data is unavailable
- **Data Validation**: Handles missing or invalid data gracefully

## Customization

- **CSV Path**: Modify the `csvPath` variable in `scripts.js` to use different data files
- **Update Rate**: Change the interval in `setInterval()` to adjust data refresh rate
- **Location Mapping**: Enhance `getLocationFromGPS()` function for better track mapping
- **Styling**: Modify `style.css` for different themes or layouts

## Requirements

- Python 3.x (for the HTTP server)
- Modern web browser with JavaScript enabled
- CSV file with telemetry data in the specified format

## Troubleshooting

- **CSV not loading**: Check that the file path is correct and the server is running
- **No data display**: Verify CSV file format matches expected column names
- **Performance issues**: Reduce update frequency or data points if needed
