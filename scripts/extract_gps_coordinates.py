import csv
import os

# File paths
files = [
    "Mishal29dec01-uni.csv",
    "Ahmed24Dec-uni.csv",
    "Mishal25Dec-uni.csv",
    "Ahmed25Dec-uni.csv",
    "Aziz27Dec -uni.csv",
    "data/2025/practice1/inuniithink1.csv",
    "data/2025/practice1/inuniithink2.csv"
]

base_path = r"c:\Users\Juju\Desktop\shell - Copy\dashboardPSU_ECOteam"

# Collect all coordinates where speed > 0.5
all_coords = []

for file in files:
    file_path = os.path.join(base_path, file)
    print(f"Processing {file}...")

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)

            for row in reader:
                try:
                    speed = float(row['speed'])
                    lat = float(row['latitude'])
                    lon = float(row['longitude'])

                    # Filter by speed > 0.5 km/h and valid coordinates
                    if speed > 0.5 and lat != 0 and lon != 0:
                        all_coords.append([lat, lon])
                except (ValueError, KeyError):
                    continue

        print(f"  Found {len([c for c in all_coords])} total valid coordinates so far")
    except Exception as e:
        print(f"  Error reading {file}: {e}")

print(f"\nTotal coordinates collected: {len(all_coords)}")

# Sample about 50-60 evenly spaced points
target_points = 55
if len(all_coords) > target_points:
    step = len(all_coords) // target_points
    sampled_coords = all_coords[::step][:target_points]
else:
    sampled_coords = all_coords

print(f"Sampled {len(sampled_coords)} points")

# Calculate center point
if sampled_coords:
    avg_lat = sum(c[0] for c in sampled_coords) / len(sampled_coords)
    avg_lon = sum(c[1] for c in sampled_coords) / len(sampled_coords)

    print(f"\nCenter point: [{avg_lat}, {avg_lon}]")

    # Output JavaScript array format
    print("\n// Copy this into your script.js:")
    print("outline: [")
    for coord in sampled_coords:
        print(f"    [{coord[0]}, {coord[1]}],")
    print("]")

    print(f"\n// Center point:")
    print(f"center: [{avg_lat}, {avg_lon}]")
else:
    print("No valid coordinates found!")
