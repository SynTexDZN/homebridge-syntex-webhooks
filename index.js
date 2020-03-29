var request = require('request');
var http = require('http');
var url = require('url');
var store = require('json-fs-store');
var logger = require('./logger');
var Service, Characteristic;

module.exports = function(homebridge)
{
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;

    homebridge.registerPlatform("homebridge-syntex-webhooks", "SynTexWebHooks", SynTexWebHookPlatform);
    homebridge.registerAccessory("homebridge-syntex-webhooks", "SynTexWebHookSensor", SynTexWebHookSensorAccessory);
    homebridge.registerAccessory("homebridge-syntex-webhooks", "SynTexWebHookSwitch", SynTexWebHookSwitchAccessory);
    homebridge.registerAccessory("homebridge-syntex-webhooks", "SynTexWebHookStripeRGB", SynTexWebHookStripeRGBAccessory);
    homebridge.registerAccessory("homebridge-syntex-webhooks", "SynTexWebHookStatelessSwitch", SynTexWebHookStatelessSwitchAccessory);
};

var config;
var storage;

function SynTexWebHookPlatform(log, sconfig, api)
{
    var url = require('url');
    this.sensors = sconfig["sensors"] || [];
    this.switches = sconfig["switches"] || [];
    this.lights = sconfig["lights"] || [];
    this.statelessSwitches = sconfig["statelessswitches"] || [];
    
    this.cacheDirectory = sconfig["cache_directory"] || "./SynTex";
    this.logDirectory = sconfig["log_directory"] || "./SynTex/log";
    this.port = sconfig["port"] || 1710;
    
    logger.create("SynTexWebHooks", this.logDirectory);

    config = store(api.user.storagePath());
    storage = store(this.cacheDirectory);
}

SynTexWebHookPlatform.prototype = {
    
    accessories : function(callback)
    {
        var accessories = [];
        
        for (var i = 0; i < this.sensors.length; i++)
        {
            var Sensor = new SynTexWebHookSensorAccessory(this.sensors[i]);
            accessories.push(Sensor);
        }
        
        for (var i = 0; i < this.switches.length; i++)
        {
            var Switch = new SynTexWebHookSwitchAccessory(this.switches[i]);
            accessories.push(Switch);
        }

        for (var i = 0; i < this.lights.length; i++)
        {
            var Light = new SynTexWebHookStripeRGBAccessory(this.lights[i]);
            accessories.push(Light);
        }

        for (var i = 0; i < this.statelessSwitches.length; i++)
        {
            var StatelessSwitch = new SynTexWebHookStatelessSwitchAccessory(this.statelessSwitches[i]);
            accessories.push(StatelessSwitch);
        }
        
        callback(accessories);
        
        var createServerCallback = (function(request, response)
        {
            var urlParts = url.parse(request.url, true);
            var urlParams = urlParts.query;
            var urlPath = urlParts.pathname;
            var body = [];
            
            body = Buffer.concat(body).toString();

            response.statusCode = 200;
            response.setHeader('Content-Type', 'application/json');
            response.setHeader('Access-Control-Allow-Origin', '*');

            if(urlPath == '/devices')
            {
                if(urlParams.mac)
                {
                    if(urlParams.value)
                    {
                        var device = {
                            mac: urlParams.mac,
                            value: urlParams.value
                        };

                        if(urlParams.type)
                        {
                            device.type = urlParams.type;
                        }

                        updateDevice(device).then(function(res) {

                            for(var i = 0; i < accessories.length; i++)
                            {
                                var accessory = accessories[i];

                                if(accessory.mac === urlParams.mac)
                                {
                                    if(urlParams.type)
                                    {
                                        if(accessory.type === urlParams.type)
                                        {
                                            if(urlParams.value == 'true' || urlParams.value == 'false')
                                            {
                                                accessory.changeHandler((urlParams.value === 'true'));
                                            }
                                            else
                                            {
                                                accessory.changeHandler(urlParams.value);
                                            }
                                        }
                                    }
                                    else
                                    {
                                        if(urlParams.value == 'true' || urlParams.value == 'false')
                                        {
                                            accessory.changeHandler((urlParams.value == 'true' || false));
                                        }
                                        else
                                        {
                                            accessory.changeHandler(urlParams.value);
                                        }
                                    }
                                }
                            }
                        });

                        response.write("Success");
                        response.end();
                    }
                    else if(urlParams.event)
                    {
                        response.write("Success");
                        response.end();

                        for(var i = 0; i < accessories.length; i++)
                        {
                            var accessory = accessories[i];

                            if(accessory.mac === urlParams.mac)
                            {
                                accessory.changeHandler(accessory.name, urlParams.event);
                            }
                        }
                    }
                    else
                    {
                        var device = {
                            mac: urlParams.mac
                        };

                        if(urlParams.type)
                        {
                            device.type = urlParams.type;
                        }

                        readDevice(device).then(function(res) {

                            if(res == null)
                            {
                                response.write("Es wurde kein passendes Gerät gefunden!");
                                response.end();

                                logger.log('error', "Es wurde kein passendes Gerät gefunden! (" + urlParams.mac + ")");
                            }
                            else
                            {
                                response.write(res.toString());
                                response.end();

                                logger.log('read', "HomeKit Status für '" + urlParams.mac + "' ist '" + res + "'");
                            }
                        });
                    }
                }
            }
            else if(urlPath == '/version')
            {
                var pjson = require('./package.json');

                response.write(pjson.version);
                response.end();
            }
            else if(urlPath == '/update')
            {
                var version = 'latest';

                if(urlParams.version)
                {
                    version = urlParams.version;
                }

                const { exec } = require("child_process");
                
                exec("sudo npm install homebridge-syntex-webhooks@" + version + " -g", (error, stdout, stderr) => {

                    if(error || stderr.includes('ERR!'))
                    {
                        response.write('Error');
                        response.end();
                        
                        logger.log('warn', "Die Homebridge konnte nicht aktualisiert werden!");
                    }
                    else
                    {
                        response.write('Success');
                        response.end();
                        
                        logger.log('success', "Die Homebridge wurde auf die Version '" + version + "' aktualisiert!");
                        
                        exec("sudo systemctl restart homebridge", (error, stdout, stderr) => {

                            logger.log('warn', "Die Homebridge wird neu gestartet ..");
                        });
                    }
                });
            }
        }).bind(this);

        http.createServer(createServerCallback).listen(this.port, "0.0.0.0");
           
        logger.log('info', "Data Link Server läuft auf Port " + "'" + this.port + "'");
    }
}

