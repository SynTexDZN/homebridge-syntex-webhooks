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

                resolve(devices[i].value);
            }
        }

        if(!found)
        {
            var value = await readDevice(mac, type);
            
            devices.push({
                mac: mac,
                type: type,
                value: value
            });

            resolve(value);
        }
    });
}

function setDevice(mac, type, value)
{
    return new Promise(async function(resolve) {

        var found = false;

        for(var i = 0; i < devices.length; i++)
        {
            if(devices[i].mac == mac && devices[i].type == type)
            {
                devices[i].value = value;

                found = true;
            }
        }

        console.log(devices);

        if(!found)
        {
            devices.push({
                mac: mac,
                type: type,
                value: value
            });
        }

        await updateDevice(mac, type, value);

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