let DeviceManager = require('./device-manager'), TypeManager = require('./type-manager'), Automations = require('./automations');

const { DynamicPlatform } = require('homebridge-syntex-dynamic-platform');

const SynTexUniversalAccessory = require('./src/universal');

const pluginID = 'homebridge-syntex-webhooks';
const pluginName = 'SynTexWebHooks';

var restart = true;

module.exports = (homebridge) => {

	homebridge.registerPlatform(pluginID, pluginName, SynTexWebHookPlatform, true);
};

class SynTexWebHookPlatform extends DynamicPlatform
{
	constructor(log, config, api)
	{
		super(config, api, pluginID, pluginName);

		this.devices = config['accessories'] || [];
	
		this.cacheDirectory = config['cache_directory'] || './SynTex';
		
		if(this.api && this.logger)
		{
			this.api.on('didFinishLaunching', () => {

				TypeManager = new TypeManager();
				DeviceManager = new DeviceManager(this.logger, this.cacheDirectory);
				Automations = new Automations(this.logger, this.cacheDirectory, DeviceManager);

				this.initWebServer();

				this.loadAccessories();

				Automations.loadAutomations().then((loaded) => {
					
					if(loaded)
					{
						this.logger.log('success', 'bridge', 'Bridge', 'Hintergrundprozesse wurden erfolgreich geladen und aktiviert!');
					}
					else
					{
						this.logger.log('warn', 'bridge', 'Bridge', 'Es wurden keine Hintergrundprozesse geladen!');
					}

					restart = false;
				});
			});
		}
	}

	initWebServer()
	{
		this.WebServer.addPage('/devices', async (response, urlParams) => {
	
			if(urlParams.id != null)
			{
				var accessory = null;
						
				for(const a of this.accessories)
				{
					if(a[1].id == urlParams.id)
					{
						if(urlParams.event != null)
						{
							accessory = a[1];
						}
						else
						{
							for(var j = 0; j < a[1].service.length; j++)
							{
								if(a[1].service[j].id != null && a[1].service[j].letters != null)
								{
									if((urlParams.type == null || a[1].service[j].letters[0] == TypeManager.typeToLetter(urlParams.type)) && (urlParams.counter == null || a[1].service[j].letters[1] == urlParams.counter))
									{
										accessory = a[1].service[j];
									}
								}
							}
						}
					}
				}

				if(accessory == null)
				{
					this.logger.log('error', urlParams.id, '', 'Es wurde kein passendes ' + (urlParams.event ? 'Event' : 'Gerät') + ' in der Config gefunden! ( ' + urlParams.id + ' )');

					response.write('Error');
				}
				else if(urlParams.event != null)
				{
					accessory.changeHandler(accessory.name, urlParams.event, urlParams.value || 0);

					response.write('Success');
				}
				else if(urlParams.value != null)
				{
					var state = { value : urlParams.value };

					if((state = this.validateUpdate(urlParams.id, accessory.letters, state)) != null)
					{
						accessory.changeHandler(state);
					}
					else
					{
						this.logger.log('error', urlParams.id, accessory.letters, '[' + accessory.name + '] konnte nicht aktualisiert werden! ( ' + urlParams.id + ' )');
					}
	
					DeviceManager.setDevice(urlParams.id, accessory.letters, urlParams.value);

					response.write(state != null ? 'Success' : 'Error')
				}
				else
				{
					var state = await DeviceManager.getDevice(urlParams.id, accessory.letters);

					response.write(state != null ? JSON.stringify(state) : 'Error');
				}

				response.end();
			}
		});

		this.WebServer.addPage('/reload-automation', async (response) => {

			if(await Automations.loadAutomations())
			{
				this.logger.log('success', 'bridge', 'Bridge', 'Hintergrundprozesse wurden erfolgreich geladen und aktiviert!');
				response.write('Success');
			}
			else
			{
				this.logger.log('warn', 'bridge', 'Bridge', 'Es wurden keine Hintergrundprozesse geladen!');
				response.write('Error');
			}
			
			response.end();
		});

		this.WebServer.addPage('/accessories', (response) => {
	
			var accessories = [];

			for(const accessory of this.accessories)
			{
				accessories.push({
					id: accessory[1].id,
					name: accessory[1].name,
					services: accessory[1].services,
					version: '99.99.99',
					plugin: pluginName
				});
			}
	
			response.write(JSON.stringify(accessories));
			response.end();
		});

		this.WebServer.addPage('/serverside/version', (response) => {

			response.write(require('./package.json').version);
			response.end();
		});

		this.WebServer.addPage('/serverside/check-restart', (response) => {

			response.write(restart.toString());
			response.end();
		});

		this.WebServer.addPage('/serverside/update', (response, urlParams) => {

			var version = urlParams.version != null ? urlParams.version : 'latest';

			const { exec } = require('child_process');

			exec('sudo npm install ' + pluginID + '@' + version + ' -g', (error, stdout, stderr) => {

				response.write(error || (stderr && stderr.includes('ERR!')) ? 'Error' : 'Success');
				response.end();

				if(error || (stderr && stderr.includes('ERR!')))
				{
					this.logger.log('warn', 'bridge', 'Bridge', 'Das Plugin ' + pluginName + ' konnte nicht aktualisiert werden! ' + (error || stderr));
				}
				else
				{
					this.logger.log('success', 'bridge', 'Bridge', 'Das Plugin ' + pluginName + ' wurde auf die Version [' + version + '] aktualisiert!');

					restart = true;

					this.logger.log('warn', 'bridge', 'Bridge', 'Die Homebridge wird neu gestartet ..');

					exec('sudo systemctl restart homebridge');
				}
			});
		});
	}

	loadAccessories()
	{
		for(const device of this.devices)
		{
			const homebridgeAccessory = this.getAccessory(device.id);

			this.addAccessory(new SynTexUniversalAccessory(homebridgeAccessory, device, { platform : this, logger : this.logger, DeviceManager : DeviceManager, Automations : Automations, TypeManager : TypeManager }));
		}
		
		Automations.setAccessories(this.accessories);
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
			3 : { type : 'rgb', format : { power : 'boolean', brightness : 'number', saturation : 'number', hue : 'number' } },
			4 : { type : 'switch', format : 'boolean' },
			5 : { type : 'relais', format : 'boolean' },
			6 : { type : 'statelessswitch', format : 'number' },
			7 : { type : 'outlet', format : 'boolean' },
			8 : { type : 'led', format : 'boolean' },
			9 : { type : 'dimmer', format : { power : 'boolean', brightness : 'number' } }
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
}