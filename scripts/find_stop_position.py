import pandas as pd
import numpy as np

# Load 2025 data
file_path = "data/2025/data/Attempt1.csv"
print(f"Loading {file_path}...")
df = pd.read_csv(file_path)

# Filter valid GPS data
df_valid = df[(df['gps_latitude'].notna()) &
              (df['gps_longitude'].notna()) &
              (df['gps_latitude'] != 0) &
              (df['gps_longitude'] != 0)].copy()

print(f"Total records: {len(df_valid)}")

# Find where car stops (speed close to 0)
df_valid['stopped'] = df_valid['gps_speed'] < 0.5  # Less than 0.5 km/h = stopped

# Find continuous stop periods
stop_periods = []
in_stop = False
stop_start_idx = None
stop_start_time = None

for idx, row in df_valid.iterrows():
    if row['stopped'] and not in_stop:
        # Start of a stop
        in_stop = True
        stop_start_idx = idx
        stop_start_time = row['obc_timestamp']
        stop_lat = row['gps_latitude']
        stop_lon = row['gps_longitude']
    elif not row['stopped'] and in_stop:
        # End of a stop
        stop_duration = row['obc_timestamp'] - stop_start_time
        if stop_duration >= 3.0:  # At least 3 seconds
            stop_periods.append({
                'start_idx': stop_start_idx,
                'duration': stop_duration,
                'latitude': stop_lat,
                'longitude': stop_lon,
                'timestamp': stop_start_time
            })
        in_stop = False

# Sort by duration (longest stops first)
stop_periods.sort(key=lambda x: x['duration'], reverse=True)

print(f"\nFound {len(stop_periods)} stop periods (3+ seconds):")
print("="*80)

for i, stop in enumerate(stop_periods[:10]):  # Show top 10
    print(f"\nStop #{i+1}:")
    print(f"  Duration: {stop['duration']:.2f} seconds")
    print(f"  Position: [{stop['latitude']}, {stop['longitude']}]")
    print(f"  Timestamp: {stop['timestamp']:.2f}")

# Get the start position for comparison
start_lat = df_valid.iloc[0]['gps_latitude']
start_lon = df_valid.iloc[0]['gps_longitude']
print(f"\nStart/Finish Position: [{start_lat}, {start_lon}]")

# Find the mandatory stop (longest stop that's NOT at start/finish)
print("\n" + "="*80)
print("MANDATORY STOP POSITION (longest stop away from start/finish):")
print("="*80)

for stop in stop_periods:
    # Calculate distance from start
    dist_from_start = ((stop['latitude'] - start_lat)**2 + (stop['longitude'] - start_lon)**2)**0.5
    dist_meters = dist_from_start * 111000  # Rough conversion to meters

    # If stop is more than 100m away from start, it's likely the mandatory stop
    if dist_meters > 100:
        print(f"\nMandatory Stop Position: [{stop['latitude']}, {stop['longitude']}]")
        print(f"Stop Duration: {stop['duration']:.2f} seconds")
        print(f"Distance from Start: {dist_meters:.0f} meters")
        mandatory_stop = stop
        break

# Calculate distance along track (rough estimate)
total_dist = 0
for i in range(1, len(df_valid)):
    prev_lat = df_valid.iloc[i-1]['gps_latitude']
    prev_lon = df_valid.iloc[i-1]['gps_longitude']
    curr_lat = df_valid.iloc[i]['gps_latitude']
    curr_lon = df_valid.iloc[i]['gps_longitude']

    dist = ((curr_lat - prev_lat)**2 + (curr_lon - prev_lon)**2)**0.5 * 111000
    total_dist += dist

    if df_valid.index[i] == mandatory_stop['start_idx']:
        print(f"Position along track: {total_dist:.0f} meters from start")
        print(f"Percentage: {(total_dist / (total_dist * 2)) * 100:.1f}% of full lap")
        break