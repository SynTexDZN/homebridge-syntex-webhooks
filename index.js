var request = require('request');
var http = require('http');
var https = require('https');
var url = require('url');
var auth = require('http-auth');
var store = require('json-fs-store');
var Service, Characteristic;

module.exports = function(homebridge)
{
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;

    homebridge.registerPlatform("homebridge-syntex", "SynTexWebHooks", SynTexWebHookPlatform);
    homebridge.registerAccessory("homebridge-syntex", "SynTexWebHookSensor", SynTexWebHookSensorAccessory);
    homebridge.registerAccessory("homebridge-syntex", "SynTexWebHookSwitch", SynTexWebHookSwitchAccessory);
};

function SynTexWebHookPlatform(log, config, api)
{
    this.sensors = config["sensors"] || [];
    this.switches = config["switches"] || [];
    this.configPath = api.user.storagePath();
    this.config = store(this.configPath);
    this.cacheDirectory = config["cache_directory"] || "./.node-persist/storage";
    this.storage = store(this.cacheDirectory);
    this.log = log;
    
    //this.autoConfig = config["autoConfig"] || true;
    this.port = config["port"] || 1710;
}

SynTexWebHookPlatform.prototype = {
    accessories : function(callback)
    {
        var accessories = [];
        
        for (var i = 0; i < this.sensors.length; i++)
        {
            var Sensor = new SynTexWebHookSensorAccessory(this.log, this.sensors[i], this.storage);
            accessories.push(Sensor);
        }
        
        for (var i = 0; i < this.switches.length; i++)
        {
            var Switch = new SynTexWebHookSwitchAccessory(this.log, this.switches[i], this.storage);
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
                this.log("[ERROR] Reason: %s.", err);
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
          
                                if(obj)
                                {                            
                                    this.log('[Devices] Storage.json geladen!');
                                    
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
                                            else
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
                                    
                                    this.storage.add(obj, (err) => {
                                        this.log('Storage aktualisiert!');
                                    });
                                }
                                else
                                {
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
                                    
                                    this.storage.add(device, (err) => {
                                        this.log('Storage aktualisiert!');
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
                            });
                                               
                            response.write("Success");
                            response.end();
                        }
                        else
                        {
                            this.storage.load('storage', (err, obj) => {    
          
                                if(obj)
                                {                            
                                    this.log('[Devices] Storage.json geladen!');
                                    
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
                                                }
                                            }
                                            else
                                            {
                                                response.write(obj.devices[i].value.toString());
                                                response.end();
                                            }
                                        }
                                    }
                                }
                            });
                        }
                    }
                    else
                    {
                        response.write("Error MAC");
                        response.end();
                    }
                }
                else if(urlPath == '/ping')
                {
                    this.log(this.configPath);
                    
                    response.write("");
                    response.end();
                }
                else
                {
                    // Index
                    
                    this.log("Index wurde aufgerufen!");
                    response.write("Hallo Welt!");
                    response.end();                    
                }
            }).bind(this));
        }).bind(this);

        http.createServer(createServerCallback).listen(this.port, "0.0.0.0");
           
        this.log("Data Link Server läuft auf Port '%s'.", this.port);
    }
}

function SynTexWebHookSensorAccessory(log, sensorConfig, storage)
{
    this.log = log;
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
            this.log("Change HomeKit state for contact sensor to '%s'.", newState);
            this.service.getCharacteristic(Characteristic.ContactSensorState).updateValue(newState ? Characteristic.ContactSensorState.CONTACT_DETECTED : Characteristic.ContactSensorState.CONTACT_NOT_DETECTED);
        }).bind(this);
        
        this.service.getCharacteristic(Characteristic.ContactSensorState).on('get', this.getState.bind(this));
    }
    else if(this.type === "motion")
    {
        this.service = new Service.MotionSensor(this.name);
        
        this.changeHandler = (function(newState)
        {
            this.log("Change HomeKit state for contact sensor to '%s'.", newState);
            this.service.getCharacteristic(Characteristic.MotionDetected).updateValue(newState);
        }).bind(this);
        
        this.service.getCharacteristic(Characteristic.MotionDetected).on('get', this.getState.bind(this));
    }
    else if(this.type === "temperature")
    {
        this.service = new Service.TemperatureSensor(this.name);
        
        this.changeHandler = (function(newState)
        {
            this.log("Change HomeKit value for temperature sensor to '%s'.", newState);
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
            this.log("Change HomeKit value for humidity sensor to '%s'.", newState);
            this.service.getCharacteristic(Characteristic.CurrentRelativeHumidity).updateValue(newState);
        }).bind(this);
        
        this.service.getCharacteristic(Characteristic.CurrentRelativeHumidity).on('get', this.getState.bind(this));
    }
    else if(this.type === "rain")
    {        
        this.service = new Service.LeakSensor(this.name);
        
        this.changeHandler = (function(newState)
        {
            this.log("Change HomeKit value for humidity sensor to '%s'.", newState);
            this.service.getCharacteristic(Characteristic.LeakDetected).updateValue(newState);
        }).bind(this);
        
        this.service.getCharacteristic(Characteristic.LeakDetected).on('get', this.getState.bind(this));
    }
    else if(this.type === "light")
    {
        this.service = new Service.LightSensor(this.name);
      
        this.changeHandler = (function(newState)
        {
            this.log("Change HomeKit value for light sensor to '%s'.", newState);
            this.service.getCharacteristic(Characteristic.CurrentAmbientLightLevel).updateValue(parseFloat(newState));
        }).bind(this);
    
        this.service.getCharacteristic(Characteristic.CurrentAmbientLightLevel).on('get', this.getState.bind(this));
    }
    
    /*
    else if(this.type === "occupancy")
    {
        this.service = new Service.OccupancySensor(this.name);
        this.changeHandler = (function(newState) {
            this.service.getCharacteristic(Characteristic.OccupancyDetected).updateValue(newState ? Characteristic.OccupancyDetected.OCCUPANCY_DETECTED : Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED, undefined, CONTEXT_FROM_WEBHOOK);
            if (this.autoRelease) {
                setTimeout(function() {
                    this.storage.setItemSync("http-webhook-" + this.id, false);
                    this.service.getCharacteristic(Characteristic.OccupancyDetected).updateValue(Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED, undefined, CONTEXT_FROM_TIMEOUTCALL);
                }.bind(this), this.autoReleaseTime);
            }
        }).bind(this);
        this.service.getCharacteristic(Characteristic.OccupancyDetected).on('get', this.getState.bind(this));
    }
    else if(this.type === "smoke")
    {
        this.service = new Service.SmokeSensor(this.name);
        this.changeHandler = (function(newState) {
            this.log("Change HomeKit state for smoke sensor to '%s'.", newState);
            this.service.getCharacteristic(Characteristic.SmokeDetected).updateValue(newState ? Characteristic.SmokeDetected.SMOKE_DETECTED : Characteristic.SmokeDetected.SMOKE_NOT_DETECTED, undefined, CONTEXT_FROM_WEBHOOK);
        }).bind(this);
        this.service.getCharacteristic(Characteristic.SmokeDetected).on('get', this.getState.bind(this));
    }
    else if(this.type === "airquality")
    {
        this.service = new Service.AirQualitySensor(this.name);
        this.changeHandler = (function(newState) {
            this.log("Change HomeKit value for air quality sensor to '%s'.", newState);
            this.service.getCharacteristic(Characteristic.AirQuality).updateValue(newState, undefined, CONTEXT_FROM_WEBHOOK);
        }).bind(this);
        this.service.getCharacteristic(Characteristic.AirQuality).on('get', this.getState.bind(this));
    }
    */
}

