var logger = exports;
logger.debugLevel = 'info';

logger.log = function(level, message)
{
    var levels = ['info', 'warn', 'error'];

    if(levels.indexOf(level) <= levels.indexOf(logger.debugLevel))
    {
        if(typeof message !== 'string')
        {
            message = JSON.stringify(message);
        };

        console.log(level + ': ' + message);
    }
}