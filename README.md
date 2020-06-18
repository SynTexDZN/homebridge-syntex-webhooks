# Homebridge SynTex Webhooks
A plugin to control and to create HTTP devices.


# Installation
1. Install homebridge using: `sudo npm install -g homebridge`
2. Install this plugin using: `sudo npm install -g homebridge-syntex-webhooks`
3. Update your configuration file. See snippet below.


# Example Config
**INFO:** If the directory for the storage can't be created you have to do it by yourself and give it full write permissions!
- `sudo chown -R homebridge ./SynTex/` ( *permissions only for homebridge* )
- `sudo chmod 777 -R homebridge ./SynTex/` ( *permissions for many processes* )
- For the mac address you can use either a `real mac address` or another `unique text`
- Every device needs these configurations: `mac`, `name` and `type`
- For lights GET parameters are added to the URL ( *Pattern: [ url ]?r=0&b=0&b=0* )

```
"platforms": [
    {
        "platform": "SynTexWebHooks",
        "port": 1710,
        "cache_directory": "./SynTex/",
        "log_directory": "./SynTex/log",
        "devices": [
            {
                "mac": "sensor",
                "name": "Contact",
                "services": "contact"
            },
            {
                "mac": "EC:FA:BC:59:3F:3C",
                "name": "Climate",
                "services": [
                    "temperature",
                    "humidity"
                ]
            },
            {
                "mac": "multi1",
                "name": "Multi Switch",
                "services": [
                    {"type" : "switch", "name" : "First"},
                    {"type" : "switch", "name" : "Second"}
                ]
            },
            {
                "mac": "multi2",
                "name": "Multi Device",
                "services": [
                    {"type" : "switch", "name" : "First"},
                    {"type" : "motion", "name" : "Second"},
                    {"type" : "light", "name" : "Second"},
                    {"type" : "leak", "name" : "Second"},
                    {"type" : "smoke", "name" : "Second"},
                    {"type" : "occupancy", "name" : "Second"}
                ]
            },
            {
                "mac": "EC:FA:BC:59:3F:3C",
                "name": "Switch",
                "services": "switch",
                "on_method": "GET",
                "on_url": "http://192.168.178.100/switch?state=true",
                "off_method": "GET",
                "off_url": "http://192.168.178.100/switch?state=false"
            },
            {
                "mac": "EC:FA:BC:59:3F:3C",
                "name": "Relais",
                "services": "relais",
                "on_method": "GET",
                "on_url": "http://192.168.178.101/switch?state=true",
                "off_method": "GET",
                "off_url": "http://192.168.178.101/switch?state=false"
            },
            {
                "mac": "light1",
                "name": "Dummy Light",
                "services": "rgb",
                "url": "http://192.168.178.163/color"
            }
        ]
    }
]
```

# Update HTTP Devices
1. Open `http://`  **Bridge IP**  `/devices?mac=`  **Device Mac**  `&value=`  **New Value**
2. Insert the `Bridge IP` and `Device Mac`
3. For the `New Value` you can type these patterns:
- For boolean devices: `true` / `false` ( *leak, motion, contact, smoke, occupancy, switch* )
- For numeric devices: `10` / `12.4` ( *temperature, humidity, light* )
- For RGB lights devices: `true:210:78:50` ( *power state, hue, saturation, brightness* )


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
- Switch / Relais
- RGB Lights