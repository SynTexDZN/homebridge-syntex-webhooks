var Service, Characteristic;

module.exports = class SynTexBaseAccessory
{
    constructor(accessoryConfig, Manager)
    {
        this.service = [];
        this.mac = accessoryConfig['mac'];
        this.name = accessoryConfig['name'];
        this.services = accessoryConfig['services'];

        this.version = accessoryConfig['version'] || '1.0.0';
        this.model = accessoryConfig['model'] || 'HTTP Accessory';
        this.manufacturer = accessoryConfig['manufacturer'] || 'SynTex';

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
        return this.manufacturer;
    }

    getModel()
    {
        return this.model;
    }

    getVersion()
    {
        return this.version;
    }
    
    getServices()
    {
        return this.service;
    }
}