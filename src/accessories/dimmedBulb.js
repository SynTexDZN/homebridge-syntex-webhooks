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
			});
		};
	}

	getState(callback)
	{
		super.getState(() => callback(null, this.value), true);
	}
	
	setState(value, callback)
	{
		this.setToCurrentBrightness({ value }, () => super.setState(value, () => callback()));
	}

	getBrightness(callback)
	{
		super.getBrightness(() => callback(null, this.brightness));
	}

	setBrightness(brightness, callback)
	{
		this.setToCurrentBrightness({ brightness }, () => super.setBrightness(brightness, () => callback()));
	}

	setToCurrentBrightness(state, callback)
	{
		if(state.value != null && this.value != state.value)
		{
			this.value = state.value;

			this.changed = true;
		}

		if(state.brightness != null && this.brightness != state.brightness)
		{
			this.brightness = state.brightness;

			this.changed = true;
		}

		setTimeout(() => {

			if(!this.running)
			{
				this.running = true;

				this.DeviceManager.fetchRequests({ value : this.value, brightness : this.brightness }, this).then((success) => {

					if(success && this.changed)
					{
						this.logger.log('update', this.id, this.letters, '%update_state[0]% [' + this.name + '] %update_state[1]% [value: ' + this.value + ', brightness: ' + this.brightness + '] ( ' + this.id + ' )');
					}
	
					this.AutomationSystem.LogikEngine.runAutomation(this.id, this.letters, { value : this.value, brightness : this.brightness });
					
					if(callback != null)
					{
						callback();
					}

					this.changed = false;
					this.running = false;
				});
			}
			else if(callback != null)
			{
				callback();
			}

		}, 100);
	}
};