const { OutletService } = require('homebridge-syntex-dynamic-platform');

let Characteristic, DeviceManager, AutomationSystem;

module.exports = class SynTexOutletService extends OutletService
{
	constructor(homebridgeAccessory, deviceConfig, serviceConfig, manager)
	{
		Characteristic = manager.platform.api.hap.Characteristic;
		AutomationSystem = manager.platform.AutomationSystem;
		DeviceManager = manager.DeviceManager;
		
		super(homebridgeAccessory, deviceConfig, serviceConfig, manager);

		super.getState((power) => {

			this.power = power || false;

			this.service.getCharacteristic(Characteristic.On).updateValue(this.power);

		}, true);

		this.changeHandler = (state) =>
		{
			if(state.value != null)
			{
				this.service.getCharacteristic(Characteristic.On).updateValue(state.value);

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

			AutomationSystem.LogikEngine.runAutomation(this.id, this.letters, { value : value });

			callback(result);
		});
	}
};