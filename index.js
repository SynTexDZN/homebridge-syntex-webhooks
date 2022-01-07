let DeviceManager = require('./device-manager'), TypeManager = require('./type-manager'), AutomationSystem = require('syntex-automation');

const { DynamicPlatform, ContextManager } = require('homebridge-syntex-dynamic-platform');

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
	
		if(this.api != null && this.logger != null && this.files != null)
		{
			this.api.on('didFinishLaunching', () => {

				TypeManager = new TypeManager(this.logger);
				DeviceManager = new DeviceManager(this.logger, TypeManager);
				AutomationSystem = new AutomationSystem(this.logger, this.files, this, pluginName, this.api.user.storagePath());

				this.loadAccessories();
				this.initWebServer();
			});
		}
		else
		{
			throw new Error('Minimal parameters not configurated. Please check the README! https://github.com/SynTexDZN/homebridge-syntex-webhooks/blob/master/README.md');
		}
	}

	loadAccessories()
	{
		for(const device of this.devices)
		{
			const homebridgeAccessory = this.getAccessory(device.id);

			device.manufacturer = pluginName;

			this.addAccessory(new SynTexUniversalAccessory(homebridgeAccessory, device, { platform : this, logger : this.logger, DeviceManager, AutomationSystem, TypeManager, ContextManager }));
		}
	}

	initWebServer()
	{
		if(this.port != null)
		{
			this.WebServer.addPage('/reload-automation', async (response) => {

				response.end(await AutomationSystem.LogikEngine.loadAutomation() ? 'Success' : 'Error');
			});
		}
	}
}