const { TemperatureService } = require('homebridge-syntex-dynamic-platform');

module.exports = class SynTexTemperatureService extends TemperatureService
{
	constructor(homebridgeAccessory, deviceConfig, serviceConfig, manager)
	{
		super(homebridgeAccessory, deviceConfig, serviceConfig, manager);

		this.changeHandler = (state) => {

			if(state.value != null)
			{
				this.value = state.value;

				super.setState(state.value,
					() => this.service.getCharacteristic(this.Characteristic.CurrentTemperature).updateValue(state.value), true);
			
				this.AutomationSystem.LogikEngine.runAutomation(this.id, this.letters, state);
			}
		};
	}

	getState(callback)
	{
		super.getState(() => callback(null, this.value), true);
	}
};