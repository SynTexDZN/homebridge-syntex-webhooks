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
        else
        {
            color = '\x1b[31m';
        }

        var d = new Date();
        var time = ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2) + ":" + ("0" + d.getSeconds()).slice(-2);

        console.log('[' + prefix + '] ' + color + '[' + level.toUpperCase() + '] \x1b[0m' + message);
        saveLog(time + " > [" + level.toUpperCase() + "] " + message);
    }
}

logger.err = function(error)
{
    var s = (error.stack.split('\n')[1].split('\n')[0].match(/\//g) || []).length;
    logger.log('error', 'Code Fehler: ' + error.message + " ( '" + error.stack.split('\n')[1].split('\n')[0].split('/')[s].split(':')[0] + "' bei Zeile '" + error.stack.split('\n')[1].split('\n')[0].split('/')[s].split(':')[1] + "' )");
}

logger.find = function(pluginName, date, param)
{
    return new Promise(resolve => {

        getLogPath(pluginName).then(function(res) {

            if(res != null)
            {
                store(res).load(date, (err, obj) => {    

                    if(obj && !err)
                    {    
                        var logs = [];

                        for(var i = 1; i < obj.logs.length + 1; i++)
                        {
                            if(obj.logs[obj.logs.length - i].includes(param))
                            {
                                logs[logs.length] = obj.logs[obj.logs.length - i];
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
                    }
        
                    if(err || !obj)
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
    });
}

logger.load = function(pluginName, date)
{
    return new Promise(resolve => {
        
        getLogPath(pluginName).then(function(res) {

            if(res != null)
            {
                store(res).load(date, (err, obj) => {    

                    if(obj && !err)
                    {    
                        resolve(obj);
                    }
        
                    if(err || !obj)
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
    });
}

async function getLogPath(pluginName)
{
    return new Promise(resolve => {
        
        conf.load('config', (err, obj) => {    

            if(obj && !err)
            {                            
                obj.id = 'config';

                for(const i in obj.platforms)
                {
                    if(obj.platforms[i].platform === pluginName)
                    {
                        resolve(obj.platforms[i].log_directory);
                    }
                }

                resolve(null);
            }

            if(err || !obj)
            {
                resolve(null);
            }
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

        var d = new Date();

        var date = d.getDate() + "." + (d.getMonth() + 1) + "." + d.getFullYear();

        logger.logs.load(date, (err, device) => {    

            if(device && !err)
            {    
                device.logs[device.logs.length] = log;

                logger.logs.add(device, (err) => {

                    inWork = false;

                    if(err)
                    {
                        logger.log('error', date + ".json konnte nicht aktualisiert werden! " + err);
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

                logger.logs.add(entry, (err) => {

                    inWork = false;

                    if(err)
                    {
                        logger.log('error', date + ".json konnte nicht aktualisiert werden! " + err);
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