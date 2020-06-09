var logger = exports, prefix;
var store = require('json-fs-store');
var conf;
logger.logs;
logger.debugLevel = 'success';

logger.create = function(pluginName, logDirectory, config)
{
    prefix = pluginName;
    conf = store(config);
    logger.logs = store(logDirectory);
};

logger.log = function(level, message)
{
    var levels = ['success', 'update', 'read', 'info', 'warn', 'error', 'debug'];

    if(levels.indexOf(level) >= levels.indexOf(logger.debugLevel))
    {
        if(typeof message !== 'string')
        {
            message = JSON.stringify(message);
        };

        var color = '';

        if(level == 'success')
        {
            color = '\x1b[92m';
        }
        else if(level == 'update')
        {
            color = '\x1b[96m';
        }
        else if(level == 'read')
        {
            color = '\x1b[36m';
        }
        else if(level == 'info')
        {
            color = '\x1b[93m';
        }
        else if(level == 'warn')
        {
            color = '\x1b[93m';
        }
        else if(level == 'debug')
        {
            color = '\x1b[35m';
        }
        else
        {
            color = '\x1b[31m';
        }

        var d = new Date();
        var time = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + ':' + ('0' + d.getSeconds()).slice(-2);
        var weekDays = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

        console.log('[' + prefix + '] ' + color + '[' + level.toUpperCase() + '] \x1b[0m' + message);
        saveLog(weekDays[d.getDay()] + ' ' + time + ' > [' + level.toUpperCase() + '] ' + message);
    }
}

logger.err = function(error)
{
    var s = (error.stack.split('\n')[1].split('\n')[0].match(/\//g) || []).length;
    logger.log('error', 'Code Fehler: ' + error.message + " ( '" + error.stack.split('\n')[1].split('\n')[0].split('/')[s].split(':')[0] + "' bei Zeile '" + error.stack.split('\n')[1].split('\n')[0].split('/')[s].split(':')[1] + "' )");
}

logger.find = function(pluginName, param)
{
    return new Promise(async function(resolve) {

        var logPath = await getLogPath(pluginName);

        if(logPath != null)
        {
            store(logPath).load(prefix, (err, obj) => {    

                var logs = [];

                if(obj && !err)
                {    
                    for(var i = 1; i < obj.logs.length + 1; i++)
                    {
                        if(obj.logs[obj.logs.length - i].includes(param))
                        {
                            logs[logs.length] = obj.logs[obj.logs.length - i];
                        }
                    }
                }

                if(logs[0] != null)
                {
                    resolve(logs);
                }
                else
                {
                    resolve(null);
                }
            });
        }
        else
        {
            resolve(null);
        }
    });
}

logger.load = function(pluginName)
{
    return new Promise(async function(resolve) {
        
        var logPath = await getLogPath(pluginName);

        if(logPath != null)
        {
            store(logPath).load(pluginName, (err, obj) => {    

                if(obj && !err)
                {    
                    resolve(obj);
                }
                else
                {
                    resolve(null);
                }
            });
        }
        else
        {
            resolve(null);
        }
    });
}

function getLogPath(pluginName)
{
    return new Promise(resolve => {
        
        conf.load('config', (err, obj) => {    

            if(obj && !err)
            {                            
                for(const i in obj.platforms)
                {
                    if(obj.platforms[i].platform === pluginName)
                    {
                        resolve(obj.platforms[i].log_directory);
                    }
                }
            }

            resolve(null);
        });
    });
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

        logger.logs.load(prefix, (err, device) => {    

            if(device && !err)
            {    
                device.logs[device.logs.length] = log;

                logger.logs.add(device, async function(err) {

                    await removeExpired();

                    inWork = false;

                    if(err)
                    {
                        logger.log('error', prefix + '.json konnte nicht aktualisiert werden! ' + err);
                    }

                    if(que.length != 0)
                    {
                        saveLog(que[0]);
                    }
                });
            }
            else
            {
                var entry = {
                    id: prefix,
                    logs: [
                        log
                    ]
                };

                logger.logs.add(entry, (err) => {

                    inWork = false;

                    if(err)
                    {
                        logger.log('error', prefix + '.json konnte nicht aktualisiert werden! ' + err);
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

function removeExpired()
{
    return new Promise(async function(resolve) {
        
        var logPath = await getLogPath(prefix);

        if(logPath != null)
        {
            store(logPath).load(prefix, (err, obj) => {    

                if(obj && !err)
                {    
                    for(var i = 1; i < obj.logs.length + 1; i++)
                    {
                        var weekDays = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
                        var time = obj.logs[obj.logs.length - i].split(' >')[0];
                        var lastWeekDay = weekDays.indexOf(new Date().getDay()) - 1;

                        if(lastWeekDay < 0)
                        {
                            lastWeekDay = 6;
                        }

                        if(time.split(' ')[0] == weekDays[lastWeekDay] && new Date() - new Date().setHours(time.split(':')[0], time.split(':')[1], time.split(':')[2]) > 0)
                        {
                            obj.logs.splice(obj.logs.indexOf(obj.logs[obj.logs.length - i]), 1);
                        }
                        else if(time.split(' ')[0] != weekDays[new Date().getDay()])
                        {
                            obj.logs.splice(obj.logs.indexOf(obj.logs[obj.logs.length - i]), 1);
                        }

                        resolve(true);
                    }
                }
                else
                {
                    resolve(false);
                }
            });
        }
        else
        {
            resolve(false);
        }
    });
}