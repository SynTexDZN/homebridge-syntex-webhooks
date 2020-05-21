var request = require('request');
var http = require('http');
var url = require('url');
var store = require('json-fs-store');
var logger = require('./logger');
var DeviceManager = require('./device-manager');
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
    this.sensors = sconfig["sensors"] || [];
    this.switches = sconfig["switches"] || [];
    this.lights = sconfig["lights"] || [];
    this.statelessSwitches = sconfig["statelessswitches"] || [];
    
    this.cacheDirectory = sconfig["cache_directory"] || "./SynTex";
    this.logDirectory = sconfig["log_directory"] || "./SynTex/log";
    this.port = sconfig["port"] || 1710;
    
    logger.create("SynTexWebHooks", this.logDirectory, api.user.storagePath());

    DeviceManager.SETUP(logger, this.cacheDirectory);

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
        
        var createServerCallback = (async function(request, response)
        {
            try
            {
                var urlParts = url.parse(request.url, true);
                var urlParams = urlParts.query;
                var urlPath = urlParts.pathname;
                var body = [];
                
                body = Buffer.concat(body).toString();

                response.statusCode = 200;
                response.setHeader('Content-Type', 'application/json');
                response.setHeader('Access-Control-Allow-Origin', '*');

                if(urlPath == '/devices' && urlParams.mac)
                {
                    var accessory = null;
                        
                    for(var i = 0; i < accessories.length; i++)
                    {
                        if(accessories[i].mac === urlParams.mac)
                        {
                            if(!urlParams.type || accessories[i].type === urlParams.type)
                            {
                                accessory = accessories[i];
                            }
                        }
                    }

                    if(urlParams.event)
                    {
                        if(accessory != null)
                        {
                            accessory.changeHandler(accessory.name, urlParams.event, urlParams.value ? urlParams.value : 0);
                        }
                        else
                        {
                            logger.log('error', "Es wurde kein passendes Event gefunden! ( " + urlParams.mac + " )");
                        }

                        response.write(accessory != null ? "Success" : "Error");
                        response.end();
                    }
                    else if(urlParams.value)
                    {
                        if(accessory != null)
                        {
                            var state = null;

                            if((state = validateUpdate(urlParams.mac, accessory.type, urlParams.value)) != null)
                            {
                                accessory.changeHandler(state);
                            }
                            else
                            {
                                logger.log('error', "'" + urlParams.value + "' ist kein gültiger Wert! ( " + urlParams.mac + " )");
                            }

                            DeviceManager.setDevice(urlParams.mac, accessory.type, urlParams.value);
                        }
                        else
                        {
                            logger.log('error', "Es wurde kein passendes Gerät in HomeKit gefunden! ( " + urlParams.mac + " )");
                        }
                         
                        response.write(accessory != null ? "Success" : "Error");
                        response.end();
                    }
                    else
                    {
                        var state = await DeviceManager.getDevice(urlParams.mac, urlParams.type);

                        if(state != null && accessory != null)
                        {
                            logger.log('read', "HomeKit Status für '" + accessory.name + "' ist '" + state + "' ( " + urlParams.mac + " )");
                        }
                        else
                        {
                            logger.log('error', "Es wurde kein passendes Gerät in der Storage gefunden! ( " + urlParams.mac + " )");
                        }

                        response.write(state == null ? "Error" : state.toString());
                        response.end();
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
                    var version = urlParams.version ? urlParams.version : 'latest';

                    const { exec } = require("child_process");
                    
                    exec("sudo npm install homebridge-syntex-webhooks@" + version + " -g", (error, stdout, stderr) => {

                        try
                        {
                            if(error || stderr.includes('ERR!'))
                            {
                                logger.log('warn', "Die Homebridge konnte nicht aktualisiert werden!");
                            }
                            else
                            {
                                logger.log('success', "Die Homebridge wurde auf die Version '" + version + "' aktualisiert!");
                                logger.log('warn', "Die Homebridge wird neu gestartet ..");

                                exec("sudo systemctl restart homebridge");
                            }

                            response.write(error || stderr.includes('ERR!') ? 'Error' : 'Success');
                            response.end();
                        }
                        catch(e)
                        {
                            logger.err(e);
                        }
                    });
                }
            }
            catch(e)
            {
                logger.err(e);
            }
            
        }).bind(this);

        http.createServer(createServerCallback).listen(this.port, "0.0.0.0");
           
        logger.log('info', "Data Link Server läuft auf Port '" + this.port + "'");
    }
}

