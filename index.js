var Service, Characteristic;
var request = require('request');
var http = require('http');
var url = require('url');
var logger = require('./logger');
var DeviceManager = require('./device-manager');
var Automations = require('./automations');
var restart = true;

var letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
var presets = {};

module.exports = function(homebridge)
{
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;

    presets.contact = {letter : 'A', service : Service.ContactSensor, characteristic : Characteristic.ContactSensorState};
    presets.motion = {letter : 'B', service : Service.MotionSensor, characteristic : Characteristic.MotionDetected};
    presets.temperature = {letter : 'C', service : Service.TemperatureSensor, characteristic : Characteristic.CurrentTemperature};
    presets.humidity = {letter : 'D', service : Service.HumiditySensor, characteristic : Characteristic.CurrentRelativeHumidity};
    presets.rain = {letter : 'E', service : Service.LeakSensor, characteristic : Characteristic.LeakDetected};
    presets.light = {letter : 'F', service : Service.LightSensor, characteristic : Characteristic.CurrentAmbientLightLevel};
    presets.occupancy = {letter : '0', service : Service.OccupancySensor, characteristic : Characteristic.OccupancyDetected};
    presets.smoke = {letter : '1', service : Service.SmokeSensor, characteristic : Characteristic.SmokeDetected};
    presets.airquality = {letter : '2', service : Service.AirQualitySensor, characteristic : Characteristic.AirQuality};
    presets.rgb = {letter : '3', service : Service.Lightbulb, characteristic : Characteristic.On};
    presets.switch = {letter : '4', service : Service.Switch, characteristic : Characteristic.On};
    presets.relais = {letter : '5', service : Service.Switch, characteristic : Characteristic.On};

    homebridge.registerPlatform('homebridge-syntex-webhooks', 'SynTexWebHooks', SynTexWebHookPlatform);
    homebridge.registerAccessory('homebridge-syntex-webhooks', 'SynTexWebHookStatelessSwitch', SynTexWebHookStatelessSwitchAccessory);
};

function SynTexWebHookPlatform(log, sconfig, api)
{
    this.devices = sconfig['accessories'] || [];
    
    this.cacheDirectory = sconfig['cache_directory'] || './SynTex';
    this.logDirectory = sconfig['log_directory'] || './SynTex/log';
    this.port = sconfig['port'] || 1710;
    
    logger.create('SynTexWebHooks', this.logDirectory, api.user.storagePath());

    DeviceManager.SETUP(logger, this.cacheDirectory);
    Automations.SETUP(logger, this.cacheDirectory, DeviceManager);

    restart = false;
}

SynTexWebHookPlatform.prototype = {
    
    accessories : function(callback)
    {
        var accessories = [];

        for(var i = 0; i < this.devices.length; i++)
        {
            if(this.devices[i].services == 'statelessswitch')
            {
                accessories.push(new SynTexWebHookStatelessSwitchAccessory(this.devices[i]));
            }
            else
            {
                accessories.push(new SynTexBaseAccessory(this.devices[i]));
            }
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
                        if(accessories[i].mac == urlParams.mac)
                        {
                            if(urlParams.event)
                            {
                                accessory = accessories[i];
                            }
                            else
                            {
                                for(var j = 0; j < accessories[i].service.length; j++)
                                {
                                    if((!urlParams.type || accessories[i].service[j].type == urlParams.type) && (!urlParams.counter || accessories[i].service[j].letters.slice(-1) == urlParams.counter))
                                    {
                                        accessory = accessories[i].service[j];
                                    }
                                }
                            }
                        }
                    }

                    if(accessory == null)
                    {
                        logger.log('error', urlParams.mac, '', 'Es wurde kein passendes ' + (urlParams.event ? 'Event' : 'Gerät') + ' in der Config gefunden! ( ' + urlParams.mac + ' )');

                        response.write('Error');
                    }
                    else if(urlParams.event)
                    {
                        accessory.changeHandler(accessory.name, urlParams.event, urlParams.value || 0);

                        response.write('Success');
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
                            logger.log('error', urlParams.mac, accessory.name, '[' + urlParams.value + '] ist kein gültiger Wert! ( ' + urlParams.mac + ' )');
                        }

                        DeviceManager.setDevice(urlParams.mac, accessory.type, accessory.letters, urlParams.value);
                         
                        response.write(state != null ? 'Success' : 'Error');
                    }
                    else
                    {
                        var state = await DeviceManager.getDevice(urlParams.mac, accessory.type, accessory.letters);

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
                                logger.log('warn', 'bridge', 'Bridge', 'Die Homebridge konnte nicht aktualisiert werden! ' + (error || stderr));
                            }
                            else
                            {
                                logger.log('success', 'bridge', 'Bridge', 'Die Homebridge wurde auf die Version [' + version + '] aktualisiert!');

                                restart = true;

                                logger.log('warn', 'bridge', 'Bridge', 'Die Homebridge wird neu gestartet ..');

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
           
        logger.log('info', 'bridge', 'Bridge', 'Data Link Server läuft auf Port [' + this.port + ']');
    }
}

