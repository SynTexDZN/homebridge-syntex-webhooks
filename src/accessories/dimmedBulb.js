const { DimmedBulbService } = require('homebridge-syntex-dynamic-platform');

let DeviceManager;

module.exports = class SynTexDimmedBulbService extends DimmedBulbService
{
	constructor(homebridgeAccessory, deviceConfig, serviceConfig, manager)
	{
		DeviceManager = manager.DeviceManager;
		
		super(homebridgeAccessory, deviceConfig, serviceConfig, manager);

		super.getState((value) => super.getBrightness((brightness) => {

			this.value = value || false;
			this.brightness = brightness || 100;

			this.service.getCharacteristic(this.Characteristic.On).updateValue(this.value);
			this.service.getCharacteristic(this.Characteristic.Brightness).updateValue(this.brightness);

			this.logger.log('read', this.id, this.letters, '%read_state[0]% [' + this.name + '] %read_state[1]% [power: ' + this.value + ', brightness: ' + this.brightness + '] ( ' + this.id + ' )');
		}));

		this.changeHandler = (state) => 
		{
			this.setToCurrentBrightness(state, () => {

				if(state.value != null)
				{
					this.service.getCharacteristic(this.Characteristic.On).updateValue(state.value);

					super.setState(state.value, () => {});
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
				
				this.logger.log('read', this.id, this.letters, '%read_state[0]% [' + this.name + '] %read_state[1]% [power: ' + this.value + ', brightness: ' + super.getValue('brightness') + '] ( ' + this.id + ' )');
			}
		});
	}
	
	setState(value, callback)
	{
		this.setToCurrentBrightness({ value }, 
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
				
			callback(null, this.brightness);
		});
	}

	setBrightness(value, callback)
	{
		this.setToCurrentBrightness({ brightness : value }, 
			() => super.setBrightness(value, 
			() => callback()));
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

				DeviceManager.fetchRequests({ value : this.value, brightness : this.brightness }, this).then((result) => {

					if(this.changed && result == null)
					{
						this.logger.log('update', this.id, this.letters, '%update_state[0]% [' + this.name + '] %update_state[1]% [power: ' + this.value + ', brightness: ' + this.brightness + '] ( ' + this.id + ' )');
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