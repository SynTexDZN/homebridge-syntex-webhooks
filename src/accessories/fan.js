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
				this.service.getCharacteristic(this.Characteristic.RotationSpeed).updateValue(this.speed);
				this.service.getCharacteristic(this.Characteristic.RotationDirection).updateValue(this.direction);
			});
		};
	}

	setState(value, callback)
	{
		this.setToCurrentState({ value }, () => callback());
	}

	setRotationSpeed(speed, callback)
	{
		this.setToCurrentState({ speed }, () => callback());
	}

	setRotationDirection(direction, callback)
	{
		this.setToCurrentState({ direction }, () => callback());
	}

	setToCurrentState(state, callback)
	{
		const setState = (resolve) => {

			this.DeviceManager.fetchRequests(this, { value : this.tempState.value, speed : this.tempState.speed, direction : this.tempState.direction }).then((success) => {

				if(success)
				{
					if(this.changedValue)
					{
						super.setState(this.tempState.value, null, false);
					}

					if(this.changedSpeed)
					{
						super.setRotationSpeed(this.tempState.speed, null, false);
					}

					if(this.changedDirection)
					{
						super.setRotationDirection(this.tempState.direction, null, false);
					}

					this.logger.log('update', this.id, this.letters, '%update_state[0]% [' + this.name + '] %update_state[1]% [' + this.getStateText() + '] ( ' + this.id + ' )');
				}

				if(callback != null)
				{
					callback();
				}

				resolve();

				this.AutomationSystem.LogikEngine.runAutomation(this, { value : this.value, speed : this.speed, direction : this.direction });
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