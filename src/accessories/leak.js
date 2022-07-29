const { LeakService } = require('homebridge-syntex-dynamic-platform');

module.exports = class SynTexLeakService extends LeakService
{
	constructor(homebridgeAccessory, deviceConfig, serviceConfig, manager)
	{
		super(homebridgeAccessory, deviceConfig, serviceConfig, manager);

		this.DeviceManager = manager.DeviceManager;

		this.changeHandler = (state) => {

			this.DeviceManager.fetchRequests(this, state).then((success) => {

				if(success && state.value != null)
				{
					this.value = state.value;

					super.setState(state.value,
						() => this.service.getCharacteristic(this.Characteristic.LeakDetected).updateValue(state.value), true);
				}

				this.AutomationSystem.LogikEngine.runAutomation(this, state);
			});
		};
	}

	getState(callback)
	{
		super.getState(() => callback(null, this.value), true);
	}
};