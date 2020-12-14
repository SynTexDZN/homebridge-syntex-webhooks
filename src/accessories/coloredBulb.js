let Service, Characteristic, DeviceManager, Automations;

const { ColoredBulbService } = require('homebridge-syntex-dynamic-platform');

const convert = require('color-convert');

module.exports = class SynTexColoredBulbService extends ColoredBulbService
{
	constructor(homebridgeAccessory, deviceConfig, serviceConfig, manager)
	{
		Service = manager.platform.api.hap.Service;
		Characteristic = manager.platform.api.hap.Characteristic;
		Automations = manager.Automations;
		DeviceManager = manager.DeviceManager;
		
        super(homebridgeAccessory, deviceConfig, serviceConfig, manager);
        
        this.options.spectrum = serviceConfig.spectrum || 'HSL';

		this.changeHandler = (state) =>
		{
			if(state.value != null)
			{
				this.homebridgeAccessory.getServiceById(Service.Lightbulb, serviceConfig.subtype).getCharacteristic(Characteristic.On).updateValue(state.power);

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
				
				this.logger.log('update', this.id, this.letters, 'HomeKit Status für [' + this.name + '] geändert zu [power: ' + this.power + ', hue: ' + this.hue +  ', saturation: ' + this.saturation + ', brightness: ' + this.brightness + '] ( ' + this.id + ' )');
			}
				
			callback(null, value != null ? value : false);
		});
	}
	
	setState(value, callback)
	{
        this.power = value;

        setToCurrentColor({ power : this.power }, 
            () => super.setState(this.power, 
            () => callback()));

		if(Automations.isReady())
		{
			Automations.runAutomations(this.id, this.letters, value);
		}
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
		this.hue = value;

        setToCurrentColor({ hue : this.hue }, 
            () => super.setHue(this.hue, 
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
		this.saturation = value;

        setToCurrentColor({ saturation : this.saturation }, 
            () => super.setSaturation(this.saturation, 
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
		this.brightness = value;

        setToCurrentColor({ brightness : this.brightness }, 
            () => super.setBrightness(this.brightness, 
            () => callback()))
    }
    
    setToCurrentColor(state, callback)
	{
		if(this.power != state.power)
		{
			this.power = state.power;

			this.changed = true;
		}

		if(this.hue != state.hue)
		{
			this.hue = state.hue;

			this.changed = true;
		}

		if(this.saturation != state.saturation)
		{
			this.saturation = state.saturation;

			this.changed = true;
		}

		if(this.brightness != state.brightness)
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

					if(this.changed)
					{
                        DeviceManager.fetchRequests(this).then((result) => {

                            if(result == null)
                            {
                                this.logger.log('update', this.id, this.letters, 'HomeKit Status für [' + this.name + '] geändert zu [power: ' + this.power + ', hue: ' + this.hue +  ', saturation: ' + this.saturation + ', brightness: ' + this.brightness + '] ( ' + this.id + ' )');
                            }
                        });

                        this.changed = false;
					}

                    this.running = false;
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