SynTexWebHookSensorAccessory.prototype.getState = function(callback)
{
    this.log("Getting current state for '%s'...", this.id);
    
    var state = null;
    
    this.storage.load('storage', (err, obj) => {    
          
        if(obj)
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
        else if(this.type === "light")
        {
            callback(null, parseFloat(state));
        }
        else
        {
            callback(null, state);
        }
        
        this.log("Status von '%s' ist '%s'", this.id, state);
    });
    
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
};

SynTexWebHookSensorAccessory.prototype.getServices = function()
{
    return [this.service];
};







































function SynTexWebHookSwitchAccessory(log, switchConfig, storage)
{
    this.log = log;
    this.mac = switchConfig["mac"];
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
        this.log("Change HomeKit state for switch to '%s'.", newState);
        this.service.getCharacteristic(Characteristic.On).updateValue(newState);
    }).bind(this);
    
    this.service.getCharacteristic(Characteristic.On).on('get', this.getState.bind(this)).on('set', this.setState.bind(this));
}

SynTexWebHookSwitchAccessory.prototype.getState = function(callback)
{
    this.log("Getting current state for '%s'...", this.id);

    var state = null;
    
    this.storage.load('storage', (err, obj) => {    
          
        if(obj)
        {    
    
            for(var i = 0; i < obj.devices.length; i++)
            {
                if(obj.devices[i].mac === this.mac)
                {
                    state = obj.devices[i].value;
                    
                    if(state == 'true' || state == 'false')
                    {
                        state = (state === 'true');
                        
                        this.log("Device Found");
                    }
                }
            }    
        }
        
        if(state == null)
        {
            state = false;
        }

        callback(null, state);
        
        this.log("Status von '%s' ist '%s'", this.id, state);
    });
};

SynTexWebHookSwitchAccessory.prototype.setState = function(powerOn, callback, context)
{
    this.log("Switch state for '%s'...", this.id);
    
    var urlToCall = this.onURL;
    var urlMethod = this.onMethod;
    var urlBody = this.onBody;
    var urlForm = this.onForm;
    var urlHeaders = this.onHeaders;
    
    this.storage.load('storage', (err, obj) => {    
          
        if(obj)
        {                            
            this.log('[Switch] Storage.json geladen!');

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
                this.log('Storage aktualisiert!');
            });
        }
        else
        {
            var device = {
                id: "storage",
                devices: [{mac: this.mac, value: powerOn}]
            };

            this.storage.add(device, (err) => {
                this.log('Storage aktualisiert!');
            });
        }
    });    
    
    if(!powerOn)
    {
        urlToCall = this.offURL;
        urlMethod = this.offMethod;
        urlBody = this.offBody;
        urlForm = this.offForm;
        urlHeaders = this.offHeaders;
    }
    
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
                this.log("Adding Form " + urlForm);
                theRequest.form = JSON.parse(urlForm);
            }
            else if(urlBody)
            {
                this.log("Adding Body " + urlBody);
                theRequest.body = urlBody;
            }
        }
        request(theRequest, (function(err, response, body)
        {
            var statusCode = response && response.statusCode ? response.statusCode : -1;
            
            this.log("Request to '%s' finished with status code '%s' and body '%s'.", urlToCall, statusCode, body, err);
            
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