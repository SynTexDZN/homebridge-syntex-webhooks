let TypeManager = require('./type-manager');
const request = require('request'), store = require('json-fs-store');
var logger, storage, automations = [], accessories = [], DeviceManager;
var eventLock = [], positiveFired = false, negativeFired = false, ready = false;

module.exports = class Automations
{
    constructor(log, storagePath, Manager)
    {
        logger = log;
        storage = store(storagePath);
        DeviceManager = Manager;

        TypeManager = new TypeManager();
    }

    setAccessories(devices)
    {
        accessories = devices;
    }

    loadAutomations()
    {
        return new Promise(resolve => {
            
            storage.load('automations', (err, obj) => {  

                if(!obj || err)
                {
                    resolve(false);
                }
                else
                {
                    automations = obj.automations;

                    resolve(true);
                }

                ready = true;
            });
        });
    }

    runAutomations(mac, letters, value)
    {
        for(var i = 0; i < automations.length; i++)
        {
            if(eventLock.includes(automations[i].id))
            {
                for(var j = 0; j < automations[i].trigger.length; j++)
                {
                    if(automations[i].trigger[j].mac == mac && automations[i].trigger[j].letters == letters)
                    {
                        var index = eventLock.indexOf(automations[i].id);

                        if(automations[i].trigger[j].operation == '>' && parseFloat(value) < parseFloat(automations[i].trigger[j].value) && negativeFired)
                        {
                            eventLock.splice(index, 1);

                            logger.debug('Automation [' + automations[i].name + '] Unterschritten ' + automations[i].id);
                        }

                        if(automations[i].trigger[j].operation == '<' && parseFloat(value) > parseFloat(automations[i].trigger[j].value) && positiveFired)
                        {
                            eventLock.splice(index, 1);

                            logger.debug('Automation [' + automations[i].name + '] Überschritten ' + automations[i].id);
                        }

                        if(automations[i].trigger[j].operation == '=' && value != automations[i].trigger[j].value)
                        {
                            eventLock.splice(index, 1);

                            logger.debug('Automation [' + automations[i].name + '] Ungleich ' + automations[i].id);
                        }
                    }
                }
            }
        }

        for(var i = 0; i < automations.length; i++)
        {
            if(automations[i].active && !eventLock.includes(automations[i].id))
            {
                checkTrigger(automations[i], mac, letters, value.toString());
            }
        }
    }

    isReady()
    {
        return ready;
    }
};

function checkTrigger(automation, mac, letters, value)
{
    var trigger = null;

    for(var i = 0; i < automation.trigger.length; i++)
    {
        if(automation.trigger[i].mac == mac && automation.trigger[i].letters == letters)
        {
            if(automation.trigger[i].operation == '>' && parseFloat(value) > parseFloat(automation.trigger[i].value))
            {
                trigger = automation.trigger[i];
            }

            if(automation.trigger[i].operation == '<' && parseFloat(value) < parseFloat(automation.trigger[i].value))
            {
                trigger = automation.trigger[i];
            }

            if(automation.trigger[i].operation == '=' && value == automation.trigger[i].value)
            {
                trigger = automation.trigger[i];
            }
        }
    }

    if(trigger != null)
    {
        logger.debug('Trigger Ausgelöst');

        if(automation.condition && automation.condition.length > 0)
        {
            checkCondition(automation, trigger);
        }
        else
        {
            executeResult(automation, trigger);
        }
    }
}

async function checkCondition(automation, trigger)
{
    var condition = 0;

    for(var i = 0; i < automation.condition.length; i++)
    {
        var value = (await DeviceManager.getDevice(automation.condition[i].mac, automation.condition[i].letters)).toString();

        if(automation.condition[i].operation == '>' && parseFloat(value) > parseFloat(automation.condition[i].value))
        {
            condition++;
        }

        if(automation.condition[i].operation == '<' && parseFloat(value) < parseFloat(automation.condition[i].value))
        {
            condition++;
        }

        if(automation.condition[i].operation == '=' && value == automation.condition[i].value)
        {
            condition++;
        }
    }

    if(condition > 0 && ((!automation.combination || automation.combination == 'ALL') && condition >= automation.condition.length) || automation.condition.combination == 'ONE')
    {
        logger.debug('Condition Erfüllt');

        executeResult(automation, trigger);
    }
}

function executeResult(automation, trigger)
{
    for(var i = 0; i < automation.result.length; i++)
    {
        var url = '';

        if(automation.result[i].url)
        {
            url = automation.result[i].url;
        }
        
        if(automation.result[i].mac && automation.result[i].letters && automation.result[i].value && automation.result[i].name)
        {
            for(var j = 0; j < accessories.length; j++)
            {
                if(accessories[j].mac == automation.result[i].mac && JSON.stringify(accessories[j].services).includes(TypeManager.letterToType(automation.result[i].letters[0])))
                {
                    if(TypeManager.letterToType(automation.result[i].letters[0]) == 'statelessswitch')
                    {
                        accessories[j].changeHandler(accessories[j].name, automation.result[i].value, 0);
                    }
                    else
                    {
                        var count = Array.isArray(accessories[j].services) ? accessories[j].services.length : 1;

                        for(var k = 1; k <= count; k++)
                        {
                            if(accessories[j].service[k] != null)
                            {
                                if(accessories[j].service[k].letters == automation.result[i].letters)
                                {
                                    var state = null;

                                    if((state = TypeManager.validateUpdate(automation.result[i].mac, automation.result[i].letters, automation.result[i].value)) != null)
                                    {
                                        accessories[j].service[k].changeHandler(state);
                                    }
                                    else
                                    {
                                        logger.log('error', automation.result[i].mac, automation.result[i].letters, '[' + automation.result[i].value + '] ist kein gültiger Wert! ( ' + automation.result[i].mac + ' )');
                                    }

                                    DeviceManager.setDevice(automation.result[i].mac, automation.result[i].letters, TypeManager.validateUpdate(automation.result[i].mac, automation.result[i].letters, automation.result[i].value));
                                }
                            }
                        }
                    }
                }
            }
        }

        if(!eventLock.includes(automation.id))
        {
            eventLock.push(automation.id);
        }

        if(trigger.operation == '<')
        {
            negativeFired = true;
            positiveFired = false;
        }
        else if(trigger.operation == '>')
        {
            positiveFired = true;
            negativeFired = false;
        }

        if(url != '')
        {
            var theRequest = {
                method : 'GET',
                url : url,
                timeout : 10000
            };

            request(theRequest, (function(err, response, body)
            {
                var statusCode = response && response.statusCode ? response.statusCode : -1;

                if(err || statusCode != 200)
                {
                    logger.log('error', 'bridge', 'Bridge', '[' + this.name + '] hat die Anfrage zu [' + this.url + '] mit dem Status Code [' + statusCode + '] beendet: [' + (body || '') + '] ' + (err ? err : ''));
                }
                
            }.bind({ url : theRequest.url, name : automation.name })));
        }
    }

    logger.log('success', trigger.mac, trigger.letters, '[' + trigger.name + '] hat den Prozess [' + automation.name + '] ausgeführt!');
}