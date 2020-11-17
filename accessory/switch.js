const Base = require('./base');

module.exports = class Switch extends Base
{
    constructor(accessoryConfig)
    {
        super(accessoryConfig);
    }

    setState(powerOn, callback, context)
    {
        this.power = powerOn;

        fetchRequests(this).then((result) => {

            callback(result);
        });
    }
}