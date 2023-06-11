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

				this.service.getCharacteristic(this.Characteristic.On).updateValue(this.value);
				this.service.getCharacteristic(this.Characteristic.Hue).updateValue(this.hue);
				this.service.getCharacteristic(this.Characteristic.Saturation).updateValue(this.saturation);
				this.service.getCharacteristic(this.Characteristic.Brightness).updateValue(this.brightness);
			});
		};
	}

	setState(value, callback)
	{
		this.setToCurrentColor({ value }, () => callback());
	}

	setHue(hue, callback)
	{
		this.setToCurrentColor({ hue }, () => callback());
	}

	setSaturation(saturation, callback)
	{
		this.setToCurrentColor({ saturation }, () => callback());
	}

	setBrightness(brightness, callback)
	{
		this.setToCurrentColor({ brightness }, () => callback());
	}

	setToCurrentColor(state, callback)
	{
		const setColor = (resolve) => {

			this.DeviceManager.fetchRequests(this, { value : this.tempState.value, hue : this.tempState.hue, saturation : this.tempState.saturation, brightness : this.tempState.brightness }).then((success) => {

				if(success)
				{
					if(this.changedValue)
					{
						super.setState(this.tempState.value, null, false);
					}

					if(this.changedColor)
					{
						super.setHue(this.tempState.hue, null, false);
						super.setSaturation(this.tempState.saturation, null, false);
						super.setBrightness(this.tempState.brightness, null, false);
					}

					this.logger.log('update', this.id, this.letters, '%update_state[0]% [' + this.name + '] %update_state[1]% [' + this.getStateText() + '] ( ' + this.id + ' )');
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
		});
	}
};