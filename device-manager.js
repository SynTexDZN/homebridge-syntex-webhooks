const request = require('request');
const convert = require('color-convert');

module.exports = class DeviceManager
{
	constructor(logger, typeManager)
	{
		this.logger = logger;
		this.typeManager = typeManager;
	}

	fetchRequests(state, accessory)
	{
		return new Promise(resolve => {

			var counter = 0, finished = 0, success = 0;

			for(var i = 0; i < accessory.options.requests.length; i++)
			{
				if(accessory.options.requests[i].trigger != null && state.power != null
				&& (state.power && accessory.options.requests[i].trigger.toLowerCase() == 'on'
				|| !state.power && accessory.options.requests[i].trigger.toLowerCase() == 'off'
				|| accessory.options.requests[i].trigger.toLowerCase() == 'color'))
				{
					counter++;
				}
			}

			for(var i = 0; i < accessory.options.requests.length; i++)
			{
				if(accessory.options.requests[i].trigger != null && state.power != null)
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

						if(state.power && accessory.options.requests[i].trigger.toLowerCase() == 'on'
						|| !state.power && accessory.options.requests[i].trigger.toLowerCase() == 'off')
						{
							request(theRequest, (function(err, response, body) {

								var statusCode = response && response.statusCode ? response.statusCode : -1;
								
								finished++;

								if(!err && statusCode == 200)
								{
									success++;

									this.logger.log('success', accessory.id, accessory.letters, '[' + accessory.name + '] %request_result[0]% [' + this.url + '] %request_result[1]% [' + statusCode + '] %request_result[2]%: [' + (body || '') + ']');

									if(finished >= counter)
									{
										resolve(null);
									}
								}
								else
								{
									this.logger.log('error', accessory.id, accessory.letters, '[' + accessory.name + '] %request_result[0]% [' + this.url + '] %request_result[1]% [' + statusCode + '] %request_result[2]%: [' + (body || '') + '] ' + (err || ''));

									if(finished >= counter)
									{
										if(success == 0 && this.typeManager.letterToType(accessory.letters) == 'relais')
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
						else if(accessory.options.requests[i].trigger.toLowerCase() == 'color')
						{
							var colors = [state.hue, state.saturation, state.brightness];

							if(accessory.options.spectrum == 'RGB')
							{
								colors = convert.hsv.rgb([state.hue, state.saturation, state.brightness]);
							}

							theRequest.url += colors[0] + ',' + colors[1] + ',' + (state.power ? colors[2] : 0);
						
							request(theRequest, (function(err, response, body)
							{
								var statusCode = response && response.statusCode ? response.statusCode : -1;

								if(!err && statusCode == 200)
								{
									this.logger.log('success', accessory.mac, accessory.letters, '[' + accessory.name + '] %request_result[0]% [' + this.url + '] %request_result[1]% [' + statusCode + '] %request_result[2]%: [' + (body || '') + '] ');
								}
								else
								{
									this.logger.log('error', accessory.mac, accessory.letters, '[' + accessory.name + '] %request_result[0]% [' + this.url + '] %request_result[1]% [' + statusCode + '] %request_result[2]%: [' + (body || '') + '] ' + (err ? err : ''));
								}
			
								finished++;

								if(finished >= counter)
								{
									resolve(null);
								}
								
							}.bind({ url : theRequest.url, logger : this.logger })));
						}
					}
				}
			}

			if(counter == 0)
			{
				resolve(null);
			}
		});
	}
}