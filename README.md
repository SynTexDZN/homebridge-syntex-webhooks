# Homebridge SynTex WebHooks
[![NPM Recommended Version](https://img.shields.io/npm/v/homebridge-syntex-webhooks?label=release&color=brightgree&style=for-the-badge)](https://www.npmjs.com/package/homebridge-syntex-webhooks)
[![NPM Beta Version](https://img.shields.io/npm/v/homebridge-syntex-webhooks/beta?color=orange&label=beta&style=for-the-badge)](https://www.npmjs.com/package/homebridge-syntex-webhooks)
[![NPM Downloads](https://img.shields.io/npm/dt/homebridge-syntex-webhooks?color=9944ee&&style=for-the-badge)](https://www.npmjs.com/package/homebridge-syntex-webhooks)
[![GitHub Commits](https://img.shields.io/github/commits-since/SynTexDZN/homebridge-syntex-webhooks/0.0.0?color=yellow&label=commits&style=for-the-badge)](https://github.com/SynTexDZN/homebridge-syntex-webhooks/commits)
[![GitHub Code Size](https://img.shields.io/github/languages/code-size/SynTexDZN/homebridge-syntex-webhooks?color=0af&style=for-the-badge)](https://github.com/SynTexDZN/homebridge-syntex-webhooks)

A simple plugin to control and to create HTTP devices.<br>
This plugin is made to cooperate with Homebridge: https://github.com/nfarina/homebridge<br>
It stores accessory data you can request to display the content on your website / app.


## Core Features
- **Device Control:** Create virtual accessory for your Homebridge.
- **HTTP Access:** Update and read device states via HTTP calls.
- **Automation:** We integrated our powerful automation API for fast and complex automation.


## Troubleshooting
#### [![GitHub Issues](https://img.shields.io/github/issues-raw/SynTexDZN/homebridge-syntex-webhooks?logo=github&style=for-the-badge)](https://github.com/SynTexDZN/homebridge-syntex-webhooks/issues)
- `Report` us your `Issues`
- `Join` our `Discord Server`
#### [![Discord](https://img.shields.io/discord/442095224953634828?color=5865F2&logoColor=white&label=discord&logo=discord&style=for-the-badge)](https://discord.gg/XUqghtw4DE)


---


## Installation
1. Install homebridge using: `sudo npm install -g homebridge`
2. Install this plugin using: `sudo npm install -g homebridge-syntex-webhooks`
3. Update your `config.json` file. See snippet below.
4. Restart the Homebridge Service with: `sudo systemctl restart homebridge; sudo journalctl -fau homebridge`


## Example Config
**Info:** If the `baseDirectory` for the storage can't be created you have to do it by yourself and give it full write permissions!
- `sudo mkdir -p /var/homebridge/SynTex/` *( create the directory )*
- `sudo chmod -R 777 /var/homebridge/SynTex/` *( permissions for many processes )*
- `sudo chown -R homebridge /var/homebridge/SynTex/` *( permissions only for homebridge )*

```json
"platforms": [
    {
        "platform": "SynTexWebHooks",
        "baseDirectory": "/var/homebridge/SynTex",
        "options": {
            "port": 1710,
            "language": "us"
        },
        "log": {
            "debug": false
        },
        "accessories": [
            {
                "id": "sensor1",
                "name": "Contact",
                "services": [
                    { "type": "contact" }
                ]
            },
            {
                "id": "EC:FA:BC:59:3F:3C",
                "name": "Climate",
                "services": [
                    { "type": "temperature" },
                    { "type": "humidity" }
                ]
            },
            {
                "id": "multi1",
                "name": "Multi Switch",
                "services": [
                    { "type": "switch", "name": "First" },
                    { "type": "switch", "name": "Second" }
                ]
            },
            {
                "id": "multi2",
                "name": "Multi Device",
                "services": [
                    { "type": "switch", "name": "First" },
                    { "type": "motion", "name": "Second" },
                    { "type": "light", "name": "Third" },
                    { "type": "leak", "name": "Leak" },
                    { "type": "smoke", "name": "Smoke" },
                    { "type": "occupancy", "name": "Present" }
                ]
            },
            {
                "id": "EC:FA:BC:59:3F:3F",
                "name": "Switch",
                "services": [
                    {
                        "type": "switch",
                        "requests": [
                            {
                                "trigger": "on",
                                "method": "GET",
                                "url": "http://192.168.1.100/switch?state=true"
                            },
                            {
                                "trigger": "off",
                                "method": "GET",
                                "url": "http://192.168.1.100/switch?state=false"
                            }
                        ]
                    }
                ],
                "pingURL": "http://192.168.1.100/ping"
            },
            {
                "id": "EC:FA:BC:59:3F:30",
                "name": "Relais",
                "services": [
                    {
                        "type": "relais",
                        "requests": [
                            {
                                "trigger": "on",
                                "method": "GET",
                                "url": "http://192.168.1.100/switch?state=true"
                            },
                            {
                                "trigger": "off",
                                "method": "GET",
                                "url": "http://192.168.1.100/switch?state=false"
                            }
                        ]
                    }
                ],
                "pingURL": "http://192.168.1.100/ping"
            },
            {
                "id": "light1",
                "name": "Dummy Dimmer",
                "services": [
                    {
                        "type": "dimmer",
                        "requests": [
                            {
                                "trigger": "dimmer",
                                "method": "GET",
                                "url": "http://192.168.1.100/brightness="
                            }
                        ]
                    }
                ],
                "pingURL": "http://192.168.1.100/ping"
            },
            {
                "id": "light2",
                "name": "Dummy Light",
                "services": [
                    {
                        "type": "rgb",
                        "spectrum":  "RGB",
                        "requests": [
                            {
                                "trigger": "color",
                                "method": "GET",
                                "url": "http://192.168.1.100/color"
                            }
                        ]
                    }
                ],
                "pingURL": "http://192.168.1.100/ping"
            },
            {
                "id": "event1",
                "name": "Events",
                "services": [
                    {
                        "type": "statelessswitch",
                        "buttons": 1
                    }
                ]
            },
            {
                "id": "blind1",
                "name": "Blind",
                "services": [
                    {
                        "type": "blind",
                        "delay": {
                            "up": 11000,
                            "down": 10000
                        }
                    }
                ]
            }
        ]
    }
]
```

### Required Parameters
- `platform` is always `SynTexWebHooks`
- `baseDirectory` The path where cache data is stored.
- `accessories` For the accessory config.

### Optional Parameters
- `port` To control your accessory over HTTP calls.
- `language` You can use your country initials if you want to change it *( Currently supported: `us`, `en`, `de` )*

### Log Parameters
- Disable certain log level: `error`, `warn`, `info`, `read`, `update`, `success` and `debug` *( for example `debug: false` )*

### Accessory Config
- Every accessory needs these parameters: `id`, `name` and `services` *( required )*
- `id` has to be either a `real mac address` or another `random unique text` *( no duplicates! )*
- `name` could be anything.
- `services` The services of your accessory.<br><br>
    - `name` could be anything.
    - `type` Define the service type *( `airquality`, `blind`, `contact`, `dimmer`, `fan`, `humidity`, `leak`, `led`, `light`, `motion`, `occupancy`, `outlet`, `rain`, `relais`, `rgb`, `smoke`, `statelessswitch`, `switch`, `temperature`, `thermostat` )*
    - For Boolean Devices you can add `requests` *( trigger can be: on, off, color )*
    - For RGB Lights you can add `spectrum` attribute *( to convert to the right output format: RGB / HSL )*
    - For Stateless Switches you have to add `buttons` attribute.<br><br>
- `pingURL` check the device connection.


---


## SynTex UI
Control and set up your devices by installing `homebridge-syntex`<br>
This plugin is made for plugin management, automation system and device control.<br><br>

Check out the GitHub page for more information:<br>
https://github.com/SynTexDZN/homebridge-syntex


## Update WebHooks Device
1. Open `http://`  **Bridge IP**  `/devices?id=`  **Device ID**  `&value=`  **New Value**
2. Insert the `Bridge IP` and `Device ID`
3. For the `New Value` you can type this pattern:
- For boolean devices: `true` / `false` *( contact, fan, leak, motion, occupancy, outlet, rain, smoke, switch )*
- For numeric devices: `10` / `12.4` *( airquality, blind, humidity, light, temperature, thermostat )*
- For all light bulbs: `true` / `false` *( dimmer, led, rgb )*
- For dimmable and colored lights add `&brightness=`  **New Brightness** *( has to be a number )*
- For colored lights add `&hue=`  **New Hue** *( has to be a number )*
- For colored lights add `&saturation=`  **New Saturation** *( has to be a number )*
- For thermostats add `&target=`  **New Target Temperature** *( has to be a number )*
- For thermostats add `&state=`  **New Current Heating Cooling State** *( has to be a number )*
- For thermostats add `&mode=`  **New Target Heating Cooling State** *( has to be a number )*
- For fans add `&direction=`  **New Rotation Direction** *( has to be a number )*
- For fans add `&speed=`  **New Rotation Speed** *( has to be a number )*
- For accessories with multiple service types add `&type=`  **SERVICETYPE**
- For accessories with multiple services with more than one of the same service type add `&counter=`  **SERVICENUMBER**\
*( First of that type = 0, second = 1 .. )*

**Example:**  `http://homebridge.local:1710/devices?id=ABCDEF1234567890&type=light&counter=0&value=20.5`\
*( Updates the value of `ABCDEF1234567890` to `20.5 LUX` for example )*


## Read WebHooks Device
1. Open `http://`  **Bridge IP**  `/devices?id=`  **Device ID**
2. Insert the `Bridge IP` and `Device ID`
- For accessories with multiple service types add `&type=`  **SERVICETYPE**
- For accessories with multiple services with more than one of the same service type add `&counter=`  **SERVICENUMBER**\
*( First of that type = 0, second = 1 .. )*

**Example:**  `http://homebridge.local:1714/devices?id=ABCDEF1234567890`\
*( Reads the state of `ABCDEF1234567890` for example )*


## Remove WebHooks Device
1. Open `http://`  **Bridge IP**  `/devices?id=`  **Device ID**  `&remove=CONFIRM`
2. Insert the `Bridge IP` and `Device ID`
- To remove a specific service add `&type=`  **SERVICETYPE**
- To remove a specific service from an accessory with more than one of the same service type add `&counter=`  **SERVICENUMBER**\
*( First of that type = 0, second = 1 .. )*

**Example:**  `http://homebridge.local:1710/devices?id=ABCDEF1234567890&remove=CONFIRM`\
*( Removes `ABCDEF1234567890` from the Config and Home App )*


---


## Automation
To enable the automation module you have to create a file named `automation.json` in your `baseDirectory >> automation` or install the `homebridge-syntex` plugin to create them via UI *( only between SynTex plugins )*<br><br>
**Example:**  For manual configuration update your `automation.json` file. See snippet below.   

```json
{
    "automation": [
        {
            "id": 0,
            "name": "Demo Automation",
            "active": true,
            "trigger": {
                "logic": "AND",
                "groups": [
                    {
                        "logic": "OR",
                        "blocks": [
                            {
                                "id": "multi2",
                                "name": "Multi Device",
                                "letters": "F0",
                                "plugin": "SynTexWebHooks",
                                "operation": "<",
                                "state": {
                                    "value": 1000
                                }
                            },
                            {
                                "operation": "=",
                                "time": "16:00",
                                "options": {
                                    "stateLock": true
                                }
                            }
                        ]
                    },
                    {
                        "logic": "AND",
                        "blocks": [
                            {
                                "id": "multi1",
                                "name": "Multi Switch",
                                "letters": "41",
                                "plugin": "SynTexWebHooks",
                                "operation": "=",
                                "state": {
                                    "value": false
                                },
                                "options": {
                                    "stateLock": true
                                }
                            },
                            {
                                "operation": "=",
                                "days": [
                                    1,
                                    2,
                                    3,
                                    4,
                                    5
                                ]
                            }
                        ]
                    }
                ]
            },
            "result": [
                {
                    "id": "light1",
                    "name": "Dummy Light",
                    "letters": "30",
                    "plugin": "SynTexWebHooks",
                    "operation": "=",
                    "state": {
                        "value": true,
                        "hue": 218,
                        "saturation": 100,
                        "brightness": 100
                    }
                },
                {
                    "id": "extern1",
                    "name": "Extern Accessory",
                    "letters": "40",
                    "bridge": "192.168.1.100",
                    "plugin": "SynTexWebHooks",
                    "operation": "=",
                    "state": {
                        "value": false
                    },
                    "options": {
                        "stateLock": false
                    }
                },
                {
                    "operation": "=",
                    "delay": 1000
                },
                {
                    "url": "http://192.168.1.100:1710/devices?id=ABCDEF1234567890&value=true&brightness=100"
                }
            ]
        }
    ]
}
```

### Required Parameters
- `id` A unique ID of your automation.
- `name` The name of the automation.
- `active` Enable / disable a single automation.
- `trigger` What triggers the automation?<br><br>
    - `logic` Define a logical operation for your groups *( `AND`, `OR` )*
    - `groups` Logical layer one<br><br>
        - `logic` Define a logical operation for your blocks *( `AND`, `OR` )*
        - `blocks` Logical layer two<br><br>
- `result` What happens when running an automation?
- `options` General automation options<br><br>
    - `timeLock` Set a timeout to prevent to many executions *( in milliseconds )*

### Block Configuration
#### Service Block ( Trigger, Result )
- `id` is the same like in your config file *( or in your log )*
- `name` The name of the accessory.
- `letters` See letter configuration below.
- `bridge` IP of your other bridge *( optional )*
- `plugin` Use the platform name of the plugin *( optional, see supported plugins below )*
- `operation` Use the logical operands *( `>`, `<`, `=` )*
- `state` The state of your accessory.<br><br>
    - `value` is used for the main characteristic.
    - `brightness` can be used for dimmable / RGB lights.
    - `hue` can be used for RGB lights.
    - `saturation` can be used for RGB lights.

#### Time Block ( Trigger )
- `operation` Use the logical operands *( `>`, `<`, `=` )*
- `time` Define a time point *( e.g. `16:00` )*

#### Weekday Block ( Trigger )
- `operation` Use the logical operands *( `=` )*
- `days` Set the weekdays *( from `0` to `6` )*

#### Delay Block ( Result )
- `delay` Set a timeout *( in milliseconds )*

#### URL Block ( Result )
- `url` Fetch an URL.

### Letter Configuration
The letters are split into two parts *( characters )*

**1. Service Type**
- 0 : Occupancy
- 1 : Smoke
- 2 : Airquality
- 3 : RGB
- 4 : Switch
- 5 : Relais
- 6 : Stateless Switch
- 7 : Outlet
- 8 : LED
- 9 : Dimmer
- A : Contact
- B : Motion
- C : Temperature
- D : Humidity
- E : Rain
- F : Light
- G : Blind
- H : Thermostat
- I : Fan

**2. Duplicate Counter**
- If there are more services of the same type the counter indicates which is which
- Simply count from top to bottom.

**Example:**  The first switch in your config has the letters `40`, the second `41` and so on ..

### Supported Plugins
- SynTexKNX *( `homebridge-syntex-knx` )*
- SynTexMagicHome *( `homebridge-syntex-magichome` )*
- SynTexTuya *( `homebridge-syntex-tuya` )*
- SynTexWebHooks *( `homebridge-syntex-webhooks` )*


---


## Currently Supported
- Airquality Sensor
- Contact Sensor
- Humidity Sensor
- Leak / Rain Sensor
- Light Sensor
- Motion Sensor
- Occupancy Sensor
- Smoke Sensor
- Stateless Switch
- Temperature Sensor
- Switch / Relais / Outlet
- LED Lights / Dimmable Lights / RGB Lights
- Blinds / Shutters / Window Coverings
- Thermostats / Fans