const { AirQualityService } = require('homebridge-syntex-dynamic-platform');

module.exports = class SynTexAirQualityService extends AirQualityService
{
	constructor(homebridgeAccessory, deviceConfig, serviceConfig, manager)
	{
		super(homebridgeAccessory, deviceConfig, serviceConfig, manager);

		this.changeHandler = (state) => {

			if(state.value != null)
			{
				this.value = state.value;

				super.setState(state.value,
					() => this.service.getCharacteristic(this.Characteristic.AirQuality).updateValue(state.value), true);
			}

			this.AutomationSystem.LogikEngine.runAutomation(this.id, this.letters, state);
		};
	}

	getState(callback)
	{
		super.getState(() => callback(null, this.value), true);
	}
};