const { SmokeService } = require('homebridge-syntex-dynamic-platform');

module.exports = class SynTexSmokeService extends SmokeService
{
	constructor(homebridgeAccessory, deviceConfig, serviceConfig, manager)
	{
		super(homebridgeAccessory, deviceConfig, serviceConfig, manager);

		this.DeviceManager = manager.DeviceManager;

		this.changeHandler = (state) => {

			if(state.value != null)
			{
				this.DeviceManager.fetchRequests(state, this).then((result) => {

					if(result == null)
					{
						this.value = state.value;

						super.setState(state.value,
							() => this.service.getCharacteristic(this.Characteristic.SmokeDetected).updateValue(state.value), true);
					}

					this.AutomationSystem.LogikEngine.runAutomation(this.id, this.letters, state);
				});
			}
		};
	}

	getState(callback)
	{
		super.getState(() => callback(null, this.value), true);
	}
};