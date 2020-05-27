var logger, storage, accessories = [];
var store = require('json-fs-store');

function getDevice(accessory)
{
    return new Promise(async function(resolve) {

        var found = false;

        for(var i = 0; i < accessories.length; i++)
        {
            if(accessories[i].mac == accessory.mac && accessories[i].type == accessory.type)
            {
                found = true;

                resolve(accessories[i].value);
            }
        }

        if(!found)
        {
            accessory.value = await readFS(accessory.mac, accessory.type);

            accessories.push(accessory);

            resolve(accessory.value);
        }
    });
}

function setDevice(accessory, value)
{
    return new Promise(async function(resolve) {

        var found = false;

        for(var i = 0; i < accessories.length; i++)
        {
            if(accessories[i].mac == accessory.mac && accessories[i].type == accessory.type)
            {
                accessories[i].value = value;

                found = true;
            }
        }

        if(!found)
        {
            accessory.value = value;

            accessories.push(accessory);
        }

        await writeFS(accessory.mac, accessory.type, value);

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
                logger.log('error', mac + '.json konnte nicht aktualisiert werden! ' + err);
            }

            resolve(err ? false : true);
        });
    });
}

function readFS(mac, type)
{
    return new Promise(resolve => {

        if(type == 'rain' || type == 'light' || type == 'temperature' || type == 'humidity')
        {
            mac += '-' + type[0].toUpperCase();
        }
        
        storage.load(mac, (err, device) => {    

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