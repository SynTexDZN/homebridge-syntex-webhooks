let Service, Characteristic, DeviceManager, Automations;

const { DimmedBulbService } = require('homebridge-syntex-dynamic-platform');

module.exports = class SynTexDimmedBulbService extends DimmedBulbService
{
	constructor(homebridgeAccessory, deviceConfig, serviceConfig, manager)
	{
		Service = manager.platform.api.hap.Service;
		Characteristic = manager.platform.api.hap.Characteristic;
		Automations = manager.Automations;
		DeviceManager = manager.DeviceManager;
		
		super(homebridgeAccessory, deviceConfig, serviceConfig, manager);

		this.changeHandler = (state) =>
		{
			if(state.value != null)
			{
				this.homebridgeAccessory.getServiceById(Service.Lightbulb, serviceConfig.subtype).getCharacteristic(Characteristic.On).updateValue(this.power);

				this.setState(state.value, () => {});
			}

			if(state.brightness != null)
			{
				this.homebridgeAccessory.getServiceById(Service.Lightbulb, serviceConfig.subtype).getCharacteristic(Characteristic.Brightness).updateValue(this.brightness);

				this.setBrightness(state.brightness, () => {});
			}
		};
	}

	getState(callback)
	{
		super.getState((value) => {

			if(value != null)
			{
				this.power = value;
				
				this.logger.log('update', this.id, this.letters, 'HomeKit Status für [' + this.name + '] geändert zu [power: ' + this.power + ', brightness: ' + this.brightness + '] ( ' + this.id + ' )');
			}
				
			callback(null, value != null ? value : false);
		});
	}
	
	setState(value, callback)
	{
		DeviceManager.fetchRequests(this).then((result) => {

			if(result == null)
			{
				this.power = value;

				super.setState(this.power, 
					() => this.logger.log('update', this.id, this.letters, 'HomeKit Status für [' + this.name + '] geändert zu [power: ' + this.power + ', brightness: ' + this.brightness + '] ( ' + this.id + ' )'));
			}

			callback(result);
		});

		if(Automations.isReady())
		{
			Automations.runAutomations(this.id, this.letters, value);
		}
	}

	getBrightness(callback)
	{
		super.getBrightness((value) => {

			if(value != null)
			{
				this.brightness = value;
			}
				
			callback(null, value != null ? value : 50);
		});
	}

	setBrightness(value, callback)
	{
		this.brightness = value;

		super.setBrightness(this.brightness, () => callback());
	}
};