let Service, Characteristic;

const { UniversalAccessory } = require('homebridge-syntex-dynamic-platform');

const ContactService = require('./accessories/contact');
const SwitchService = require('./accessories/switch');
const LightService = require('./accessories/light');
//const SynTexStatelessswitchAccessory = require('../accessories/statelessswitch');

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
		var serviceConfig = { name : name, type : type, subtype : subtype, requests : config.requests };

		if(type == 'contact')
		{
			service = new ContactService(this.homebridgeAccessory, this.deviceConfig, serviceConfig, this.manager);
		}
		else if(type == 'switch')
		{
			service = new SwitchService(this.homebridgeAccessory, this.deviceConfig, serviceConfig, this.manager);
		}
		else if(type == 'light')
		{
			service = new LightService(this.homebridgeAccessory, this.deviceConfig, serviceConfig, this.manager);
		}
		else if(type == 'statelessswitch')
		{
			//service = new SynTexStatelessswitchAccessory(this.deviceConfig, { Service, Characteristic, logger : this.logger, TypeManager : this.manager.TypeManager, DeviceManager : this.manager.DeviceManager, Automations : this.manager.Automations });
		}
		else
		{
			//service = new SynTexAccessory(this.deviceConfig, { Service, Characteristic, logger : this.logger, TypeManager : this.manager.TypeManager, DeviceManager : this.manager.DeviceManager, Automations : this.manager.Automations });
		}

		if(service != null)
		{
			this.service.push(service);
		}
	}
	
	getModel()
	{
		return 'HTTP ' + (this.services == 'switch' ? 'Switch' : this.services == 'contact' ? 'Contact Sensor' : 'Accessory');
	}
};