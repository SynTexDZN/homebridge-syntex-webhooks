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
				var accessory = this.getAccessory(urlParams.id);
				var service = accessory.service[1];
						
				if(urlParams.event == null)
				{
					for(var j = 0; j < accessory.service.length; j++)
					{
						if(accessory.service[j].id != null && accessory.service[j].letters != null)
						{
							if((urlParams.type == null || accessory.service[j].letters[0] == TypeManager.typeToLetter(urlParams.type)) && (urlParams.counter == null || accessory.service[j].letters[1] == urlParams.counter))
							{
								service = accessory.service[j];
							}
						}
					}
				}

				if(service == null)
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

					if(urlParams.hue != null)
					{
						state.hue = urlParams.hue;
					}
					
					if(urlParams.saturation != null)
					{
						state.saturation = urlParams.saturation;
					}

					if(urlParams.brightness != null)
					{
						state.brightness = urlParams.brightness;
					}

					if((state = TypeManager.validateUpdate(urlParams.id, service.letters, state)) != null)
					{
						service.changeHandler(state);
					}
					else
					{
						this.logger.log('error', urlParams.id, service.letters, '[' + service.name + '] konnte nicht aktualisiert werden! ( ' + urlParams.id + ' )');
					}

					response.write(state != null ? 'Success' : 'Error');
				}
				else if(urlParams.remove != null)
				{
					if(urlParams.remove == 'CONFIRM')
					{
						this.removeAccessory(accessory.homebridgeAccessory);
					}

					response.write(urlParams.remove == 'CONFIRM' ? 'Success' : 'Error');
				}
				else
				{
					var state = null;
					
					if(accessory.homebridgeAccessory != null
						&& accessory.homebridgeAccessory.context != null
						&& accessory.homebridgeAccessory.context.data != null
						&& service != null
						&& service.letters != null)
					{
						state = accessory.homebridgeAccessory.context.data[service.letters];
					}

					response.write(state != null ? JSON.stringify(state) : 'Error');
				}
			}
			else
			{
				response.write('Error');
			}

			response.end();
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
}