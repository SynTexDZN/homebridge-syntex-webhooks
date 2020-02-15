var request = require('request');
var http = require('http');
var url = require('url');
var store = require('json-fs-store');
var Service, Characteristic;

module.exports = function(homebridge)
{
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;

    homebridge.registerPlatform("homebridge-syntex-webhooks", "SynTexWebHooks", SynTexWebHookPlatform);
    homebridge.registerAccessory("homebridge-syntex-webhooks", "SynTexWebHookSensor", SynTexWebHookSensorAccessory);
    homebridge.registerAccessory("homebridge-syntex-webhooks", "SynTexWebHookSwitch", SynTexWebHookSwitchAccessory);
    homebridge.registerAccessory("homebridge-syntex-webhooks", "SynTexWebHookStripeRGB", SynTexWebHookStripeRGBAccessory);
};

var log;
var config;
var storage;

function SynTexWebHookPlatform(slog, sconfig, api)
{
    var url = require('url');
    this.sensors = sconfig["sensors"] || [];
    this.switches = sconfig["switches"] || [];
    this.lights = sconfig["lights"] || [];
    
    this.cacheDirectory = sconfig["cache_directory"] || "./SynTex";
    this.port = sconfig["port"] || 1710;
    
    log = slog;
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
            response.setHeader('Access-Control-Allow-Origin', 'http://syntex.local');

            if(urlPath == '/devices')
            {
                if(urlParams.mac)
                {
                    if(urlParams.value)
                    {
                        if(urlParams.type)
                        {
                            var device = {
                                mac: urlParams.mac,
                                value: urlParams.value,
                                type: urlParams.type
                            };
                        }
                        else
                        {
                            var device = {
                                mac: urlParams.mac,
                                value: urlParams.value
                            };
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
                                            accessory.changeHandler((urlParams.value === 'true'));
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
                    else
                    {
                        if(urlParams.type)
                        {
                            var device = {
                                mac: urlParams.mac,
                                type: urlParams.type
                            };
                        }
                        else
                        {
                            var device = {
                                mac: urlParams.mac
                            };
                        }

                        readDevice(device).then(function(res) {

                            if(!res)
                            {
                                response.write("Es wurde kein passendes Gerät gefunden!");
                                response.end();

                                log('\x1b[31m%s\x1b[0m', "[ERROR]", "Es wurde kein passendes Gerät gefunden! (" + urlParams.mac + ")");
                            }
                            else
                            {
                                response.write(res);
                                response.end();

                                log('\x1b[36m%s\x1b[0m', "[READ]", "HomeKit Status für '" + urlParams.mac + "' ist '" + res + "'");
                            }
                        });
                    }
                }
            }
            else if(urlPath == '/ping')
            {
                response.write("");
                response.end();
            }
            
        }).bind(this);

        http.createServer(createServerCallback).listen(this.port, "0.0.0.0");
           
        log('\x1b[33m%s\x1b[0m', "[INFO]", "Data Link Server läuft auf Port ", "'" + this.port + "'");
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
            log('\x1b[36m%s\x1b[0m', "[UPDATE]", "HomeKit Status für '" + this.name + "' geändert zu '" + newState + "' ( " + this.mac + " )");
            this.service.getCharacteristic(Characteristic.ContactSensorState).updateValue(newState ? Characteristic.ContactSensorState.CONTACT_DETECTED : Characteristic.ContactSensorState.CONTACT_NOT_DETECTED);
        }).bind(this);
        
        this.service.getCharacteristic(Characteristic.ContactSensorState).on('get', this.getState.bind(this));
    }
    else if(this.type === "motion")
    {
        this.service = new Service.MotionSensor(this.name);
        
        this.changeHandler = (function(newState)
        {
            log('\x1b[36m%s\x1b[0m', "[UPDATE]", "HomeKit Status für '" + this.name + "' geändert zu '" + newState + "' ( " + this.mac + " )");
            this.service.getCharacteristic(Characteristic.MotionDetected).updateValue(newState);
        }).bind(this);
        
        this.service.getCharacteristic(Characteristic.MotionDetected).on('get', this.getState.bind(this));
    }
    else if(this.type === "temperature")
    {
        this.service = new Service.TemperatureSensor(this.name);
        
        this.changeHandler = (function(newState)
        {
            log('\x1b[36m%s\x1b[0m', "[UPDATE]", "HomeKit Status für '" + this.name + "' geändert zu '" + newState + "' ( " + this.mac + " )");
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
            log('\x1b[36m%s\x1b[0m', "[UPDATE]", "HomeKit Status für '" + this.name + "' geändert zu '" + newState + "' ( " + this.mac + " )"); this.service.getCharacteristic(Characteristic.CurrentRelativeHumidity).updateValue(newState);
        }).bind(this);
        
        this.service.getCharacteristic(Characteristic.CurrentRelativeHumidity).on('get', this.getState.bind(this));
    }
    else if(this.type === "rain")
    {        
        this.service = new Service.LeakSensor(this.name);
        
        this.changeHandler = (function(newState)
        {
            log('\x1b[36m%s\x1b[0m', "[UPDATE]", "HomeKit Status für '" + this.name + "' geändert zu '" + newState + "' ( " + this.mac + " )");
            this.service.getCharacteristic(Characteristic.LeakDetected).updateValue(newState);
        }).bind(this);
        
        this.service.getCharacteristic(Characteristic.LeakDetected).on('get', this.getState.bind(this));
    }
    else if(this.type === "light")
    {
        this.service = new Service.LightSensor(this.name);
      
        this.changeHandler = (function(newState)
        {
            log('\x1b[36m%s\x1b[0m', "[UPDATE]", "HomeKit Status für '" + this.name + "' geändert zu '" + newState + "' ( " + this.mac + " )"); this.service.getCharacteristic(Characteristic.CurrentAmbientLightLevel).updateValue(parseFloat(newState));
        }).bind(this);
    
        this.service.getCharacteristic(Characteristic.CurrentAmbientLightLevel).on('get', this.getState.bind(this));
    }
    else if(this.type === "occupancy")
    {
        this.service = new Service.OccupancySensor(this.name);
        
        this.changeHandler = (function(newState)
        {
            this.service.getCharacteristic(Characteristic.OccupancyDetected).updateValue(newState ? Characteristic.OccupancyDetected.OCCUPANCY_DETECTED : Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED, undefined, CONTEXT_FROM_WEBHOOK);
        }).bind(this);
        
        this.service.getCharacteristic(Characteristic.OccupancyDetected).on('get', this.getState.bind(this));
    }
    else if(this.type === "smoke")
    {
        this.service = new Service.SmokeSensor(this.name);
        
        this.changeHandler = (function(newState)
        {
            log("Change HomeKit state for smoke sensor to '%s'.", newState);
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
            log("Change HomeKit value for air quality sensor to '%s'.", newState);
            this.service.getCharacteristic(Characteristic.AirQuality).updateValue(newState, undefined, CONTEXT_FROM_WEBHOOK);
        }).bind(this);
        
        this.service.getCharacteristic(Characteristic.AirQuality).on('get', this.getState.bind(this));
    }
    */
}

