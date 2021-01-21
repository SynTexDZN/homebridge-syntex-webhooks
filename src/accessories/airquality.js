let Service, Characteristic, DeviceManager, AutomationSystem;

const { AirQualityService } = require('homebridge-syntex-dynamic-platform');

module.exports = class SynTexAirQualityService extends AirQualityService
{
	constructor(homebridgeAccessory, deviceConfig, serviceConfig, manager)
	{
		Service = manager.platform.api.hap.Service;
		Characteristic = manager.platform.api.hap.Characteristic;
		AutomationSystem = manager.AutomationSystem;
		DeviceManager = manager.DeviceManager;
		
		super(homebridgeAccessory, deviceConfig, serviceConfig, manager);

		super.getState((value) => {

			this.value = value || 0;

		}, true);

		this.changeHandler = (state) =>
		{
			if(state.value != null)
			{
				this.value = state.value;

				this.service.getCharacteristic(Characteristic.AirQuality).updateValue(this.value);

				super.setValue('state', this.value, true);
			
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
				
			callback(null, value != null ? value : 0);

		}, true);
	}
};