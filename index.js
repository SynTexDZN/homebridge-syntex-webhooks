var Service, Characteristic;
var DeviceManager = require('./device-manager'), TypeManager = require('./type-manager'), Automations = require('./automations'), WebServer = require('./webserver');
var request = require('request'), http = require('http'), logger = require('./logger');
var restart = true;

var letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

module.exports = function(homebridge)
{
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;

    homebridge.registerPlatform('homebridge-syntex-webhooks', 'SynTexWebHooks', SynTexWebHookPlatform);
    homebridge.registerAccessory('homebridge-syntex-webhooks', 'SynTexWebHookStatelessSwitch', SynTexWebHookStatelessSwitchAccessory);
};

function SynTexWebHookPlatform(log, config, api)
{
    this.devices = config['accessories'] || [];
    
    this.cacheDirectory = config['cache_directory'] || './SynTex';
    this.logDirectory = config['log_directory'] || './SynTex/log';
    this.port = config['port'] || 1710;
    
    TypeManager = new TypeManager(Service, Characteristic);
    logger = new logger('SynTexWebHooks', this.logDirectory, api.user.storagePath());
    DeviceManager = new DeviceManager(logger, this.cacheDirectory);
    WebServer = new WebServer('SynTexTuya', logger, this.port);
    Automations = new Automations(logger, this.cacheDirectory, DeviceManager).then(() => { restart = false; });
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

        Automations.setAccessories(accessories);
        
        callback(accessories);

        WebServer.addPage('/devices', async (response, urlParams) => {
	
            if(urlParams.mac != null)
            {
                var accessory = null;
                        
                for(var i = 0; i < accessories.length; i++)
                {
                    if(accessories[i].mac == urlParams.mac)
                    {
                        if(urlParams.event != null)
                        {
                            accessory = accessories[i];
                        }
                        else
                        {
                            for(var j = 0; j < accessories[i].service.length; j++)
                            {
                                if(accessories[i].service[j].mac != null && accessories[i].service[j].letters != null)
                                {
                                    if((urlParams.type == null || accessories[i].service[j].letters[0] == TypeManager.typeToLetter(urlParams.type)) && (urlParams.counter != null || accessories[i].service[j].letters[1] == urlParams.counter))
                                    {
                                        accessory = accessories[i].service[j];
                                    }
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
                else if(urlParams.event != null)
                {
                    accessory.changeHandler(accessory.name, urlParams.event, urlParams.value || 0);

                    response.write('Success');
                }
                else if(urlParams.value != null)
                {
                    var state = null;

                    if((state = validateUpdate(urlParams.mac, accessory.letters, urlParams.value)) != null)
                    {
                        accessory.changeHandler(state);
                    }
                    else
                    {
                        logger.log('error', urlParams.mac, accessory.letters, '[' + urlParams.value + '] ist kein gültiger Wert! ( ' + urlParams.mac + ' )');
                    }

                    DeviceManager.setDevice(urlParams.mac, accessory.letters, urlParams.value);
                        
                    response.write(state != null ? 'Success' : 'Error');
                }
                else
                {
                    var state = await DeviceManager.getDevice(urlParams.mac, accessory.letters);

                    response.write(state != null ? state.toString() : 'Error');
                }

                response.end();
            }
        });

        WebServer.addPage('/version', (response, urlParams) => {

            response.write(require('./package.json').version);
            response.end();
        });

        WebServer.addPage('/check-restart', (response, urlParams) => {

            response.write(restart.toString());
            response.end();
        });

        WebServer.addPage('/reload-automation', async (response, urlParams) => {

            if(await Automations.loadAutomations())
            {
                logger.log('success', 'bridge', 'Bridge', 'Hintergrundprozesse wurden erfolgreich geladen und aktiviert!');
                response.write('Success');
            }
            else
            {
                logger.log('warn', 'bridge', 'Bridge', 'Es wurden keine Hintergrundprozesse geladen!');
                response.write('Error');
            }
            
            response.end();
        });

        WebServer.addPage('/update', async (response, urlParams) => {

            var version = urlParams.version != null ? urlParams.version : 'latest';

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
        });
        
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

    for(var i = 0; i < counter; i++)
    {
        var s = this.services;

        if(Array.isArray(s))
        {
            s = this.services[i];
        }

        if(s instanceof Object)
        {
            type = s.type;
        }
        else
        {
            type = s;
        }

        if(s.name)
        {
            name = s.name;
        }
        else if(counter > 1)
        {
            name = this.name + ' ' + type[0].toUpperCase() + type.substring(1);
        }

        if(TypeManager.getPreset(type) != null)
        {
            if((JSON.stringify(this.services).match(new RegExp(type, 'g')) || []).length == 1)
            {
                var service = new (TypeManager.getPreset(type).service(name));
            }
            else if(s instanceof Object)
            {
                var service = new (TypeManager.getPreset(type).service(name, i));
            }
            else
            {
                name +=  ' ' + letters[i];
                var service = new (TypeManager.getPreset(type).service(name, i));
            }

            if(type == 'statelessswitch')
            {
                service = null;
                service = new Service.StatelessProgrammableSwitch(name + (subtypes[type] || 0), '' + (subtypes[type] || 0));
            }

            service.mac = this.mac;
            service.type = type;
            service.name = name;
            service.characteristic = TypeManager.getPreset(type).characteristic;
            service.letters = TypeManager.getPreset(type).letter + (subtypes[type] || 0);

            service.options = {
                requests : [],
                spectrum : 'RGB'
            };

            if(s instanceof Object)
            {
                service.options.requests = s.requests || [];
                service.options.spectrum = s.spectrum || 'RGB';
            }

            if(type == 'statelessswitch')
            {
                service.options.buttons = accessoryConfig['buttons'] || 0;
            }

            DeviceManager.getDevice(this.mac, service.letters).then(function(state) {

                if(state == null)
                {
                    logger.log('error', this.mac, this.letters, '[' + this.name + '] wurde nicht in der Storage gefunden! ( ' + this.mac + ' )');
                }
                else if((state = validateUpdate(this.mac, this.letters, state)) != null)
                {
                    logger.log('read', this.mac, this.letters, 'HomeKit Status für [' + this.name + '] ist [' + state + '] ( ' + this.mac + ' )');
                }
                
                if(this.type == 'rgb')
                {
                    var arr = [0, 100, 50];

                    if(state != null)
                    {
                        arr = state.split(':');
                        arr.shift();
                    }

                    var value = service.options.spectrum == 'RGB' ? getHSL(state) : arr;

                    this.power = state ? state.split(':')[0] == 'true' : 'false';
                    this.hue = value[0];
                    this.saturation = value[1];
                    this.brightness = value[2];

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
                logger.log('update', this.mac, this.letters, 'HomeKit Status für [' + this.name + '] geändert zu [' + state + '] ( ' + this.mac + ' )');

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
                /*
                else if(this.type == 'statelessswitch')
                {
                    for(var i = 0; i < this.service.length; i++)
                    {
                        if(i == event)
                        {
                            logger.log('update', this.mac, this.letters, '[' + buttonName + ']: Event [' + i + '] wurde ausgeführt! ( ' + this.mac + ' )');

                            this.getCharacteristic(this.characteristic).updateValue(value);
                        }
                    }
                }
                */
                else
                {
                    this.getCharacteristic(this.characteristic).updateValue(state);
                }

                if(!restart)
                {
                    Automations.runAutomations(this.mac, this.letters, state);
                }

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

            if(service.type == 'statelessswitch')
            {
                var props = {
                    minValue : Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS,
                    maxValue : Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS
                };

                service.getCharacteristic(Characteristic.ProgrammableSwitchEvent).setProps(props);
                service.getCharacteristic(Characteristic.ServiceLabelIndex).setValue((subtypes[type] || 0) + 1);
            }

            subtypes[type] = (subtypes[type] || 0) + 1;

            this.service.push(service);
        }
    }
}

SynTexBaseAccessory.prototype.getState = function(callback)
{   
    DeviceManager.getDevice(this.mac, this.letters).then(function(state) {

        if(state == null)
        {
            logger.log('error', this.mac, this.letters, '[' + this.name + '] wurde nicht in der Storage gefunden! ( ' + this.mac + ' )');
        }
        else if((state = validateUpdate(this.mac, this.letters, state)) != null)
        {
            logger.log('read', this.mac, this.letters, 'HomeKit Status für [' + this.name + '] ist [' + state + '] ( ' + this.mac + ' )');
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
    this.power = powerOn;

    fetchRequests(this).then((result) => {

        callback(result);
    });
};

SynTexBaseAccessory.prototype.getHue = function(callback)
{
    DeviceManager.getDevice(this.mac, this.letters).then(function(state) {

        callback(null, (state == null) ? 0 : this.options.spectrum == 'HSL' ? (state.split(':')[1] || 0) : (getHSL(state)[0] || 0));

    }.bind(this)).catch(function(e) {

        logger.err(e);
    });
};

SynTexBaseAccessory.prototype.getSaturation = function(callback)
{
    DeviceManager.getDevice(this.mac, this.letters).then(function(state) {

        callback(null, (state == null) ? 100 : this.options.spectrum == 'HSL' ? (state.split(':')[2] || 100) : (getHSL(state)[1] || 100));

    }.bind(this)).catch(function(e) {

        logger.err(e);
    });
}

SynTexBaseAccessory.prototype.getBrightness = function(callback)
{
    DeviceManager.getDevice(this.mac, this.letters).then(function(state) {

        callback(null, (state == null) ? 50 : this.options.spectrum == 'HSL' ? (state.split(':')[3] || 50) : (getHSL(state)[2] || 50));

    }.bind(this)).catch(function(e) {

        logger.err(e);
    });
}

SynTexBaseAccessory.prototype.setHue = function(level, callback)
{
    this.hue = level;
    
    fetchRequests(this).then((result) => {

        callback(result);
    });
};

SynTexBaseAccessory.prototype.setSaturation = function(level, callback)
{
    this.saturation = level;
    
    fetchRequests(this).then((result) => {

        callback(result);
    });
};

SynTexBaseAccessory.prototype.setBrightness = function(level, callback)
{
    this.brightness = level;
    
    fetchRequests(this).then((result) => {

        callback(result);
    });
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
    this.buttons = statelessSwitchConfig['buttons'] || 0;
    this.letters = '60';
    this.services = 'statelessswitch';

    this.version = statelessSwitchConfig['version'] || '1.0.0';
    this.model = statelessSwitchConfig['model'] || 'HTTP Accessory';
    this.manufacturer = statelessSwitchConfig['manufacturer'] || 'SynTex';

    var informationService = new Service.AccessoryInformation();
    
    informationService
        .setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
        .setCharacteristic(Characteristic.Model, this.model)
        .setCharacteristic(Characteristic.FirmwareRevision, this.version)
        .setCharacteristic(Characteristic.SerialNumber, this.mac);

    this.service.push(informationService);

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
        for(var i = 1; i < this.service.length - 1; i++)
        {
            if(i - 1 == event)
            {
               logger.log('update', this.mac, this.letters, '[' + buttonName + ']: Event [' + (i + 1) + '] wurde ausgeführt! ( ' + this.mac + ' )');

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

function setRGB(accessory, req)
{
    return new Promise(resolve => {

        var h = accessory.hue, s = accessory.saturation * 2, l = accessory.power ? accessory.brightness / 4 : 0;
        var r = 0, g = 0, b = 0;

        if(accessory.options.spectrum == 'HSL')
        {
            if(req.url != '')
            {
                var theRequest = {
                    method : 'GET',
                    url : req.url + accessory.hue + ',' + accessory.saturation + ',' + (accessory.power ? accessory.brightness : 0),
                    timeout : 10000
                };
            
                request(theRequest, (function(err, response, body)
                {
                    var statusCode = response && response.statusCode ? response.statusCode : -1;
            
                    if(!err && statusCode == 200)
                    {
                        logger.log('success', accessory.mac, accessory.letters, '[' + accessory.name + '] hat die Anfrage zu [' + this.url + '] mit dem Status Code [' + statusCode + '] beendet: [' + (body || '') + '] ');
            
                        DeviceManager.setDevice(accessory.mac, accessory.letters, accessory.power + ':' + accessory.hue + ':' + accessory.saturation + ':' + accessory.brightness);
                    }
                    else
                    {
                        logger.log('error', accessory.mac, accessory.letters, '[' + accessory.name + '] hat die Anfrage zu [' + this.url + '] mit dem Status Code [' + statusCode + '] beendet: [' + (body || '') + '] ' + (err ? err : ''));
                    }

                    resolve();
                    
                }.bind({ url : theRequest.url })));
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

                logger.log('update', accessory.mac, accessory.letters, 'HomeKit Status für [' + accessory.name + '] geändert zu [' + accessory.fetch + '] ( ' + accessory.mac + ' )');

                if(req.url != '')
                {
                    var theRequest = {
                        method : 'GET',
                        url : req.url + r + ',' + g + ',' + b,
                        timeout : 10000
                    };
                
                    request(theRequest, (function(err, response, body)
                    {
                        var statusCode = response && response.statusCode ? response.statusCode : -1;
                
                        if(!err && statusCode == 200)
                        {
                            logger.log('success', accessory.mac, accessory.letters, '[' + accessory.name + '] hat die Anfrage zu [' + this.url + '] mit dem Status Code [' + statusCode + '] beendet: [' + (body || '') + '] ');
                
                            DeviceManager.setDevice(accessory.mac, accessory.letters, accessory.fetch);
                        }
                        else
                        {
                            logger.log('error', accessory.mac, accessory.letters, '[' + accessory.name + '] hat die Anfrage zu [' + this.url + '] mit dem Status Code [' + statusCode + '] beendet: [' + (body || '') + '] ' + (err ? err : ''));
                        }

                        resolve();
                        
                    }.bind({ url : theRequest.url })));
                }
            }
        }
    });
}

function validateUpdate(mac, letters, state)
{
    var type = TypeManager.letterToType(letters[0]);

    if(type === 'motion' || type === 'rain' || type === 'smoke' || type === 'occupancy' || type === 'contact' || type == 'switch' || type == 'relais')
    {
        if(state != true && state != false && state != 'true' && state != 'false')
        {
            logger.log('warn', mac, letters, 'Konvertierungsfehler: [' + state + '] ist keine boolsche Variable! ( ' + mac + ' )');

            return null;
        }

        return (state == 'true' || state == true ? true : false);
    }
    else if(type === 'light' || type === 'temperature')
    {
        if(isNaN(state))
        {
            logger.log('warn', mac, letters, 'Konvertierungsfehler: [' + state + '] ist keine numerische Variable! ( ' + mac + ' )');
        }

        return !isNaN(state) ? parseFloat(state) : null;
    }
    else if(type === 'humidity' || type === 'airquality')
    {
        if(isNaN(state))
        {
            logger.log('warn', mac, letters, 'Konvertierungsfehler: [' + state + '] ist keine numerische Variable! ( ' + mac + ' )');
        }

        return !isNaN(state) ? parseInt(state) : null;
    }
    else
    {
        return state;
    }
}

function fetchRequests(accessory)
{
    return new Promise(resolve => {

        if(accessory.options.requests)
        {
            var counter = 0, finished = 0;

            for(var i = 0; i < accessory.options.requests.length; i++)
            {
                if(accessory.options.requests[i].trigger && accessory.power != undefined
                && (accessory.power && accessory.options.requests[i].trigger.toLowerCase() == 'on'
                || !accessory.power && accessory.options.requests[i].trigger.toLowerCase() == 'off'
                || accessory.options.requests[i].trigger.toLowerCase() == 'color'))
                {
                    counter++;
                }
            }

            for(var i = 0; i < accessory.options.requests.length; i++)
            {
                if(accessory.options.requests[i].trigger && accessory.power != undefined)
                {
                    if(accessory.power && accessory.options.requests[i].trigger.toLowerCase() == 'on'
                    || !accessory.power && accessory.options.requests[i].trigger.toLowerCase() == 'off')
                    {
                        var urlMethod = accessory.options.requests[i].method || '';
                        var urlToCall = accessory.options.requests[i].url || '';
                        var urlBody = accessory.options.requests[i].body || '';
                        var urlForm = accessory.options.requests[i].form || '';
                        var urlHeaders = accessory.options.requests[i].body || '{}';

                        if(urlMethod != '' && urlToCall != '')
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
                                
                                finished++;

                                if(!err && statusCode == 200)
                                {
                                    logger.log('success', accessory.mac, accessory.letters, '[' + accessory.name + '] hat die Anfrage zu [' + urlToCall + '] mit dem Status Code [' + statusCode + '] beendet: [' + (body || '') + ']');

                                    logger.log('update', accessory.mac, accessory.letters, 'HomeKit Status für [' + accessory.name + '] geändert zu [' + accessory.power.toString() + '] ( ' + accessory.mac + ' )');

                                    DeviceManager.setDevice(accessory.mac, accessory.letters, accessory.power);

                                    if(finished >= counter)
                                    {
                                        resolve(null);
                                    }
                                }
                                else
                                {
                                    logger.log('error', accessory.mac, accessory.letters, '[' + accessory.name + '] hat die Anfrage zu [' + urlToCall + '] mit dem Status Code [' + statusCode + '] beendet: [' + (body || '') + '] ' + (err || ''));

                                    if(finished >= counter)
                                    {
                                        resolve(err || new Error("Request to '" + urlToCall + "' was not succesful."));
                                    }
                                }

                            }).bind(accessory));
                        }
                    }
                    else if(accessory.options.requests[i].trigger.toLowerCase() == 'color')
                    {
                        setRGB(accessory, accessory.options.requests[i]).then(() => {
                            
                            finished++;

                            if(finished >= counter)
                            {
                                resolve(null);
                            }
                        });
                    }
                }
            }

            if(counter == 0)
            {
                logger.log('update', accessory.mac, accessory.letters, 'HomeKit Status für [' + accessory.name + '] geändert zu [' + accessory.power.toString() + '] ( ' + accessory.mac + ' )');

                DeviceManager.setDevice(accessory.mac, accessory.letters, accessory.power);

                resolve(null);
            }
        }
        else
        {
            logger.log('update', accessory.mac, accessory.letters, 'HomeKit Status für [' + accessory.name + '] geändert zu [' + accessory.power.toString() + '] ( ' + accessory.mac + ' )');

            DeviceManager.setDevice(accessory.mac, accessory.letters, accessory.power);

            resolve(null);
        }
    });
}