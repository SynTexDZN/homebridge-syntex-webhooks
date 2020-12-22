var presets = {};

module.exports = class TypeManager
{
	constructor(logger)
	{
		this.logger = logger;

		this.types = ['contact', 'motion', 'temperature', 'humidity', 'rain', 'light', 'occupancy', 'smoke', 'airquality', 'rgb', 'switch', 'relais', 'statelessswitch', 'outlet', 'led', 'dimmer'];
		this.letters = ['A', 'B', 'C', 'D', 'E', 'F', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
	}

	getPreset(type)
	{
		return presets[type];
	}

	letterToType(letter)
	{
		return this.types[this.letters.indexOf(letter.toUpperCase())];
	}

	typeToLetter(type)
	{
		return this.letters[this.types.indexOf(type.toLowerCase())];
	}
	
	validateUpdate(id, letters, state)
	{
		var data = {
			A : { type : 'contact', format : 'boolean' },
			B : { type : 'motion', format : 'boolean' },
			C : { type : 'temperature', format : 'number' },
			D : { type : 'humidity', format : 'number' },
			E : { type : 'rain', format : 'boolean' },
			F : { type : 'light', format : 'number' },
			0 : { type : 'occupancy', format : 'boolean' },
			1 : { type : 'smoke', format : 'boolean' },
			2 : { type : 'airquality', format : 'number' },
			3 : { type : 'rgb', format : { value : 'boolean', brightness : 'number', saturation : 'number', hue : 'number' } },
			4 : { type : 'switch', format : 'boolean' },
			5 : { type : 'relais', format : 'boolean' },
			6 : { type : 'statelessswitch', format : 'number' },
			7 : { type : 'outlet', format : 'boolean' },
			8 : { type : 'led', format : 'boolean' },
			9 : { type : 'dimmer', format : { value : 'boolean', brightness : 'number' } }
		};

		for(const i in state)
		{
			try
			{
				state[i] = JSON.parse(state[i]);
			}
			catch(e)
			{
				this.logger.log('warn', id, letters, 'Konvertierungsfehler: [' + state[i] + '] konnte nicht gelesen werden! ( ' + id + ' )');

				return null;
			}
			
			var format = data[letters[0].toUpperCase()].format;

			if(format instanceof Object)
			{
				format = format[i];
			}

			if(typeof state[i] != format)
			{
				this.logger.log('warn', id, letters, 'Konvertierungsfehler: [' + state[i] + '] ist keine ' + (format == 'boolean' ? 'boolsche' : format == 'number' ? 'numerische' : 'korrekte') + ' Variable! ( ' + id + ' )');

				return null;
			}
		}

		return state;
	}
};