SynTexWebHookSensorAccessory.prototype.getState = function(callback)
{        
    if(this.type == 'rain' || this.type == 'light' || this.type == 'temperature' || this.type == 'humidity')
    {
        var device = {
            mac: this.mac,
            type: this.type,
            name: this.name
        };
    }
    else
    {
        var device = {
            mac: this.mac,
            name: this.name
        };
    }
    
    var name = this.name;
    var mac = this.mac;
    var type = this.type;

    readDevice(device).then(function(state) {
        
        if(!state)
        {
            log('\x1b[31m%s\x1b[0m', "[ERROR]", "Es wurde kein passendes Gerät gefunden! (" + mac + ")");
        }
        else
        {
            log('\x1b[36m%s\x1b[0m', "[READ]", "HomeKit Status für '" + name + "' ist '" + state + "'");
        }

        if(type === "contact")
        {
            callback(null, state ? Characteristic.ContactSensorState.CONTACT_DETECTED : Characteristic.ContactSensorState.CONTACT_NOT_DETECTED);
        }
        else if(type === "rain")
        {
            callback(null, state ? Characteristic.LEAK_DETECTED : Characteristic.LEAK_NOT_DETECTED);
        }
        else if(type === "smoke")
        {
            callback(null, state ? Characteristic.SmokeDetected.SMOKE_DETECTED : Characteristic.SmokeDetected.SMOKE_NOT_DETECTED);
        }
        else if(type === "occupancy")
        {
            callback(null, state ? Characteristic.OccupancyDetected.OCCUPANCY_DETECTED : Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED);
        }
        else if(type === "light")
        {
            callback(null, parseFloat(state));
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
        log('\x1b[36m%s\x1b[0m', "[UPDATE]", "HomeKit Status für '" + this.name + "' geändert zu '" + newState + "' ( " + this.mac + " )");
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
    
    var name = this.name;
    var mac = this.mac;

    readDevice(device).then(function(res) {
        
        state = (res == 'true' || res);
        
        log('\x1b[36m%s\x1b[0m', "[READ]", "HomeKit Status für '" + name + "' ist '" + state + "'");

        callback(null, state);
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
        value: powerOn
    };

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
                //log("Adding Form " + urlForm);
                theRequest.form = JSON.parse(urlForm);
            }
            else if(urlBody)
            {
                //log("Adding Body " + urlBody);
                theRequest.body = urlBody;
            }
        }
        request(theRequest, (function(err, response, body)
        {
            var statusCode = response && response.statusCode ? response.statusCode : -1;
            
            log("Anfrage zu '%s' wurde mit dem Status Code '%s' beendet: '%s'", urlToCall, statusCode, body, err);
            
            if(!err && statusCode == 200)
            {
                callback(null);
            }
            else
            {
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

function SynTexWebHookStripeRGBAccessory(switchConfig)
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

    this.hue = 0;
    this.saturation = 100;
    this.brightness = 100;
    this.power = true;

    this.service = new Service.Lightbulb(this.name);

    /*
    this.changeHandler = (function(newState)
    {
        log('\x1b[36m%s\x1b[0m', "[UPDATE]", "HomeKit Status für '" + this.name + "' geändert zu '" + newState + "' ( " + this.mac + " )");
        this.service.getCharacteristic(Characteristic.On).updateValue(newState);
    }).bind(this);
    */

    this.service.getCharacteristic(Characteristic.On).on('get', this.getState.bind(this)).on('set', this.setState.bind(this));
    this.service.addCharacteristic(new Characteristic.Brightness()).on('get', this.getBrightness.bind(this)).on('set', this.setBrightness.bind(this));
    this.service.addCharacteristic(new Characteristic.Hue()).on('get', this.getHue.bind(this)).on('set', this.setHue.bind(this));
    this.service.addCharacteristic(new Characteristic.Saturation()).on('get', this.getSaturation.bind(this)).on('set', this.setSaturation.bind(this));
}

SynTexWebHookStripeRGBAccessory.prototype.getBrightness = function(callback)
{
    callback(null, this.brightness);
}

SynTexWebHookStripeRGBAccessory.prototype.getSaturation = function(callback)
{
    callback(null, this.saturation);
}

SynTexWebHookStripeRGBAccessory.prototype.getState = function(callback)
{
    /*
    var device = {
        mac: this.mac,
        name: this.name
    };
    
    var name = this.name;
    var mac = this.mac;

    readDevice(device).then(function(res) {
        
        state = (res == 'true' || res);
        
        log('\x1b[36m%s\x1b[0m', "[READ]", "HomeKit Status für '" + name + "' ist '" + state + "'");

        callback(null, state);
    });
    */

    callback(null, this.power);
};

SynTexWebHookStripeRGBAccessory.prototype.setState = function(powerOn, callback, context)
{
    this.power = powerOn;

    if(powerOn)
    {
        setRGB(this.hue, this.saturation, this.brightness);
    }
    else
    {
        setRGB(this.hue, this.saturation, 0);
    }
    
    callback(null);
};

SynTexWebHookStripeRGBAccessory.prototype.setSaturation = function(level, callback)
{
    this.saturation = level;
    setRGB(this.hue, this.saturation, this.brightness);
    callback(null);
};

SynTexWebHookStripeRGBAccessory.prototype.setBrightness = function(level, callback)
{
    this.brightness = level;
    setRGB(this.hue, this.saturation, this.brightness);
    callback(null);
};

SynTexWebHookStripeRGBAccessory.prototype.getHue = function(callback)
{
    log(this.hue);
    callback(null, this.hue);
    
    /*
    var device = {
        mac: this.mac,
        name: this.name
    };
    
    var name = this.name;
    var mac = this.mac;

    readDevice(device).then(function(res) {
        
        state = 210;
        
        log('\x1b[36m%s\x1b[0m', "[READ]", "HomeKit Status für '" + name + "' ist '" + state + "'");

        callback(null, state);
    });
    */
};

SynTexWebHookStripeRGBAccessory.prototype.setHue = function(level, callback)
{
    this.hue = level;
    setRGB(this.hue, this.saturation, this.brightness);
    callback(null);
};

SynTexWebHookStripeRGBAccessory.prototype.getServices = function()
{
    return [this.service];
};

function setRGB(hue, saturation, brightness)
{
    log("HUE", hue);
    log("SATURATION", saturation);
    log("BRIGHTNESS", brightness);

    var h = hue, s = saturation * 2, l = brightness / 4;
    var r = 0, g = 0, b = 0;

    s /= 100;
    l /= 100;

    let c = (1 - Math.abs(2 * l - 1)) * s,
        x = c * (1 - Math.abs((h / 60) % 2 - 1)),
        m = l - c/2;

    if (0 <= h && h < 60) {
        r = c; g = x; b = 0;
    } else if (60 <= h && h < 120) {
        r = x; g = c; b = 0;
    } else if (120 <= h && h < 180) {
        r = 0; g = c; b = x;
    } else if (180 <= h && h < 240) {
        r = 0; g = x; b = c;
    } else if (240 <= h && h < 300) {
        r = x; g = 0; b = c;
    } else if (300 <= h && h < 360) {
        r = c; g = 0; b = x;
    }

    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);

    log('R:', r);
    log('G:', g);
    log('B:', b);

    var theRequest = {
        method : "GET",
        url : "http://192.168.188.155/color?r=" + r + "&g=" + g + "&b=" + b,
        timeout : 5000
    };

    request(theRequest, (function(err, response, body)
    {
        var statusCode = response && response.statusCode ? response.statusCode : -1;
        
        log("Anfrage zu '%s' wurde mit dem Status Code '%s' beendet: '%s'", 'URL', statusCode, body, err);
    }).bind(this));
}

async function updateDevice(obj)
{
    return new Promise(resolve => {
        
        if(obj.type)
        {
            var device = {
                id: obj.mac + '-' + obj.type[0].toUpperCase(),
                value: obj.value,
                type: obj.type
            };
        }
        else
        {
            var device = {
                id: obj.mac,
                value: obj.value
            };
        }

        storage.add(device, (err) => {

            if(err)
            {
                log('\x1b[31m%s\x1b[0m', "[ERROR]", obj.mac + ".json konnte nicht aktualisiert werden!", err);
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
                resolve(false);
            }
        });
    });
}