let DeviceManager = require('./device-manager'), TypeManager = require('./type-manager'), AutomationSystem = require('syntex-automation');

const { DynamicPlatform } = require('homebridge-syntex-dynamic-platform');

const SynTexUniversalAccessory = require('./src/universal');

const pluginID = 'homebridge-syntex-webhooks';
const pluginName = 'SynTexWebHooks';
const pluginVersion = require('./package.json').version;

module.exports = (homebridge) => homebridge.registerPlatform(pluginID, pluginName, SynTexWebHookPlatform, true);

class SynTexWebHookPlatform extends DynamicPlatform
{
	constructor(log, config, api)
	{
		super(config, api, pluginID, pluginName, pluginVersion);

		this.devices = config['accessories'] || [];
	
		this.cacheDirectory = config['cacheDirectory'] || './SynTex';
		
		if(this.api && this.logger)
		{
			this.api.on('didFinishLaunching', () => {

				TypeManager = new TypeManager(this.logger);
				DeviceManager = new DeviceManager(this.logger, TypeManager, this.cacheDirectory);
				AutomationSystem = new AutomationSystem(this.logger, '/var/SynTex/automation');

				this.loadAccessories();
				this.initWebServer();
				this.finishInit();
			});
		}
	}

	initWebServer()
	{
		this.WebServer.addPage('/reload-automation', async (response) => {

			response.write(await AutomationSystem.LogikEngine.loadAutomations() ? 'Success' : 'Error');
			response.end();
		});
	}

	loadAccessories()
	{
		for(const device of this.devices)
		{
			const homebridgeAccessory = this.getAccessory(device.id);

			this.addAccessory(new SynTexUniversalAccessory(homebridgeAccessory, device, { platform : this, logger : this.logger, DeviceManager : DeviceManager, AutomationSystem : AutomationSystem, TypeManager : TypeManager }));
		}
	}
}