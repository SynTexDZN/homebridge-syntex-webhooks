var Service, Characteristic;
var request = require('request');
var http = require('http');
var url = require('url');
var logger = require('./logger');
var DeviceManager = require('./device-manager');
var restart = true;

module.exports = function(homebridge)
{
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;

    homebridge.registerPlatform('homebridge-syntex-webhooks', 'SynTexWebHooks', SynTexWebHookPlatform);
    homebridge.registerAccessory('homebridge-syntex-webhooks', 'SynTexWebHookStripeRGB', SynTexWebHookStripeRGBAccessory);
    homebridge.registerAccessory('homebridge-syntex-webhooks', 'SynTexWebHookStatelessSwitch', SynTexWebHookStatelessSwitchAccessory);
};

function SynTexWebHookPlatform(log, sconfig, api)
{
    this.sensors = sconfig['sensors'] || [];
    this.switches = sconfig['switches'] || [];
    this.lights = sconfig['lights'] || [];
    this.statelessSwitches = sconfig['statelessswitches'] || [];
    
    this.cacheDirectory = sconfig['cache_directory'] || './SynTex';
    this.logDirectory = sconfig['log_directory'] || './SynTex/log';
    this.port = sconfig['port'] || 1710;
    
    logger.create('SynTexWebHooks', this.logDirectory, api.user.storagePath());

    DeviceManager.SETUP(logger, this.cacheDirectory);

    restart = false;
}