function SynTexWebHookSensorAccessory(sensorConfig)
{
    this.mac = sensorConfig["mac"];
    this.name = sensorConfig["name"];
    this.type = sensorConfig["type"];

    var characteristic;

    if(this.type === "contact")
    {
        this.service = new Service.ContactSensor(this.name);
        characteristic = Characteristic.ContactSensorState;
    }
    else if(this.type === "motion")
    {
        this.service = new Service.MotionSensor(this.name);
        characteristic = Characteristic.MotionDetected;
    }
    else if(this.type === "temperature")
    {
        this.service = new Service.TemperatureSensor(this.name);
        characteristic = Characteristic.CurrentTemperature;
        
        this.service.getCharacteristic(Characteristic.CurrentTemperature).setProps({
            minValue : -100,
            maxValue : 140
        }).on('get', this.getState.bind(this));
    }
    else if(this.type === "humidity")
    {        
        this.service = new Service.HumiditySensor(this.name);
        characteristic = Characteristic.CurrentRelativeHumidity;
    }
    else if(this.type === "rain")
    {        
        this.service = new Service.LeakSensor(this.name);
        characteristic = Characteristic.LeakDetected;
    }
    else if(this.type === "light")
    {
        this.service = new Service.LightSensor(this.name);
        characteristic = Characteristic.CurrentAmbientLightLevel;
    }
    else if(this.type === "occupancy")
    {
        this.service = new Service.OccupancySensor(this.name);
        characteristic = Characteristic.OccupancyDetected;
    }
    else if(this.type === "smoke")
    {
        this.service = new Service.SmokeSensor(this.name);
        characteristic = Characteristic.SmokeDetected;
    }
    else if(this.type === "airquality")
    {
        this.service = new Service.AirQualitySensor(this.name);
        characteristic = Characteristic.AirQuality;
    }

    this.changeHandler = (function(state)
    {
        if((state = validateUpdate(this.mac, this.type, state)) != null)
        {
            logger.log('update', "HomeKit Status für '" + this.name + "' geändert zu '" + state + "' ( " + this.mac + " )");
            this.service.getCharacteristic(characteristic).updateValue(state);
        }

    }).bind(this);
    
    this.service.getCharacteristic(characteristic).on('get', this.getState.bind(this));
}

