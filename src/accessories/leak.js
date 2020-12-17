let Service, Characteristic, DeviceManager, Automations;

const { LeakService } = require('homebridge-syntex-dynamic-platform');

module.exports = class SynTexLeakService extends LeakService
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
				DeviceManager.fetchRequests({ power : state.value }, this).then((result) => {

					if(result == null)
					{
						this.value = state.value;

						this.homebridgeAccessory.getServiceById(Service.LeakSensor, serviceConfig.subtype).getCharacteristic(Characteristic.LeakDetected).updateValue(this.value);

						super.setValue('state', this.value, true);
					}
				});

				if(Automations.isReady())
				{
					Automations.runAutomations(this.id, this.letters, state.value);
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
				
			callback(null, value != null ? value : false);

		}, true);
	}
};