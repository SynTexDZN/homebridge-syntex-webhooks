let Characteristic, AutomationSystem;

const { LightService } = require('homebridge-syntex-dynamic-platform');

module.exports = class SynTexLightService extends LightService
{
	constructor(homebridgeAccessory, deviceConfig, serviceConfig, manager)
	{
		Characteristic = manager.platform.api.hap.Characteristic;
		AutomationSystem = manager.platform.AutomationSystem;
		
		super(homebridgeAccessory, deviceConfig, serviceConfig, manager);

		super.getState((value) => {

			this.value = value || 0.0001;

		}, true);

		this.changeHandler = (state) =>
		{
			if(state.value != null)
			{
				this.value = state.value;

				this.service.getCharacteristic(Characteristic.CurrentAmbientLightLevel).updateValue(this.value);

				super.setValue('value', this.value, true);
			
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