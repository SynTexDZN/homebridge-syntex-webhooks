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
		this.DeviceManager.fetchRequests({ value }, this).then((success) => {

			if(success)
			{
				this.value = value;

				super.setState(value, () => callback(), true);
			
				this.AutomationSystem.LogikEngine.runAutomation(this.id, this.letters, { value });
			}
			else
			{
				callback(new Error('Request failed'));
			}
		});
	}
};