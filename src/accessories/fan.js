const { FanService } = require('homebridge-syntex-dynamic-platform');

module.exports = class SynTexFanService extends FanService
{
	constructor(homebridgeAccessory, deviceConfig, serviceConfig, manager)
	{
		super(homebridgeAccessory, deviceConfig, serviceConfig, manager);

		this.DeviceManager = manager.DeviceManager;

		this.changeHandler = (state) => {

			this.setToCurrentState(state, () => {

				this.service.getCharacteristic(this.Characteristic.On).updateValue(this.value);
				this.service.getCharacteristic(this.Characteristic.RotationDirection).updateValue(this.direction);
				this.service.getCharacteristic(this.Characteristic.RotationSpeed).updateValue(this.speed);
			});
		};
	}

	setState(value, callback)
	{
		this.setToCurrentState({ value }, () => callback());
	}

	setRotationDirection(direction, callback)
	{
		this.setToCurrentState({ direction }, () => callback());
	}

	setRotationSpeed(speed, callback)
	{
		this.setToCurrentState({ speed }, () => callback());
	}

	setToCurrentState(state, callback)
	{
		const setState = (resolve) => {

			this.DeviceManager.fetchRequests(this, { value : this.tempState.value, direction : this.tempState.direction, speed : this.tempState.speed }).then((success) => {

				if(success)
				{
					if(this.changedValue)
					{
						super.setState(this.tempState.value, null, false);
					}

					if(this.changedDirection)
					{
						super.setRotationDirection(this.tempState.direction, null, false);
					}

					if(this.changedSpeed)
					{
						super.setRotationSpeed(this.tempState.speed, null, false);
					}

					this.logger.log('update', this.id, this.letters, '%update_state[0]% [' + this.name + '] %update_state[1]% [' + this.getStateText() + '] ( ' + this.id + ' )');
				}

				if(callback != null)
				{
					callback();
				}

				resolve();

				this.AutomationSystem.LogikEngine.runAutomation(this, { value : this.value, direction : this.direction, speed : this.speed });
			});
		};

		super.setToCurrentState(state, (resolve) => {

			setState(resolve);

		}, (resolve) => {

			setState(resolve);

		}, (resolve) => {

			setState(resolve);

		}, (resolve) => {

			if(callback != null)
			{
				callback();
			}

			resolve();
		});
	}
};