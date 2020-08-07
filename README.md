# Homebridge SynTex Webhooks
A simple plugin to control and to create HTTP devices.<br>
This plugin is made to cooperate with Homebridge: https://github.com/nfarina/homebridge<br>
It stores accessory data you can request to display the content on your website / app.


# Installation
1. Install homebridge using: `sudo npm install -g homebridge`
2. Install this plugin using: `sudo npm install -g homebridge-syntex-webhooks`
3. Update your `config.json` file. See snippet below.
4. Restart the Homebridge Service with `sudo systemctl restart homebridge; sudo journalctl -fau homebridge`.


# Example Config
**Info:** If the directory for the storage can't be created you have to do it by yourself and give it full write permissions!
- `sudo chown -R homebridge ./SynTex/` ( *permissions only for homebridge* )
- `sudo chmod 777 -R homebridge ./SynTex/` ( *permissions for many processes* )
- For the mac address you can use either a `real mac address` or another `random unique text`
- Every device needs these configurations: `mac`, `name` and `service`
- For lights GET parameters are included to the URL ( *[ url ]?r=0&b=0&b=0* )

```
"platforms": [
    {
        "platform": "SynTexWebHooks",
        "port": 1710,
        "cache_directory": "./SynTex/",
        "log_directory": "./SynTex/log",
        "devices": [
            {
                "mac": "sensor1",
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
                    {"type" : "light", "name" : "Third"},
                    {"type" : "leak", "name" : "Leak"},
                    {"type" : "smoke", "name" : "Smoke"},
                    {"type" : "occupancy", "name" : "Present"}
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
            },
            {
                "mac": "event1",
                "name": "Events",
                "services": "statelessswitch",
                "buttons": 1
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
---
- For accessories with multiple service types add `&type=`  **SERVICETYPE**
- For accessories with multiple services with more than one of the same service types add `&counter=`  **SERVICENUMBER**\
( *First of that type = 0, second = 1 ..* )

**Example:**  `http://homebridge.local/devices?mac=multi2&type=light&counter=0&value=20.5`\
( *Updates the value of `Third` to `20.5 LUX` from the Example Config* )


# Read HTTP Device Values
1. Open `http://`  **Bridge IP**  `/devices?mac=`  **Device Mac**
2. Insert the `Bridge IP` and `Device Mac`
---
- For accessories with multiple service types add `&type=`  **SERVICETYPE**
- For accessories with multiple services with more than one of the same service types add `&counter=`  **SERVICENUMBER**\
( *First of that type = 0, second = 1 ..* )

**Example:**  `http://homebridge.local/devices?mac=multi1&type=switch&counter=1`\
( *Reads the value of `Second` from the Example Config* )


# Currently Supported
- Temperature Sensor
- Humidity Sensor
- Light Sensor
- Leak Sensor
- Motion Sensor
- Contact Sensor
- Smoke Sensor
- Occupancy Sensor
- Airquality Sensor
- Switch / Relais
- RGB Lights

# NEW
- Added support for complex accessory with multiple services