function SynTexWebHookSensorAccessory(sensorConfig)
{
    this.mac = sensorConfig["mac"];
    this.name = sensorConfig["name"];
    this.type = sensorConfig["type"];

    if(this.type === "contact")
    {
        this.service = new Service.ContactSensor(this.name);
        
        this.changeHandler = (function(newState)
        {
            logger.log('update', "HomeKit Status für '" + this.name + "' geändert zu '" + newState + "' ( " + this.mac + " )");
            this.service.getCharacteristic(Characteristic.ContactSensorState).updateValue(newState ? Characteristic.ContactSensorState.CONTACT_DETECTED : Characteristic.ContactSensorState.CONTACT_NOT_DETECTED);
        }).bind(this);
        
        this.service.getCharacteristic(Characteristic.ContactSensorState).on('get', this.getState.bind(this));
    }
    else if(this.type === "motion")
    {
        this.service = new Service.MotionSensor(this.name);
        
        this.changeHandler = (function(newState)
        {
            logger.log('update', "HomeKit Status für '" + this.name + "' geändert zu '" + newState + "' ( " + this.mac + " )");
            this.service.getCharacteristic(Characteristic.MotionDetected).updateValue(newState);
        }).bind(this);
        
        this.service.getCharacteristic(Characteristic.MotionDetected).on('get', this.getState.bind(this));
    }
    else if(this.type === "temperature")
    {
        this.service = new Service.TemperatureSensor(this.name);
        
        this.changeHandler = (function(newState)
        {
            logger.log('update', "HomeKit Status für '" + this.name + "' geändert zu '" + newState + "' ( " + this.mac + " )");
            this.service.getCharacteristic(Characteristic.CurrentTemperature).updateValue(newState);
        }).bind(this);
        
        this.service.getCharacteristic(Characteristic.CurrentTemperature).setProps({
            minValue : -100,
            maxValue : 140
        }).on('get', this.getState.bind(this));
    }
    else if(this.type === "humidity")
    {        
        this.service = new Service.HumiditySensor(this.name);
        
        this.changeHandler = (function(newState)
        {
            logger.log('update', "HomeKit Status für '" + this.name + "' geändert zu '" + newState + "' ( " + this.mac + " )");
            this.service.getCharacteristic(Characteristic.CurrentRelativeHumidity).updateValue(newState);
        }).bind(this);
        
        this.service.getCharacteristic(Characteristic.CurrentRelativeHumidity).on('get', this.getState.bind(this));
    }
    else if(this.type === "rain")
    {        
        this.service = new Service.LeakSensor(this.name);
        
        this.changeHandler = (function(newState)
        {
            logger.log('update', "HomeKit Status für '" + this.name + "' geändert zu '" + newState + "' ( " + this.mac + " )");
            this.service.getCharacteristic(Characteristic.LeakDetected).updateValue(newState);
        }).bind(this);
        
        this.service.getCharacteristic(Characteristic.LeakDetected).on('get', this.getState.bind(this));
    }
    else if(this.type === "light")
    {
        this.service = new Service.LightSensor(this.name);
      
        this.changeHandler = (function(newState)
        {
            logger.log('update', "HomeKit Status für '" + this.name + "' geändert zu '" + newState + "' ( " + this.mac + " )");
            this.service.getCharacteristic(Characteristic.CurrentAmbientLightLevel).updateValue(parseFloat(newState));
        }).bind(this);
    
        this.service.getCharacteristic(Characteristic.CurrentAmbientLightLevel).on('get', this.getState.bind(this));
    }
    else if(this.type === "occupancy")
    {
        this.service = new Service.OccupancySensor(this.name);
        
        this.changeHandler = (function(newState)
        {
            logger.log('update', "HomeKit Status für '" + this.name + "' geändert zu '" + newState + "' ( " + this.mac + " )");
            this.service.getCharacteristic(Characteristic.OccupancyDetected).updateValue(newState ? Characteristic.OccupancyDetected.OCCUPANCY_DETECTED : Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED, undefined, CONTEXT_FROM_WEBHOOK);
        }).bind(this);
        
        this.service.getCharacteristic(Characteristic.OccupancyDetected).on('get', this.getState.bind(this));
    }
    else if(this.type === "smoke")
    {
        this.service = new Service.SmokeSensor(this.name);
        
        this.changeHandler = (function(newState)
        {
            logger.log('update', "HomeKit Status für '" + this.name + "' geändert zu '" + newState + "' ( " + this.mac + " )");
            this.service.getCharacteristic(Characteristic.SmokeDetected).updateValue(newState ? Characteristic.SmokeDetected.SMOKE_DETECTED : Characteristic.SmokeDetected.SMOKE_NOT_DETECTED, undefined, CONTEXT_FROM_WEBHOOK);
        }).bind(this);
        
        this.service.getCharacteristic(Characteristic.SmokeDetected).on('get', this.getState.bind(this));
    }
    /*
    else if(this.type === "airquality")
    {
        this.service = new Service.AirQualitySensor(this.name);
        
        this.changeHandler = (function(newState)
        {
            logger.log('update', "HomeKit Status für '" + this.name + "' geändert zu '" + newState + "' ( " + this.mac + " )");
            this.service.getCharacteristic(Characteristic.AirQuality).updateValue(newState, undefined, CONTEXT_FROM_WEBHOOK);
        }).bind(this);
        
        this.service.getCharacteristic(Characteristic.AirQuality).on('get', this.getState.bind(this));
    }
    */
}

