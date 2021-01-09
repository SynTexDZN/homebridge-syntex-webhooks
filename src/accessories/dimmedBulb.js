let Service, Characteristic, DeviceManager, AutomationSystem;

const { DimmedBulbService } = require('homebridge-syntex-dynamic-platform');

module.exports = class SynTexDimmedBulbService extends DimmedBulbService
{
	constructor(homebridgeAccessory, deviceConfig, serviceConfig, manager)
	{
		Service = manager.platform.api.hap.Service;
		Characteristic = manager.platform.api.hap.Characteristic;
		AutomationSystem = manager.AutomationSystem;
		DeviceManager = manager.DeviceManager;
		
		super(homebridgeAccessory, deviceConfig, serviceConfig, manager);

		super.getState((power) => super.getBrightness((brightness) => {

			this.power = power || false;
			this.brightness = brightness || 100;

			this.logger.log('read', this.id, this.letters, '%read_state[0]% [' + this.name + '] %read_state[1]% [power: ' + this.power + ', brightness: ' + this.brightness + '] ( ' + this.id + ' )');

		}));

		this.changeHandler = (state) => 
		{
			state.power = state.value;

			this.setToCurrentBrightness(state, () => {

				if(state.value != null)
				{
					this.service.getCharacteristic(Characteristic.On).updateValue(state.value);

					super.setState(state.value, () => {});
				}

				if(state.brightness != null)
				{
					this.service.getCharacteristic(Characteristic.Brightness).updateValue(state.brightness);

					super.setBrightness(state.brightness, () => {});
				}
			});
		};
	}

	getState(callback)
	{
		super.getState((value) => {

			if(value != null)
			{
				this.power = value;
				
				this.logger.log('read', this.id, this.letters, '%read_state[0]% [' + this.name + '] %read_state[1]% [power: ' + this.power + ', brightness: ' + super.getValue('brightness') + '] ( ' + this.id + ' )');
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

	setToCurrentBrightness(state, callback)
	{
		if(state.power != null && this.power != state.power)
		{
			this.power = state.power;

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

				DeviceManager.fetchRequests({ power : this.power, brightness : this.brightness }, this).then((result) => {

					if(this.changed)
					{
						if(result == null)
						{
							this.logger.log('update', this.id, this.letters, '%update_state[0]% [' + this.name + '] %update_state[1]% [power: ' + this.power + ', brightness: ' + this.brightness + '] ( ' + this.id + ' )');
						}
	
						if(callback)
						{
							callback();
						}
					}
					else if(callback)
					{
						callback();
					}
	
					AutomationSystem.LogikEngine.runAutomation(this.id, this.letters, this.power);
					
					this.changed = false;
					this.running = false;
				});
			}
			else if(callback)
			{
				callback();
			}

		}, 100);
	}
};