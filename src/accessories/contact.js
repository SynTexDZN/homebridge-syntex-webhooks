let Service, Characteristic;

const { ContactService } = require('homebridge-syntex-dynamic-platform');

module.exports = class SynTexOutletService extends ContactService
{
	constructor(homebridgeAccessory, deviceConfig, serviceConfig, manager)
	{
        Service = manager.platform.api.hap.Service;
		Characteristic = manager.platform.api.hap.Characteristic;
		
        super(homebridgeAccessory, deviceConfig, serviceConfig, manager);

        this.changeHandler = (state) =>
		{
			if(state.value != null)
			{
				this.value = state.value;

                this.homebridgeAccessory.getServiceById(Service.ContactSensor, serviceConfig.subtype).getCharacteristic(Characteristic.ContactSensorState).updateValue(this.value);

                this.logger.log('update', this.id, this.letters, 'HomeKit Status für [' + this.name + '] geändert zu [' + this.value + '] ( ' + this.id + ' )');
            
                super.setValue('state', this.value);
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