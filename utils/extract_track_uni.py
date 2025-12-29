import csv
import numpy as np
import os

# List of all uni test drive files
uni_files = [
    '../Mishal29dec01-uni.csv',
    '../Ahmed24Dec-uni.csv',
    '../Mishal25Dec-uni.csv',
    '../Ahmed25Dec-uni.csv',
    '../Aziz27Dec -uni.csv',
    '../data/2025/practice1/inuniithink1.csv',
    '../data/2025/practice1/inuniithink2.csv'
]

# Read GPS coordinates from all uni files
all_coords = []
print("Reading uni test drive data...")

for file_path in uni_files:
    full_path = os.path.join(os.path.dirname(__file__), file_path)
    if not os.path.exists(full_path):
        print(f"Warning: {file_path} not found, skipping...")
        continue

    print(f"Reading {file_path}...")
    with open(full_path, 'r') as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader):
            # Try different possible column names
            lat = row.get('latitude', row.get('gps_latitude', '')).strip()
            lon = row.get('longitude', row.get('gps_longitude', '')).strip()
            speed = row.get('speed', row.get('gps_speed', '')).strip()

            if lat and lon and lat != '0' and lon != '0':
                try:
                    lat_f = float(lat)
                    lon_f = float(lon)
                    speed_f = float(speed) if speed else 0
                    if speed_f > 0.5:  # Only include moving points
                        all_coords.append([lat_f, lon_f, speed_f, i])
                except:
                    pass

print(f"Total GPS points collected: {len(all_coords)}")

if len(all_coords) == 0:
    print("ERROR: No valid GPS coordinates found!")
    exit(1)

# Sample points evenly around the track (about 50-60 points for smooth outline)
sample_rate = max(1, len(all_coords) // 55)
outline = all_coords[::sample_rate]

# Extract just lat/lon
outline_coords = [[pt[0], pt[1]] for pt in outline]

# Close the loop if needed
if len(outline_coords) > 0:
    first = outline_coords[0]
    last = outline_coords[-1]
    dist = np.sqrt((first[0] - last[0])**2 + (first[1] - last[1])**2)
    if dist > 0.0001:  # If not already closed
        outline_coords.append(first)

print(f"Track outline points: {len(outline_coords)}")

# Calculate center point
lats = [pt[0] for pt in outline_coords]
lons = [pt[1] for pt in outline_coords]
center_lat = sum(lats) / len(lats)
center_lon = sum(lons) / len(lons)

print(f"\nCenter point: [{center_lat}, {center_lon}]")

print("\n// University Test Drive Track GPS coordinates:")
print("outline: [")
for lat, lon in outline_coords:
    print(f"    [{lat}, {lon}],")
print("]")
