const { HumidityService } = require('homebridge-syntex-dynamic-platform');

let AutomationSystem;

module.exports = class SynTexHumidityService extends HumidityService
{
	constructor(homebridgeAccessory, deviceConfig, serviceConfig, manager)
	{
		AutomationSystem = manager.platform.AutomationSystem;
		
		super(homebridgeAccessory, deviceConfig, serviceConfig, manager);

		super.getState((value) => {

			this.value = value || 0;

			this.service.getCharacteristic(this.Characteristic.CurrentRelativeHumidity).updateValue(this.value);

		}, true);

		this.changeHandler = (state) =>
		{
			if(state.value != null)
			{
				this.value = state.value;

				this.service.getCharacteristic(this.Characteristic.CurrentRelativeHumidity).updateValue(state.value);

				super.setValue('value', state.value, true);

				AutomationSystem.LogikEngine.runAutomation(this.id, this.letters, state);
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
};