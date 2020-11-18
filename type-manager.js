var presets = {};

var types = ['contact', 'motion', 'temperature', 'humidity', 'rain', 'light', 'occupancy', 'smoke', 'airquality', 'rgb', 'switch', 'relais', 'statelessswitch'];
var letters = ['A', 'B', 'C', 'D', 'E', 'F', '0', '1', '2', '3', '4', '5', '6'];

module.exports = class TypeManager
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

    validateUpdate(mac, letters, state)
    {
        var type = this.letterToType(letters[0]);

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
};