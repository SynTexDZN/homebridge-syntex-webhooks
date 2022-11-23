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
		const setColor = (resolve) => {

			this.DeviceManager.fetchRequests(this, { value : this.tempState.value, hue : this.tempState.hue, saturation : this.tempState.saturation, brightness : this.tempState.brightness }).then((success) => {

				if(success)
				{
					this.value = this.tempState.value;
					this.hue = this.tempState.hue;
					this.saturation = this.tempState.saturation;
					this.brightness = this.tempState.brightness;

					this.logger.log('update', this.id, this.letters, '%update_state[0]% [' + this.name + '] %update_state[1]% [value: ' + this.value + ', hue: ' + this.hue +  ', saturation: ' + this.saturation + ', brightness: ' + this.brightness + '] ( ' + this.id + ' )');
				}
				
				if(callback != null)
				{
					callback();
				}

				resolve();

				this.AutomationSystem.LogikEngine.runAutomation(this, { value : this.value, hue : this.hue, saturation : this.saturation, brightness : this.brightness });
			});
		};

		super.setToCurrentColor(state, (resolve) => {

			setColor(resolve);

		}, (resolve) => {

			setColor(resolve);

		}, (resolve) => {
			
			if(callback != null)
			{
				callback();
			}

			resolve();

			this.AutomationSystem.LogikEngine.runAutomation(this, { value : this.value, hue : this.hue, saturation : this.saturation, brightness : this.brightness });
		});
	}
};