var logger, storage, automations = [], DeviceManager, Devices;
var request = require('request'), store = require('json-fs-store');;

function runAutomations(mac, value)
{
    logger.debug(mac + ' ' + value);

    for(var i = 0; i < automations.length; i++)
    {
        if(automations[i].active && automations[i].trigger.triggers)
        {
            checkTrigger(automations[i], mac, value);
            logger.debug(automations[i]);
        }
    }
}

// TODO: Multiple Triggers, Conditions, Results

async function checkTrigger(automation, mac, value)
{
    var trigger = false;

    for(var i = 0; i < automation.trigger.triggers.length; i++)
    {
        if(automation.trigger.triggers[i].mac == mac)
        {
            //var value = await DeviceManager.getDevice(automation.trigger.triggers[i].mac, automation.trigger.triggers[i].type, automation.trigger.triggers[i].counter);



            if(automation.trigger.triggers[i].operation == '>' && value > automation.trigger.triggers[i].value)
            {
                trigger = true;
            }

            if(automation.trigger.triggers[i].operation == '<' && value < automation.trigger.triggers[i].value)
            {
                trigger = true;
            }

            if(automation.trigger.triggers[i].operation == '=' && value == automation.trigger.triggers[i].value)
            {
                trigger = true;
            }
        }
    }

    if(trigger)
    {
        if(automations.condition && automations.condition.conditions && automation.condition.conditions.length > 0)
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
        var value = await DeviceManager.getDevice(automation.condition.conditions[i].mac, automation.condition.conditions[i].type, automation.condition.conditions[i].counter);

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

    if(condition > 0 && (automation.condition.conditions[i].combination == 'ONE' || (automation.condition.conditions[i].combination == 'ALL' && trigger >= automation.condition.conditions.length)))
    {
        if(automations.checkCondition && automation.trigger.length > 0)
        {
            checkCondition(automation);
        }
        else
        {
            executeResult(automation);
        }
    }
}

function executeResult(automation)
{
    for(var i = 0; i < automation.result.results.length; i++)
    {
        DeviceManager.setDevice(automation.result.results[i].mac, automation.result.results[i].type, automation.result.results[i].counter, automation.result.results[i].value);

        if(automation.result.results[i].type == 'relais')
        {
            for(var j = 0; j < Devices.length; j++)
            {
                if(Devices[j].mac == automation.result.results[i].mac && Devices[j].type == automation.result.results[i].type)
                {
                    var theRequest = {
                        method : 'GET',
                        url : automation.result.results[i].value ? Devices[j].on_url : Devices[j].off_url,
                        timeout : 10000
                    };
                
                    request(theRequest, (function(err, response, body)
                    {
                        var statusCode = response && response.statusCode ? response.statusCode : -1;
                
                        if(!err && statusCode == 200)
                        {
                            logger.log('success', automation.result.results[i].mac, automation.result.results[i].name, '[' + automation.result.results[i].name + '] hat die Anfrage zu [URL] wurde mit dem Status Code [' + statusCode + '] beendet: [' + body + ']');
                        }
                        else
                        {
                            logger.log('error', automation.result.results[i].mac, automation.result.results[i].name, '[' + automation.result.results[i].name + '] hat die Anfrage zu [URL] wurde mit dem Status Code [' + statusCode + '] beendet: [' + body + '] ' + (err ? err : ''));
                        }
                    }));
                }
            }
        }
    }
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

async function SETUP(log, storagePath, Manager, Config)
{
    logger = log;
    storage = store(storagePath);
    DeviceManager = Manager;

    for(const i in Config.platforms)
    {
        if(Config.platforms[i].platform === 'SynTexWebHooks')
        {
            Devices = Config.platforms[i].accessories;
        }
    }

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