function SynTexBaseAccessory(accessoryConfig)
{
    this.service = [];
    this.mac = accessoryConfig['mac'];
    this.name = accessoryConfig['name'];
    this.services = accessoryConfig['services'];

    this.version = accessoryConfig['version'] || '1.0.0';
    this.model = accessoryConfig['model'] || 'HTTP Accessory';
    this.manufacturer = accessoryConfig['manufacturer'] || 'SynTex';

    var informationService = new Service.AccessoryInformation();
    
    informationService
        .setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
        .setCharacteristic(Characteristic.Model, this.model)
        .setCharacteristic(Characteristic.FirmwareRevision, this.version)
        .setCharacteristic(Characteristic.SerialNumber, this.mac);

        this.service.push(informationService);

    var counter = 1, subtypes = {};
    var type = this.services;
    var name = this.name;

    if(Array.isArray(this.services))
    {
        counter = this.services.length;
    }
    else if(this.services instanceof Object)
    {
        type = this.services.type;
        name = this.services.name;
    }

    for(var i = 0; i < counter; i++)
    {
        if(counter > 1)
        {
            if(this.services[i] instanceof Object)
            {
                type = this.services[i].type;
                name = this.services[i].name;
            }
            else
            {
                type = this.services[i];
                name = this.name + ' ' + type[0].toUpperCase() + type.substring(1)
            }
        }

        if((JSON.stringify(this.services).match(new RegExp(type, 'g')) || []).length == 1)
        {
            var service = new presets[type].service(name);
        }
        else if(this.services[i] instanceof Object)
        {
            var service = new presets[type].service(name, i);
        }
        else
        {
            name +=  ' ' + letters[i];
            var service = new presets[type].service(name, i);
        }

        service.mac = this.mac;
        service.type = type;
        service.name = name;
        service.characteristic = presets[type].characteristic;
        service.letters = presets[type].letter + (subtypes[type] || 0);

        service.options = {};

        if(type == 'switch' || type == 'relais')
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
        else if(type == 'rgb')
        {
            service.options.url = accessoryConfig['url'] || '';
            service.options.spectrum = accessoryConfig['spectrum'] || 'RGB';
        }

        DeviceManager.getDevice(this.mac, type, service.letters).then(function(state) {

            if(state == null)
            {
                logger.log('error', this.mac, this.name, '[' + this.name + '] wurde nicht in der Storage gefunden! ( ' + this.mac + ' )');
            }
            else if((state = validateUpdate(this.mac, this.type, state)) != null)
            {
                logger.log('read', this.mac, this.name, 'HomeKit Status für [' + this.name + '] ist [' + state + '] ( ' + this.mac + ' )');
            }
            
            if(this.type == 'rgb')
            {
                this.power = state ? state.split(':')[0] == 'true' : 'false';
                this.hue = state ? getHSL(state)[0] : 0;
                this.saturation = state ? getHSL(state)[1] : 100;
                this.brightness = state ? getHSL(state)[2] : 50;

                this.getCharacteristic(Characteristic.On).updateValue(this.power);
                this.getCharacteristic(Characteristic.Hue).updateValue(this.hue);
                this.getCharacteristic(Characteristic.Saturation).updateValue(this.saturation);
                this.getCharacteristic(Characteristic.Brightness).updateValue(this.brightness);
            }
            else
            {
                this.getCharacteristic(this.characteristic).updateValue(state);
            }
    
        }.bind(service));

        service.changeHandler = (function(state)
        {
            logger.log('update', this.mac, this.name, 'HomeKit Status für [' + this.name + '] geändert zu [' + state + '] ( ' + this.mac + ' )');

            if(this.type == 'rgb')
            {
                this.power = state.split(':')[0] == 'true';
                this.hue = getHSL(state)[0] || 0;
                this.saturation = getHSL(state)[1] || 100;
                this.brightness = getHSL(state)[2] || 50;

                this.getCharacteristic(Characteristic.On).updateValue(this.power);
                this.getCharacteristic(Characteristic.Hue).updateValue(this.hue);
                this.getCharacteristic(Characteristic.Saturation).updateValue(this.saturation);
                this.getCharacteristic(Characteristic.Brightness).updateValue(this.brightness);
            }
            else
            {
                this.getCharacteristic(this.characteristic).updateValue(state);
            }

            Automations.runAutomations(this.mac, this.type, this.letters, state);

        }.bind(service));

        service.getCharacteristic(service.characteristic).on('get', this.getState.bind(service));

        if(service.type == 'temperature')
        {
            service.getCharacteristic(service.characteristic).setProps({ minValue : -100, maxValue : 140 });
        }

        if(service.type == 'switch' || service.type == 'relais' || service.type == 'rgb')
        {
            service.getCharacteristic(service.characteristic).on('set', this.setState.bind(service));
        }

        if(service.type == 'rgb')
        {
            service.addCharacteristic(new Characteristic.Hue()).on('get', this.getHue.bind(service)).on('set', this.setHue.bind(service));
            service.addCharacteristic(new Characteristic.Saturation()).on('get', this.getSaturation.bind(service)).on('set', this.setSaturation.bind(service));
            service.addCharacteristic(new Characteristic.Brightness()).on('get', this.getBrightness.bind(service)).on('set', this.setBrightness.bind(service));
        }

        subtypes[type] = (subtypes[type] || 0) + 1;

        this.service.push(service);
    }
}

