import time
import logging
from paho import mqtt
import paho.mqtt.client as paho
import json

def on_connect(client, userdata, flags, rc, properties=None):
    print("CONNACK received with code %s." % rc)


def on_publish(client, userdata, mid, properties=None):
    print("mid: " + str(mid))

def on_subscribe(client, userdata, mid, granted_qos, properties=None):
    print("Subscribed: " + str(mid) + " " + str(granted_qos))


FIRST_RECONNECT_DELAY = 1
RECONNECT_RATE = 2
MAX_RECONNECT_COUNT = 12
MAX_RECONNECT_DELAY = 60

def on_disconnect(client, userdata, rc):
    logging.info("Disconnected with result code: %s", rc)
    reconnect_count, reconnect_delay = 0, FIRST_RECONNECT_DELAY
    while reconnect_count < MAX_RECONNECT_COUNT:
        logging.info("Reconnecting in %d seconds...", reconnect_delay)

        time.sleep(reconnect_delay)

        try:
            client.reconnect()
            logging.info("Reconnected successfully!")
            return
        except Exception as err:
            logging.error("%s. Reconnect failed. Retrying...", err)

        reconnect_delay *= RECONNECT_RATE
        reconnect_delay = min(reconnect_delay, MAX_RECONNECT_DELAY)
        reconnect_count += 1
    logging.info("Reconnect failed after %s attempts. Exiting...", reconnect_count)


class MQTTConnector:
    def __init__(self, broker_address, port, username, password, protocol=paho.MQTTv31, tls=None):
        protocol = paho.MQTTv5
        tls = mqtt.client.ssl.PROTOCOL_TLS
        self.connected = False
        self.client = paho.Client(client_id="", userdata=None, protocol=protocol)
        self.client.on_connect = on_connect
        if tls:
            self.client.tls_set(tls_version=tls)
        self.client.username_pw_set(username, password)
        self.client.connect(broker_address, port)
        self.client.on_subscribe = on_subscribe
        self.client.on_message = self.on_message
        self.client.on_publish = on_publish
        self.client.on_disconnect = on_disconnect
        self.msg = None
        self.get_msg = 0
        pass
    def on_message(self, client, userdata, msg):
        # self.msg = {
        #     'topic': str(msg.topic),
        #     'payload': str(msg.payload),
        #     'qos': str(msg.qos),
        #     'timestamp': str(time.time()),
        # }
        self.get_msg = 1
        self.msg = json.loads(msg.payload)
        print(msg.payload)
        pass

    def send_turn_on(self):
        topic_send = "ESP32/MC38"
        time_sent = int(time.time())
        self.msg = {
            'payload': 1,
            'qos': 0,
            'timestamp': int(time.time()),
        }
        payload_json = json.dumps(self.msg)
        self.client.publish(topic_send, payload_json)

    def send_turn_off(self):
        topic_send = "ESP32/MC38"
        time_sent = int(time.time())
        self.msg = {
            'payload': 0,
            'qos': 0,
            'timestamp': int(time.time()),
        }
        payload_json = json.dumps(self.msg)
        self.client.publish(topic_send, payload_json)


if __name__ == '__main__':
    broker_address = "ed1cd23213b14ea2a47d388637fce5d1.s1.eu.hivemq.cloud"
    port = 8883
    username = "adminiot"
    password = "Adminiot123"

    broker_address = "mqtt-dashboard.com"
    port = 1883
    username = "b20dcat170"
    password = "Thanhtung170"

    conn = MQTTConnector(broker_address, port, username, password, protocol=paho.MQTTv31, tls=None)
    # conn = MQTTConnector(broker_address, port, username, password, protocol=paho.MQTTv5, tls=mqtt.client.ssl.PROTOCOL_TLS)

    topic = "e"
    conn.client.subscribe(topic, qos=0)
    start = -1
    conn.client.publish(topic, "abc",qos=0)
    conn.client.loop_forever()