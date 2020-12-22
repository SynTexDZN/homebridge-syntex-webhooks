let Service, Characteristic, DeviceManager, Automations;

const { StatelessSwitchService } = require('homebridge-syntex-dynamic-platform');

module.exports = class SynTexStatelessSwitchService extends StatelessSwitchService
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
			for(var i = 1; i < this.service.length - 1; i++)
            {
                if(i - 1 == event)
                {
                    logger.log('update', this.mac, this.letters, '[' + buttonName + ']: Event [' + (i + 1) + '] wurde ausgeführt! ( ' + this.mac + ' )');

                    this.service[i].getCharacteristic(Characteristic.ProgrammableSwitchEvent).updateValue(value);
                }
            }
        };
        */
	}
};