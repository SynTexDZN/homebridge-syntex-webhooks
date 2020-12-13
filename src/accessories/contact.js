let Characteristic, DeviceManager;

const { ContactService } = require('homebridge-syntex-dynamic-platform');

module.exports = class SynTexOutletService extends ContactService
{
	constructor(homebridgeAccessory, deviceConfig, serviceConfig, manager)
	{
		Characteristic = manager.platform.api.hap.Characteristic;
		DeviceManager = manager.DeviceManager;
		
        super(homebridgeAccessory, deviceConfig, serviceConfig, manager);
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

    updateState(state)
	{
		if(state.value != null && this.value != state.value)
		{
			this.value = state.value;

			this.homebridgeAccessory.services[1].getCharacteristic(Characteristic.ContactSensorState).updateValue(this.value);

			this.logger.log('update', this.id, this.letters, 'HomeKit Status für [' + this.name + '] geändert zu [' + this.value + '] ( ' + this.id + ' )');
		}

		super.setValue('state', state.value);
	}
};