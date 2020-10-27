var presets = {};

var types = ['contact', 'motion', 'temperature', 'humidity', 'rain', 'light', 'occupancy', 'smoke', 'airquality', 'rgb', 'switch', 'relais', 'statelessswitch'];
var letters = ['A', 'B', 'C', 'D', 'E', 'F', '0', '1', '2', '3', '4', '5', '6'];

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

module.exports = class WebServer
{
    constructor()
    {
        
    }

    getPreset(type)
    {
        return presets[type];
    }

    letterToType(letter)
    {
        return types[letters.indexOf(letter.toUpperCase())];
    }

    typeToLetter(type)
    {
        return letters[types.indexOf(type.toLowerCase())];
    }
};