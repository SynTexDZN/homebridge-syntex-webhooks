var request = require('request');
var http = require('http');
var url = require('url');
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
}

SynTexWebHookPlatform.prototype = {
    
    accessories : function(callback)
    {
        var accessories = [];
        
        for(var i = 0; i < this.sensors.length; i++)
        {
            var Sensor = new SynTexWebHookSensorAccessory(this.sensors[i]);
            accessories.push(Sensor);
        }
        
        for(var i = 0; i < this.switches.length; i++)
        {
            var Switch = new SynTexWebHookSwitchAccessory(this.switches[i]);
            accessories.push(Switch);
        }

        for(var i = 0; i < this.lights.length; i++)
        {
            var Light = new SynTexWebHookStripeRGBAccessory(this.lights[i]);
            accessories.push(Light);
        }

        for(var i = 0; i < this.statelessSwitches.length; i++)
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
                        if(accessories[i].mac === urlParams.mac && (!urlParams.type || accessories[i].type === urlParams.type))
                        {
                            accessory = accessories[i];
                        }
                    }

                    if(accessory == null)
                    {
                        logger.log('error', "Es wurde kein passendes " + (urlParams.event ? 'Event' : 'Gerät') + " in der Config gefunden! ( " + urlParams.mac + " )");

                        response.write("Error");
                    }
                    else if(urlParams.event)
                    {
                        accessory.changeHandler(accessory.name, urlParams.event, urlParams.value ? urlParams.value : 0);

                        response.write("Success");
                    }
                    else if(urlParams.value)
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

                        DeviceManager.setDevice(accessory, urlParams.value);
                         
                        response.write(state != null ? "Success" : "Error");
                    }
                    else
                    {
                        var state = await DeviceManager.getDevice(accessory);

                        if(state != null)
                        {
                            logger.log('read', "HomeKit Status für '" + accessory.name + "' ist '" + state + "' ( " + urlParams.mac + " )");
                        }
                        else
                        {
                            logger.log('error', "Es wurde kein passendes Gerät in der Storage gefunden! ( " + urlParams.mac + " )");
                        }

                        response.write(state != null ? state.toString() : "Error");
                    }

                    response.end();
                }
                else if(urlPath == '/version')
                {
                    response.write(require('./package.json').version);
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
    var sensors = [];

    this.mac = sensorConfig["mac"];
    this.name = sensorConfig["name"];
    this.type = sensorConfig["type"];

    DeviceManager.getDevice(this).then(function(state) {

        this.value = validateUpdate(this.mac, this.type, state);

    }.bind(this));

    sensors.push({type : 'contact', service : new Service.ContactSensor(this.name), characteristic : Characteristic.ContactSensorState});
    sensors.push({type : 'motion', service : new Service.MotionSensor(this.name), characteristic : Characteristic.MotionDetected});
    sensors.push({type : 'temperature', service : new Service.TemperatureSensor(this.name), characteristic : Characteristic.CurrentTemperature});
    sensors.push({type : 'humidity', service : new Service.HumiditySensor(this.name), characteristic : Characteristic.CurrentRelativeHumidity});
    sensors.push({type : 'rain', service : new Service.LeakSensor(this.name), characteristic : Characteristic.LeakDetected});
    sensors.push({type : 'light', service : new Service.LightSensor(this.name), characteristic : Characteristic.CurrentAmbientLightLevel});
    sensors.push({type : 'occupancy', service : new Service.OccupancySensor(this.name), characteristic : Characteristic.OccupancyDetected});
    sensors.push({type : 'smoke', service : new Service.SmokeSensor(this.name), characteristic : Characteristic.SmokeDetected});
    sensors.push({type : 'airquality', service : new Service.AirQualitySensor(this.name), characteristic : Characteristic.AirQuality});

    for(var i = 0; i < sensors.length; i++)
    {
        if(sensors[i].type == this.type)
        {
            var characteristic = sensors[i].characteristic;

            this.service = sensors[i].service;
            this.service.getCharacteristic(sensors[i].characteristic).on('get', this.getState.bind(this));

            this.changeHandler = (function(state)
            {
                logger.log('update', "HomeKit Status für '" + this.name + "' geändert zu '" + state + "' ( " + this.mac + " )");
                this.service.getCharacteristic(characteristic).updateValue(state);

            }).bind(this);
        }
    }

    if(this.type === "temperature")
    {
        this.service.getCharacteristic(Characteristic.CurrentTemperature).setProps({
            minValue : -100,
            maxValue : 140
        }).on('get', this.getState.bind(this));
    }
}

