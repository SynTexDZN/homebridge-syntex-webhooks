const { ColoredBulbService } = require('homebridge-syntex-dynamic-platform');

module.exports = class SynTexColoredBulbService extends ColoredBulbService
{
	constructor(homebridgeAccessory, deviceConfig, serviceConfig, manager)
	{
		super(homebridgeAccessory, deviceConfig, serviceConfig, manager);

		this.DeviceManager = manager.DeviceManager;
		
		this.options.spectrum = serviceConfig.spectrum || 'HSL';
		
		this.changeHandler = (state) => {

			this.setToCurrentColor(state, () => {

				if(state.value != null)
				{
					super.setState(state.value,
						() => this.service.getCharacteristic(this.Characteristic.On).updateValue(state.value));
				}

				if(state.hue != null)
				{
					super.setHue(state.hue,
						() => this.service.getCharacteristic(this.Characteristic.Hue).updateValue(state.hue));
				}

				if(state.saturation != null)
				{
					super.setSaturation(state.saturation,
						() => this.service.getCharacteristic(this.Characteristic.Saturation).updateValue(state.saturation));
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
		this.setToCurrentColor({ value }, () => super.setState(value, () => callback()));
	}

	getHue(callback)
	{
		super.getHue(() => callback(null, this.hue));
	}

	setHue(hue, callback)
	{
		this.setToCurrentColor({ hue }, () => super.setHue(hue, () => callback()));
	}

	getSaturation(callback)
	{
		super.getSaturation(() => callback(null, this.saturation));
	}

	setSaturation(saturation, callback)
	{
		this.setToCurrentColor({ saturation }, () => super.setSaturation(saturation, () => callback()));
	}

	getBrightness(callback)
	{
		super.getBrightness(() => callback(null, this.brightness));
	}

	setBrightness(brightness, callback)
	{
		this.setToCurrentColor({ brightness }, () => super.setBrightness(brightness, () => callback()));
	}

	setToCurrentColor(state, callback)
	{
		if(state.value != null && this.value != state.value)
		{
			this.value = state.value;

			this.changed = true;
		}

		if(state.hue != null && this.hue != state.hue)
		{
			this.hue = state.hue;

			this.changed = true;
		}

		if(state.saturation != null && this.saturation != state.saturation)
		{
			this.saturation = state.saturation;

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

				this.DeviceManager.fetchRequests({ value : this.value, hue : this.hue, saturation : this.saturation, brightness : this.brightness }, this).then((success) => {

					if(success && this.changed)
					{
						this.logger.log('update', this.id, this.letters, '%update_state[0]% [' + this.name + '] %update_state[1]% [value: ' + this.value + ', hue: ' + this.hue +  ', saturation: ' + this.saturation + ', brightness: ' + this.brightness + '] ( ' + this.id + ' )');
					}
	
					this.AutomationSystem.LogikEngine.runAutomation(this.id, this.letters, { value : this.value, hue : this.hue, saturation : this.saturation, brightness : this.brightness });
					
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