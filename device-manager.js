var logger, storage, accessories = [];
var store = require('json-fs-store');

function getDevice(mac, type, counter)
{
    return new Promise(async function(resolve) {

        var found = false;

        for(var i = 0; i < accessories.length; i++)
        {
            if(accessories[i].mac == mac && accessories[i].type == type && accessories[i].counter == counter)
            {
                found = true;

                resolve(accessories[i].value);
            }
        }

        if(!found)
        {
            var accessory = {
                mac : mac,
                type : type,
                counter : counter,
                value : await readFS(mac, type, counter)
            };

            accessories.push(accessory);

            resolve(accessory.value);
        }
    });
}

function setDevice(mac, type, counter, value)
{
    return new Promise(async function(resolve) {

        var found = false;

        for(var i = 0; i < accessories.length; i++)
        {
            if(accessories[i].mac == mac && accessories[i].type == type && accessories[i].counter == counter)
            {
                accessories[i].value = value;

                found = true;
            }
        }

        if(!found)
        {
            accessories.push({ mac : mac, type : type, counter : counter, value : value });
        }

        await writeFS(mac, type, counter, value);

        resolve();
    });
}

function writeFS(mac, type, counter, value)
{
    return new Promise(resolve => {
        
        var device = {
            id: mac + ':' + type[0].toUpperCase() + counter,
            value: value,
            type: type
        };
        
        storage.add(device, (err) => {

            if(err)
            {
                logger.log('error', mac + '.json konnte nicht aktualisiert werden! ' + err);
            }

            resolve(err ? false : true);
        });
    });
}

function readFS(mac, type, counter)
{
    return new Promise(resolve => {

        storage.load(mac + ':' + type[0].toUpperCase() + counter, (err, device) => {    

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