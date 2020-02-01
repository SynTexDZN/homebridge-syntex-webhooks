var request = require('request');
var http = require('http');
var url = require('url');
var store = require('json-fs-store');
var fs = require('fs');
var path = require('path');
var Service, Characteristic;

module.exports = function(homebridge)
{
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;

    homebridge.registerPlatform("homebridge-syntex-webhooks", "SynTexWebHooks", SynTexWebHookPlatform);
    homebridge.registerAccessory("homebridge-syntex-webhooks", "SynTexWebHookSensor", SynTexWebHookSensorAccessory);
    homebridge.registerAccessory("homebridge-syntex-webhooks", "SynTexWebHookSwitch", SynTexWebHookSwitchAccessory);
};

var log;
var config;

function SynTexWebHookPlatform(slog, sconfig, api)
{
    config = store(api.user.storagePath());
    log = slog;
    
    this.sensors = sconfig["sensors"] || [];
    this.switches = sconfig["switches"] || [];
    
    this.cacheDirectory = sconfig["cache_directory"] || "./.node-persist/storage";
    this.port = sconfig["port"] || 1710;
    
    this.storage = store(this.cacheDirectory);
}

SynTexWebHookPlatform.prototype = {
    
    accessories : function(callback)
    {
        var accessories = [];
        
        for (var i = 0; i < this.sensors.length; i++)
        {
            var Sensor = new SynTexWebHookSensorAccessory(this.sensors[i], this.storage);
            accessories.push(Sensor);
        }
        
        for (var i = 0; i < this.switches.length; i++)
        {
            var Switch = new SynTexWebHookSwitchAccessory(this.switches[i], this.storage);
            accessories.push(Switch);
        }
        
        callback(accessories);
        
        var createServerCallback = (function(request, response)
        {
            var urlParts = url.parse(request.url, true);
            var urlParams = urlParts.query;
            var urlPath = urlParts.pathname;
            var body = [];
            
            request.on('error', (function(err)
            {
                log('\x1b[31m%s\x1b[0m', "[ERROR]", "Reason: ", err);
                
            }).bind(this)).on('data', function(chunk)
            {
                body.push(chunk);
                
            }).on('end', (function()
            {
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
                            this.storage.load('storage', (err, obj) => {    
          
                                if(err)
                                {
                                    log('\x1b[31m%s\x1b[0m', "[ERROR]", "ERR", err);    
                                }
                                else
                                {
                                    log('\x1b[32m%s\x1b[0m', "[SUCCESS]", "!ERR");         
                                }
                                
                                if(obj)
                                {
                                    log('\x1b[32m%s\x1b[0m', "[SUCCESS]", "OBJ");                                    
                                }
                                else
                                {
                                    log('\x1b[31m%s\x1b[0m', "[ERROR]", "!OBJ");               
                                }
                                
                                if(!obj && err)
                                {
                                    log('\x1b[31m%s\x1b[0m', "[ERROR]", "Storage.json konnte nicht geparst werden!"); 
                                }
                                else if(!obj && !err)
                                {
                                    log('\x1b[33m%s\x1b[0m', "[INFO]", "Storage.json wurde ohne Inhalt geladen!");
                                    
                                    if(urlParams.type)
                                    {
                                        var device = {
                                            id: "storage",
                                            devices: [{mac: urlParams.mac, value: urlParams.value, type: urlParams.type}]
                                        };
                                    }
                                    else
                                    {
                                        var device = {
                                            id: "storage",
                                            devices: [{mac: urlParams.mac, value: urlParams.value}]
                                        };
                                    }
                                    
                                    log(device);
                                    
                                    this.storage.add(device, (err) => {
                                        
                                        if(err)
                                        {
                                            log('\x1b[31m%s\x1b[0m', "[ERROR]", "Storage.json konnte nicht aktualisiert werden!");
                                        }
                                        
                                        var pathname = this.cacheDirectory + 'storage.json';

                                        fs.exists(pathname, function (exist)
                                        {
                                            if(!exist)
                                            {
                                                log('\x1b[31m%s\x1b[0m', "[ERROR]", pathname + ' wurde nicht gefunden!');
                                            }
                                            else
                                            {
                                                fs.readFile(pathname, function(err, data)
                                                {
                                                    if(err)
                                                    {
                                                        log('\x1b[31m%s\x1b[0m', "[ERROR]", 'Die Seite konnte nicht geladen werden: ' + err);
                                                    }
                                                    else
                                                    {
                                                        log('\x1b[32m%s\x1b[0m', "[SUCCESS]", pathname);
                                                        log(data.toString());
                                                    }
                                                });
                                            }
                                        });
                                    });
                                }
                                else if(obj && !err)
                                {                                                     
                                    var found = false;
                                    
                                    for(var i = 0; i < obj.devices.length; i++)
                                    {
                                        if(obj.devices[i].mac === urlParams.mac)
                                        {
                                            if(urlParams.type && obj.devices[i].type)
                                            {
                                                if(urlParams.type == obj.devices[i].type)
                                                {
                                                    obj.devices[i].value = urlParams.value;
                                                    
                                                    found = true;
                                                }
                                            }
                                            else if(!urlParams.type)
                                            {
                                                obj.devices[i].value = urlParams.value;
                                                
                                                found = true;
                                            }
                                        }
                                    }
                                    
                                    if(found == false)
                                    {                                        
                                        if(urlParams.type)
                                        {
                                            obj.devices[obj.devices.length] = {mac: urlParams.mac, value: urlParams.value, type: urlParams.type};
                                        }
                                        else
                                        {
                                            obj.devices[obj.devices.length] = {mac: urlParams.mac, value: urlParams.value};
                                        }
                                    }
                                    
                                    log(obj);
                                    
                                    this.storage.add(obj, (err) => {
                                        
                                        if(err)
                                        {
                                            log('\x1b[31m%s\x1b[0m', "[ERROR]", "Storage.json konnte nicht aktualisiert werden!");
                                        }
                                        
                                        var pathname = this.cacheDirectory + 'storage.json';

                                        fs.exists(pathname, function (exist)
                                        {
                                            if(!exist)
                                            {
                                                log('\x1b[31m%s\x1b[0m', "[ERROR]", pathname + ' wurde nicht gefunden!');
                                            }
                                            else
                                            {
                                                fs.readFile(pathname, function(err, data)
                                                {
                                                    if(err)
                                                    {
                                                        log('\x1b[31m%s\x1b[0m', "[ERROR]", 'Die Seite konnte nicht geladen werden: ' + err);
                                                    }
                                                    else
                                                    {
                                                        log('\x1b[32m%s\x1b[0m', "[SUCCESS]", pathname);
                                                        log(data.toString());
                                                    }
                                                });
                                            }
                                        });
                                    });
                                }
                                
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
                                /*
                                if(obj && obj.devices)
                                {
                                   log(obj.devices);
                                }
                                */
                            });
                                               
                            response.write("Success");
                            response.end();
                        }
                        else
                        {
                            this.storage.load('storage', (err, obj) => {    
          
                                if(obj && !err)
                                {                            
                                    var found = false;
                                    
                                    for(var i = 0; i < obj.devices.length; i++)
                                    {
                                        if(obj.devices[i].mac === urlParams.mac)
                                        {
                                            if(urlParams.type && obj.devices[i].type)
                                            {
                                                if(urlParams.type == obj.devices[i].type)
                                                {
                                                    response.write(obj.devices[i].value.toString());
                                                    response.end();
                                                    
                                                    found = true;
                                                }
                                            }
                                            else
                                            {
                                                response.write(obj.devices[i].value.toString());
                                                response.end();
                                                
                                                found = true;
                                            }
                                        }
                                    }
                                    
                                    if(!found)
                                    {
                                        response.write("Es wurde kein passendes Gerät gefunden!");
                                        response.end();
                                        
                                        log('\x1b[31m%s\x1b[0m', "[ERROR]", "Es wurde kein passendes Gerät gefunden! (" + urlParams.mac + ")");
                                    }
                                }
                                
                                if(err || !obj)
                                {
                                    log('\x1b[31m%s\x1b[0m', "[ERROR]", "Storage.json konnte nicht geladen werden!");
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
            }).bind(this));
            
        }).bind(this);

        http.createServer(createServerCallback).listen(this.port, "0.0.0.0");
           
        log('\x1b[33m%s\x1b[0m', "[INFO]", "Data Link Server läuft auf Port ", "'" + this.port + "'");
    }
}

function SynTexWebHookSensorAccessory(sensorConfig, storage)
{
    this.mac = sensorConfig["mac"];
    this.id = sensorConfig["id"];
    this.name = sensorConfig["name"];
    this.type = sensorConfig["type"];
    this.storage = storage;

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
    /*
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
    var state = null;
    
    this.storage.load('storage', (err, obj) => {    
          
        if(obj && !err)
        {    
            for(var i = 0; i < obj.devices.length; i++)
            {
                if(obj.devices[i].mac === this.mac)
                {
                    if(obj.devices[i].type)
                    {
                        if(obj.devices[i].type == this.type)
                        {
                            state = obj.devices[i].value;
                    
                            if(state == 'true' || state == 'false')
                            {
                                state = (state === 'true');
                            }
                        }
                    }
                    else
                    {
                        state = obj.devices[i].value;
                    
                        if(state == 'true' || state == 'false')
                        {
                            state = (state === 'true');
                        }
                    }
                }
            }
        }
        
        if(err || !obj)
        {
            log('\x1b[31m%s\x1b[0m', "[ERROR 4]", "Storage.json konnte nicht geladen werden!");
        }
        
        if(state == null)
        {
            state = false;
        }

        if(this.type === "contact")
        {
            callback(null, state ? Characteristic.ContactSensorState.CONTACT_DETECTED : Characteristic.ContactSensorState.CONTACT_NOT_DETECTED);
        }
        else if(this.type === "rain")
        {
            callback(null, state ? Characteristic.LEAK_DETECTED : Characteristic.LEAK_NOT_DETECTED);
        }
        /*
        else if(this.type === "smoke")
        {
            callback(null, state ? Characteristic.SmokeDetected.SMOKE_DETECTED : Characteristic.SmokeDetected.SMOKE_NOT_DETECTED);
        }
        else if(this.type === "occupancy")
        {
            callback(null, state ? Characteristic.OccupancyDetected.OCCUPANCY_DETECTED : Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED);
        }
        */
        else if(this.type === "light")
        {
            callback(null, parseFloat(state));
        }
        else
        {
            callback(null, state);
        }
        
        log('\x1b[36m%s\x1b[0m', "[READ]", "HomeKit Status für '" + this.name + "' ist '" + state + "' ( " + this.mac + " )");
    });
};

SynTexWebHookSensorAccessory.prototype.getServices = function()
{
    return [this.service];
};


function SynTexWebHookSwitchAccessory(switchConfig, storage)
{
    this.mac = switchConfig["mac"];
    this.type = switchConfig["type"];
    this.id = switchConfig["id"];
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
    this.storage = storage;

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
    var state = null;
    
    this.storage.load('storage', (err, obj) => {    
          
        if(obj && !err)
        {    
            for(var i = 0; i < obj.devices.length; i++)
            {
                if(obj.devices[i].mac === this.mac)
                {
                    state = obj.devices[i].value;
                    
                    if(state == 'true' || state == 'false')
                    {
                        state = (state === 'true');
                    }
                }
            }    
        }
        
        if(err || !obj)
        {
            log('\x1b[31m%s\x1b[0m', "[ERROR 5]", "Storage.json konnte nicht geladen werden!");
        }
        
        if(state == null)
        {
            state = false;
        }

        callback(null, state);
        
        log('\x1b[36m%s\x1b[0m', "[READ]", "HomeKit Status für '" + this.name + "' ist '" + state + "' ( " + this.mac + " )");
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
    
    this.storage.load('storage', (err, obj) => {    
          
        if(obj && !err)
        {                            
            var found = false;

            for(var i = 0; i < obj.devices.length; i++)
            {
                if(obj.devices[i].mac === this.mac)
                {
                    obj.devices[i].value = powerOn;

                    found = true;
                }
            }

            if(found == false)
            {
                obj.devices[obj.devices.length] = {mac: this.mac, value: powerOn};
            }

            this.storage.add(obj, (err) => {
                
                if(err)
                {
                    log('\x1b[31m%s\x1b[0m', "[ERROR]", "Storage.json konnte nicht aktualisiert werden!");
                }
            });
        }
        else
        {
            var device = {
                id: "storage",
                devices: [{mac: this.mac, value: powerOn}]
            };

            this.storage.add(device, (err) => {
                
                if(err)
                {
                    log('\x1b[31m%s\x1b[0m', "[ERROR]", "Storage.json konnte nicht aktualisiert werden!");
                }
            });
        }
    });    
    
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