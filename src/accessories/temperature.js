let Service, Characteristic, DeviceManager, Automations;

const { TemperatureService } = require('homebridge-syntex-dynamic-platform');

module.exports = class SynTexTemperatureService extends TemperatureService
{
	constructor(homebridgeAccessory, deviceConfig, serviceConfig, manager)
	{
		Service = manager.platform.api.hap.Service;
		Characteristic = manager.platform.api.hap.Characteristic;
		Automations = manager.Automations;
		DeviceManager = manager.DeviceManager;
		
		super(homebridgeAccessory, deviceConfig, serviceConfig, manager);

		super.getState((value) => {

			this.value = value || 0;

		}, true);

		this.changeHandler = (state) =>
		{
			if(state.value != null)
			{
				this.value = state.value;

				this.homebridgeAccessory.getServiceById(Service.TemperatureSensor, serviceConfig.subtype).getCharacteristic(Characteristic.CurrentTemperature).updateValue(this.value);

				super.setValue('state', this.value, true);
			
				if(Automations.isReady())
				{
					Automations.runAutomations(this.id, this.letters, this.value);
				}
			}
		};
	}

	getState(callback)
	{
		super.getState((value) => {

			if(value != null)
			{
				this.value = value;
			}
				
			callback(null, value != null ? value : 0);

		}, true);
	}
};