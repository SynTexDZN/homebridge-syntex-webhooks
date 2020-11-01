var presets = {};

var types = ['contact', 'motion', 'temperature', 'humidity', 'rain', 'light', 'occupancy', 'smoke', 'airquality', 'rgb', 'switch', 'relais', 'statelessswitch'];
var letters = ['A', 'B', 'C', 'D', 'E', 'F', '0', '1', '2', '3', '4', '5', '6'];

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