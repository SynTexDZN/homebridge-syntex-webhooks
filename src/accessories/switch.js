const { SwitchService } = require('homebridge-syntex-dynamic-platform');

module.exports = class SynTexSwitchService extends SwitchService
{
	constructor(homebridgeAccessory, deviceConfig, serviceConfig, manager)
	{
		super(homebridgeAccessory, deviceConfig, serviceConfig, manager);

		this.DeviceManager = manager.DeviceManager;

		this.changeHandler = (state) => {

			if(state.value != null)
			{
				this.setState(state.value,
					() => this.service.getCharacteristic(this.Characteristic.On).updateValue(state.value));
			}
		};
	}

	getState(callback)
	{
		super.getState(() => callback(null, this.value), true);
	}
	
	setState(value, callback)
	{
		this.DeviceManager.fetchRequests({ value }, this).then((result) => {

			if(result == null)
			{
				this.value = value;

				super.setState(value, 
					() => this.logger.log('update', this.id, this.letters, '%update_state[0]% [' + this.name + '] %update_state[1]% [' + value + '] ( ' + this.id + ' )'));
			}

			this.AutomationSystem.LogikEngine.runAutomation(this.id, this.letters, { value });

			callback(result);
		});
	}
};