SynTexWebHookSensorAccessory.prototype.getState = function(callback)
{        
    var device = {
        mac: this.mac,
        name: this.name
    };

    if(this.type == 'rain' || this.type == 'light' || this.type == 'temperature' || this.type == 'humidity')
    {
        device.type = this.type
    }
    
    readDevice(device).then(function(state) {

        if(state == null)
        {
            logger.log('error', "Es wurde kein passendes Gerät gefunden! (" + device.mac + ")");
        }
        else
        {
            logger.log('read', "HomeKit Status für '" + device.name + "' ist '" + state + "'");
        }

        if(device.type === "contact" || device.type === "rain" || device.type === "smoke" || device.type === "occupancy")
        {
            state = (state == 'true' || false);
        }
        else if(device.type === "light" || device.type === "temperature")
        {
            state = !isNaN(parseFloat(state)) ? parseFloat(state) : 0;
        }
        else if(device.type === "humidity")
        {
            state = !isNaN(state) ? state : 0;
        }
        
        if(device.type === "contact")
        {
            callback(null, state ? Characteristic.ContactSensorState.CONTACT_NOT_DETECTED : Characteristic.ContactSensorState.CONTACT_DETECTED);
        }
        else if(device.type === "rain")
        {
            callback(null, state ? Characteristic.LEAK_DETECTED : Characteristic.LEAK_NOT_DETECTED);
        }
        else if(device.type === "smoke")
        {
            callback(null, state ? Characteristic.SmokeDetected.SMOKE_DETECTED : Characteristic.SmokeDetected.SMOKE_NOT_DETECTED);
        }
        else if(device.type === "occupancy")
        {
            callback(null, state ? Characteristic.OccupancyDetected.OCCUPANCY_DETECTED : Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED);
        }
        else
        {
            callback(null, state);
        }
    });
};

