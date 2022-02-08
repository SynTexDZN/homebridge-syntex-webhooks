const { SmokeService } = require('homebridge-syntex-dynamic-platform');

let Characteristic, DeviceManager, AutomationSystem;

module.exports = class SynTexSmokeService extends SmokeService
{
	constructor(homebridgeAccessory, deviceConfig, serviceConfig, manager)
	{
		Characteristic = manager.platform.api.hap.Characteristic;
		AutomationSystem = manager.platform.AutomationSystem;
		DeviceManager = manager.DeviceManager;
		
		super(homebridgeAccessory, deviceConfig, serviceConfig, manager);

		super.getState((value) => {

			this.value = value || false;

			this.service.getCharacteristic(Characteristic.SmokeDetected).updateValue(this.value);

		}, true);

		this.changeHandler = (state) =>
		{
			if(state.value != null)
			{
				DeviceManager.fetchRequests({ power : state.value }, this).then((result) => {

					if(result == null)
					{
						this.value = state.value;

						this.service.getCharacteristic(Characteristic.SmokeDetected).updateValue(state.value);

						super.setValue('value', state.value, true);
					}

					AutomationSystem.LogikEngine.runAutomation(this.id, this.letters, state);
				});
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