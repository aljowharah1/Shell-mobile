import pandas as pd
import json

# Load CSV file
file_path = "data/2025/data/Attempt1.csv"
print(f"Loading data from: {file_path}")
df = pd.read_csv(file_path)

# Extract GPS coordinates
gps_coords = []
prev_lat = None
prev_lon = None
min_distance = 0.0001  # ~10 meters minimum distance between points

for index, row in df.iterrows():
    lat = row["gps_latitude"]
    lon = row["gps_longitude"]

    # Skip if GPS is invalid
    if pd.isna(lat) or pd.isna(lon) or lat == 0 or lon == 0:
        continue

    # Skip if too close to previous point (reduce density)
    if prev_lat is not None and prev_lon is not None:
        dist = ((lat - prev_lat)**2 + (lon - prev_lon)**2)**0.5
        if dist < min_distance:
            continue

    gps_coords.append([lat, lon])
    prev_lat = lat
    prev_lon = lon

print(f"Extracted {len(gps_coords)} GPS points")

# Calculate center (start/finish line - first point)
if len(gps_coords) > 0:
    center_lat = gps_coords[0][0]
    center_lon = gps_coords[0][1]
    print(f"Center (Start/Finish): [{center_lat}, {center_lon}]")

    # Calculate bounds for zoom level
    lats = [coord[0] for coord in gps_coords]
    lons = [coord[1] for coord in gps_coords]
    lat_range = max(lats) - min(lats)
    lon_range = max(lons) - min(lons)
    print(f"Latitude range: {min(lats):.6f} to {max(lats):.6f} (range: {lat_range:.6f})")
    print(f"Longitude range: {min(lons):.6f} to {max(lons):.6f} (range: {lon_range:.6f})")

    # Generate JavaScript code for dashboard
    print("\n" + "=" * 60)
    print("Copy this into your app/script.js file:")
    print("=" * 60)
    print(f"""
const LUSAIL_SHORT = {{
    center: [{center_lat}, {center_lon}],
    zoom: 17,
    outline: {json.dumps(gps_coords, indent=8)}
}};
""")

    # Save to file
    output_file = "scripts/track_outline.json"
    with open(output_file, 'w') as f:
        track_data = {
            "center": [center_lat, center_lon],
            "zoom": 17,
            "outline": gps_coords
        }
        json.dump(track_data, f, indent=2)
    print(f"\n✅ Track outline saved to: {output_file}")
    print(f"Total track points: {len(gps_coords)}")

else:
    print("❌ No valid GPS coordinates found!")
