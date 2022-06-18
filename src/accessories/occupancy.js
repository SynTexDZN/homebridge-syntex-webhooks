const { OccupancyService } = require('homebridge-syntex-dynamic-platform');

module.exports = class SynTexOccupancyService extends OccupancyService
{
	constructor(homebridgeAccessory, deviceConfig, serviceConfig, manager)
	{
		super(homebridgeAccessory, deviceConfig, serviceConfig, manager);

		this.DeviceManager = manager.DeviceManager;

		this.changeHandler = (state) => {

			this.DeviceManager.fetchRequests(state, this).then((success) => {

				if(success && state.value != null)
				{
					this.value = state.value;

					super.setState(state.value,
						() => this.service.getCharacteristic(this.Characteristic.OccupancyDetected).updateValue(state.value), true);
				}

				this.AutomationSystem.LogikEngine.runAutomation(this.id, this.letters, state);
			});
		};
	}

	getState(callback)
	{
		super.getState(() => callback(null, this.value), true);
	}
};