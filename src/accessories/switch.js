let Service, Characteristic, DeviceManager, AutomationSystem;

const { SwitchService } = require('homebridge-syntex-dynamic-platform');

module.exports = class SynTexSwitchService extends SwitchService
{
	constructor(homebridgeAccessory, deviceConfig, serviceConfig, manager)
	{
		Service = manager.platform.api.hap.Service;
		Characteristic = manager.platform.api.hap.Characteristic;
		AutomationSystem = manager.AutomationSystem;
		DeviceManager = manager.DeviceManager;
		
		super(homebridgeAccessory, deviceConfig, serviceConfig, manager);

		super.getState((power) => {

			this.power = power || false;

		}, true);

		this.changeHandler = (state) =>
		{
			if(state.value != null)
			{
				this.service.getCharacteristic(Characteristic.On).updateValue(state.value);

				this.setState(state.value, () => {});
			}
		};
	}

	getState(callback)
	{
		super.getState((value) => {

			if(value != null)
			{
				this.power = value;
			}
				
			callback(null, value != null ? value : false);

		}, true);
	}
	
	setState(value, callback)
	{
		DeviceManager.fetchRequests({ power : value }, this).then((result) => {

			if(result == null)
			{
				this.power = value;

				super.setState(this.power, 
					() => this.logger.log('update', this.id, this.letters, '%update_state[0]% [' + this.name + '] %update_state[1]% [' + this.power + '] ( ' + this.id + ' )'));
			}

			callback(result);
		});

		if(AutomationSystem.LogikEngine.isReady())
		{
			AutomationSystem.LogikEngine.runAutomation(this.id, this.letters, value);
		}
	}
};