SynTexBaseAccessory.prototype.getState = function(callback)
{   
    DeviceManager.getDevice(this.mac, this.type, this.letters).then(function(state) {

        if(state == null)
        {
            logger.log('error', this.mac, this.name, '[' + this.name + '] wurde nicht in der Storage gefunden! ( ' + this.mac + ' )');
        }
        else if((state = validateUpdate(this.mac, this.type, state)) != null)
        {
            logger.log('read', this.mac, this.name, 'HomeKit Status für [' + this.name + '] ist [' + state + '] ( ' + this.mac + ' )');
        }

        if(this.type == 'rgb')
        {
            callback(null, state == null ? false : (state.split(':')[0] == 'true' || false));
        }
        else
        {
            callback(null, state);
        }

    }.bind(this)).catch(function(e) {

        logger.err(e);
    });
};

SynTexBaseAccessory.prototype.setState = function(powerOn, callback, context)
{
    if(this.type == 'rgb')
    {
        /*
        var urlToCall = this.options.url;
        var urlMethod = 'GET';
        var urlBody = '';
        var urlForm = '';
        var urlHeaders = '{}';
        */
        this.power = powerOn;
        setRGB(this);
        callback(null);
    }
    else
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
                    theRequest.form = JSON.parse(urlForm);
                }
                else if(urlBody)
                {
                    theRequest.body = urlBody;
                }
            }

            request(theRequest, (function(err, response, body)
            {
                var statusCode = response && response.statusCode ? response.statusCode : -1;
                
                if(!err && statusCode == 200)
                {
                    logger.log('success', this.mac, this.name, 'Anfrage zu [' + urlToCall + '] wurde mit dem Status Code [' + statusCode + '] beendet: [' + body + ']');

                    logger.log('update', this.mac, this.name, 'HomeKit Status für [' + this.name + '] geändert zu [' + powerOn.toString() + '] ( ' + this.mac + ' )');

                    DeviceManager.setDevice(this.mac, this.type, this.letters, powerOn);

                    callback(null);
                }
                else
                {
                    logger.log('error', this.mac, this.name, 'Anfrage zu [' + urlToCall + '] wurde mit dem Status Code [' + statusCode + '] beendet: [' + body + '] ' + (err || ''));

                    callback(err || new Error("Request to '" + urlToCall + "' was not succesful."));
                }

            }).bind(this));
        }
        else
        {
            logger.log('update', this.mac, this.name, 'HomeKit Status für [' + this.name + '] geändert zu [' + powerOn.toString() + '] ( ' + this.mac + ' )');

            DeviceManager.setDevice(this.mac, this.type, this.letters, powerOn);

            callback(null);
        }
    }
};

SynTexBaseAccessory.prototype.getHue = function(callback)
{
    DeviceManager.getDevice(this.mac, this.type, this.letters).then(function(state) {

        callback(null, (state == null) ? 0 : (getHSL(state)[0] || 0));

    }).catch(function(e) {

        logger.err(e);
    });
};

SynTexBaseAccessory.prototype.getSaturation = function(callback)
{
    DeviceManager.getDevice(this.mac, this.type, this.letters).then(function(state) {

        callback(null, (state == null) ? 100 : (getHSL(state)[1] || 100));

    }).catch(function(e) {

        logger.err(e);
    });
}