SynTexWebHookSensorAccessory.prototype.getState = function(callback)
{        
    DeviceManager.getDevice(this).then(function(state) {

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

    DeviceManager.getDevice(this).then(function(state) {

        this.value = validateUpdate(this.mac, this.type, state);

    }.bind(this));

    this.changeHandler = (function(newState)
    {
        this.service.getCharacteristic(Characteristic.On).updateValue(newState);

    }).bind(this);
    
    this.service.getCharacteristic(Characteristic.On).on('get', this.getState.bind(this)).on('set', this.setState.bind(this));
}

SynTexWebHookSwitchAccessory.prototype.getState = function(callback)
{
    DeviceManager.getDevice(this).then(function(state) {
        
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

    DeviceManager.setDevice(this, powerOn.toString() + ':' + this.value.split(':')[1] + ':' + this.value.split(':')[2] + ':' + this.value.split(':')[3]);

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
                logger.log('error', "Anfrage zu '" + urlToCall + "' wurde mit dem Status Code '" + statusCode + "' beendet: '" + body + "' " + (err ? err : ''));

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
    this.service = new Service.Lightbulb(this.name);

    DeviceManager.getDevice(this).then(function(state) {

        this.value = validateUpdate(this.mac, this.type, state);

    }.bind(this));

    this.changeHandler = (function(newState)
    {
        logger.log('update', "HomeKit Status für '" + this.name + "' geändert zu '" + newState + "' ( " + this.mac + " )");
        
    }).bind(this);

    this.service.getCharacteristic(Characteristic.On).on('get', this.getState.bind(this)).on('set', this.setState.bind(this));
    this.service.addCharacteristic(new Characteristic.Hue()).on('get', this.getHue.bind(this)).on('set', this.setHue.bind(this));
    this.service.addCharacteristic(new Characteristic.Saturation()).on('get', this.getSaturation.bind(this)).on('set', this.setSaturation.bind(this));
    this.service.addCharacteristic(new Characteristic.Brightness()).on('get', this.getBrightness.bind(this)).on('set', this.setBrightness.bind(this));
}

SynTexWebHookStripeRGBAccessory.prototype.getState = function(callback)
{
    DeviceManager.getDevice(this).then(function(state) {

        if(state == null)
        {
            logger.log('error', "Es wurde kein passendes Gerät in der Storage gefunden! ( " + this.mac + " )");
        }
        else
        {
            logger.log('read', "HomeKit Status für '" + this.name + "' ist '" + state + "' ( " + this.mac + " )");
        }

        callback(null, state == null ? false : (state.split(':')[0] == 'true' || false));

    }.bind(this)).catch(function(e) {

        logger.err(e);
    });
};

SynTexWebHookStripeRGBAccessory.prototype.getHue = function(callback)
{
    DeviceManager.getDevice(this).then(function(state) {

        callback(null, (state == null) ? 0 : (getHSL(state)[0] || 0));

    }.bind(this)).catch(function(e) {

        logger.err(e);
    });
};

SynTexWebHookStripeRGBAccessory.prototype.getSaturation = function(callback)
{
    DeviceManager.getDevice(this).then(function(state) {

        callback(null, (state == null) ? 100 : (getHSL(state)[1] || 100));

    }.bind(this)).catch(function(e) {

        logger.err(e);
    });
}

SynTexWebHookStripeRGBAccessory.prototype.getBrightness = function(callback)
{
    DeviceManager.getDevice(this).then(function(state) {

        callback(null, (state == null) ? 50 : (getHSL(state)[2] || 50));

    }.bind(this)).catch(function(e) {

        logger.err(e);
    });
}

SynTexWebHookStripeRGBAccessory.prototype.setState = function(powerOn, callback, context)
{
    this.power = powerOn;
    setRGB(this);
    callback(null);
};

SynTexWebHookStripeRGBAccessory.prototype.setHue = function(level, callback)
{
    this.hue = level;
    setRGB(this);
    callback(null);
};

SynTexWebHookStripeRGBAccessory.prototype.setSaturation = function(level, callback)
{
    this.saturation = level;
    setRGB(this);
    callback(null);
};

SynTexWebHookStripeRGBAccessory.prototype.setBrightness = function(level, callback)
{
    this.brightness = level;
    setRGB(this);
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

function getHSL(state)
{
    var r = state.split(':')[1] / 255, g = state.split(':')[2] / 255, b = state.split(':')[3] / 255;

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

function setRGB(accessory)
{
    var h = accessory.hue, s = accessory.saturation * 2, l = accessory.powerOn ? accessory.brightness / 4 : 0;
    var r = 0, g = 0, b = 0;

    logger.log('debug', accessory);

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
        url : accessory.url + "?r=" + r + "&g=" + g + "&b=" + b,
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
            logger.log('error', "Anfrage zu 'URL' wurde mit dem Status Code '" + statusCode + "' beendet: '" + body + "' " + (err ? err : ''));
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