SynTexWebHookSensorAccessory.prototype.getServices = function()
{
    return [this.service];
};

function SynTexWebHookSwitchAccessory(switchConfig)
{
    this.mac = switchConfig["mac"];
    this.type = switchConfig["type"];
    this.name = switchConfig["name"];
    this.onURL = switchConfig["on_url"] || "";
    this.onMethod = switchConfig["on_method"] || "GET";
    this.onBody = switchConfig["on_body"] || "";
    this.onForm = switchConfig["on_form"] || "";
    this.onHeaders = switchConfig["on_headers"] || "{}";
    this.offURL = switchConfig["off_url"] || "";
    this.offMethod = switchConfig["off_method"] || "GET";
    this.offBody = switchConfig["off_body"] || "";
    this.offForm = switchConfig["off_form"] || "";
    this.offHeaders = switchConfig["off_headers"] || "{}";

    this.service = new Service.Switch(this.name);
    
    this.changeHandler = (function(newState)
    {
        this.service.getCharacteristic(Characteristic.On).updateValue(newState);
    }).bind(this);
    
    this.service.getCharacteristic(Characteristic.On).on('get', this.getState.bind(this)).on('set', this.setState.bind(this));
}

SynTexWebHookSwitchAccessory.prototype.getState = function(callback)
{
    var device = {
        mac: this.mac,
        name: this.name
    };
    
    readDevice(device).then(function(state) {
        
        if(state != null)
        {
            state = (state == 'true' || false);

            logger.log('read', "HomeKit Status für '" + device.name + "' ist '" + state + "'");

            callback(null, state);
        }
        else
        {
            logger.log('error', "Es wurde kein passendes Gerät gefunden! (" + device.mac + ")");

            callback(null, false);
        }
    });
};

SynTexWebHookSwitchAccessory.prototype.setState = function(powerOn, callback, context)
{
    var urlToCall = this.onURL;
    var urlMethod = this.onMethod;
    var urlBody = this.onBody;
    var urlForm = this.onForm;
    var urlHeaders = this.onHeaders;
    
    if(!powerOn)
    {
        urlToCall = this.offURL;
        urlMethod = this.offMethod;
        urlBody = this.offBody;
        urlForm = this.offForm;
        urlHeaders = this.offHeaders;
    }
    
    var device = {
        mac: this.mac,
        value: powerOn.toString()
    };

    logger.log('update', "HomeKit Status für '" + this.name + "' geändert zu '" + device.value + "' ( " + this.mac + " )");

    updateDevice(device);
    
    if(urlToCall != "")
    {
        var theRequest = {
            method : urlMethod,
            url : urlToCall,
            timeout : 5000,
            headers: JSON.parse(urlHeaders)
        };
        
        if(urlMethod === "POST" || urlMethod === "PUT")
        {
            if(urlForm)
            {
                //logger.log("Adding Form " + urlForm);
                theRequest.form = JSON.parse(urlForm);
            }
            else if(urlBody)
            {
                //logger.log("Adding Body " + urlBody);
                theRequest.body = urlBody;
            }
        }

        request(theRequest, (function(err, response, body)
        {
            var statusCode = response && response.statusCode ? response.statusCode : -1;
            
            if(!err && statusCode == 200)
            {
                logger.log('success', "Anfrage zu '" + urlToCall + "' wurde mit dem Status Code '" + statusCode + "' beendet: '" + body + "'" );

                callback(null);
            }
            else
            {
                logger.log('error', "Anfrage zu '" + urlToCall + "' wurde mit dem Status Code '" + statusCode + "' beendet: '" + body + "' " + err);

                callback(err || new Error("Request to '" + urlToCall + "' was not succesful."));
            }
        }).bind(this));
    }
    else
    {
        callback(null);
    }
};

SynTexWebHookSwitchAccessory.prototype.getServices = function()
{
    return [this.service];
};

