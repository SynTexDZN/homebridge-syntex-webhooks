const { BlindService } = require('homebridge-syntex-dynamic-platform');

module.exports = class SynTexBlindService extends BlindService
{
	constructor(homebridgeAccessory, deviceConfig, serviceConfig, manager)
	{
		super(homebridgeAccessory, deviceConfig, serviceConfig, manager);

		this.DeviceManager = manager.DeviceManager;

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
		this.DeviceManager.fetchRequests({ value }, this).then((result) => {

			console.log(result == null, value);

			if(result == null)
			{
				this.value = value;

				console.log('X1', super.setTargetPosition != null);

				super.setTargetPosition(value, 
					() => {
						console.log('X3');
						
						this.logger.log('update', this.id, this.letters, '%update_state[0]% [' + this.name + '] %update_state[1]% [' + value + '] ( ' + this.id + ' )')
					});
			}

			this.AutomationSystem.LogikEngine.runAutomation(this.id, this.letters, { value });

			callback(result);
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
};