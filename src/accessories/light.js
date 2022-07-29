const { LightService } = require('homebridge-syntex-dynamic-platform');

module.exports = class SynTexLightService extends LightService
{
	constructor(homebridgeAccessory, deviceConfig, serviceConfig, manager)
	{
		super(homebridgeAccessory, deviceConfig, serviceConfig, manager);

		this.changeHandler = (state) => {

			if(state.value != null)
			{
				this.value = state.value;

				super.setState(state.value,
					() => this.service.getCharacteristic(this.Characteristic.CurrentAmbientLightLevel).updateValue(state.value), true);
			}

			this.AutomationSystem.LogikEngine.runAutomation(this, state);
		};
	}

	getState(callback)
	{
		super.getState(() => callback(null, this.value), true);
	}
};