function SynTexWebHookStripeRGBAccessory(lightConfig)
{
    this.mac = lightConfig["mac"];
    this.type = lightConfig["type"];
    this.name = lightConfig["name"];
    this.url = lightConfig["url"];
    this.urlMethod = lightConfig["url_method"];

    this.service = new Service.Lightbulb(this.name);

    this.changeHandler = (function(newState)
    {
        logger.log('update', "HomeKit Status für '" + this.name + "' geändert zu '" + newState + "' ( " + this.mac + " )");
        /* this.service.getCharacteristic(Characteristic.On).updateValue(newState); */
    }).bind(this);

    this.service.getCharacteristic(Characteristic.On).on('get', this.getState.bind(this)).on('set', this.setState.bind(this));
    this.service.addCharacteristic(new Characteristic.Hue()).on('get', this.getHue.bind(this)).on('set', this.setHue.bind(this));
    this.service.addCharacteristic(new Characteristic.Saturation()).on('get', this.getSaturation.bind(this)).on('set', this.setSaturation.bind(this));
    this.service.addCharacteristic(new Characteristic.Brightness()).on('get', this.getBrightness.bind(this)).on('set', this.setBrightness.bind(this));
}

SynTexWebHookStripeRGBAccessory.prototype.getState = function(callback)
{
    if(this.power)
    {
        callback(null, this.power);
    }
    else
    {
        var device = {
            mac: this.mac,
            name: this.name
        };

        readDevice(device).then(function(state) {
        
            if(state != null)
            {
                logger.log('info', state);
                logger.log('info', state.split(':')[0] == 'true');

                callback(null, (state.split(':')[0] == 'true' || false));
            }
            else
            {
                callback(null, false);
            }
        });
    }
};

SynTexWebHookStripeRGBAccessory.prototype.getHue = function(callback)
{
    if(this.hue)
    {
        logger.log('info', 'CALLBACK: this.hue');
        callback(null, this.hue);
    }
    else
    {
        var device = {
            mac: this.mac,
            name: this.name
        };

        var parent = this;

        readDevice(device).then(function(res) {
        
            logger.log('info', parent.hue);

            if(res == null)
            {
                logger.log('info', 'CALLBACK: 0');
                callback(null, 0);
            }
            else
            {
                logger.log('info', 'CALLBACK: res.split');
                callback(null, (getHSL(res.split(':')[1], res.split(':')[2], res.split(':')[3])[0] || 0));
            }
        });
    }
};

SynTexWebHookStripeRGBAccessory.prototype.getSaturation = function(callback)
{
    if(this.saturation)
    {
        callback(null, this.saturation);
    }
    else
    {
        var device = {
            mac: this.mac,
            name: this.name
        };

        readDevice(device).then(function(res) {
        
            if(res == null)
            {
                callback(null, 100);
            }
            else
            {
                callback(null, (getHSL(res.split(':')[1], res.split(':')[2], res.split(':')[3])[1] || 100));
            }
        });
    }
}

SynTexWebHookStripeRGBAccessory.prototype.getBrightness = function(callback)
{
    if(this.brightness)
    {
        callback(null, this.brightness);
    }
    else
    {
        var device = {
            mac: this.mac,
            name: this.name
        };

        readDevice(device).then(function(res) {
        
            if(res == null)
            {
                callback(null, 50);
            }
            else
            {
                callback(null, (getHSL(res.split(':')[1], res.split(':')[2], res.split(':')[3])[2] || 50));
            }
        });
    }
}

SynTexWebHookStripeRGBAccessory.prototype.setState = function(powerOn, callback, context)
{
    this.power = powerOn;
    setRGB(this.url, this.hue, this.saturation, powerOn ? this.brightness : 0);
    callback(null);
};

SynTexWebHookStripeRGBAccessory.prototype.setHue = function(level, callback)
{
    this.hue = level;
    setRGB(this.url, this.hue, this.saturation, this.brightness);
    callback(null);
};

SynTexWebHookStripeRGBAccessory.prototype.setSaturation = function(level, callback)
{
    this.saturation = level;
    setRGB(this.url, this.hue, this.saturation, this.brightness);
    callback(null);
};

SynTexWebHookStripeRGBAccessory.prototype.setBrightness = function(level, callback)
{
    this.brightness = level;
    setRGB(this.url, this.hue, this.saturation, this.brightness);
    callback(null);
};

SynTexWebHookStripeRGBAccessory.prototype.getServices = function()
{
    return [this.service];
};

