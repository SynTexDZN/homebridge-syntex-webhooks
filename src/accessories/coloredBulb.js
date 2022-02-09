const { ColoredBulbService } = require('homebridge-syntex-dynamic-platform');

let DeviceManager;

module.exports = class SynTexColoredBulbService extends ColoredBulbService
{
	constructor(homebridgeAccessory, deviceConfig, serviceConfig, manager)
	{
		DeviceManager = manager.DeviceManager;
		
		super(homebridgeAccessory, deviceConfig, serviceConfig, manager);
		
		this.options.spectrum = serviceConfig.spectrum || 'HSL';
		
		super.getState((value) => super.getHue((hue) => super.getSaturation((saturation) => super.getBrightness((brightness) => {

			this.value = value || false;
			this.hue = hue || 0;
			this.saturation = saturation || 100;
			this.brightness = brightness || 50;

			this.service.getCharacteristic(this.Characteristic.On).updateValue(this.value);
			this.service.getCharacteristic(this.Characteristic.Hue).updateValue(this.hue);
			this.service.getCharacteristic(this.Characteristic.Saturation).updateValue(this.saturation);
			this.service.getCharacteristic(this.Characteristic.Brightness).updateValue(this.brightness);

			this.logger.log('read', this.id, this.letters, '%read_state[0]% [' + this.name + '] %read_state[1]% [power: ' + this.value + ', hue: ' + this.hue +  ', saturation: ' + this.saturation + ', brightness: ' + this.brightness + '] ( ' + this.id + ' )');
		
		}))));

		this.changeHandler = (state) => {

			this.setToCurrentColor(state, () => {

				if(state.value != null)
				{
					this.service.getCharacteristic(this.Characteristic.On).updateValue(state.value);

					super.setState(state.value, () => {});
				}

				if(state.hue != null)
				{
					this.service.getCharacteristic(this.Characteristic.Hue).updateValue(state.hue);

					super.setHue(state.hue, () => {});
				}

				if(state.saturation != null)
				{
					this.service.getCharacteristic(this.Characteristic.Saturation).updateValue(state.saturation);

					super.setSaturation(state.saturation, () => {});
				}

				if(state.brightness != null)
				{
					this.service.getCharacteristic(this.Characteristic.Brightness).updateValue(state.brightness);

					super.setBrightness(state.brightness, () => {});
				}
			});
		};
	}

	getState(callback)
	{
		super.getState((value) => {

			callback(null, value != null ? value : this.value);

			if(value != null)
			{
				this.value = value;

				this.logger.log('read', this.id, this.letters, '%read_state[0]% [' + this.name + '] %read_state[1]% [power: ' + this.value + ', hue: ' + super.getValue('hue') +  ', saturation: ' + super.getValue('saturation') + ', brightness: ' + super.getValue('brightness') + '] ( ' + this.id + ' )');
			}
		});
	}
	
	setState(value, callback)
	{
		this.setToCurrentColor({ value }, 
			() => super.setState(value, 
			() => callback()));
	}

	getHue(callback)
	{
		super.getHue((value) => {

			if(value != null)
			{
				this.hue = value;
			}
				
			callback(null, this.hue);
		});
	}

	setHue(value, callback)
	{
		this.setToCurrentColor({ hue : value }, 
			() => super.setHue(value, 
			() => callback()));
	}

	getSaturation(callback)
	{
		super.getSaturation((value) => {

			if(value != null)
			{
				this.saturation = value;
			}
				
			callback(null, this.saturation);
		});
	}

	setSaturation(value, callback)
	{
		this.setToCurrentColor({ saturation : value }, 
			() => super.setSaturation(value, 
			() => callback()));
	}

	getBrightness(callback)
	{
		super.getBrightness((value) => {

			if(value != null)
			{
				this.brightness = value;
			}
				
			callback(null, this.brightness);
		});
	}

	setBrightness(value, callback)
	{
		this.setToCurrentColor({ brightness : value }, 
			() => super.setBrightness(value, 
			() => callback()));
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

				DeviceManager.fetchRequests({ value : this.value, hue : this.hue, saturation : this.saturation, brightness : this.brightness }, this).then((result) => {

					if(this.changed && result == null)
					{
						this.logger.log('update', this.id, this.letters, '%update_state[0]% [' + this.name + '] %update_state[1]% [power: ' + this.value + ', hue: ' + this.hue +  ', saturation: ' + this.saturation + ', brightness: ' + this.brightness + '] ( ' + this.id + ' )');
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