SynTexWebHookPlatform.prototype = {
    
    accessories : function(callback)
    {
        var accessories = [];
        
        for(var i = 0; i < this.sensors.length; i++)
        {
            accessories.push(new SynTexBaseAccessory(this.sensors[i]));
        }
        
        for(var i = 0; i < this.switches.length; i++)
        {
            accessories.push(new SynTexBaseAccessory(this.switches[i]));
        }

        for(var i = 0; i < this.lights.length; i++)
        {
            accessories.push(new SynTexWebHookStripeRGBAccessory(this.lights[i]));
        }

        for(var i = 0; i < this.statelessSwitches.length; i++)
        {
            accessories.push(new SynTexWebHookStatelessSwitchAccessory(this.statelessSwitches[i]));
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
                        if(accessories[i].mac === urlParams.mac && (!urlParams.type || accessories[i].type.includes(urlParams.type)))
                        {
                            accessory = accessories[i];
                        }
                    }

                    if(accessory == null)
                    {
                        logger.log('error', 'Es wurde kein passendes ' + (urlParams.event ? 'Event' : 'Gerät') + ' in der Config gefunden! ( ' + urlParams.mac + ' )');

                        response.write('Error');
                    }
                    else if(urlParams.event)
                    {
                        accessory.changeHandler(accessory.name, urlParams.event, urlParams.value ? urlParams.value : 0);

                        response.write('Success');
                    }
                    else if(urlParams.value)
                    {
                        var state = null;

                        if((state = validateUpdate(urlParams.mac, accessory.type, urlParams.value)) != null)
                        {
                            accessory.changeHandler(state, urlParams.type || accessory.type);
                        }
                        else
                        {
                            logger.log('error', "'" + urlParams.value + "' ist kein gültiger Wert! ( " + urlParams.mac + ' )');
                        }

                        DeviceManager.setDevice(urlParams.mac, urlParams.type || accessory.type, urlParams.value);
                         
                        response.write(state != null ? 'Success' : 'Error');
                    }
                    else
                    {
                        var state = await DeviceManager.getDevice(accessory);

                        response.write(state != null ? state.toString() : 'Error');
                    }

                    response.end();
                }
                else if(urlPath == '/version')
                {
                    response.write(require('./package.json').version);
                    response.end();
                }
                else if(urlPath == '/check-restart')
                {
                    response.write(restart.toString());
                    response.end();
                }
                else if(urlPath == '/update')
                {
                    var version = urlParams.version ? urlParams.version : 'latest';

                    const { exec } = require('child_process');
                    
                    exec('sudo npm install homebridge-syntex-webhooks@' + version + ' -g', (error, stdout, stderr) => {

                        try
                        {
                            if(error || stderr.includes('ERR!'))
                            {
                                logger.log('warn', 'Die Homebridge konnte nicht aktualisiert werden! ' + (error || stderr));
                            }
                            else
                            {
                                logger.log('success', "Die Homebridge wurde auf die Version '" + version + "' aktualisiert!");

                                restart = true;

                                logger.log('warn', 'Die Homebridge wird neu gestartet ..');

                                exec('sudo systemctl restart homebridge');
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

        http.createServer(createServerCallback).listen(this.port, '0.0.0.0');
           
        logger.log('info', "Data Link Server läuft auf Port '" + this.port + "'");
    }
}

function SynTexWebHookStripeRGBAccessory(lightConfig)
{
    this.mac = lightConfig['mac'];
    this.type = lightConfig['type'];
    this.name = lightConfig['name'];
    this.url = lightConfig['url'] || '';

    this.version = lightConfig['version'] || '1.0.0';
    this.model = lightConfig['model'] || 'HTTP Accessory';
    this.manufacturer = lightConfig['manufacturer'] || 'SynTex';

    DeviceManager.getDevice({ mac : this.mac, type : this.type }).then(function(state) {

        this.power = state.split(':')[0] == 'true';
        this.hue = getHSL(state)[0] || 0;
        this.saturation = getHSL(state)[1] || 100;
        this.brightness = getHSL(state)[2] || 50;

    }.bind(this));
    
    this.service = createAccessory(this);
}

SynTexWebHookStripeRGBAccessory.prototype.getState = function(callback)
{
    DeviceManager.getDevice({ mac : this.mac, type : this.type }).then(function(state) {

        if(state == null)
        {
            logger.log('error', 'Es wurde kein passendes Gerät in der Storage gefunden! ( ' + this.mac + ' )');
        }
        else
        {
            logger.log('read', "HomeKit Status für '" + this.name + "' ist '" + state + "' ( " + this.mac + ' )');
        }

        callback(null, state == null ? false : (state.split(':')[0] == 'true' || false));

    }.bind({ mac : this.mac, name : this.name })).catch(function(e) {

        logger.err(e);
    });
};

SynTexWebHookStripeRGBAccessory.prototype.getHue = function(callback)
{
    DeviceManager.getDevice({ mac : this.mac, type : this.type }).then(function(state) {

        callback(null, (state == null) ? 0 : (getHSL(state)[0] || 0));

    }).catch(function(e) {

        logger.err(e);
    });
};

SynTexWebHookStripeRGBAccessory.prototype.getSaturation = function(callback)
{
    DeviceManager.getDevice({ mac : this.mac, type : this.type }).then(function(state) {

        callback(null, (state == null) ? 100 : (getHSL(state)[1] || 100));

    }).catch(function(e) {

        logger.err(e);
    });
}

SynTexWebHookStripeRGBAccessory.prototype.getBrightness = function(callback)
{
    DeviceManager.getDevice({ mac : this.mac, type : this.type }).then(function(state) {

        callback(null, (state == null) ? 50 : (getHSL(state)[2] || 50));

    }).catch(function(e) {

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
    return this.service;
};

function SynTexWebHookStatelessSwitchAccessory(statelessSwitchConfig)
{
    this.service = [];
    this.mac = statelessSwitchConfig['mac'];
    this.name = statelessSwitchConfig['name'];
    this.type = 'statelessswitch';
    this.buttons = statelessSwitchConfig['buttons'] || 0;

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
               logger.log('success', "'" + buttonName + "': Event " + i + " wurde ausgeführt! ( " + this.mac + ' )');

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

    let cmin = Math.min(r, g, b),
        cmax = Math.max(r, g, b),
        delta = cmax - cmin,
        h = 0,
        s = 0,
        l = 0;
    
    if(delta == 0)
        h = 0;
    else if(cmax == r)
        h = ((g - b) / delta) % 6;
    else if(cmax == g)
        h = (b - r) / delta + 2;
    else
        h = (r - g) / delta + 4;

    h = Math.round(h * 60);
    
    if(h < 0)
        h += 360;

    l = (cmax + cmin) / 2;

    s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
        
    s = +(s * 49.8).toFixed(1);
    l = +(l * 401.5).toFixed(1);

    return [h, s, l];
}

function setRGB(accessory)
{
    var h = accessory.hue, s = accessory.saturation * 2, l = accessory.power ? accessory.brightness / 4 : 0;
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

    if(accessory.fetch != accessory.power + ':' + r + ':' + g + ':' + b)
    {
        accessory.fetch = accessory.power + ':' + r + ':' + g + ':' + b;

        logger.log('update', "HomeKit Status für '" + accessory.name + "' geändert zu '" + accessory.fetch + "' ( " + accessory.mac + ' )');

        if(accessory.url != '')
        {
            var theRequest = {
                method : 'GET',
                url : accessory.url + '?r=' + r + '&g=' + g + '&b=' + b,
                timeout : 10000
            };
        
            request(theRequest, (function(err, response, body)
            {
                var statusCode = response && response.statusCode ? response.statusCode : -1;
        
                if(!err && statusCode == 200)
                {
                    logger.log('success', "Anfrage zu 'URL' wurde mit dem Status Code '" + statusCode + "' beendet: '" + body + "'");
        
                    DeviceManager.setDevice(accessory, accessory.fetch);
                }
                else
                {
                    logger.log('error', "Anfrage zu 'URL' wurde mit dem Status Code '" + statusCode + "' beendet: '" + body + "' " + (err ? err : ''));
                }
                
            }));
        }
    }
}

function validateUpdate(mac, type, state)
{
    if(type === 'motion' || type === 'rain' || type === 'smoke' || type === 'occupancy' || type === 'contact' || type == 'switch' || type == 'relais')
    {
        if(state != true && state != false && state != 'true' && state != 'false')
        {
            logger.log('warn', "Konvertierungsfehler: '" + state + "' ist keine boolsche Variable! ( " + mac + ' )');

            return null;
        }

        return (state == 'true' || state == true ? true : false);
    }
    else if(type === 'light' || type === 'temperature')
    {
        if(isNaN(state))
        {
            logger.log('warn', "Konvertierungsfehler: '" + state + "' ist keine numerische Variable! ( " + mac + ' )');
        }

        return !isNaN(state) ? parseFloat(state) : null;
    }
    else if(type === 'humidity' || type === 'airquality')
    {
        if(isNaN(state))
        {
            logger.log('warn', "Konvertierungsfehler: '" + state + "' ist keine numerische Variable! ( " + mac + ' )');
        }

        return !isNaN(state) ? parseInt(state) : null;
    }
    else
    {
        return state;
    }
}

function createAccessory(accessory)
{
    var services = [], accessories = [];

    accessories.push({type : 'contact', service : new Service.ContactSensor(accessory.name), characteristic : Characteristic.ContactSensorState});
    accessories.push({type : 'motion', service : new Service.MotionSensor(accessory.name), characteristic : Characteristic.MotionDetected});
    accessories.push({type : 'temperature', service : new Service.TemperatureSensor(accessory.name), characteristic : Characteristic.CurrentTemperature});
    accessories.push({type : 'humidity', service : new Service.HumiditySensor(accessory.name), characteristic : Characteristic.CurrentRelativeHumidity});
    accessories.push({type : 'rain', service : new Service.LeakSensor(accessory.name), characteristic : Characteristic.LeakDetected});
    accessories.push({type : 'light', service : new Service.LightSensor(accessory.name), characteristic : Characteristic.CurrentAmbientLightLevel});
    accessories.push({type : 'occupancy', service : new Service.OccupancySensor(accessory.name), characteristic : Characteristic.OccupancyDetected});
    accessories.push({type : 'smoke', service : new Service.SmokeSensor(accessory.name), characteristic : Characteristic.SmokeDetected});
    accessories.push({type : 'airquality', service : new Service.AirQualitySensor(accessory.name), characteristic : Characteristic.AirQuality});
    accessories.push({type : 'rgb', service : new Service.Lightbulb(accessory.name), characteristic : Characteristic.On});
    accessories.push({type : 'switch', service : new Service.Switch(accessory.name), characteristic : Characteristic.On});
    accessories.push({type : 'relais', service : new Service.Switch(accessory.name), characteristic : Characteristic.On});

    var informationService = new Service.AccessoryInformation();
    
    informationService
        .setCharacteristic(Characteristic.Manufacturer, accessory.manufacturer)
        .setCharacteristic(Characteristic.Model, accessory.model)
        .setCharacteristic(Characteristic.FirmwareRevision, accessory.version)
        .setCharacteristic(Characteristic.SerialNumber, accessory.mac);

        services.push(informationService);

    for(var i = 0; i < accessories.length; i++)
    {
        if(accessory.type.includes(accessories[i].type))
        {
            var count = (accessory.type.match(new RegExp(accessories[i].type, 'g')) || []).length;
            var characteristic = accessories[i].characteristic;

            for(var i = 0; i < count; i++)
            {
                var service = accessories[i].service;

                service.type = accessories[i].type;
                service.character = characteristic;

                accessory.changeHandler = (function(state, type)
                {
                    logger.log('update', "HomeKit Status für '" + type + "' in '" + accessory.name + "' geändert zu '" + state + "' ( " + accessory.mac + ' )');

                    for(var j = 1; j < accessory.service.length; j++)
                    {
                        if(accessory.type != 'rgb' && (type == null || type == accessory.service[j].type))
                        {
                            accessory.service[j].getCharacteristic(accessory.service[j].character).updateValue(state);
                        }
                    }
                });

                if(accessory.type == 'temperature')
                {
                    service.getCharacteristic(Characteristic.CurrentTemperature).setProps({ minValue : -100, maxValue : 140 });
                }

                //service.getCharacteristic(characteristic).on('get', accessory.getState.bind(service));

                if(accessory.type == 'switch' || accessory.type == 'reials' || accessory.type == 'rgb')
                {
                    service.getCharacteristic(characteristic).on('set', accessory.setState.bind(service));
                }

                if(accessory.type == 'rgb')
                {
                    service.addCharacteristic(new Characteristic.Hue()).on('get', accessory.getHue.bind(accessory)).on('set', accessory.setHue.bind(accessory));
                    service.addCharacteristic(new Characteristic.Saturation()).on('get', accessory.getSaturation.bind(accessory)).on('set', accessory.setSaturation.bind(accessory));
                    service.addCharacteristic(new Characteristic.Brightness()).on('get', accessory.getBrightness.bind(accessory)).on('set', accessory.setBrightness.bind(accessory));
                }

                services.push(service);
            }
        }
    }

    return services;
}

function SynTexBaseAccessory(accessoryConfig)
{
    this.service = [];
    this.mac = accessoryConfig['mac'];
    this.name = accessoryConfig['name'];
    this.type = accessoryConfig['type'];

    this.version = accessoryConfig['version'] || '1.0.0';
    this.model = accessoryConfig['model'] || 'HTTP Accessory';
    this.manufacturer = accessoryConfig['manufacturer'] || 'SynTex';

    var accessories = [];

    accessories.push({type : 'contact', service : Service.ContactSensor, characteristic : Characteristic.ContactSensorState});
    accessories.push({type : 'motion', service : Service.MotionSensor, characteristic : Characteristic.MotionDetected});
    accessories.push({type : 'temperature', service : Service.TemperatureSensor, characteristic : Characteristic.CurrentTemperature});
    accessories.push({type : 'humidity', service : Service.HumiditySensor, characteristic : Characteristic.CurrentRelativeHumidity});
    accessories.push({type : 'rain', service : Service.LeakSensor, characteristic : Characteristic.LeakDetected});
    accessories.push({type : 'light', service : Service.LightSensor, characteristic : Characteristic.CurrentAmbientLightLevel});
    accessories.push({type : 'occupancy', service : Service.OccupancySensor, characteristic : Characteristic.OccupancyDetected});
    accessories.push({type : 'smoke', service : Service.SmokeSensor, characteristic : Characteristic.SmokeDetected});
    accessories.push({type : 'airquality', service : Service.AirQualitySensor, characteristic : Characteristic.AirQuality});
    accessories.push({type : 'rgb', service : Service.Lightbulb, characteristic : Characteristic.On});
    accessories.push({type : 'switch', service : Service.Switch, characteristic : Characteristic.On});
    accessories.push({type : 'relais', service : Service.Switch, characteristic : Characteristic.On});

    var informationService = new Service.AccessoryInformation();
    
    informationService
        .setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
        .setCharacteristic(Characteristic.Model, this.model)
        .setCharacteristic(Characteristic.FirmwareRevision, this.version)
        .setCharacteristic(Characteristic.SerialNumber, this.mac);

        this.service.push(informationService);

    for(var i = 0; i < accessories.length; i++)
    {
        if(this.type.includes(accessories[i].type))
        {
            var count = (this.type.match(new RegExp(accessories[i].type, 'g')) || []).length;
            var characteristic = accessories[i].characteristic;
            var name = this.name;

            if(this.type instanceof Array && this.type.length > 1)
            {
                name += ' ' + accessories[i].type[0].toUpperCase() + accessories[i].type.substring(1);
            }

            for(var i = 0; i < count; i++)
            {
                if(count == 1)
                {
                    var service = new accessories[i].service(name);
                }
                else
                {
                    var service = new accessories[i].service(name + ' ' + (i + 1));
                }

                service.mac = this.mac;
                service.type = accessories[i].type;
                service.name = name;
                service.characteristic = characteristic;

                service.options = {};

                if(service.type == 'switch' || service.type == 'relais')
                {
                    service.options.onURL = accessoryConfig['on_url'] || '';
                    service.options.onMethod = accessoryConfig['on_method'] || 'GET';
                    service.options.onBody = accessoryConfig['on_body'] || '';
                    service.options.onForm = accessoryConfig['on_form'] || '';
                    service.options.onHeaders = accessoryConfig['on_headers'] || '{}';
                    service.options.offURL = accessoryConfig['off_url'] || '';
                    service.options.offMethod = accessoryConfig['off_method'] || 'GET';
                    service.options.offBody = accessoryConfig['off_body'] || '';
                    service.options.offForm = accessoryConfig['off_form'] || '';
                    service.options.offHeaders = accessoryConfig['off_headers'] || '{}'; 
                }
                else if(service.type == 'rgb')
                {
                    service.options.url = accessoryConfig['url'] || '';
                }

                DeviceManager.getDevice({ mac : this.mac, type : service.type }).then(function(state) {

                    if(service.type == 'rgb')
                    {
                        this.power = state.split(':')[0] == 'true';
                        this.hue = getHSL(state)[0] || 0;
                        this.saturation = getHSL(state)[1] || 100;
                        this.brightness = getHSL(state)[2] || 50;
                    }
                    else
                    {
                        this.accessory.changeHandler(validateUpdate(this.accessory.mac, this.service.type, state), this.service.type);
                    }
            
                }.bind({ accessory : this, service : service }));

                this.changeHandler = (function(state, type)
                {
                    for(var j = 1; j < this.service.length; j++)
                    {
                        if(this.service[j].type != 'rgb' && this.service[j].type == type)
                        {
                            logger.log('update', "HomeKit Status für '" + this.service[j].name + "' geändert zu '" + state + "' ( " + this.mac + ' )');

                            this.service[j].getCharacteristic(this.service[j].characteristic).updateValue(state);
                        }
                    }

                }.bind(this));

                if(service.type == 'temperature')
                {
                    service.getCharacteristic(Characteristic.CurrentTemperature).setProps({ minValue : -100, maxValue : 140 });
                }

                service.getCharacteristic(characteristic).on('get', this.getState.bind(service));

                if(service.type == 'switch' || service.type == 'relais' || service.type == 'rgb')
                {
                    service.getCharacteristic(characteristic).on('set', this.setState.bind(service));
                }

                if(service.type == 'rgb')
                {
                    service.addCharacteristic(new Characteristic.Hue()).on('get', this.getHue.bind(this)).on('set', this.setHue.bind(this));
                    service.addCharacteristic(new Characteristic.Saturation()).on('get', this.getSaturation.bind(this)).on('set', this.setSaturation.bind(this));
                    service.addCharacteristic(new Characteristic.Brightness()).on('get', this.getBrightness.bind(this)).on('set', this.setBrightness.bind(this));
                }

                this.service.push(service);
            }
        }
    }
}

SynTexBaseAccessory.prototype.getState = function(callback)
{        
    DeviceManager.getDevice(this).then(function(state) {

        if(state == null)
        {
            logger.log('error', 'Es wurde kein passendes Gerät in der Storage gefunden! ( ' + this.mac + ' )');
        }
        else if((state = validateUpdate(this.mac, this.type, state)) != null)
        {
            logger.log('read', "HomeKit Status für '" + this.name + "' ist '" + state + "' ( " + this.mac + ' )');
        }
         
        callback(null, state);

    }.bind(this)).catch(function(e) {

        logger.err(e);
    });
};

SynTexBaseAccessory.prototype.setState = function(powerOn, callback, context)
{
    var urlToCall = powerOn ? this.options.onURL : this.options.offURL;
    var urlMethod = powerOn ? this.options.onMethod : this.options.offMethod;
    var urlBody = powerOn ? this.options.onBody : this.options.offBody;
    var urlForm = powerOn ? this.options.onForm : this.options.offForm;
    var urlHeaders = powerOn ? this.options.onHeaders : this.options.offHeaders;

    if(urlToCall != '')
    {
        var theRequest = {
            method : urlMethod,
            url : urlToCall,
            timeout : 5000,
            headers: JSON.parse(urlHeaders)
        };
        
        if(urlMethod === 'POST' || urlMethod === 'PUT')
        {
            if(urlForm)
            {
                //logger.log('Adding Form ' + urlForm);
                theRequest.form = JSON.parse(urlForm);
            }
            else if(urlBody)
            {
                //logger.log('Adding Body ' + urlBody);
                theRequest.body = urlBody;
            }
        }

        request(theRequest, (function(err, response, body)
        {
            var statusCode = response && response.statusCode ? response.statusCode : -1;
            
            if(!err && statusCode == 200)
            {
                logger.log('success', "Anfrage zu '" + urlToCall + "' wurde mit dem Status Code '" + statusCode + "' beendet: '" + body + "'");

                logger.log('update', "HomeKit Status für '" + this.name + "' geändert zu '" + powerOn.toString() + "' ( " + this.mac + ' )');

                DeviceManager.setDevice(this.mac, this.type, powerOn);

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
        logger.log('update', "HomeKit Status für '" + this.name + "' geändert zu '" + powerOn.toString() + "' ( " + this.mac + ' )');

        DeviceManager.setDevice(this.mac, this.type, powerOn);

        callback(null);
    }
};

SynTexBaseAccessory.prototype.getServices = function()
{
    return this.service;
};