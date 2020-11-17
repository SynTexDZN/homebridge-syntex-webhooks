const Base = require('./base');
let logger, DeviceManager, TypeManager;

module.exports = class Switch extends Base
{
    constructor(accessoryConfig, Manager)
    {
        super(accessoryConfig, Manager);

        logger = Manager.logger;
        DeviceManager = Manager.DeviceManager;
        TypeManager = Manager.TypeManager;
    }

    setState(powerOn, callback, context)
    {
        this.power = powerOn;

        fetchRequests(this).then((result) => {

            callback(result);
        });
    }
}

function fetchRequests(accessory)
{
    return new Promise(resolve => {

        if(accessory.options.requests)
        {
            var counter = 0, finished = 0, success = 0;

            for(var i = 0; i < accessory.options.requests.length; i++)
            {
                if(accessory.options.requests[i].trigger && accessory.power != undefined
                && (accessory.power && accessory.options.requests[i].trigger.toLowerCase() == 'on'
                || !accessory.power && accessory.options.requests[i].trigger.toLowerCase() == 'off'
                || accessory.options.requests[i].trigger.toLowerCase() == 'color'))
                {
                    counter++;
                }
            }

            for(var i = 0; i < accessory.options.requests.length; i++)
            {
                if(accessory.options.requests[i].trigger && accessory.power != undefined)
                {
                    if(accessory.power && accessory.options.requests[i].trigger.toLowerCase() == 'on'
                    || !accessory.power && accessory.options.requests[i].trigger.toLowerCase() == 'off')
                    {
                        var urlMethod = accessory.options.requests[i].method || '';
                        var urlToCall = accessory.options.requests[i].url || '';
                        var urlBody = accessory.options.requests[i].body || '';
                        var urlForm = accessory.options.requests[i].form || '';
                        var urlHeaders = accessory.options.requests[i].body || '{}';

                        if(urlMethod != '' && urlToCall != '')
                        {
                            var theRequest = {
                                method : urlMethod,
                                url : urlToCall,
                                timeout : 5000,
                                headers: JSON.parse(urlHeaders)
                            };
                            
                            if(urlMethod === 'POST' || urlMethod === 'PUT')
                            {
                                if(urlForm)
                                {
                                    theRequest.form = JSON.parse(urlForm);
                                }
                                else if(urlBody)
                                {
                                    theRequest.body = urlBody;
                                }
                            }

                            request(theRequest, (function(err, response, body)
                            {
                                var statusCode = response && response.statusCode ? response.statusCode : -1;
                                
                                finished++;

                                if(!err && statusCode == 200)
                                {
                                    success++;

                                    logger.log('success', accessory.mac, accessory.letters, '[' + accessory.name + '] hat die Anfrage zu [' + this.url + '] mit dem Status Code [' + statusCode + '] beendet: [' + (body || '') + ']');

                                    if(finished >= counter)
                                    {
                                        logger.log('update', accessory.mac, accessory.letters, 'HomeKit Status für [' + accessory.name + '] geändert zu [' + accessory.power.toString() + '] ( ' + accessory.mac + ' )');

                                        DeviceManager.setDevice(accessory.mac, accessory.letters, accessory.power);

                                        resolve(null);
                                    }
                                }
                                else
                                {
                                    logger.log('error', accessory.mac, accessory.letters, '[' + accessory.name + '] hat die Anfrage zu [' + this.url + '] mit dem Status Code [' + statusCode + '] beendet: [' + (body || '') + '] ' + (err || ''));

                                    if(finished >= counter)
                                    {
                                        if(success == 0 && TypeManager.letterToType(accessory.letters) == 'relais')
                                        {
                                            resolve(err || new Error("Request to '" + this.url + "' was not succesful."));
                                        }
                                        else
                                        {
                                            logger.log('update', accessory.mac, accessory.letters, 'HomeKit Status für [' + accessory.name + '] geändert zu [' + accessory.power.toString() + '] ( ' + accessory.mac + ' )');

                                            DeviceManager.setDevice(accessory.mac, accessory.letters, accessory.power);

                                            resolve(null);
                                        }
                                    }
                                }

                            }).bind({ url : urlToCall }));
                        }
                    }
                    else if(accessory.options.requests[i].trigger.toLowerCase() == 'color')
                    {
                        setRGB(accessory, accessory.options.requests[i]).then(() => {
                            
                            finished++;

                            if(finished >= counter)
                            {
                                resolve(null);
                            }
                        });
                    }
                }
            }

            if(counter == 0)
            {
                logger.log('update', accessory.mac, accessory.letters, 'HomeKit Status für [' + accessory.name + '] geändert zu [' + accessory.power.toString() + '] ( ' + accessory.mac + ' )');

                DeviceManager.setDevice(accessory.mac, accessory.letters, accessory.power);

                resolve(null);
            }
        }
        else
        {
            logger.log('update', accessory.mac, accessory.letters, 'HomeKit Status für [' + accessory.name + '] geändert zu [' + accessory.power.toString() + '] ( ' + accessory.mac + ' )');

            DeviceManager.setDevice(accessory.mac, accessory.letters, accessory.power);

            resolve(null);
        }
    });
}