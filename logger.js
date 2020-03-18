var logger = exports, log;
logger.debugLevel = 'error';

logger.create = function(slog)
{
    log = slog;
}

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
            log('\x1b[32m%s\x1b[0m', "[SUCCESS]", message);
        }
        else if(level == 'update')
        {
            log('\x1b[36m%s\x1b[0m', "[UPDATE]", message);
        }
        else if(level == 'read')
        {
            log('\x0b[36m%s\x1b[0m', "[READ]", message);
        }
        else if(level == 'info')
        {
            log('\x1b[33m%s\x1b[0m', "[INFO]", message);
        }
        else if(level == 'warn')
        {
            log('\x0b[33m%s\x1b[0m', "[WARN]", message);
        }
        else
        {
            log('\x1b[31m%s\x1b[0m', "[ERROR]", message);
        }
    }
}