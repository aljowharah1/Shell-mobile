import json
import re

# Load track outline
with open('scripts/track_outline.json', 'r') as f:
    track_data = json.load(f)

center = track_data['center']
outline = track_data['outline']

print(f"Track Center: {center}")
print(f"Track Points: {len(outline)}")

# Generate the JavaScript code for LUSAIL_SHORT
js_track_code = f"""const LUSAIL_SHORT = {{
    center: {json.dumps(center)},
    zoom: {track_data['zoom']},
    outline: {json.dumps(outline, indent=8)}
}};"""

# Files to update
files_to_update = [
    'app/script.js',
    'script.js'
]

for file_path in files_to_update:
    print(f"\nUpdating {file_path}...")

    # Read the file
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find and replace the LUSAIL_SHORT definition
    # Pattern matches: const LUSAIL_SHORT = { ... };
    pattern = r'const LUSAIL_SHORT = \{[^}]*center:[^,]*,\s*zoom:[^,]*,\s*outline:\s*\[[^\]]*(?:\[[^\]]*\][^\]]*)*\]\s*\};'

    if re.search(pattern, content, re.DOTALL):
        # Replace the old track data with new
        new_content = re.sub(pattern, js_track_code, content, flags=re.DOTALL)

        # Write back to file
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)

        print(f"  Updated successfully!")
    else:
        print(f"  Could not find LUSAIL_SHORT definition in {file_path}")

print("\nDone! Track outline has been updated in the dashboard.")
