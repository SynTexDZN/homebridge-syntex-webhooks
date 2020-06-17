var logger, storage, accessories = [];
var store = require('json-fs-store');

function getDevice(mac, type, service)
{
    return new Promise(async function(resolve) {

        var found = false;

        for(var i = 0; i < accessories.length; i++)
        {
            if(accessories[i].mac == mac && accessories[i].type == type && accessories[i].service == service)
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
                service : service,
                value : await readFS(mac, service)
            };

            accessories.push(accessory);

            resolve(accessory.value);
        }
    });
}

function setDevice(mac, type, service, value)
{
    return new Promise(async function(resolve) {

        var found = false;

        for(var i = 0; i < accessories.length; i++)
        {
            if(accessories[i].mac == mac && accessories[i].type == type && accessories[i].service == service)
            {
                accessories[i].value = value;

                found = true;
            }
        }

        if(!found)
        {
            accessories.push({ mac : mac, type : type, service : service, value : value });
        }

        await writeFS(mac, type, service, value);

        resolve();
    });
}

function writeFS(mac, type, service, value)
{
    return new Promise(resolve => {
        
        var device = {
            id: mac + ':' + service,
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

function readFS(mac, service)
{
    return new Promise(resolve => {

        storage.load(mac + ':' + service, (err, device) => {    

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