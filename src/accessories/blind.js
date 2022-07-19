const { BlindService } = require('homebridge-syntex-dynamic-platform');

module.exports = class SynTexBlindService extends BlindService
{
	constructor(homebridgeAccessory, deviceConfig, serviceConfig, manager)
	{
		super(homebridgeAccessory, deviceConfig, serviceConfig, manager);

		this.DeviceManager = manager.DeviceManager;

		this.timeDelayUp = serviceConfig.delay != null && serviceConfig.delay.up != null ? serviceConfig.delay.up : 11000;
		this.timeDelayDown = serviceConfig.delay != null && serviceConfig.delay.down != null ? serviceConfig.delay.down : 10000;

		this.changeHandler = (state) => {

			if(state.value != null)
			{
				this.setTargetPosition(state.value, () => {});
			}
		};
	}

	getTargetPosition(callback)
	{
		super.getTargetPosition((value) => callback(null, value), true);
	}
	
	setTargetPosition(value, callback)
	{
		this.DeviceManager.fetchRequests(this, { value }).then((success) => {

			if(success)
			{
				this.value = value;

				super.setTargetPosition(value, () => callback(this.updatePosition(value)), true);

				this.AutomationSystem.LogikEngine.runAutomation(this.id, this.letters, { value });
			}
			else
			{
				callback(new Error('Request failed'));
			}
		});
	}

	getCurrentPosition(callback)
	{
		callback(null, this.value);
	}

	getPositionState(callback)
	{
		callback(null, this.position);
	}

	updatePosition(value)
	{
		this.position = value > 0 ? this.Characteristic.PositionState.INCREASING : this.Characteristic.PositionState.DECREASING;

		this.service.getCharacteristic(this.Characteristic.TargetPosition).updateValue(value);
		this.service.getCharacteristic(this.Characteristic.PositionState).updateValue(this.position);

		super.setPositionState(this.position, () => setTimeout(() => {

			this.position = this.Characteristic.PositionState.STOPPED;

			this.service.getCharacteristic(this.Characteristic.CurrentPosition).updateValue(this.value);
			this.service.getCharacteristic(this.Characteristic.PositionState).updateValue(this.position);

			super.setPositionState(this.position, () => {});

		}, value > 0 ? this.timeDelayUp : this.timeDelayDown));
	}
};