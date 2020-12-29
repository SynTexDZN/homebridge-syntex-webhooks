# Homebridge SynTex Webhooks
A simple plugin to control and to create HTTP devices.<br>
This plugin is made to cooperate with Homebridge: https://github.com/nfarina/homebridge<br>
It stores accessory data you can request to display the content on your website / app.

[![NPM Recommended Version](https://img.shields.io/npm/v/homebridge-syntex-webhooks?label=release&color=brightgreen)](https://www.npmjs.com/package/homebridge-syntex-webhooks)
[![NPM Beta Version](https://img.shields.io/npm/v/homebridge-syntex-webhooks/beta?color=orange&label=beta)](https://www.npmjs.com/package/homebridge-syntex-webhooks)
[![GitHub Commits](https://badgen.net/github/commits/SynTexDZN/homebridge-syntex-webhooks?color=yellow)](https://github.com/SynTexDZN/homebridge-syntex-webhooks/commits)
[![NPM Downloads](https://badgen.net/npm/dt/homebridge-syntex-webhooks?color=purple)](https://www.npmjs.com/package/homebridge-syntex-webhooks)
[![GitHub Code Size](https://img.shields.io/github/languages/code-size/SynTexDZN/homebridge-syntex-webhooks?color=0af)](https://github.com/SynTexDZN/homebridge-syntex-webhooks)
[![Discord](https://img.shields.io/discord/442095224953634828?color=728ED5&label=discord)](https://discord.gg/XUqghtw4DE)

<br>

## Installation
1. Install homebridge using: `sudo npm install -g homebridge`
2. Install this plugin using: `sudo npm install -g homebridge-syntex-webhooks`
3. Update your `config.json` file. See snippet below.
4. Restart the Homebridge Service with: `sudo systemctl restart homebridge; sudo journalctl -fau homebridge`


## Example Config
**Info:** If the `log_directory` for the storage can't be created you have to do it by yourself and give it full write permissions!
- `sudo chown -R homebridge ./SynTex/` ( *permissions only for homebridge* )
- `sudo chmod 777 -R homebridge ./SynTex/` ( *permissions for many processes* )

```
"platforms": [
    {
        "platform": "SynTexWebHooks",
        "port": 1710,
        "language": "us",
        "cache_directory": "./SynTex/",
        "log_directory": "./SynTex/log",
        "accessories": [
            {
                "id": "sensor1",
                "name": "Contact",
                "services": "contact"
            },
            {
                "id": "EC:FA:BC:59:3F:3C",
                "name": "Climate",
                "services": [
                    "temperature",
                    "humidity"
                ]
            },
            {
                "id": "multi1",
                "name": "Multi Switch",
                "services": [
                    {"type": "switch", "name": "First"},
                    {"type": "switch", "name": "Second"}
                ]
            },
            {
                "id": "multi2",
                "name": "Multi Device",
                "services": [
                    {"type": "switch", "name": "First"},
                    {"type": "motion", "name": "Second"},
                    {"type": "light", "name": "Third"},
                    {"type": "rain", "name": "Leak"},
                    {"type": "smoke", "name": "Smoke"},
                    {"type": "occupancy", "name": "Present"}
                ]
            },
            {
                "id": "EC:FA:BC:59:3F:3F",
                "name": "Switch",
                "services": {
                    "type": "switch",
                    "requests": [
                        {
                            "trigger": "on",
                            "method": "GET",
                            "url": "http://192.168.178.100/switch?state=true"
                        },
                        {
                            "trigger": "off",
                            "method": "GET",
                            "url": "http://192.168.178.100/switch?state=false"
                        }
                    ]
                }
            },
            {
                "id": "EC:FA:BC:59:3F:30",
                "name": "Relais",
                "services": {
                    "type": "relais",
                    "requests": [
                        {
                            "trigger": "on",
                            "method": "GET",
                            "url": "http://192.168.178.101/switch?state=true"
                        },
                        {
                            "trigger": "off",
                            "method": "GET",
                            "url": "http://192.168.178.101/switch?state=false"
                        }
                    ]
                }
            },
            {
                "id": "light1",
                "name": "Dummy Light",
                "services": {
                    "type": "rgb",
                    "spectrum":  "RGB",
                    "requests": [
                        {
                            "trigger": "color",
                            "method": "GET",
                            "url": "http://192.168.178.163/color"
                        }
                    ]
                }
            },
            {
                "id": "event1",
                "name": "Events",
                "services": {
                    "type": "statelessswitch",
                    "buttons": 1
                }
            }
        ]
    }
]
```
### Required Parameters
- `platform` is always `SynTexMagicHome`
- `log_directory` The path where your logs are stored.
- `accessories` For the accessory config.

### Optional Parameters
- `port` To control your accessory over HTTP calls.
- `language` You can use your country initials if you want to change it *( Currently supported: `us`, `en`, `de` )*
- `debug` For further information because of troubleshooting and bug reports.
- `polling_interval` defines how often the plugin should chech the Magic Home Device state *( in seconds )*

### Accessory Config
- Every device needs these parameters: `id`, `name` and `services` *( required )*
- `id` has to be either a `real mac address` or another `random unique text` *( no duplicates! )*
- `name` could be anything.
- `services` Should be one of these: `temperature`, `humidity`, `light`, `leak`, `motion`, `contact`, `smoke`, `occupancy`, `airquality`, `switch`, `relais`, `outlet`, `led`, `dimmer`, `rgb`, `statelessswitch`
- For Boolean Devices you can add `requests` ( *trigger can be: on, off, color* )
- For RGB Lights you can add `spectrum` attribute ( *to convert to the right output format: RGB / HSL* )
- For Stateless Switches you have to add `buttons` attribute.


---


## Update HTTP Devices
1. Open `http://`  **Bridge IP**  `/devices?id=`  **Device ID**  `&value=`  **New Value**
2. Insert the `Bridge IP` and `Device ID`
3. For the `New Value` you can type these patterns:
- For boolean devices: `true` / `false` ( *leak, motion, contact, smoke, occupancy, switch, outlet* )
- For numeric devices: `10` / `12.4` ( *temperature, humidity, light, airquality* )
- For all light bulbs: `true` / `false` ( *led, dimmer, rgb* )
---
- For accessories with multiple service types add `&type=`  **SERVICETYPE**
- For accessories with multiple services with more than one of the same service types add `&counter=`  **SERVICENUMBER**\
( *First of that type = 0, second = 1 ..* )
- For dimmable and colored lights add `&brightness=`  **New Brightness** ( *has to be a number* )
- For colored lights add `&hue=`  **New Hue** ( *has to be a number* )
- For colored lights add `&saturation=`  **New Saturation** ( *has to be a number* )

**Example:**  `http://homebridge.local:1710/devices?id=multi2&type=light&counter=0&value=20.5`\
( *Updates the value of `Third` to `20.5 LUX` from the Example Config* )


## Read HTTP Device Values
1. Open `http://`  **Bridge IP**  `/devices?id=`  **Device ID**
2. Insert the `Bridge IP` and `Device ID`
- For accessories with multiple service types add `&type=`  **SERVICETYPE**
- For accessories with multiple services with more than one of the same service types add `&counter=`  **SERVICENUMBER**\
( *First of that type = 0, second = 1 ..* )

**Example:**  `http://homebridge.local:1710/devices?id=multi1&type=switch&counter=1`\
( *Reads the value of `Second` from the Example Config* )


## Remove Tuya Device
1. Open `http://`  **Bridge IP**  `/devices?id=`  **Device ID**  `&remove=CONFIRM`
2. Insert the `Bridge IP` and `Device ID`

**Example:**  `http://homebridge.local:1710/devices?id=sensor1&remove=CONFIRM`\
( *Removes `Contact` from the Example Config* )


## Currently Supported
- Temperature Sensor
- Humidity Sensor
- Light Sensor
- Leak Sensor
- Motion Sensor
- Contact Sensor
- Smoke Sensor
- Occupancy Sensor
- Airquality Sensor
- Stateless Switch
- Switch / Relais / Outlet
- LED Lights / Dimmable Lights / RGB Lights