const Switch = require('./switch');

module.exports = class RGB extends Switch
{
    constructor(accessoryConfig)
    {
        super(accessoryConfig);
    }

    getHue(callback)
    {
        DeviceManager.getDevice(this.mac, this.letters).then(function(state) {

            callback(null, (state == null) ? 0 : this.options.spectrum == 'HSL' ? (state.split(':')[1] || 0) : (getHSL(state)[0] || 0));

        }.bind(this)).catch(function(e) {

            logger.err(e);
        });
    };

    getSaturation(callback)
    {
        DeviceManager.getDevice(this.mac, this.letters).then(function(state) {

            callback(null, (state == null) ? 100 : this.options.spectrum == 'HSL' ? (state.split(':')[2] || 100) : (getHSL(state)[1] || 100));

        }.bind(this)).catch(function(e) {

            logger.err(e);
        });
    }

    getBrightness(callback)
    {
        DeviceManager.getDevice(this.mac, this.letters).then(function(state) {

            callback(null, (state == null) ? 50 : this.options.spectrum == 'HSL' ? (state.split(':')[3] || 50) : (getHSL(state)[2] || 50));

        }.bind(this)).catch(function(e) {

            logger.err(e);
        });
    }

    setHue(level, callback)
    {
        this.hue = level;
        
        fetchRequests(this).then((result) => {

            callback(result);
        });
    };

    setSaturation(level, callback)
    {
        this.saturation = level;
        
        fetchRequests(this).then((result) => {

            callback(result);
        });
    };

    setBrightness(level, callback)
    {
        this.brightness = level;
        
        fetchRequests(this).then((result) => {

            callback(result);
        });
    };
}