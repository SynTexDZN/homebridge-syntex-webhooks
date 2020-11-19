const request = require('request');
const Base = require('./base');
var Service, Characteristic, DeviceManager, TypeManager, Automations, logger;
var presets = {};
var letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

module.exports = class Accessory extends Base
{
    constructor(accessoryConfig, Manager)
    {
        super(accessoryConfig, Manager);

        Service = Manager.Service;
        Characteristic = Manager.Characteristic;
        DeviceManager = Manager.DeviceManager;
        TypeManager = Manager.TypeManager;
        Automations = Manager.Automations;
        logger = Manager.logger;

        presets.contact = { letter : 'A', service : Service.ContactSensor, characteristic : Characteristic.ContactSensorState };
        presets.motion = { letter : 'B', service : Service.MotionSensor, characteristic : Characteristic.MotionDetected };
        presets.temperature = { letter : 'C', service : Service.TemperatureSensor, characteristic : Characteristic.CurrentTemperature };
        presets.humidity = { letter : 'D', service : Service.HumiditySensor, characteristic : Characteristic.CurrentRelativeHumidity };
        presets.rain = { letter : 'E', service : Service.LeakSensor, characteristic : Characteristic.LeakDetected };
        presets.light = { letter : 'F', service : Service.LightSensor, characteristic : Characteristic.CurrentAmbientLightLevel };
        presets.occupancy = { letter : '0', service : Service.OccupancySensor, characteristic : Characteristic.OccupancyDetected };
        presets.smoke = { letter : '1', service : Service.SmokeSensor, characteristic : Characteristic.SmokeDetected };
        presets.airquality = { letter : '2', service : Service.AirQualitySensor, characteristic : Characteristic.AirQuality };
        presets.rgb = { letter : '3', service : Service.Lightbulb, characteristic : Characteristic.On };
        presets.switch = { letter : '4', service : Service.Switch, characteristic : Characteristic.On };
        presets.relais = { letter : '5', service : Service.Switch, characteristic : Characteristic.On };
        presets.statelessswitch = { letter : '6', service : Service.StatelessProgrammableSwitch, characteristic : Characteristic.ProgrammableSwitchEvent };
        //presets.lcd = { letter : '7', service : Service.Switch, characteristic : Characteristic.On };

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
            
            if(presets[type] != undefined)
            {
                if((JSON.stringify(this.services).match(new RegExp(type, 'g')) || []).length == 1)
                {
                    var service = new presets[type].service(name);
                }
                else if(s instanceof Object)
                {
                    var service = new presets[type].service(name, i);
                }
                else
                {
                    name +=  ' ' + letters[i];
                    var service = new presets[type].service(name, i);
                }

                if(type == 'statelessswitch')
                {
                    service = null;
                    service = new Service.StatelessProgrammableSwitch(name + (subtypes[type] || 0), '' + (subtypes[type] || 0));
                }

                service.mac = this.mac;
                service.type = type;
                service.name = name;
                service.characteristic = presets[type].characteristic;
                service.letters = TypeManager.typeToLetter(type) + (subtypes[type] || 0);

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
                    else if((state = TypeManager.validateUpdate(this.mac, this.letters, state)) != null)
                    {
                        logger.log('read', this.mac, this.letters, 'HomeKit Status für [' + this.name + '] ist [' + state + '] ( ' + this.mac + ' )');
                    }
                    
                    if(this.type == 'rgb' || this.type == 'rgbw' || this.type == 'rgbww' || this.type == 'rgbcw')
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
                        if(this.type == 'relais' || this.type == 'switch')
                        {
                            this.power = state;
                        }

                        this.getCharacteristic(this.characteristic).updateValue(state);
                    }
            
                }.bind(service));

                service.changeHandler = (function(state)
                {
                    logger.log('update', this.mac, this.letters, 'HomeKit Status für [' + this.name + '] geändert zu [' + state + '] ( ' + this.mac + ' )');

                    if(this.type == 'rgb' || this.type == 'rgbw' || this.type == 'rgbww' || this.type == 'rgbcw')
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
                        if(this.type == 'relais' || this.type == 'switch')
                        {
                            this.power = state;
                        }

                        this.getCharacteristic(this.characteristic).updateValue(state);
                    }

                    if(this.type == 'relais' || this.type == 'switch' || this.type == 'rgb' || this.type == 'rgbw' || this.type == 'rgbww' || this.type == 'rgbcw')
                    {
                        fetchRequests(this);
                    }

                    if(Automations.isReady())
                    {
                        Automations.runAutomations(this.mac, this.letters, state);
                    }

                }.bind(service));

                service.getCharacteristic(service.characteristic).on('get', this.getState.bind(service));

                if(service.type == 'temperature')
                {
                    service.getCharacteristic(service.characteristic).setProps({ minValue : -100, maxValue : 140 });
                }

                if(service.type == 'switch' || service.type == 'relais' || service.type == 'rgb' || service.type == 'rgbw' || service.type == 'rgbww' || service.type == 'rgbcw')
                {
                    service.getCharacteristic(service.characteristic).on('set', this.setState.bind(service));
                }

                if(service.type == 'rgb' || service.type == 'rgbw' || service.type == 'rgbww' || service.type == 'rgbcw')
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

    getState(callback)
    {
        DeviceManager.getDevice(this.mac, this.letters).then(function(state) {

            if(state == null)
            {
                logger.log('error', this.mac, this.letters, '[' + this.name + '] wurde nicht in der Storage gefunden! ( ' + this.mac + ' )');
            }
            else if((state = TypeManager.validateUpdate(this.mac, this.letters, state)) != null)
            {
                logger.log('read', this.mac, this.letters, 'HomeKit Status für [' + this.name + '] ist [' + state + '] ( ' + this.mac + ' )');
            }
    
            if(this.type == 'rgb' || this.type == 'rgbw' || this.type == 'rgbww' || this.type == 'rgbcw')
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
    }

    setState(powerOn, callback, context)
    {
        console.log('SET STATE', powerOn);

        this.power = powerOn;

        fetchRequests(this).then((result) => {

            callback(result);
        });
    }

    getHue(callback)
    {
        DeviceManager.getDevice(this.mac, this.letters).then(function(state) {

            callback(null, (state == null) ? 0 : this.options.spectrum == 'HSL' ? (state.split(':')[1] || 0) : (getHSL(state)[0] || 0));

        }.bind(this)).catch(function(e) {

            logger.err(e);
        });
    }

    setHue(level, callback)
    {
        console.log('SET HUE', level);

        this.hue = level;
        
        fetchRequests(this).then((result) => {

            callback(result);
        });
    }

    getSaturation(callback)
    {
        DeviceManager.getDevice(this.mac, this.letters).then(function(state) {

            callback(null, (state == null) ? 100 : this.options.spectrum == 'HSL' ? (state.split(':')[2] || 100) : (getHSL(state)[1] || 100));

        }.bind(this)).catch(function(e) {

            logger.err(e);
        });
    }

    setSaturation(level, callback)
    {
        console.log('SET SATURATION', level);

        this.saturation = level;
        
        fetchRequests(this).then((result) => {

            callback(result);
        });
    }

    getBrightness(callback)
    {
        DeviceManager.getDevice(this.mac, this.letters).then(function(state) {

            callback(null, (state == null) ? 50 : this.options.spectrum == 'HSL' ? (state.split(':')[3] || 50) : (getHSL(state)[2] || 50));

        }.bind(this)).catch(function(e) {

            logger.err(e);
        });
    }

    setBrightness(level, callback)
    {
        console.log('SET BRIGHTNESS', level);

        this.brightness = level;
        
        fetchRequests(this).then((result) => {

            callback(result);
        });
    }
}

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
        else if(accessory.options.spectrum == 'RGB')
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

function fetchRequests(accessory)
{
    return new Promise(resolve => {

        if(accessory.options.requests)
        {
            var counter = 0, finished = 0, success = 0;

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
                                    success++;

                                    logger.log('success', accessory.mac, accessory.letters, '[' + accessory.name + '] hat die Anfrage zu [' + this.url + '] mit dem Status Code [' + statusCode + '] beendet: [' + (body || '') + ']');

                                    if(finished >= counter)
                                    {
                                        logger.log('update', accessory.mac, accessory.letters, 'HomeKit Status für [' + accessory.name + '] geändert zu [' + accessory.power.toString() + '] ( ' + accessory.mac + ' )');

                                        DeviceManager.setDevice(accessory.mac, accessory.letters, accessory.power);

                                        resolve(null);
                                    }
                                }
                                else
                                {
                                    logger.log('error', accessory.mac, accessory.letters, '[' + accessory.name + '] hat die Anfrage zu [' + this.url + '] mit dem Status Code [' + statusCode + '] beendet: [' + (body || '') + '] ' + (err || ''));

                                    if(finished >= counter)
                                    {
                                        if(success == 0 && TypeManager.letterToType(accessory.letters) == 'relais')
                                        {
                                            resolve(err || new Error("Request to '" + this.url + "' was not succesful."));
                                        }
                                        else
                                        {
                                            logger.log('update', accessory.mac, accessory.letters, 'HomeKit Status für [' + accessory.name + '] geändert zu [' + accessory.power.toString() + '] ( ' + accessory.mac + ' )');

                                            DeviceManager.setDevice(accessory.mac, accessory.letters, accessory.power);

                                            resolve(null);
                                        }
                                    }
                                }

                            }).bind({ url : urlToCall }));
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