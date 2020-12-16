let Service, Characteristic, DeviceManager, Automations;

const { ColoredBulbService } = require('homebridge-syntex-dynamic-platform');

module.exports = class SynTexColoredBulbService extends ColoredBulbService
{
	constructor(homebridgeAccessory, deviceConfig, serviceConfig, manager)
	{
		Service = manager.platform.api.hap.Service;
		Characteristic = manager.platform.api.hap.Characteristic;
		Automations = manager.Automations;
		DeviceManager = manager.DeviceManager;
		
        super(homebridgeAccessory, deviceConfig, serviceConfig, manager);
		
		console.log(serviceConfig);

        this.options.spectrum = serviceConfig.spectrum || 'HSL';

		this.changeHandler = (state) =>
		{
			if(state.value != null)
			{
				this.homebridgeAccessory.getServiceById(Service.Lightbulb, serviceConfig.subtype).getCharacteristic(Characteristic.On).updateValue(state.value);

				this.setState(state.value, () => {});
			}

            if(state.hue != null)
			{
				this.homebridgeAccessory.getServiceById(Service.Lightbulb, serviceConfig.subtype).getCharacteristic(Characteristic.Hue).updateValue(state.hue);

				this.setHue(state.hue, () => {});
            }
            
            if(state.saturation != null)
			{
				this.homebridgeAccessory.getServiceById(Service.Lightbulb, serviceConfig.subtype).getCharacteristic(Characteristic.Saturation).updateValue(state.saturation);

				this.setSaturation(state.saturation, () => {});
			}

			if(state.brightness != null)
			{
				this.homebridgeAccessory.getServiceById(Service.Lightbulb, serviceConfig.subtype).getCharacteristic(Characteristic.Brightness).updateValue(state.brightness);

				this.setBrightness(state.brightness, () => {});
			}
		};
	}

	getState(callback)
	{
		super.getState((value) => {

			if(value != null)
			{
				this.power = value;

				this.logger.log('read', this.id, this.letters, 'HomeKit Status für [' + this.name + '] ist [power: ' + this.power + ', hue: ' + super.getValue('hue') +  ', saturation: ' + super.getValue('saturation') + ', brightness: ' + super.getValue('brightness') + '] ( ' + this.id + ' )');
			}

			callback(null, value != null ? value : false);
		});
	}
	
	setState(value, callback)
	{
        this.setToCurrentColor({ power : value }, 
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
				
			callback(null, value != null ? value : 0);
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
				
			callback(null, value != null ? value : 100);
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
				
			callback(null, value != null ? value : 50);
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
		if(state.power != null && this.power != state.power)
		{
			this.power = state.power;

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
        
		if(this.changed)
		{
			setTimeout(() => {

				if(!this.running)
				{
					this.running = true;

                    DeviceManager.fetchRequests(this).then((result) => {

                        if(result == null)
                        {
                            this.logger.log('update', this.id, this.letters, 'HomeKit Status für [' + this.name + '] geändert zu [power: ' + this.power + ', hue: ' + this.hue +  ', saturation: ' + this.saturation + ', brightness: ' + this.brightness + '] ( ' + this.id + ' )');
                        }

                        if(callback)
                        {
                            callback();
                        }

                        this.changed = false;

                        this.running = false;
                    });

                    if(Automations.isReady() && this.power != null)
                    {
                        Automations.runAutomations(this.id, this.letters, this.power);
                    }
				}
				else if(callback)
				{
					callback();
				}
	
			}, 100);
		}
		else if(callback)
		{
			callback();
		}
	}
};