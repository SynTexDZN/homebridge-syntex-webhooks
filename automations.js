var logger, storage, automations = [], DeviceManager;
var request = require('request'), store = require('json-fs-store');
var eventLock = [];

function runAutomations(mac, type, letters, value)
{
    for(var i = 0; i < automations.length; i++)
    {
        if(automations[i].active && !eventLock.includes(automations[i].id))
        {
            checkTrigger(automations[i], mac, type, letters, value.toString());
        }
        else if(eventLock.includes(automations[i].id))
        {
            for(var j = 0; j < automations[i].trigger.length; j++)
            {
                if(automations[i].trigger[j].mac == mac && automations[i].trigger[j].type == type && automations[i].trigger[j].letters == letters)
                {
                    var index = eventLock.indexOf(automations[i].id);

                    if(automations[i].trigger[j].operation == '>' && value > automations[i].trigger[j].value)
                    {
                        eventLock.splice(index, 1);

                        logger.debug('Value Unterschritten');
                    }

                    if(automations[i].trigger[j].operation == '<' && value < automations[i].trigger[j].value)
                    {
                        eventLock.splice(index, 1);

                        logger.debug('Value Überschritten');
                    }

                    if(automations[i].trigger[j].operation == '=' && value != automations[i].trigger[j].value)
                    {
                        eventLock.splice(index, 1);

                        logger.debug('Value Ungleich');
                    }
                }
            }
        }
    }
}

// TODO: Multiple Triggers, Conditions, Results

async function checkTrigger(automation, mac, type, letters, value)
{
    var trigger = false;

    for(var i = 0; i < automation.trigger.length; i++)
    {
        if(automation.trigger[i].mac == mac && automation.trigger[i].type == type && automation.trigger[i].letters == letters)
        {
            if(automation.trigger[i].operation == '>' && parseFloat(value) > parseFloat(automation.trigger[i].value))
            {
                trigger = true;
            }

            if(automation.trigger[i].operation == '<' && parseFloat(value) < parseFloat(automation.trigger[i].value))
            {
                trigger = true;
            }

            if(automation.trigger[i].operation == '=' && value == automation.trigger[i].value)
            {
                trigger = true;
            }
        }
    }

    if(trigger)
    {
        if(automation.condition && automation.condition.conditions && automation.condition.conditions.length > 0)
        {
            checkCondition(automation);
        }
        else
        {
            executeResult(automation);
        }

        logger.debug('Trigger Ausgelöst');
    }
}

async function checkCondition(automation)
{
    var condition = 0;

    for(var i = 0; i < automation.condition.conditions.length; i++)
    {
        var value = (await DeviceManager.getDevice(automation.condition.conditions[i].mac, automation.condition.conditions[i].type, automation.condition.conditions[i].letters)).toString();

        if(automation.condition.conditions[i].operation == '>' && value > automation.condition.conditions[i].value)
        {
            condition++;
        }

        if(automation.condition.conditions[i].operation == '<' && value < automation.condition.conditions[i].value)
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
        executeResult(automation);

        logger.debug('Condition Erfüllt');
    }
}

function executeResult(automation)
{
    for(var i = 0; i < automation.result.length; i++)
    {
        var url = '';

        if(automation.result[i].url)
        {
            url = automation.result[i].url;
        }
        
        if(automation.result[i].mac && automation.result[i].type && automation.result[i].letters && automation.result[i].value && automation.result[i].name)
        {
            DeviceManager.setDevice(automation.result[i].mac, automation.result[i].type, automation.result[i].letters, automation.result[i].value);

            logger.log('update', automation.result[i].mac, automation.result[i].name, 'HomeKit Status für [' + automation.result[i].name + '] geändert zu [' + automation.result[i].value + '] ( ' + automation.result[i].mac + ' )');
        }

        eventLock.push(automation.id);

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

    logger.log('success', 'bridge', 'Bridge', 'Der Prozess [' + automation.name + '] wurde ausgeführt!');
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
                automations = obj;

                resolve(true);
            }
        });
    });
}

async function SETUP(log, storagePath, Manager)
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
}

module.exports = {
    SETUP,
    runAutomations
};