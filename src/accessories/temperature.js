const { TemperatureService } = require('homebridge-syntex-dynamic-platform');

module.exports = class SynTexTemperatureService extends TemperatureService
{
	constructor(homebridgeAccessory, deviceConfig, serviceConfig, manager)
	{
		super(homebridgeAccessory, deviceConfig, serviceConfig, manager);

		super.getState((value) => {

			this.value = value || 0;

			this.service.getCharacteristic(this.Characteristic.CurrentTemperature).updateValue(this.value);

		}, true);

		this.changeHandler = (state) =>
		{
			if(state.value != null)
			{
				this.value = state.value;

				this.service.getCharacteristic(this.Characteristic.CurrentTemperature).updateValue(state.value);

				super.setValue('value', state.value, true);
			
				this.AutomationSystem.LogikEngine.runAutomation(this.id, this.letters, state);
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