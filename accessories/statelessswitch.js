var Service, Characteristic, logger;

module.exports = class Statelessswitch
{
    constructor(accessoryConfig, Manager)
    {
        super(accessoryConfig, Manager);

        Service = Manager.Service;
        Characteristic = Manager.Characteristic;
        logger = Manager.logger;

        this.buttons =  accessoryConfig['buttons'] || 0;
        this.letters = '60';

        for(var i = 0; i < this.buttons; i++)
        {
            var button = new Service.StatelessProgrammableSwitch(this.mac + i, '' + i);
            var props = {
                minValue : Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS,
                maxValue : Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS
            };

            button.getCharacteristic(Characteristic.ProgrammableSwitchEvent).setProps(props);
            button.getCharacteristic(Characteristic.ServiceLabelIndex).setValue(i + 1);

            this.service.push(button);
        }

        this.changeHandler = (function(buttonName, event, value)
        {
            for(var i = 1; i < this.service.length - 1; i++)
            {
                if(i - 1 == event)
                {
                    logger.log('update', this.mac, this.letters, '[' + buttonName + ']: Event [' + (i + 1) + '] wurde ausgeführt! ( ' + this.mac + ' )');

                    this.service[i].getCharacteristic(Characteristic.ProgrammableSwitchEvent).updateValue(value);
                }
            }

        }).bind(this);
    }
}