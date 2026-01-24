import pandas as pd
import json
import math

def calculate_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two GPS points in meters"""
    R = 6371000  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

    return R * c

# Load 2025 data (last year - for mandatory stop position)
print("Loading 2025 data (Attempt1)...")
df_2025 = pd.read_csv("data/2025/data/Attempt1.csv")
valid_2025 = df_2025[(df_2025['gps_latitude'].notna()) &
                      (df_2025['gps_longitude'].notna()) &
                      (df_2025['gps_latitude'] != 0) &
                      (df_2025['gps_longitude'] != 0)]
start_2025_lat = valid_2025.iloc[0]['gps_latitude']
start_2025_lon = valid_2025.iloc[0]['gps_longitude']
print(f"2025 Start Position: [{start_2025_lat}, {start_2025_lon}]")

# Load 2026 data (this year - for averaging start position)
print("\nLoading 2026 data (test_drive_1)...")
df_2026 = pd.read_csv("data/2026/test_drive_1.csv")
valid_2026 = df_2026[(df_2026['latitude'].notna()) &
                      (df_2026['longitude'].notna()) &
                      (df_2026['latitude'] != 0) &
                      (df_2026['longitude'] != 0)]
start_2026_lat = valid_2026.iloc[0]['latitude']
start_2026_lon = valid_2026.iloc[0]['longitude']
print(f"2026 Start Position: [{start_2026_lat}, {start_2026_lon}]")

# Calculate average start position from both years
avg_start_lat = (start_2025_lat + start_2026_lat) / 2
avg_start_lon = (start_2025_lon + start_2026_lon) / 2
print(f"\nAveraged Start Position (both years): [{avg_start_lat}, {avg_start_lon}]")

# Mandatory stop position from 2025 (last year's file)
mandatory_stop_lat = start_2025_lat
mandatory_stop_lon = start_2025_lon
print(f"Mandatory Stop Position (2025 data): [{mandatory_stop_lat}, {mandatory_stop_lon}]")

# Extract one clean lap from 2026 data
print("\n" + "="*60)
print("Extracting single lap from 2026 data...")
print("="*60)

# Find where car completes first lap
lap_points = []
has_left_start = False
START_THRESHOLD = 50  # meters

for index, row in df_2026.iterrows():
    lat = row['latitude']
    lon = row['longitude']

    if pd.isna(lat) or pd.isna(lon) or lat == 0 or lon == 0:
        continue

    # Calculate distance from start
    dist_from_start = calculate_distance(avg_start_lat, avg_start_lon, lat, lon)

    # Check if left start area
    if not has_left_start and dist_from_start > START_THRESHOLD:
        has_left_start = True
        print(f"Car left start area at index {index}")

    # Add point to lap
    if has_left_start or len(lap_points) < 50:  # Always include first 50 points
        lap_points.append([lat, lon])

    # Check if completed lap (returned to start)
    if has_left_start and dist_from_start < START_THRESHOLD and len(lap_points) > 100:
        print(f"Lap completed at index {index} with {len(lap_points)} points")
        break

# Simplify lap (take every Nth point)
if len(lap_points) > 100:
    step = len(lap_points) // 80  # Target ~80 points
    simplified_lap = [lap_points[i] for i in range(0, len(lap_points), step)]
    # Ensure first and last points are included
    if simplified_lap[0] != lap_points[0]:
        simplified_lap.insert(0, lap_points[0])
    if simplified_lap[-1] != lap_points[-1]:
        simplified_lap.append(lap_points[-1])
else:
    simplified_lap = lap_points

print(f"\nLap points: {len(lap_points)} -> Simplified to: {len(simplified_lap)}")

# Calculate lap statistics
lats = [p[0] for p in simplified_lap]
lons = [p[1] for p in simplified_lap]
print(f"Latitude range: {min(lats):.6f} to {max(lats):.6f}")
print(f"Longitude range: {min(lons):.6f} to {max(lons):.6f}")

# Save track data
track_data = {
    "center": [avg_start_lat, avg_start_lon],
    "stopLine": [mandatory_stop_lat, mandatory_stop_lon],
    "zoom": 17,
    "outline": simplified_lap
}

output_file = "scripts/single_lap_track.json"
with open(output_file, 'w') as f:
    json.dump(track_data, f, indent=2)

print(f"\nTrack data saved to: {output_file}")
print("\n" + "="*60)
print("JavaScript code for dashboard:")
print("="*60)
print(f"""
const LUSAIL_SHORT = {{
    center: {json.dumps(track_data['center'])}, // Average from both years
    stopLine: {json.dumps(track_data['stopLine'])}, // Mandatory stop from 2025
    zoom: {track_data['zoom']},
    outline: {json.dumps(simplified_lap, separators=(',', ':'))}
}};
""")

print(f"\nStart Position (averaged): {track_data['center']}")
print(f"Stop Line (2025 data): {track_data['stopLine']}")
print(f"Track points: {len(simplified_lap)}")
