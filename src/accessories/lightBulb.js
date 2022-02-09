const { LightBulbService } = require('homebridge-syntex-dynamic-platform');

let DeviceManager;

module.exports = class SynTexLightBulbService extends LightBulbService
{
	constructor(homebridgeAccessory, deviceConfig, serviceConfig, manager)
	{
		DeviceManager = manager.DeviceManager;
		
		super(homebridgeAccessory, deviceConfig, serviceConfig, manager);

		super.getState((power) => {

			this.power = power || false;

			this.service.getCharacteristic(this.Characteristic.On).updateValue(this.power);

		}, true);

		this.changeHandler = (state) =>
		{
			if(state.value != null)
			{
				this.service.getCharacteristic(this.Characteristic.On).updateValue(state.value);

				this.setState(state.value, () => {});
			}
		};
	}

	getState(callback)
	{
		super.getState((value) => {

			if(value != null)
			{
				this.power = value;
			}
				
			callback(null, this.power);

		}, true);
	}
	
	setState(value, callback)
	{
		DeviceManager.fetchRequests({ power : value }, this).then((result) => {

			if(result == null)
			{
				this.power = value;

				super.setState(this.power, 
					() => this.logger.log('update', this.id, this.letters, '%update_state[0]% [' + this.name + '] %update_state[1]% [' + this.power + '] ( ' + this.id + ' )'));
			}

			this.AutomationSystem.LogikEngine.runAutomation(this.id, this.letters, { value : value });

			callback(result);
		});
	}
};