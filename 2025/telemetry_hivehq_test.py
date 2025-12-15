import paho.mqtt.client as mqtt
import pandas as pd
import json
import time

# HiveMQ Broker Details (Update with your credentials)
BROKER = "d4ac669e97f84b698c56fca5c36606dc.s1.eu.hivemq.cloud"  # Change if using a private HiveMQ instance
PORT = 8883  # for SSL
TOPIC = "telemetry/vehicle"  # Change to your preferred topic
USERNAME = "admin"  # Replace with your MQTT username
PASSWORD = "admin1PSU"  # Replace with your MQTT password

# Load CSV Data
file_path = "test.csv"
df = pd.read_csv(file_path)

def on_connect(client, userdata, flags, rc):
    print("Connected to MQTT Broker with result code", rc)

def publish_data():
    client = mqtt.Client()
    client.username_pw_set(USERNAME, PASSWORD)
    client.tls_set()
    client.on_connect = on_connect
    client.connect(BROKER, PORT, 60)
    client.loop_start()

    for index, row in df.iterrows():
        payload = {
            "timestamp": row["obc_timestamp"],
            "gps": {
                "latitude": row["gps_latitude"],
                "longitude": row["gps_longitude"],
                "speed": row["gps_speed"]
            },
            "vehicle": {
                "voltage": row["jm3_voltage"],
                "current": row["jm3_current"],
                "net_joule": row["jm3_netjoule"]
            },
            "lap": {
                "lap_distance": row["lap_dist"],
                "lap_energy": row["lap_jm3_netjoule"]
            },
            "message_id": row["message_id"]
        }
        
        # Publish single payload
        payload_json = json.dumps(payload)
        client.publish(TOPIC, payload_json)
        print(f"Published: {payload_json}")
        time.sleep(0.1)  # Simulating real-time data transfer
    
    client.loop_stop()
    client.disconnect()

if __name__ == "__main__": 
    publish_data()
