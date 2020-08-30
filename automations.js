var logger, storage, automations = [], accessories = [], DeviceManager;
var request = require('request'), store = require('json-fs-store');
var eventLock = [], positiveFired = false, negativeFired = false;
var types = ['contact', 'motion', 'temperature', 'humidity', 'rain', 'light', 'occupancy', 'smoke', 'airquality', 'rgb', 'switch', 'relais', 'statelessswitch'];
var letters = ['A', 'B', 'C', 'D', 'E', 'F', '0', '1', '2', '3', '4', '5', '6'];

function letterToType(letter)
{
    return types[letters.indexOf(letter)];
}

function typeToLetter(type)
{
    return letters[types.indexOf(type)];
}

function runAutomations(mac, letters, value)
{
    for(var i = 0; i < automations.length; i++)
    {
        if(automations[i].active && !eventLock.includes(automations[i].id))
        {
            checkTrigger(automations[i], mac, letters, value.toString());
        }
    }

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

                        logger.debug('Value Unterschritten ' + automations[i].id);
                    }

                    if(automations[i].trigger[j].operation == '<' && parseFloat(value) > parseFloat(automations[i].trigger[j].value) && positiveFired)
                    {
                        eventLock.splice(index, 1);

                        logger.debug('Value Überschritten ' + automations[i].id);
                    }

                    if(automations[i].trigger[j].operation == '=' && value != automations[i].trigger[j].value)
                    {
                        eventLock.splice(index, 1);

                        logger.debug('Value Ungleich ' + automations[i].id);
                    }
                }
            }
        }
    }
}

// TODO: Multiple Triggers, Conditions, Results

async function checkTrigger(automation, mac, letters, value)
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

        if(automation.condition && automation.condition.conditions && automation.condition.conditions.length > 0)
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

    for(var i = 0; i < automation.condition.conditions.length; i++)
    {
        var value = (await DeviceManager.getDevice(automation.condition.conditions[i].mac, automation.condition.conditions[i].letters)).toString();

        if(automation.condition.conditions[i].operation == '>' && parseFloat(value) > parseFloat(automation.condition.conditions[i].value))
        {
            condition++;
        }

        if(automation.condition.conditions[i].operation == '<' && parseFloat(value) < parseFloat(automation.condition.conditions[i].value))
        {
            condition++;
        }

        if(automation.condition.conditions[i].operation == '=' && value == automation.condition.conditions[i].value)
        {
            condition++;
        }
    }

    if(condition > 0 && (automation.condition.combination == 'ONE' || (automation.condition.combination == 'ALL' && condition >= automation.condition.conditions.length)))
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
                if(accessories[j].mac == automation.result[i].mac && JSON.stringify(accessories[j].services).includes(letterToType(automation.result[i].letters[0])))
                {
                    if(letterToType(automation.result[i].letters[0]) == 'statelessswitch')
                    {
                        accessories[j].changeHandler(accessories[j].name, automation.result[i].value, 0);
                    }
                    else
                    {
                        var count = Array.isArray(accessories[j].services) ? accessories[j].services.length : 1;

                        for(var k = 1; k <= count; k++)
                        {
                            if(accessories[j].service[k].letters == automation.result[i].letters)
                            {
                                var state = null;

                                if((state = validateUpdate(automation.result[i].mac, letterToType(automation.result[i].letters[0]), automation.result[i].value)) != null)
                                {
                                    accessories[j].service[k].changeHandler(state);
                                }
                                else
                                {
                                    logger.log('error', automation.result[i].mac, automation.result[i].letters, '[' + automation.result[i].value + '] ist kein gültiger Wert! ( ' + automation.result[i].mac + ' )');
                                }

                                DeviceManager.setDevice(automation.result[i].mac, automation.result[i].letters, validateUpdate(automation.result[i].mac, letterToType(automation.result[i].letters[0]), automation.result[i].value));
                            }
                        }
                    }
                }
            }
        }

        eventLock.push(automation.id);

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

                if(!err && statusCode == 200)
                {
                    //logger.log('success', this.mac, this.name, '[' + this.name + '] hat die Anfrage zu [URL] wurde mit dem Status Code [' + statusCode + '] beendet: [' + body + ']');
                }
                else
                {
                    logger.log('error', 'bridge', 'Bridge', '[' + this.name + '] hat die Anfrage zu [' + this.url + '] wurde mit dem Status Code [' + statusCode + '] beendet: [' + body + '] ' + (err ? err : ''));
                }
                
            }.bind({ url : theRequest.url, name : automation.name })));
        }
    }

    logger.log('success', trigger.mac, trigger.letters, '[' + trigger.name + '] hat den Prozess [' + automation.name + '] ausgeführt!');
}

function loadAutomations()
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
        });
    });
}

function setAccessories(devices)
{
    accessories = devices;
}

function SETUP(log, storagePath, Manager)
{
    return new Promise(async function(resolve)
    {
        logger = log;
        storage = store(storagePath);
        DeviceManager = Manager;

        if(await loadAutomations())
        {
            logger.log('success', 'bridge', 'Bridge', 'Hintergrundprozesse wurden erfolgreich geladen und aktiviert!');
        }
        else
        {
            logger.log('error', 'bridge', 'Bridge', 'Es wurden keine Hintergrundprozesse geladen!');
        }

        resolve();
    });
}

module.exports = {
    SETUP,
    setAccessories,
    runAutomations
};

function validateUpdate(mac, type, state)
{
    if(type === 'motion' || type === 'rain' || type === 'smoke' || type === 'occupancy' || type === 'contact' || type == 'switch' || type == 'relais')
    {
        if(state != true && state != false && state != 'true' && state != 'false')
        {
            logger.log('warn', mac, '', 'Konvertierungsfehler: [' + state + '] ist keine boolsche Variable! ( ' + mac + ' )');

            return null;
        }

        return (state == 'true' || state == true ? true : false);
    }
    else if(type === 'light' || type === 'temperature')
    {
        if(isNaN(state))
        {
            logger.log('warn', mac, '', 'Konvertierungsfehler: [' + state + '] ist keine numerische Variable! ( ' + mac + ' )');
        }

        return !isNaN(state) ? parseFloat(state) : null;
    }
    else if(type === 'humidity' || type === 'airquality')
    {
        if(isNaN(state))
        {
            logger.log('warn', mac, '', 'Konvertierungsfehler: [' + state + '] ist keine numerische Variable! ( ' + mac + ' )');
        }

        return !isNaN(state) ? parseInt(state) : null;
    }
    else
    {
        return state;
    }
}