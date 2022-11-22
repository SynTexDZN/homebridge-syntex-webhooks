const { DimmedBulbService } = require('homebridge-syntex-dynamic-platform');

module.exports = class SynTexDimmedBulbService extends DimmedBulbService
{
	constructor(homebridgeAccessory, deviceConfig, serviceConfig, manager)
	{
		super(homebridgeAccessory, deviceConfig, serviceConfig, manager);

		this.DeviceManager = manager.DeviceManager;

		this.changeHandler = (state) => {

			this.setToCurrentBrightness(state, () => {

				if(state.value != null)
				{
					super.setState(state.value,
						() => this.service.getCharacteristic(this.Characteristic.On).updateValue(state.value));
				}

				if(state.brightness != null)
				{
					super.setBrightness(state.brightness,
						() => this.service.getCharacteristic(this.Characteristic.Brightness).updateValue(state.brightness));
				}

				this.AutomationSystem.LogikEngine.runAutomation(this, state);
			});
		};
	}

	getState(callback)
	{
		super.getState(() => callback(null, this.value), true);
	}
	
	setState(value, callback)
	{
		this.setToCurrentBrightness({ value }, () => {
			
			super.setState(value, () => callback());

			this.AutomationSystem.LogikEngine.runAutomation(this, { value, brightness : this.brightness });
		});
	}

	getBrightness(callback)
	{
		super.getBrightness(() => callback(null, this.brightness));
	}

	setBrightness(brightness, callback)
	{
		this.setToCurrentBrightness({ brightness }, () => {
			
			super.setBrightness(brightness, () => callback());

			this.AutomationSystem.LogikEngine.runAutomation(this, { value : this.value, brightness });
		});
	}

	setToCurrentBrightness(state, callback)
	{
		const setBrightness = (resolve) => {

			this.DeviceManager.fetchRequests(this, { value : this.value, brightness : this.brightness }).then((success) => {

				if(success)
				{
					this.logger.log('update', this.id, this.letters, '%update_state[0]% [' + this.name + '] %update_state[1]% [value: ' + this.value + ', brightness: ' + this.brightness + '] ( ' + this.id + ' )');
				}

				if(callback != null)
				{
					callback();
				}

				resolve();
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