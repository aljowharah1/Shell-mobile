#!/usr/bin/env python3
"""
MQTT Replay Script for Mishal 29 Dec Test Drive
Reads Mishal29dec01-uni.csv and publishes data to MQTT broker
"""

import csv
import json
import time
import paho.mqtt.client as mqtt
from datetime import datetime

# MQTT Configuration (same as dashboard)
MQTT_BROKER = "8fac0c92ea0a49b8b56f39536ba2fd78.s1.eu.hivemq.cloud"
MQTT_PORT = 8883
MQTT_USER = "ShellJM"
MQTT_PASS = "psuEcoteam1st"
MQTT_TOPIC = "car/telemetry"

# File to replay
CSV_FILE = "Mishal29dec01-uni.csv"

# Playback speed multiplier (1.0 = real-time, 2.0 = 2x speed, 0.5 = half speed)
PLAYBACK_SPEED = 1.0

def on_connect(client, userdata, flags, reason_code, properties):
    if reason_code == 0:
        print("[OK] Connected to MQTT broker")
    else:
        print(f"[ERROR] Connection failed with code {reason_code}")

def on_publish(client, userdata, mid, reason_code, properties):
    pass  # Silent publish confirmation

def main():
    print("=" * 60)
    print("MQTT Replay: Mishal 29 Dec Test Drive")
    print("=" * 60)

    # Setup MQTT client
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    client.username_pw_set(MQTT_USER, MQTT_PASS)
    client.tls_set()  # Enable TLS for secure connection
    client.on_connect = on_connect
    client.on_publish = on_publish

    print(f"Connecting to {MQTT_BROKER}:{MQTT_PORT}...")
    try:
        client.connect(MQTT_BROKER, MQTT_PORT, 60)
        client.loop_start()
        time.sleep(2)  # Wait for connection
    except Exception as e:
        print(f"[ERROR] Connection error: {e}")
        return

    # Read and replay CSV data
    print(f"\nReading {CSV_FILE}...")
    print(f"Playback speed: {PLAYBACK_SPEED}x")
    print(f"Publishing to topic: {MQTT_TOPIC}")
    print("\n" + "=" * 60)

    row_count = 0
    start_time = None
    last_timestamp = None

    try:
        with open(CSV_FILE, 'r') as f:
            reader = csv.DictReader(f)

            for row in reader:
                row_count += 1

                # Parse timestamp
                try:
                    current_timestamp = datetime.fromisoformat(row['timestamp'].replace('Z', '+00:00'))
                except:
                    continue

                # Calculate delay between messages
                if last_timestamp is not None:
                    delay = (current_timestamp - last_timestamp).total_seconds()
                    delay = delay / PLAYBACK_SPEED  # Apply playback speed
                    if delay > 0:
                        time.sleep(delay)

                last_timestamp = current_timestamp

                # Prepare telemetry message
                telemetry = {
                    "timestamp": row['timestamp'],
                    "voltage": float(row['voltage']) if row['voltage'] else 0,
                    "current": float(row['current']) if row['current'] else 0,
                    "power": float(row['power']) if row['power'] else 0,
                    "speed": float(row['speed']) if row['speed'] else 0,
                    "rpm": float(row['rpm']) if row['rpm'] else 0,
                    "distance_km": float(row['distance_km']) if row['distance_km'] else 0,
                    "latitude": float(row['latitude']) if row['latitude'] else 0,
                    "longitude": float(row['longitude']) if row['longitude'] else 0,
                    "total_energy_wh": float(row['total_energy_wh']) if row['total_energy_wh'] else 0,
                    "efficiency_km_per_kwh": float(row['efficiency_km_per_kwh']) if row['efficiency_km_per_kwh'] else 0,
                    "consumption_wh_per_km": float(row['consumption_wh_per_km']) if row['consumption_wh_per_km'] else 0
                }

                # Publish to MQTT
                payload = json.dumps(telemetry)
                result = client.publish(MQTT_TOPIC, payload, qos=1)

                # Print progress every 100 rows
                if row_count % 100 == 0:
                    print(f"[SENT] {row_count} messages | Speed: {telemetry['speed']:.1f} km/h | "
                          f"Lat: {telemetry['latitude']:.6f}, Lon: {telemetry['longitude']:.6f}")

    except FileNotFoundError:
        print(f"[ERROR] File not found: {CSV_FILE}")
        print("Make sure the script is run from the dashboardPSU_ECOteam directory")
        return
    except KeyboardInterrupt:
        print("\n\n[INFO] Playback interrupted by user")
    except Exception as e:
        print(f"\n[ERROR] Error during playback: {e}")
    finally:
        print("\n" + "=" * 60)
        print(f"[DONE] Replay complete! Sent {row_count} telemetry messages")
        print("=" * 60)
        client.loop_stop()
        client.disconnect()

if __name__ == "__main__":
    main()