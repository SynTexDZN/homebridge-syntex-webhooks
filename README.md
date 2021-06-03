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
**Info:** If the `logDirectory` for the storage can't be created you have to do it by yourself and give it full write permissions!
- `sudo chown -R homebridge /var/homebridge/SynTex/` ( *permissions only for homebridge* )
- `sudo chmod 777 -R homebridge /var/homebridge/SynTex/` ( *permissions for many processes* )

```
"platforms": [
    {
        "platform": "SynTexWebHooks",
        "port": 1710,
        "language": "us",
        "logDirectory": "/var/homebridge/SynTex/log",
        "automationDirectory": "/var/homebridge/SynTex/automation",
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
                "name": "Dummy Dimmer",
                "services": {
                    "type": "dimmer",
                    "requests": [
                        {
                            "trigger": "dimmer",
                            "method": "GET",
                            "url": "http://192.168.178.163/brightness="
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
- `logDirectory` The path where your logs are stored.
- `accessories` For the accessory config.

### Optional Parameters
- `port` To control your accessory over HTTP calls.
- `language` You can use your country initials if you want to change it *( Currently supported: `us`, `en`, `de` )*
- `debug` For further information because of troubleshooting and bug reports.

### Accessory Config
- Every device needs these parameters: `id`, `name` and `services` *( required )*
- `id` has to be either a `real mac address` or another `random unique text` *( no duplicates! )*
- `name` could be anything.
- `services` Should be one of these: `temperature`, `humidity`, `light`, `leak`, `motion`, `contact`, `smoke`, `occupancy`, `airquality`, `switch`, `relais`, `outlet`, `led`, `dimmer`, `rgb`, `statelessswitch`
- For Boolean Devices you can add `requests` ( *trigger can be: on, off, color* )
- For RGB Lights you can add `spectrum` attribute ( *to convert to the right output format: RGB / HSL* )
- For Stateless Switches you have to add `buttons` attribute.


---


## SynTex UI
Control and set up your devices by installing `homebridge-syntex`<br>
This plugin is made for plugin management, automation system and device control.<br><br>

Check out the GitHub page for more information:<br>
https://github.com/SynTexDZN/homebridge-syntex


## Update HTTP Devices
1. Open `http://`  **Bridge IP**  `/devices?id=`  **Device ID**  `&value=`  **New Value**
2. Insert the `Bridge IP` and `Device ID`
3. For the `New Value` you can type these patterns:
- For boolean devices: `true` / `false` ( *leak, motion, contact, smoke, occupancy, switch, outlet* )
- For numeric devices: `10` / `12.4` ( *temperature, humidity, light, airquality* )
- For all light bulbs: `true` / `false` ( *led, dimmer, rgb* )
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


---


## Automation
To enable the automation module you have to create a file named `automation.json` in your `automationDirectory` or install the `homebridge-syntex` plugin to create them via UI *( only between syntex plugins )*<br><br>
**Example:**  For manual configuration update your `automation.json` file. See snippet below.   

```
{
  "id": "automation",
  "automation": [
    {
      "id": 0,
      "name": "Demo Automation",
      "active": true,
      "trigger": [
        {
          "id": "multi2",
          "name": "Multi Device",
          "letters": "F0",
          "plugin": "SynTexWebHooks",
          "operation": "<",
          "value": "1000"
        }
      ],
      "condition": [
        {
          "id": "multi1",
          "name": "Multi Switch",
          "letters": "41",
          "plugin": "SynTexWebHooks",
          "operation": "=",
          "value": "false"
        }
      ],
      "result": [
        {
          "id": "light1",
          "name": "Dummy Light",
          "letters": "30",
          "plugin": "SynTexWebHooks",
          "operation": "=",
          "value": "true",
          "hue": "218",
          "saturation": "100",
          "brightness": "100"
        },
        {
          "url": "http://192.168.178.100:1713/devices?id=58757402d8bfc108d0dc&value=true&brightness=100"
        }
      ]
    }
  }
}
```
### Required Parameters
- `id` is the same like in your config file *( or in your log )*
- `name` The name of the accessory.
- `letters` See letter configuration below.
- `operation` Use the logical operands *( `>`, `<`, `=` )*
- `value` The state of your accessory.


### Optional Parameters
- `plugin` Use the platform name of the plugin *( see supported plugins below )*
- `hue` is used for RGB lights.
- `saturation` is used for RGB lights.
- `brightness` is used for dimmable lights.


### Letter Configuration
The letters are split into two parts *( numbers )*

**1. Service Type**
- A : Contact
- B : Motion
- C : Temperature
- D : Humidity
- E : Rain
- F : Light
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

**2. Duplicate Counter**
- If there are more services of the same type the counter indicates which is which
- Simply count from top to bottom.

**Example:**  The first switch in your config has the letters `40`, the second `41` and so on ..


### Supported Plugins
- SynTexMagicHome *( `homebridge-syntex-magichome` )*
- SynTexTuya *( `homebridge-syntex-tuya` )*
- SynTexWebHooks *( `homebridge-syntex-webhooks` )*


---


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