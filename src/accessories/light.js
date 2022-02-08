const { LightService } = require('homebridge-syntex-dynamic-platform');

let Characteristic, AutomationSystem;

module.exports = class SynTexLightService extends LightService
{
	constructor(homebridgeAccessory, deviceConfig, serviceConfig, manager)
	{
		Characteristic = manager.platform.api.hap.Characteristic;
		AutomationSystem = manager.platform.AutomationSystem;
		
		super(homebridgeAccessory, deviceConfig, serviceConfig, manager);

		super.getState((value) => {

			this.value = value || 0.0001;

			this.service.getCharacteristic(Characteristic.CurrentAmbientLightLevel).updateValue(this.value);

		}, true);

		this.changeHandler = (state) =>
		{
			if(state.value != null)
			{
				this.value = state.value;

				this.service.getCharacteristic(Characteristic.CurrentAmbientLightLevel).updateValue(state.value);

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