SynTexBaseAccessory.prototype.getBrightness = function(callback)
{
    DeviceManager.getDevice(this.mac, this.type, this.letters).then(function(state) {

        callback(null, (state == null) ? 50 : (getHSL(state)[2] || 50));

    }).catch(function(e) {

        logger.err(e);
    });
}

SynTexBaseAccessory.prototype.setHue = function(level, callback)
{
    this.hue = level;
    setRGB(this);
    callback(null);
};

SynTexBaseAccessory.prototype.setSaturation = function(level, callback)
{
    this.saturation = level;
    setRGB(this);
    callback(null);
};

SynTexBaseAccessory.prototype.setBrightness = function(level, callback)
{
    this.brightness = level;
    setRGB(this);
    callback(null);
};

SynTexBaseAccessory.prototype.getServices = function()
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
               logger.log('success', this.mac, this.name, '[' + buttonName + ']: Event [' + i + '] wurde ausgeführt! ( ' + this.mac + ' )');

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

    if(accessory.options.spectrum == 'hsl')
    {
        if(accessory.options.url != '')
        {
            var theRequest = {
                method : 'GET',
                url : accessory.options.url + accessory.hue + ',' + accessory.saturation + ',' + (accessory.power ? accessory.brightness : 0),
                timeout : 10000
            };
        
            request(theRequest, (function(err, response, body)
            {
                var statusCode = response && response.statusCode ? response.statusCode : -1;
        
                if(!err && statusCode == 200)
                {
                    logger.log('success', accessory.mac, accessory.name, '[' + accessory.name + '] hat die Anfrage zu [URL] wurde mit dem Status Code [' + statusCode + '] beendet: [' + body + ']');
        
                    logger.debug(accessory.power + ':' + h + ':' + s + ':' + l);

                    DeviceManager.setDevice(accessory.mac, accessory.type, accessory.letters, accessory.power + ':' + h + ':' + s + ':' + l);
                }
                else
                {
                    logger.log('error', accessory.mac, accessory.name, '[' + accessory.name + '] hat die Anfrage zu [URL] wurde mit dem Status Code [' + statusCode + '] beendet: [' + body + '] ' + (err ? err : ''));
                }
                
            }));
        }
    }
    else if(accessory.options.spectrum == 'rgb')
    {
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

            logger.log('update', accessory.mac, accessory.name, 'HomeKit Status für [' + accessory.name + '] geändert zu [' + accessory.fetch + '] ( ' + accessory.mac + ' )');

            if(accessory.options.url != '')
            {
                var theRequest = {
                    method : 'GET',
                    url : accessory.options.url + r + ',' + g + ',' + b,
                    timeout : 10000
                };
            
                request(theRequest, (function(err, response, body)
                {
                    var statusCode = response && response.statusCode ? response.statusCode : -1;
            
                    if(!err && statusCode == 200)
                    {
                        logger.log('success', accessory.mac, accessory.name, '[' + accessory.name + '] hat die Anfrage zu [URL] wurde mit dem Status Code [' + statusCode + '] beendet: [' + body + ']');
            
                        DeviceManager.setDevice(accessory.mac, accessory.type, accessory.letters, accessory.fetch);
                    }
                    else
                    {
                        logger.log('error', accessory.mac, accessory.name, '[' + accessory.name + '] hat die Anfrage zu [URL] wurde mit dem Status Code [' + statusCode + '] beendet: [' + body + '] ' + (err ? err : ''));
                    }
                    
                }));
            }
        }
    }
}

function validateUpdate(mac, type, state)
{
    if(type === 'motion' || type === 'rain' || type === 'smoke' || type === 'occupancy' || type === 'contact' || type == 'switch' || type == 'relais')
    {
        if(state != true && state != false && state != 'true' && state != 'false')
        {
            logger.log('warn', mac, '', 'Konvertierungsfehler: [' + state + '] ist keine boolsche Variable! ( ' + mac + ' )');

            return null;
        }

        return (state == 'true' || state == true ? true : false);
    }
    else if(type === 'light' || type === 'temperature')
    {
        if(isNaN(state))
        {
            logger.log('warn', mac, '', 'Konvertierungsfehler: [' + state + '] ist keine numerische Variable! ( ' + mac + ' )');
        }

        return !isNaN(state) ? parseFloat(state) : null;
    }
    else if(type === 'humidity' || type === 'airquality')
    {
        if(isNaN(state))
        {
            logger.log('warn', mac, '', 'Konvertierungsfehler: [' + state + '] ist keine numerische Variable! ( ' + mac + ' )');
        }

        return !isNaN(state) ? parseInt(state) : null;
    }
    else
    {
        return state;
    }
}