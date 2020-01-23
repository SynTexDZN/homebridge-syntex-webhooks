# Homebridge SynTex Webhooks
A plugin to control and to create HTTP devices.


# Installation
1. Install homebridge using: `sudo npm install -g homebridge`
2. Install this plugin using: `sudo npm install -g homebridge-syntex-webhooks`
3. Update your configuration file. See snippet below.


# Example Config
**INFO:** If the directory for the storage can't be created you have to do it by yourself and give it full write permissions!
```
"platforms": [
    {
        "platform": "SynTexWebhooks",
        "port": 1710,
        "cache_directory": "./SynTex/",
        "sensors": [],
        "switches": []
    }
]
```

# Update HTTP Devices
1. Open `http://<bridgeIP>/devices?mac=<bridgeMac>&value=<newValue>`
2. Insert the `Bridge IP` and `Device Mac`
3. For the `New Value` you can type these patterns:
- For boolean devices: `true` / `false`
- For numeric devices: `10` / `12.4`


# See HTTP Device Values
1. Open `http://<bridgeIP>/devices?mac=<bridgeMac>`
2. Insert the `Bridge IP` and `Device Mac`


# Currently Supported
- Temperature Sensor
- Humidity Sensor
- Light Sensor
- Leak Sensor
- Motion Sensor
- Contact Sensor
- Switch