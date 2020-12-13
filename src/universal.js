const { UniversalAccessory } = require('homebridge-syntex-dynamic-platform');

const SynTexAccessory = require('./accessories/accessory');
const SynTexStatelessswitchAccessory = require('./accessories/statelessswitch');

module.exports = class SynTexUniversalAccessory extends UniversalAccessory
{
	constructor(homebridgeAccessory, deviceConfig, manager)
	{
        Service = manager.platform.api.hap.Service;
        Characteristic = manager.platform.api.hap.Characteristic;

		super(homebridgeAccessory, deviceConfig, manager);
	}
	
	setService(config, subtype)
	{
		var name = this.name;
		var type = config;

		if(config instanceof Object)
		{
			if(config.name != null)
			{
				name = config.name;
			}
			
			if(config.type != null)
			{
				type = config.type;
			}
		}

		var service = null;
		var serviceConfig = { name : name, type : type, subtype : subtype };

		if(type == 'statelessswitch')
		{
			service = new SynTexStatelessswitchAccessory(this.deviceConfig, { Service, Characteristic, TypeManager, logger : this.logger, DeviceManager, Automations });
		}
		else
		{
			service = new SynTexAccessory(this.deviceConfig, { Service, Characteristic, TypeManager, logger : this.logger, DeviceManager, Automations });
		}

		if(service != null)
		{
			this.service.push(service);
		}
	}
	
	getModel()
	{
		return 'Tuya ' + (this.services == 'light' ? 'Light Bulb' : this.services == 'switch' ? 'Outlet' : 'Accessory');
	}
};