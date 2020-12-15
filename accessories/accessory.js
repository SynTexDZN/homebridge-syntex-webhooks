var Service, Characteristic, DeviceManager, TypeManager, Automations, logger;
var presets = {};
var letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

module.exports = class Accessory
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
            
            if(presets[type] != null)
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

                service.characteristic = presets[type].characteristic;
                service.letters = TypeManager.typeToLetter(type) + (subtypes[type] || 0);

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
                        var defaults = [0, 100, 50];

                        if(this.options.spectrum == 'HSL' && state != null)
                        {
                            defaults[0] = state.hue;
                            defaults[1] = state.saturation;
                            defaults[2] = state.brightness;
                        }

                        var value = this.options.spectrum == 'RGB' ? getHSL(state) : defaults;

                        this.power = state != null ? state.power : false;
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
                        var value = { power : state.split(':')[0] };

                        value[this.options.spectrum == 'HSL' ? 'hue' : 'red'] = state.split(':')[1];
                        value[this.options.spectrum == 'HSL' ? 'saturation' : 'green'] = state.split(':')[2];
                        value[this.options.spectrum == 'HSL' ? 'brightness' : 'blue'] = state.split(':')[3];

                        this.power = value.power || false;

                        if(this.options.spectrum == 'HSL')
                        {
                            this.hue = value.hue || 0;
                            this.saturation = value.saturation || 100;
                            this.brightness = value.brightness || 50;
                        }
                        else if(this.options.spectrum == 'RGB')
                        {
                            this.hue = getHSL(value)[0] || 0;
                            this.saturation = getHSL(value)[1] || 100;
                            this.brightness = getHSL(value)[2] || 50;
                        }
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

                    if(this.type == 'relais' || this.type == 'switch' || this.type == 'rgb' || this.type == 'rgbw' || this.type == 'rgbww' || this.type == 'rgbcw')
                    {
                        fetchRequests(this);
                    }

                }.bind(service));
            }
        }
    }
}