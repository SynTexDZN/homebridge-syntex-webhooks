var logger = exports, prefix;
var store = require('json-fs-store');
var logs;
logger.debugLevel = 'success';

logger.create = function(pluginName, logDirectory)
{
    prefix = pluginName;
    logs = store(logDirectory);
};

logger.log = function(level, message)
{
    var levels = ['success', 'update', 'read', 'info', 'warn', 'error'];

    if(levels.indexOf(level) >= levels.indexOf(logger.debugLevel))
    {
        if(typeof message !== 'string')
        {
            message = JSON.stringify(message);
        };

        var log = "";

        if(level == 'success')
        {
            log = '[' + prefix + '] \x1b[32m%s\x1b[0m', "[SUCCESS]", message;
        }
        else if(level == 'update')
        {
            log = '[' + prefix + '] \x1b[36m%s\x1b[0m', "[UPDATE]", message;
        }
        else if(level == 'read')
        {
            log = '[' + prefix + '] \x0b[36m%s\x1b[0m', "[READ]", message;
        }
        else if(level == 'info')
        {
            log = '[' + prefix + '] \x1b[33m%s\x1b[0m', "[INFO]", message;
        }
        else if(level == 'warn')
        {
            log = '[' + prefix + '] \x0b[33m%s\x1b[0m', "[WARN]", message;
        }
        else
        {
            log = '[' + prefix + '] \x1b[31m%s\x1b[0m', "[ERROR]", message;
        }

        console.log(log);
        saveLog(log);
    }
}

function saveLog(log)
{
    var d = new Date();

    var date = d.getDate() + "." + d.getMonth() + "." + d.getFullYear();

    logs.load(date, (err, device) => {    

        if(device && !err)
        {    
            device.logs[device.logs.size()] = log;

            logs.add(device, (err) => {

                if(err)
                {
                    logger.log('error', date + ".json konnte nicht aktualisiert werden!" + err);
                    resolve(false);
                }
                else
                {
                    resolve(true);
                }
            });
        }

        if(err || !device)
        {
            var entry = {
                id: date,
                logs: [
                    log
                ]
            };

            logs.add(entry, (err) => {

                if(err)
                {
                    logger.log('error', date + ".json konnte nicht aktualisiert werden!" + err);
                    resolve(false);
                }
                else
                {
                    resolve(true);
                }
            });
        }
    });
}