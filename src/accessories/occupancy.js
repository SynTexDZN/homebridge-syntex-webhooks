const { OccupancyService } = require('homebridge-syntex-dynamic-platform');

module.exports = class SynTexOccupancyService extends OccupancyService
{
	constructor(homebridgeAccessory, deviceConfig, serviceConfig, manager)
	{
		super(homebridgeAccessory, deviceConfig, serviceConfig, manager);

		this.DeviceManager = manager.DeviceManager;

		this.changeHandler = (state) => {

			this.DeviceManager.fetchRequests(this, state).then((success) => {

				if(success && state.value != null)
				{
					super.setState(state.value,
						() => this.service.getCharacteristic(this.Characteristic.OccupancyDetected).updateValue(state.value));
				}

				this.AutomationSystem.LogikEngine.runAutomation(this, state);
			});
		};
	}
};