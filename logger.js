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

        var color = "";

        if(level == 'success')
        {
            color = '[' + prefix + '] \x1b[32m%s\x1b[0m';
        }
        else if(level == 'update')
        {
            color = '[' + prefix + '] \x1b[36m%s\x1b[0m';
        }
        else if(level == 'read')
        {
            color = '[' + prefix + '] \x0b[36m%s\x1b[0m';
        }
        else if(level == 'info')
        {
            color = '[' + prefix + '] \x1b[33m%s\x1b[0m';
        }
        else if(level == 'warn')
        {
            color = '[' + prefix + '] \x0b[33m%s\x1b[0m';
        }
        else
        {
            color = '[' + prefix + '] \x1b[31m%s\x1b[0m';
        }

        var d = new Date();
        var time = ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2) + ":" + ("0" + d.getSeconds()).slice(-2);

        console.log(color, "[" + level.toUpperCase() + "]", message);
        saveLog(time + " > [" + level.toUpperCase() + "] " + message);
    }
}

var inWork = false;
var que = [];

function saveLog(log)
{
    if(inWork)
    {
        if(!que.includes(log))
        {
            que.push(log);
        }
    }
    else
    {
        inWork = true;

        if(que.includes(log))
        {
            que.shift();
        }

        var d = new Date();

        var date = d.getDate() + "." + (d.getMonth() + 1) + "." + d.getFullYear();

        logs.load(date, (err, device) => {    

            if(device && !err)
            {    
                device.logs[device.logs.length] = log;

                logs.add(device, (err) => {

                    inWork = false;

                    if(err)
                    {
                        logger.log('error', date + ".json konnte nicht aktualisiert werden!" + err);
                    }

                    if(que.length != 0)
                    {
                        saveLog(que[0]);
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

                    inWork = false;

                    if(err)
                    {
                        logger.log('error', date + ".json konnte nicht aktualisiert werden!" + err);
                    }

                    if(que.length != 0)
                    {
                        saveLog(que[0]);
                    }
                });
            }
        });
    }
}