function SynTexWebHookStatelessSwitchAccessory(statelessSwitchConfig)
{
    this.mac = statelessSwitchConfig["mac"];
    this.name = statelessSwitchConfig["name"];
    this.buttons = statelessSwitchConfig["buttons"] || 0;
    this.service = [];

    for(var i = 0; i < this.buttons; i++)
    {
        var button = new Service.StatelessProgrammableSwitch(this.mac + i, '' + i);
        var props = {
            minValue : Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS,
            maxValue : Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS
        };

        button.getCharacteristic(Characteristic.ProgrammableSwitchEvent).setProps(props);
        button.getCharacteristic(Characteristic.ServiceLabelIndex).setValue(i + 1);

        this.service.push(button);
    }

    this.changeHandler = (function(buttonName, event)
    {
        for(var i = 0; i < this.service.length; i++)
        {
            if(i == event)
            {
               logger.log('success', "'" + buttonName + "': Event " + i + " wurde ausgeführt!");
               this.service[i].getCharacteristic(Characteristic.ProgrammableSwitchEvent).updateValue(0);
            }
        }
    }).bind(this);
};
  
SynTexWebHookStatelessSwitchAccessory.prototype.getServices = function()
{
    return this.service;
};

function getHSL(r, g, b)
{
    logger.log('info', "RGB: " + r + "-" + g + "-" + b);

    r /= 255, g /= 255, b /= 255;

    let cmin = Math.min(r,g,b),
        cmax = Math.max(r,g,b),
        delta = cmax - cmin,
        h = 0,
        s = 0,
        l = 0;
    
    if (delta == 0)
        h = 0;
    else if (cmax == r)
        h = ((g - b) / delta) % 6;
    else if (cmax == g)
        h = (b - r) / delta + 2;
    else
        h = (r - g) / delta + 4;

    h = Math.round(h * 60);
    
    if (h < 0)
        h += 360;

    l = (cmax + cmin) / 2;

    s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
        
    s = +(s * 50).toFixed(1);
    l = +(l * 401.5).toFixed(1);

    logger.log('info', "HSL: " + h + "-" + s + "-" + l);

    return [h, s, l];
}

function setRGB(url, hue, saturation, brightness)
{
    var h = hue, s = saturation * 2, l = brightness / 4;
    var r = 0, g = 0, b = 0;

    s /= 100;
    l /= 100;

    let c = (1 - Math.abs(2 * l - 1)) * s,
        x = c * (1 - Math.abs((h / 60) % 2 - 1)),
        m = l - c/2;

    if(0 <= h && h < 60)
    {
        r = c; g = x; b = 0;
    }
    else if(60 <= h && h < 120)
    {
        r = x; g = c; b = 0;
    }
    else if(120 <= h && h < 180)
    {
        r = 0; g = c; b = x;
    }
    else if(180 <= h && h < 240)
    {
        r = 0; g = x; b = c;
    }
    else if(240 <= h && h < 300)
    {
        r = x; g = 0; b = c;
    }
    else if(300 <= h && h < 360)
    {
        r = c; g = 0; b = x;
    }

    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);

    var theRequest = {
        method : "GET",
        url : url + "?r=" + r + "&g=" + g + "&b=" + b,
        timeout : 10000
    };

    request(theRequest, (function(err, response, body)
    {
        var statusCode = response && response.statusCode ? response.statusCode : -1;

        if(!err && statusCode == 200)
        {
            logger.log('success', "Anfrage zu 'URL' wurde mit dem Status Code '" + statusCode + "' beendet: '" + body + "'" );
        }
        else
        {
            logger.log('error', "Anfrage zu 'URL' wurde mit dem Status Code '" + statusCode + "' beendet: '" + body + "' " + err);
        }
    }).bind(this));
}

async function updateDevice(obj)
{
    return new Promise(resolve => {
        
        var device = {
            id: obj.mac,
            value: obj.value
        };

        if(obj.type)
        {
            device.id = obj.mac + '-' + obj.type[0].toUpperCase();
            device.type = obj.type;
        }

        storage.add(device, (err) => {

            if(err)
            {
                logger.log('error', obj.mac + ".json konnte nicht aktualisiert werden!" + err);
                resolve(false);
            }
            else
            {
                resolve(true);
            }
        });
    });
}

async function readDevice(obj)
{
    return new Promise(resolve => {
        
        var id = obj.mac;
    
        if(obj.type)
        {
            id += '-' + obj.type[0].toUpperCase();
        }

        storage.load(id, (err, device) => {    

            if(device && !err)
            {    
                resolve(device.value);
            }

            if(err || !device)
            {
                resolve(null);
            }
        });
    });
}