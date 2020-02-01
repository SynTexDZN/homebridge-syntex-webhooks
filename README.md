# Homebridge SynTex Webhooks
A plugin to control and to create HTTP devices.


# Installation
1. Install homebridge using: `sudo npm install -g homebridge`
2. Install this plugin using: `sudo npm install -g homebridge-syntex-webhooks`
3. Update your configuration file. See snippet below.


# Example Config
**INFO:** If the directory for the storage can't be created you have to do it by yourself and give it full write permissions!
- For the mac address you can use either a `real mac address` or another `unique text`
- Every device needs these configurations: `mac`, `name` and `type`

```
"platforms": [
    {
        "platform": "SynTexWebhooks",
        "port": 1710,
        "cache_directory": "./SynTex/",
        "sensors": [
            {
                "mac": "EC:FA:BC:59:3F:3C",
                "name": "Temperature",
                "type": "temperature"
            },
            {
                "mac": "EC:FA:BC:59:3F:3C",
                "name": "Humidity",
                "type": "humidity"
            },
            {
                "mac": "EC:FA:BC:59:3F:3C",
                "name": "Light",
                "type": "light"
            },
            {
                "mac": "EC:FA:BC:59:3F:3C",
                "name": "Leak",
                "type": "leak"
            },
            {
                "mac": "sensor1",
                "name": "Motion",
                "type": "motion"
            },
            {
                "mac": "sensor2",
                "name": "Contact",
                "type": "contact"
            },
            {
                "mac": "sensor3",
                "name": "Smoke",
                "type": "smoke"
            },
            {
                "mac": "sensor4",
                "name": "Occupancy",
                "type": "occupancy"
            }
        ],
        "switches": [
            {
                "mac": "EC:FA:BC:59:3F:3C",
                "name": "Switch",
                "type": "switch",
                "on_method": "GET",
                "on_url": "http://192.168.178.164/switch?state=true",
                "off_method": "GET",
                "off_url": "http://192.168.178.164/switch?state=false"
            },
            {
                "mac": "EC:FA:BC:59:3F:3C",
                "name": "Relais",
                "type": "relais",
                "on_method": "GET",
                "on_url": "http://192.168.178.162/switch?state=true",
                "off_method": "GET",
                "off_url": "http://192.168.178.162/switch?state=false"
            },
            {
                "mac": "switch1",
                "name": "Dummy",
                "type": "switch"
            }
        ]
    }
]
```

# Update HTTP Devices
1. Open `http://`  **Bridge IP**  `/devices?mac=`  **Device Mac**  `&value=`  **New Value**
2. Insert the `Bridge IP` and `Device Mac`
3. For the `New Value` you can type these patterns:
- For boolean devices: `true` / `false`
- For numeric devices: `10` / `12.4`


# See HTTP Device Values
1. Open `http://`  **Bridge IP**  `/devices?mac=`  **Device Mac**
2. Insert the `Bridge IP` and `Device Mac`


# Currently Supported
- Temperature Sensor
- Humidity Sensor
- Light Sensor
- Leak Sensor
- Motion Sensor
- Contact Sensor
- Smoke Sensor
- Occupancy Sensor
- Switch