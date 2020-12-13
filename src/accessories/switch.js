let Service, Characteristic, DeviceManager, Automations;

const { SwitchService } = require('homebridge-syntex-dynamic-platform');

module.exports = class SynTexOutletService extends SwitchService
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
                this.homebridgeAccessory.getServiceById(Service.Switch, serviceConfig.subtype).getCharacteristic(Characteristic.On).updateValue(state.value);

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
        this.power = value;

        if(Automations.isReady())
        {
            Automations.runAutomations(this.id, this.letters, this.power);
        }
        
        DeviceManager.fetchRequests(this).then((result) => {

            if(result == null)
            {
                super.setState(value, 
                    () => this.logger.log('update', this.id, this.letters, 'HomeKit Status für [' + this.name + '] geändert zu [' + this.power + '] ( ' + this.id + ' )'));
            }

            callback(result);
        });
    }
};