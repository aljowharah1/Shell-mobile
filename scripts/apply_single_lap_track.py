import json
import re

# Load the single lap track data
with open('scripts/single_lap_track.json', 'r') as f:
    track_data = json.load(f)

print(f"Center: {track_data['center']}")
print(f"Stop Line: {track_data['stopLine']}")
print(f"Track Points: {len(track_data['outline'])}")

# Create the new LUSAIL_SHORT JavaScript code
new_track_code = f"""/* ====== TRACK DATA (Single Lap - 2026 Test Drive) ====== */
// Single clean lap from 2026 test_drive_1.csv ({len(track_data['outline'])} points)
// Start position: Averaged from 2025 & 2026 data
// Stop line: Mandatory stop position from 2025 data
const LUSAIL_SHORT = {{
    center: {json.dumps(track_data['center'])}, // Start position (averaged from both years)
    stopLine: {json.dumps(track_data['stopLine'])}, // Mandatory stop line (2025 data)
    zoom: {track_data['zoom']},
    turns: [],
    outline: {json.dumps(track_data['outline'], separators=(',', ':'))}
}};"""

# Files to update
files = ['app/script.js']

for file_path in files:
    print(f"\nUpdating {file_path}...")

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Pattern to match the entire LUSAIL_SHORT definition
    # Matches from "/* ====== TRACK DATA" to the closing "};"
    pattern = r'/\* ====== TRACK DATA.*?const LUSAIL_SHORT = \{.*?\n\};'

    if re.search(pattern, content, re.DOTALL):
        # Replace with new track data
        new_content = re.sub(pattern, new_track_code, content, flags=re.DOTALL)

        # Write back
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)

        print(f"  [OK] Updated successfully!")
    else:
        print(f"  [ERROR] Could not find LUSAIL_SHORT in {file_path}")

print("\nDone! Dashboard updated with single lap track.")
print(f"  Start: {track_data['center']}")
print(f"  Stop:  {track_data['stopLine']}")
