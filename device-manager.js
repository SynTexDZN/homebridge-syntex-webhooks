const store = require('json-fs-store');
const request = require('request');
const convert = require('color-convert');
var logger, storage, accessories = [];

module.exports = class DeviceManager
{
	constructor(log, storagePath)
	{
		logger = log;
		storage = store(storagePath);
	}

	getDevice(mac, service)
	{
		return new Promise(async (resolve) => {

			var found = false;

			for(var i = 0; i < accessories.length; i++)
			{
				if(accessories[i].mac == mac && accessories[i].service == service)
				{
					found = true;

					resolve(accessories[i].value);
				}
			}

			if(!found)
			{
				var accessory = {
					mac : mac,
					service : service,
					value : await readFS(mac, service)
				};

				accessories.push(accessory);

				resolve(accessory.value);
			}
		});
	}

	setDevice(mac, service, value)
	{
		return new Promise(async (resolve) => {

			var found = false;

			for(var i = 0; i < accessories.length; i++)
			{
				if(accessories[i].mac == mac && accessories[i].service == service)
				{
					accessories[i].value = value;

					found = true;
				}
			}

			if(!found)
			{
				accessories.push({ mac : mac, service : service, value : value });
			}

			await writeFS(mac, service, value);

			resolve();
		});
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

							}).bind({ url : urlToCall, logger : logger }));
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
									logger.log('success', accessory.mac, accessory.letters, '[' + accessory.name + '] hat die Anfrage zu [' + this.url + '] mit dem Status Code [' + statusCode + '] beendet: [' + (body || '') + '] ');
								}
								else
								{
									logger.log('error', accessory.mac, accessory.letters, '[' + accessory.name + '] hat die Anfrage zu [' + this.url + '] mit dem Status Code [' + statusCode + '] beendet: [' + (body || '') + '] ' + (err ? err : ''));
								}
			
								finished++;

								if(finished >= counter)
								{
									resolve(null);
								}
								
							}.bind({ url : theRequest.url })));
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

function readFS(mac, service)
{
	return new Promise(resolve => {

		storage.load(mac + ':' + service, (err, device) => {    

			resolve(device && !err ? device.value : null);
		});
	});
}

function writeFS(mac, service, value)
{
	return new Promise(resolve => {
		
		var device = {
			id: mac + ':' + service,
			value: value
		};
		
		storage.add(device, (err) => {

			if(err)
			{
				logger.log('error', 'bridge', 'Bridge', mac + '.json konnte nicht aktualisiert werden! ' + err);
			}

			resolve(err ? false : true);
		});
	});
}