const { LightBulbService } = require('homebridge-syntex-dynamic-platform');

module.exports = class SynTexLightBulbService extends LightBulbService
{
	constructor(homebridgeAccessory, deviceConfig, serviceConfig, manager)
	{
		super(homebridgeAccessory, deviceConfig, serviceConfig, manager);

		this.DeviceManager = manager.DeviceManager;

		this.changeHandler = (state) => {

			if(state.value != null)
			{
				this.setState(state.value,
					() => this.service.getCharacteristic(this.Characteristic.On).updateValue(state.value));
			}
		};
	}

	setState(value, callback)
	{
		this.DeviceManager.fetchRequests(this, { value }).then((success) => {

			if(success)
			{
				super.setState(value, () => callback());

				this.AutomationSystem.LogikEngine.runAutomation(this, { value });
			}
			else
			{
				callback(new Error('Request failed'));
			}
		});
	}
};