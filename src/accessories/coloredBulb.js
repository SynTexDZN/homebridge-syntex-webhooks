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
		DeviceManager.fetchRequests(this).then((result) => {

			if(result == null)
			{
				this.power = value;

				super.setState(this.power, 
					() => this.logger.log('update', this.id, this.letters, 'HomeKit Status für [' + this.name + '] geändert zu [power: ' + this.power + ', hue: ' + this.hue +  ', saturation: ' + this.saturation + ', brightness: ' + this.brightness + '] ( ' + this.id + ' )'));
			}

			callback(result);
		});

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

	getHue(value, callback)
	{
		this.hue = value;

		super.setBrightness(this.hue, () => callback());
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

		super.setBrightness(this.saturation, () => callback());
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

		super.setBrightness(this.brightness, () => callback());
	}
};