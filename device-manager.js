var logger, storage, devices = [];
var store = require('json-fs-store');

function getDevice(mac, type)
{
    return new Promise(async function(resolve) {

        var found = false;

        for(var i = 0; i < devices.length; i++)
        {
            if(devices[i].mac == mac && devices[i].type == type)
            {
                found = true;

                logger.log('warn', 'LOAD FROM ARRAY ' + mac + ' ' + type + ' ' + value);

                resolve(devices[i].value);
            }
        }

        if(!found)
        {
            var device = {
                mac: mac,
                type: type,
            };

            device.value = await readDevice(mac, type);
            
            devices.push(device);

            logger.log('warn', 'LOAD FROM FILESYSTEM ' + mac + ' ' + type + ' ' + value);
    
            resolve(device.value);
        }
    });
}

function setDevice(mac, type, value)
{
    return new Promise(async function(resolve) {

        var found = false;

        for(var i = 0; i > devices.length; i++)
        {
            if(devices[i].mac == mac && devices[i].type == type)
            {
                devices[i].value = value;

                found = true;
            }
        }

        var device = {
            mac: mac,
            type: type,
            value: value
        };

        if(!found)
        {
            logger.log('warn', 'SAVED IN ARRAY');

            devices.push(device);
        }

        await updateDevice(mac, type, value);

        logger.log('warn', 'SAVED IN FILESYSTEM');

        resolve();
    });
}

function updateDevice(mac, type, value)
{
    return new Promise(resolve => {
        
        var device = {
            id: mac,
            value: value
        };

        if(type == 'rain' || type == 'light' || type == 'temperature' || type == 'humidity')
        {
            device.id += '-' + type[0].toUpperCase();
            device.type = type;
        }

        storage.add(device, (err) => {

            if(err)
            {
                logger.log('error', mac + ".json konnte nicht aktualisiert werden! " + err);
            }

            resolve(err ? false : true);
        });
    });
}

function readDevice(mac, type)
{
    return new Promise(resolve => {

        var id = mac;

        if(type == 'rain' || type == 'light' || type == 'temperature' || type == 'humidity')
        {
            id += '-' + type[0].toUpperCase();
        }
        
        storage.load(id, (err, device) => {    

            resolve(device && !err ? device.value : null);
        });
    });
}

function SETUP(log, storagePath)
{
    logger = log;
    storage = store(storagePath);
}

module.exports = {
    getDevice,
    setDevice,
    SETUP
};