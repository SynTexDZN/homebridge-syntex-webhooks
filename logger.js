const store = require('json-fs-store');
var prefix, logs, que = [], debugLevel = 'success', inWork = false;

module.exports = class Logger
{
    constructor(pluginName, logDirectory, configDirectory)
    {
        prefix = pluginName;
        logs = store(logDirectory);
    }

    log(level, mac, letters, message)
    {
        var levels = ['success', 'update', 'read', 'info', 'warn', 'error', 'debug'];

        if(levels.indexOf(level) >= levels.indexOf(debugLevel))
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

            console.log('[' + prefix + '] ' + color + '[' + level.toUpperCase() + '] \x1b[0m' + message);

            saveLog(level[0].toUpperCase() + level.substring(1), mac, letters, Math.round(new Date().getTime() / 1000), message);
        }
    }

    err(error)
    {
        var s = (error.stack.split('\n')[1].split('\n')[0].match(/\//g) || []).length;
        console.log(error);
        this.log('error', 'bridge', 'Bridge', 'Code Fehler: ' + error.message + ' ( [' + error.stack.split('\n')[1].split('\n')[0].split('/')[s].split(':')[0] + '] bei Zeile [' + error.stack.split('\n')[1].split('\n')[0].split('/')[s].split(':')[1] + '] )');
    }

    debug(message)
    {
        this.log('debug', 'bridge', 'Bridge', message);
    }

    load(pluginName, group)
    {
        return new Promise(async function(resolve) {
            
            logs.load(pluginName, (err, obj) => {    

                if(obj && !err)
                {    
                    var logs = [];

                    for(const i in obj)
                    {
                        if(i != 'id' && (group == null || group == i))
                        {
                            logs.push(obj[i]);
                        }
                    }

                    resolve(logs);
                }
                else
                {
                    resolve(null);
                }
            });
        });
    }

    list()
    {
        return new Promise(async function(resolve) {

            logs.list(function(err, objects)
            {
                if(!objects || err)
                {
                    resolve([]);
                }
                else
                {
                    resolve(objects);
                }
            });
        });
    }
}

async function saveLog(level, mac, letters, time, message)
{
    var queOBJ = { mac : mac, letters : letters, time : time, level : level, message : message };

    if(inWork)
    {
        if(!que.some(element => element.time == time && element.message == message))
        {
            que.push(queOBJ);
        }
    }
    else
    {
        inWork = true;

        if(que.some(element => element.time == time && element.message == message))
        {
            que.shift();
        }

        logs.load(prefix, (err, device) => {    

            if(device && !err)
            {    
                device = removeExpired(device);

                if(!device[mac])
                {
                    device[mac] = {};
                }

                if(!device[mac][letters])
                {
                    device[mac][letters] = [];
                }

                device[mac][letters][device[mac][letters].length] = { t : time, l : level, m : message };

                logs.add(device, function(err) {

                    inWork = false;

                    if(err)
                    {
                        logger.log('error', 'bridge', 'Bridge', prefix + '.json konnte nicht aktualisiert werden! ' + err);
                    }

                    if(que.length != 0)
                    {
                        saveLog(que[0].level, que[0].mac, que[0].letters, que[0].time, que[0].message);
                    }
                });
            }
            else
            {
                var entry = { id : prefix };

                entry[mac] = {};

                entry[mac][letters] = [ { t : time, l : level, m : message } ];

                logs.add(entry, (err) => {

                    inWork = false;

                    if(err)
                    {
                        logger.log('error', 'bridge', 'Bridge', prefix + '.json konnte nicht aktualisiert werden! ' + err);
                    }

                    if(que.length != 0)
                    {
                        saveLog(que[0].level, que[0].mac, que[0].letters, que[0].time, que[0].message);
                    }
                });
            }
        });
    }
}

function removeExpired(obj)
{
    for(const i in obj)
    {
        if(i != 'id')
        {
            for(const j in obj[i])
            {
                for(var k = 1; k < obj[i][j].length + 1; k++)
                {
                    var time = obj[i][j][obj[i][j].length - k].t;

                    if(new Date() - new Date(time * 1000) > 86400000)
                    {
                        obj[i][j].splice(obj[i][j].length - k, 1);
                    }
                }
            }
        }
    }
    
    return obj;
}