const { SwitchService } = require('homebridge-syntex-dynamic-platform');

let DeviceManager;

module.exports = class SynTexSwitchService extends SwitchService
{
	constructor(homebridgeAccessory, deviceConfig, serviceConfig, manager)
	{
		DeviceManager = manager.DeviceManager;
		
		super(homebridgeAccessory, deviceConfig, serviceConfig, manager);

		super.getState((value) => {

			this.value = value || false;

			this.service.getCharacteristic(this.Characteristic.On).updateValue(this.value);

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
				this.value = value;
			}
				
			callback(null, this.value);

		}, true);
	}
	
	setState(value, callback)
	{
		DeviceManager.fetchRequests({ value }, this).then((result) => {

			if(result == null)
			{
				this.value = value;

				super.setState(this.value, 
					() => this.logger.log('update', this.id, this.letters, '%update_state[0]% [' + this.name + '] %update_state[1]% [' + this.value + '] ( ' + this.id + ' )'));
			}

			this.AutomationSystem.LogikEngine.runAutomation(this.id, this.letters, { value });

			callback(result);
		});
	}
};