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
				this.setTargetPosition(state.value,
					() => this.service.getCharacteristic(this.Characteristic.TargetPosition).updateValue(state.value));
			}
		};
	}

	setTargetPosition(target, callback)
	{
		this.DeviceManager.fetchRequests(this, { value : target }).then((success) => {

			if(success)
			{
				super.setTargetPosition(target, () => callback());

				this.updateTarget();

				this.AutomationSystem.LogikEngine.runAutomation(this, { value : this.value, target : this.target, state : this.state });
			}
			else
			{
				callback(new Error('Not Connected'));
			}
		});
	}

	updateTarget()
	{
		var currentState = this.target > 0 ? this.Characteristic.PositionState.INCREASING : this.Characteristic.PositionState.DECREASING;

		super.setPositionState(currentState,
			() => this.service.getCharacteristic(this.Characteristic.PositionState).updateValue(currentState), true);

		setTimeout(() => {

			currentState = this.Characteristic.PositionState.STOPPED;

			super.setState(this.target,
				() => this.service.getCharacteristic(this.Characteristic.CurrentPosition).updateValue(this.target), false);

			super.setPositionState(currentState,
				() => this.service.getCharacteristic(this.Characteristic.PositionState).updateValue(currentState), false);

			this.logger.log('update', this.id, this.letters, '%update_state[0]% [' + this.name + '] %update_state[1]% [' + this.getStateText() + '] ( ' + this.id + ' )');

			this.AutomationSystem.LogikEngine.runAutomation(this, { value : this.value, target : this.target, state : this.state });

		}, this.target > 0 ? this.timeDelayUp : this.timeDelayDown);
	}
};