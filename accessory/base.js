let DeviceManager = require('../device-manager'), TypeManager = require('../type-manager'), Automations = require('../automations'), logger = require('../logger');
var Service, Characteristic;
var presets = {};

module.exports = class Base
{
    constructor(accessoryConfig, Manager)
    {
        this.service = [];
        this.mac = accessoryConfig['mac'];
        this.name = accessoryConfig['name'];
        this.services = accessoryConfig['services'];

        this.version = accessoryConfig['version'] || '1.0.0';
        this.model = accessoryConfig['model'] || 'HTTP Accessory';
        this.manufacturer = accessoryConfig['manufacturer'] || 'SynTex';

        Service = Manager.Service;
        Characteristic = Manager.Characteristic;
        TypeManager = Manager.TypeManager;
        logger = Manager.logger;
        DeviceManager = Manager.DeviceManager;
        Automations = Manager.Automations;

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
                    else if((state = validateUpdate(this.mac, this.letters, state)) != null)
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
                    /*
                    else
                    {
                        if(this.type == 'relais' || this.type == 'switch')
                        {
                            this.power = state;
                        }

                        this.getCharacteristic(this.characteristic).updateValue(state);
                    }
                    */
                    if(!restart)
                    {
                        if(this.type == 'relais' || this.type == 'switch' || this.type == 'rgb' || this.type == 'rgbw' || this.type == 'rgbww' || this.type == 'rgbcw')
                        {
                            fetchRequests(this);
                        }

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
            else if((state = validateUpdate(this.mac, this.letters, state)) != null)
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

    getServices()
    {
        return this.service;
    }
}