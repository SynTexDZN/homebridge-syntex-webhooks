let DeviceManager = require('./device-manager'), TypeManager = require('./type-manager'), Automations = require('./automations');

const { DynamicPlatform } = require('homebridge-syntex-dynamic-platform');

const SynTexUniversalAccessory = require('./src/universal');

const pluginID = 'homebridge-syntex-webhooks';
const pluginName = 'SynTexWebHooks';
const pluginVersion = require('./package.json').version;

module.exports = (homebridge) => {

	homebridge.registerPlatform(pluginID, pluginName, SynTexWebHookPlatform, true);
};

class SynTexWebHookPlatform extends DynamicPlatform
{
	constructor(log, config, api)
	{
		super(config, api, pluginID, pluginName, pluginVersion);

		this.devices = config['accessories'] || [];
	
		this.cacheDirectory = config['cache_directory'] || './SynTex';
		
		if(this.api && this.logger)
		{
			this.api.on('didFinishLaunching', () => {

				TypeManager = new TypeManager(this.logger);
				DeviceManager = new DeviceManager(this.logger, TypeManager, this.cacheDirectory);
				Automations = new Automations(this.logger, this.cacheDirectory, this);

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

					this.finishInit();
				});
			});
		}
	}

	initWebServer()
	{
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