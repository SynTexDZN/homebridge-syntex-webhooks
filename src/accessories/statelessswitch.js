let Service, Characteristic, DeviceManager, Automations;

const { StatelessSwitchService } = require('homebridge-syntex-dynamic-platform');

module.exports = class SynTexSwitchService extends StatelessSwitchService
{
	constructor(homebridgeAccessory, deviceConfig, serviceConfig, manager)
	{
		Service = manager.platform.api.hap.Service;
		Characteristic = manager.platform.api.hap.Characteristic;
		Automations = manager.Automations;
		DeviceManager = manager.DeviceManager;
		
		super(homebridgeAccessory, deviceConfig, serviceConfig, manager);
        /*
		this.changeHandler = (state) =>
		{
			if(state.value != null)
			{
				this.homebridgeAccessory.getServiceById(Service.Switch, serviceConfig.subtype).getCharacteristic(Characteristic.On).updateValue(state.value);

				this.setState(state.value, () => {});
			}
        };
        */
	}
};