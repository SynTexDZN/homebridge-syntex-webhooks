let Service, Characteristic, DeviceManager, Automations;

const { MotionService } = require('homebridge-syntex-dynamic-platform');

module.exports = class SynTexMotionService extends MotionService
{
	constructor(homebridgeAccessory, deviceConfig, serviceConfig, manager)
	{
		Service = manager.platform.api.hap.Service;
		Characteristic = manager.platform.api.hap.Characteristic;
		Automations = manager.Automations;
		DeviceManager = manager.DeviceManager;
		
		super(homebridgeAccessory, deviceConfig, serviceConfig, manager);

		super.getState((value) => {

			this.value = value || false;
			
		}, true);

		this.changeHandler = (state) =>
		{
			if(state.value != null)
			{
				DeviceManager.fetchRequests({ power : state.value }, this).then((result) => {

					if(result == null)
					{
						this.value = state.value;

						this.homebridgeAccessory.getServiceById(Service.MotionSensor, serviceConfig.subtype).getCharacteristic(Characteristic.MotionDetected).updateValue(this.value);

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