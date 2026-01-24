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

# Load Attempt1 CSV Data
file_path = "data/2025/data/Attempt1.csv"
print(f"Loading data from: {file_path}")
df = pd.read_csv(file_path)
print(f"Loaded {len(df)} telemetry records")

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("✅ Connected to MQTT Broker")
    else:
        print(f"❌ Connection failed with code {rc}")

def publish_data():
    client = mqtt.Client()
    client.username_pw_set(USERNAME, PASSWORD)
    client.tls_set()
    client.on_connect = on_connect

    print(f"Connecting to {BROKER}:{PORT}...")
    client.connect(BROKER, PORT, 60)
    client.loop_start()

    time.sleep(2)  # Wait for connection

    print(f"\n🚀 Starting replay of Attempt1 data at 10Hz (100ms intervals)")
    print(f"📡 Publishing to topic: {TOPIC}")
    print("-" * 60)

    for index, row in df.iterrows():
        # Convert data to dashboard format
        payload = {
            "voltage": float(row["jm3_voltage"]) / 1000.0 if pd.notna(row["jm3_voltage"]) else 0,  # Convert mV to V
            "current": float(row["jm3_current"]) if pd.notna(row["jm3_current"]) else 0,
            "power": (float(row["jm3_voltage"]) / 1000.0) * float(row["jm3_current"]) if pd.notna(row["jm3_voltage"]) and pd.notna(row["jm3_current"]) else 0,
            "speed": float(row["gps_speed"]) if pd.notna(row["gps_speed"]) else 0,
            "rpm": float(row["gps_speed"]) * 50 if pd.notna(row["gps_speed"]) else 0,  # Estimate
            "distance_km": float(row["dist"]) / 1000.0 if pd.notna(row["dist"]) else 0,  # Convert m to km
            "latitude": float(row["gps_latitude"]) if pd.notna(row["gps_latitude"]) else 0,
            "longitude": float(row["gps_longitude"]) if pd.notna(row["gps_longitude"]) else 0
        }

        # Publish
        payload_json = json.dumps(payload)
        client.publish(TOPIC, payload_json, qos=0)

        # Progress indicator every 100 messages
        if index % 100 == 0:
            print(f"📊 Progress: {index}/{len(df)} ({(index/len(df)*100):.1f}%) - Speed: {payload['speed']:.1f} km/h, Pos: {payload['latitude']:.6f}, {payload['longitude']:.6f}")

        time.sleep(0.1)  # 10Hz (100ms between messages)

    print("-" * 60)
    print(f"✅ Replay complete! Published {len(df)} messages")

    client.loop_stop()
    client.disconnect()

if __name__ == "__main__":
    publish_data()
