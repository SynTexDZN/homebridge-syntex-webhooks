let Service, Characteristic;

const { SwitchService } = require('homebridge-syntex-dynamic-platform');

const request = require('request');

module.exports = class SynTexOutletService extends SwitchService
{
	constructor(homebridgeAccessory, deviceConfig, serviceConfig, manager)
	{
        Service = manager.platform.api.hap.Service;
		Characteristic = manager.platform.api.hap.Characteristic;
		
        super(homebridgeAccessory, deviceConfig, serviceConfig, manager);

        console.log(deviceConfig);
        console.log(serviceConfig);

        this.options = {};

        if(serviceConfig.requests != null)
        {
            this.options.requests = serviceConfig.requests;
        }

        this.changeHandler = (state) =>
		{
			if(state.value != null)
			{
				this.power = state.value;

                this.homebridgeAccessory.getServiceById(Service.Switch, serviceConfig.subtype).getCharacteristic(Characteristic.On).updateValue(this.power);

                this.logger.log('update', this.id, this.letters, 'HomeKit Status für [' + this.name + '] geändert zu [' + this.power + '] ( ' + this.id + ' )');
            
                super.setValue('state', this.power);
            }
		};
    }

    getState(callback)
	{
		super.getState((value) => {

			if(value != null)
			{
				this.power = value;
			}
				
			callback(null, value != null ? value : false);

		}, true);
    }
    
    setState(value, callback)
	{
        this.power = value;

        super.setState(value, () => this.fetchRequests(this).then((result) => {

            if(result == null)
            {
                this.logger.log('update', this.id, this.letters, 'HomeKit Status für [' + this.name + '] geändert zu [' + this.power + '] ( ' + this.id + ' )');
            }

            callback(result);
        }));
    }
    
    fetchRequests(accessory)
    {
        return new Promise(resolve => {

            if(accessory.options.requests)
            {
                var counter = 0, finished = 0, success = 0;

                for(var i = 0; i < accessory.options.requests.length; i++)
                {
                    if(accessory.options.requests[i].trigger && accessory.power != null
                    && (accessory.power && accessory.options.requests[i].trigger.toLowerCase() == 'on'
                    || !accessory.power && accessory.options.requests[i].trigger.toLowerCase() == 'off'
                    || accessory.options.requests[i].trigger.toLowerCase() == 'color'))
                    {
                        counter++;
                    }
                }

                for(var i = 0; i < accessory.options.requests.length; i++)
                {
                    if(accessory.options.requests[i].trigger && accessory.power != null)
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

                                request(theRequest, (function(err, response, body) {

                                    var statusCode = response && response.statusCode ? response.statusCode : -1;
                                    
                                    finished++;

                                    if(!err && statusCode == 200)
                                    {
                                        success++;

                                        this.logger.log('success', accessory.id, accessory.letters, '[' + accessory.name + '] hat die Anfrage zu [' + this.url + '] mit dem Status Code [' + statusCode + '] beendet: [' + (body || '') + ']');

                                        if(finished >= counter)
                                        {
                                            resolve(null);
                                        }
                                    }
                                    else
                                    {
                                        this.logger.log('error', accessory.id, accessory.letters, '[' + accessory.name + '] hat die Anfrage zu [' + this.url + '] mit dem Status Code [' + statusCode + '] beendet: [' + (body || '') + '] ' + (err || ''));

                                        if(finished >= counter)
                                        {
                                            if(success == 0 && TypeManager.letterToType(accessory.letters) == 'relais')
                                            {
                                                resolve(err || new Error("Request to '" + this.url + "' was not succesful."));
                                            }
                                            else
                                            {
                                                resolve(null);
                                            }
                                        }
                                    }

                                }).bind({ url : urlToCall, logger : this.logger }));
                            }
                        }
                        else if(accessory.options.requests[i].trigger.toLowerCase() == 'color')
                        {
                            /*
                            setRGB(accessory, accessory.options.requests[i]).then(() => {
                                
                                finished++;

                                if(finished >= counter)
                                {
                                    resolve(null);
                                }
                            });
                            */
                        }
                    }
                }

                if(counter == 0)
                {
                    resolve(null);
                }
            }
            else
            {
                resolve(null);
            }
        });
    }
};