SynTexWebHookSensorAccessory.prototype.getState = function(callback)
{        
    DeviceManager.getDevice(this.mac, this.type).then(function(state) {

        if(state == null)
        {
            logger.log('error', "Es wurde kein passendes Gerät in der Storage gefunden! ( " + this.mac + " )");
        }
        else if((state = validateUpdate(this.mac, this.type, state)) != null)
        {
            logger.log('read', "HomeKit Status für '" + this.name + "' ist '" + state + "' ( " + this.mac + " )");
        }

        callback(null, state);

    }.bind(this)).catch(function(e) {

        logger.err(e);
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
    DeviceManager.getDevice(this.mac, this.type).then(function(state) {
        
        if(state == null)
        {
            logger.log('error', "Es wurde kein passendes Gerät in der Storage gefunden! ( " + this.mac + " )");
        }
        else if((state = validateUpdate(this.mac, this.type, state)) != null)
        {
            logger.log('read', "HomeKit Status für '" + this.name + "' ist '" + state + "' ( " + this.mac + " )");
        }
         
        callback(null, state);

    }.bind(this)).catch(function(e) {

        logger.err(e);
    });
};

SynTexWebHookSwitchAccessory.prototype.setState = function(powerOn, callback, context)
{
    var urlToCall = powerOn ? this.onURL : this.offURL;
    var urlMethod = powerOn ? this.onMethod : this.offMethod;
    var urlBody = powerOn ? this.onBody : this.offBody;
    var urlForm = powerOn ? this.onForm : this.offForm;
    var urlHeaders = powerOn ? this.onHeaders : this.offHeaders;

    logger.log('update', "HomeKit Status für '" + this.name + "' geändert zu '" + powerOn.toString() + "' ( " + this.mac + " )");

    DeviceManager.setDevice(this.mac, this.type, powerOn.toString());

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
                logger.log('success', "Anfrage zu '" + urlToCall + "' wurde mit dem Status Code '" + statusCode + "' beendet: '" + body + "'");

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
        DeviceManager.getDevice(this.mac, this.type).then(function(state) {

            this.power = state == null ? false : (state.split(':')[0] == 'true' || false);

            logger.log('read', "HomeKit Status für '" + this.name + "' ist '" + state + "' ( " + this.mac + " )");

            callback(null, this.power);

        }.bind(this)).catch(function(e) {

            logger.err(e);
        });
    }
};

SynTexWebHookStripeRGBAccessory.prototype.getHue = function(callback)
{
    if(this.hue)
    {
        callback(null, this.hue);
    }
    else
    {
        DeviceManager.getDevice(this.mac, this.type).then(function(state) {

            if(state == null)
            {
                this.hue = (state == null) ? 0 : (getHSL(state.split(':')[1], state.split(':')[2], state.split(':')[3])[0] || 0);
            }
             
            callback(null, this.hue);

        }.bind(this)).catch(function(e) {

            logger.err(e);
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
        DeviceManager.getDevice(this.mac, this.type).then(function(state) {

            this.saturation = (state == null) ? 100 : (getHSL(state.split(':')[1], state.split(':')[2], state.split(':')[3])[1] || 100);
            callback(null, this.saturation);

        }.bind(this)).catch(function(e) {

            logger.err(e);
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
        DeviceManager.getDevice(this.mac, this.type).then(function(state) {

            this.brightness = (state == null) ? 50 : (getHSL(state.split(':')[1], state.split(':')[2], state.split(':')[3])[2] || 50);
            callback(null, this.brightness);

        }.bind(this)).catch(function(e) {

            logger.err(e);
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
            maxValue : Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS
        };

        button.getCharacteristic(Characteristic.ProgrammableSwitchEvent).setProps(props);
        button.getCharacteristic(Characteristic.ServiceLabelIndex).setValue(i + 1);

        this.service.push(button);
    }

    this.changeHandler = (function(buttonName, event, value)
    {
        for(var i = 0; i < this.service.length; i++)
        {
            if(i == event)
            {
               logger.log('success', "'" + buttonName + "': Event " + i + " wurde ausgeführt! ( " + this.mac + " )");
               this.service[i].getCharacteristic(Characteristic.ProgrammableSwitchEvent).updateValue(value);
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
        
    s = +(s * 49.8).toFixed(1);
    l = +(l * 401.5).toFixed(1);

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
            logger.log('success', "Anfrage zu 'URL' wurde mit dem Status Code '" + statusCode + "' beendet: '" + body + "'");
        }
        else
        {
            logger.log('error', "Anfrage zu 'URL' wurde mit dem Status Code '" + statusCode + "' beendet: '" + body + "' " + err);
        }
        
    }).bind(this));
}

function validateUpdate(mac, type, state)
{
    if(type === "motion" || type === "rain" || type === "smoke" || type === "occupancy" || type === "contact" || type == "switch" || type == "relais")
    {
        if(state != true && state != false && state != 'true' && state != 'false')
        {
            logger.log('warn', "Konvertierungsfehler: '" + state + "' ist keine boolsche Variable! ( " + mac + " )");

            return null;
        }

        return (state == 'true' || state == true ? true : false);
    }
    else if(type === "light" || type === "temperature")
    {
        if(isNaN(state))
        {
            logger.log('warn', "Konvertierungsfehler: '" + state + "' ist keine numerische Variable! ( " + mac + " )");
        }

        return !isNaN(state) ? parseFloat(state) : null;
    }
    else if(type === "humidity" || type === "airquality")
    {
        if(isNaN(state))
        {
            logger.log('warn', "Konvertierungsfehler: '" + state + "' ist keine numerische Variable! ( " + mac + " )");
        }

        return !isNaN(state) ? parseInt(state) : null;
    }
    else
    {
        return state;
    }
}