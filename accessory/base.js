var Service, Characteristic;

module.exports = class SynTexBaseAccessory
{
    constructor(accessoryConfig, Manager)
    {
        this.service = [];
        this.mac = accessoryConfig['mac'];
        this.name = accessoryConfig['name'];
        this.services = accessoryConfig['services'];

        Service = Manager.Service;
        Characteristic = Manager.Characteristic;

        this.service.push(this.getInformationService());
    }

    getInformationService()
	{
		var informationService = new Service.AccessoryInformation();

        informationService
            .setCharacteristic(Characteristic.SerialNumber, this.getID())
            .setCharacteristic(Characteristic.Manufacturer, this.getManufacturer())
            .setCharacteristic(Characteristic.Model, this.getModel())
            .setCharacteristic(Characteristic.FirmwareRevision, this.getVersion());

		return informationService;
    }

    getID()
    {
        return this.mac;
    }

    getManufacturer()
    {
        return 'SynTex';
    }

    getModel()
    {
        throw new Error('Die getModel() Methode muss überschrieben werden!');
    }

    getVersion()
    {
        throw new Error('Die getVersion() Methode muss überschrieben werden!');
    }
    
    getServices()
    {
        return this.service;
    }
}