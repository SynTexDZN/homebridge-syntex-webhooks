var logger, storage, devices;
var store = require('json-fs-store');

function getDevice(accessory)
{
    return new Promise(async function(resolve) {

        var found = false;

        for(var i = 0; i < devices.length; i++)
        {
            if(devices[i].value && devices[i].mac == accessory.mac && devices[i].type == accessory.type)
            {
                found = true;

                resolve(devices[i].value);
            }
        }

        if(!found)
        {
            accessory.value = await readFS(accessory.mac, accessory.type);

            resolve(accessory.value);
        }

        console.log(found, accessory.value, accessory);
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

        if(!found)
        {
            devices.push({
                mac: mac,
                type: type,
                value: value
            });
        }

        await writeFS(mac, type, value);

        resolve();
    });
}

function writeFS(mac, type, value)
{
    return new Promise(resolve => {
        
        var device = {
            id: mac,
            value: value,
            type: type
        };

        if(type == 'rain' || type == 'light' || type == 'temperature' || type == 'humidity')
        {
            device.id += '-' + type[0].toUpperCase();
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

function readFS(mac, type)
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

function SETUP(log, storagePath, accessories)
{
    logger = log;
    storage = store(storagePath);
    devices = accessories;
}

module.exports = {
    getDevice,
    setDevice,
    SETUP
};