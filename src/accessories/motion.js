const { MotionService } = require('homebridge-syntex-dynamic-platform');

let DeviceManager;

module.exports = class SynTexMotionService extends MotionService
{
	constructor(homebridgeAccessory, deviceConfig, serviceConfig, manager)
	{
		DeviceManager = manager.DeviceManager;
		
		super(homebridgeAccessory, deviceConfig, serviceConfig, manager);

		super.getState((value) => {

			this.value = value || false;

			this.service.getCharacteristic(this.Characteristic.MotionDetected).updateValue(this.value);
			
		}, true);

		this.changeHandler = (state) =>
		{
			if(state.value != null)
			{
				DeviceManager.fetchRequests({ value : state.value }, this).then((result) => {

					if(result == null)
					{
						this.value = state.value;

						this.service.getCharacteristic(this.Characteristic.MotionDetected).updateValue(state.value);

						super.setValue('value', state.value, true);
					}

					this.AutomationSystem.LogikEngine.runAutomation(this.id, this.letters, state);
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