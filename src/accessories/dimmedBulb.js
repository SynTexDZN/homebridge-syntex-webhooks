const { DimmedBulbService } = require('homebridge-syntex-dynamic-platform');

module.exports = class SynTexDimmedBulbService extends DimmedBulbService
{
	constructor(homebridgeAccessory, deviceConfig, serviceConfig, manager)
	{
		super(homebridgeAccessory, deviceConfig, serviceConfig, manager);

		this.DeviceManager = manager.DeviceManager;

		this.changeHandler = (state) => {

			this.setToCurrentBrightness(state, () => {

				this.service.getCharacteristic(this.Characteristic.On).updateValue(this.value);
				this.service.getCharacteristic(this.Characteristic.Brightness).updateValue(this.brightness);
			});
		};
	}

	setState(value, callback)
	{
		this.setToCurrentBrightness({ value }, () => callback());
	}

	setBrightness(brightness, callback)
	{
		this.setToCurrentBrightness({ brightness }, () => callback());
	}

	setToCurrentBrightness(state, callback)
	{
		const setBrightness = (resolve) => {

			this.DeviceManager.fetchRequests(this, { value : this.tempState.value, brightness : this.tempState.brightness }).then((success) => {

				if(success)
				{
					if(this.changedValue)
					{
						super.setState(this.tempState.value, null, false);
					}

					if(this.changedBrightness)
					{
						super.setBrightness(this.tempState.brightness, null, false);
					}
					
					this.logger.log('update', this.id, this.letters, '%update_state[0]% [' + this.name + '] %update_state[1]% [' + this.getStateText() + '] ( ' + this.id + ' )');
				}

				if(callback != null)
				{
					callback();
				}

				resolve();

				this.AutomationSystem.LogikEngine.runAutomation(this, { value : this.value, brightness : this.brightness });
			});
		};

		super.setToCurrentBrightness(state, (resolve) => {

			setBrightness(resolve);

		}, (resolve) => {

			setBrightness(resolve);

		}, (resolve) => {
			
			if(callback != null)
			{
				callback();
			}

			resolve();
		});
	}
};