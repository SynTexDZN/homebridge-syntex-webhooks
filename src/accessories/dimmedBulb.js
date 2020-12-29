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

		super.getState((power) => super.getBrightness((brightness) => {

			this.power = power || false;
			this.brightness = brightness || 100;

			this.logger.log('read', this.id, this.letters, '%read_state[0]% [' + this.name + '] %read_state[1]% [power: ' + this.power + ', brightness: ' + this.brightness + '] ( ' + this.id + ' )');

		}));

		this.changeHandler = (state) =>
		{
			if(state.value != null)
			{
				this.service.getCharacteristic(Characteristic.On).updateValue(state.value);

				this.setState(state.value, () => {});
			}

			if(state.brightness != null)
			{
				this.service.getCharacteristic(Characteristic.Brightness).updateValue(state.brightness);

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
				
				this.logger.log('read', this.id, this.letters, '%read_state[0]% [' + this.name + '] %read_state[1]% [power: ' + this.power + ', brightness: ' + super.getValue('brightness') + '] ( ' + this.id + ' )');
			}
				
			callback(null, value != null ? value : false);
		});
	}
	
	setState(value, callback)
	{
		DeviceManager.fetchRequests({ power : value }, this).then((result) => {

			if(result == null)
			{
				this.power = value;

				super.setState(this.power, 
					() => this.logger.log('update', this.id, this.letters, '%update_state[0]% [' + this.name + '] %update_state[1]% [power: ' + this.power + ', brightness: ' + this.brightness + '] ( ' + this.id + ' )'));
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