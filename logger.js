var logger = exports;
logger.debugLevel = 'info';

logger.log = function(message)
{
    var level = 'info';

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