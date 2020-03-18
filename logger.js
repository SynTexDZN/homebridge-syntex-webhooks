var logger = exports, prefix;
logger.debugLevel = 'success';

logger.create = function(pluginName)
{
    prefix = pluginName;
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

        if(level == 'success')
        {
            console.log('[' + prefix + '] \x1b[32m%s\x1b[0m', "[SUCCESS]", message);
        }
        else if(level == 'update')
        {
            console.log('[' + prefix + '] \x1b[36m%s\x1b[0m', "[UPDATE]", message);
        }
        else if(level == 'read')
        {
            console.log('[' + prefix + '] \x0b[36m%s\x1b[0m', "[READ]", message);
        }
        else if(level == 'info')
        {
            console.log('[' + prefix + '] \x1b[33m%s\x1b[0m', "[INFO]", message);
        }
        else if(level == 'warn')
        {
            console.log('[' + prefix + '] \x0b[33m%s\x1b[0m', "[WARN]", message);
        }
        else
        {
            console.log('[' + prefix + '] \x1b[31m%s\x1b[0m', "[ERROR]", message);
        }
    }
}