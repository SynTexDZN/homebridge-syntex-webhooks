# Homebridge Syntex Webhooks
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


# Currently Supported
- Temperature Sensor
- Humidity Sensor
- Light Sensor
- Leak Sensor
- Motion Sensor
- Contact Sensor
- Switch