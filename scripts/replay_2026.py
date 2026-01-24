import paho.mqtt.client as mqtt
import pandas as pd
import json
import time

# HiveMQ Broker (matches dashboard configuration)
BROKER = "8fac0c92ea0a49b8b56f39536ba2fd78.s1.eu.hivemq.cloud"
PORT = 8884
TOPIC = "car/telemetry"
USERNAME = "ShellJM"
PASSWORD = "psuEcoteam1st"

# Load 2026 test drive data
file_path = "data/2026/test_drive_1.csv"
print(f"Loading 2026 data from: {file_path}")
df = pd.read_csv(file_path)

# Filter out invalid GPS data for smooth playback
df_clean = df[(df['latitude'].notna()) &
              (df['longitude'].notna()) &
              (df['latitude'] != 0) &
              (df['longitude'] != 0)].copy()

print(f"Loaded {len(df_clean)} telemetry records (filtered from {len(df)} total)")

# Calculate stats
print(f"\nData Statistics:")
print(f"  Voltage: {df_clean['voltage'].min():.2f}V - {df_clean['voltage'].max():.2f}V")
print(f"  Current: {df_clean['current'].min():.2f}A - {df_clean['current'].max():.2f}A")
print(f"  Speed: {df_clean['speed'].min():.2f} - {df_clean['speed'].max():.2f} km/h")
print(f"  Distance: {df_clean['distance_km'].min():.3f} - {df_clean['distance_km'].max():.3f} km")

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("\n[OK] Connected to MQTT Broker")
    else:
        print(f"\n[ERROR] Connection failed with code {rc}")

def publish_data():
    client = mqtt.Client()
    client.username_pw_set(USERNAME, PASSWORD)
    client.tls_set()
    client.on_connect = on_connect

    print(f"\nConnecting to {BROKER}:{PORT}...")
    client.connect(BROKER, PORT, 60)
    client.loop_start()

    time.sleep(2)  # Wait for connection

    print(f"\n>> Starting replay of 2026 test drive data at 10Hz")
    print(f">> Publishing to topic: {TOPIC}")
    print("-" * 70)

    prev_dist = 0
    for index, row in df_clean.iterrows():
        # Convert data to dashboard format
        payload = {
            "voltage": float(row["voltage"]) if pd.notna(row["voltage"]) else 0,
            "current": float(row["current"]) if pd.notna(row["current"]) else 0,
            "power": float(row["power"]) if pd.notna(row["power"]) else 0,
            "speed": float(row["speed"]) if pd.notna(row["speed"]) else 0,
            "rpm": float(row["speed"]) * 50 if pd.notna(row["speed"]) else 0,  # Estimate
            "distance_km": float(row["distance_km"]) if pd.notna(row["distance_km"]) else prev_dist,
            "latitude": float(row["latitude"]),
            "longitude": float(row["longitude"])
        }

        prev_dist = payload["distance_km"]

        # Publish
        payload_json = json.dumps(payload)
        client.publish(TOPIC, payload_json, qos=0)

        # Progress indicator every 100 messages
        if index % 100 == 0:
            print(f"[{index:5d}/{len(df_clean)}] {(index/len(df_clean)*100):5.1f}% | "
                  f"Speed: {payload['speed']:5.1f} km/h | "
                  f"Voltage: {payload['voltage']:5.2f}V | "
                  f"Current: {payload['current']:5.2f}A | "
                  f"GPS: {payload['latitude']:.6f}, {payload['longitude']:.6f}")

        time.sleep(0.1)  # 10Hz (100ms between messages)

    print("-" * 70)
    print(f"[DONE] Replay complete! Published {len(df_clean)} messages")
    print(f"\nTo view the dashboard:")
    print(f"  Local: file:///C:/Users/Juju/Desktop/shell/dashboardPSU_ECOteam/index.html")
    print(f"  Or open: app/index.html in your browser")

    client.loop_stop()
    client.disconnect()

if __name__ == "__main__":
    print("="*70)
    print("  PSU Racing - 2026 Test Drive Replay")
    print("="*70)
    publish_data()
