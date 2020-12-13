let Service, Characteristic, DeviceManager, Automations;

const { LightBulbService } = require('homebridge-syntex-dynamic-platform');

module.exports = class SynTexOutletService extends LightBulbService
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
				this.power = state.value;

                this.homebridgeAccessory.getServiceById(Service.Lightbulb, serviceConfig.subtype).getCharacteristic(Characteristic.On).updateValue(this.power);

                this.logger.log('update', this.id, this.letters, 'HomeKit Status für [' + this.name + '] geändert zu [' + this.power + '] ( ' + this.id + ' )');
            
                super.setValue('state', this.power);

                if(Automations.isReady())
                {
                    Automations.runAutomations(this.id, this.letters, this.power);
                }

                DeviceManager.fetchRequests(this);
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
        this.power = value;

        super.setState(value, () => {});

        if(Automations.isReady())
        {
            Automations.runAutomations(this.id, this.letters, this.power);
        }
        
        DeviceManager.fetchRequests(this).then((result) => {

            if(result == null)
            {
                this.logger.log('update', this.id, this.letters, 'HomeKit Status für [' + this.name + '] geändert zu [' + this.power + '] ( ' + this.id + ' )');
            }

            callback(result);
        });
    }
};