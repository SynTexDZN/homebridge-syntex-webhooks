const axios = require('axios');
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
				|| accessory.options.requests[i].trigger.toLowerCase() == 'color'
				|| accessory.options.requests[i].trigger.toLowerCase() == 'dimmer'))
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
							timeout : 5000
						};

						try
						{
							theRequest.headers = JSON.parse(urlHeaders);
						}
						catch(e)
						{
							this.logger.log('error', 'bridge', 'Bridge', 'Request Headers %json_parse_error%! ( ' + theRequest.headers + ')', e);
						}

						if(urlMethod === 'POST' || urlMethod === 'PUT')
						{
							if(urlForm)
							{
								try
								{
									theRequest.data = JSON.parse(urlForm);
								}
								catch(e)
								{
									this.logger.log('error', 'bridge', 'Bridge', 'Request Form %json_parse_error%! ( ' + theRequest.headers + ')', e);
								}
							}
							else if(urlBody)
							{
								theRequest.data = urlBody;
							}
						}

						if(state.power && accessory.options.requests[i].trigger.toLowerCase() == 'on'
						|| !state.power && accessory.options.requests[i].trigger.toLowerCase() == 'off')
						{
							axios.get(urlToCall, theRequest).then(function(response) {

								success++;

								this.logger.log('success', accessory.id, accessory.letters, '[' + accessory.name + '] %request_result[0]% [' + this.url + '] %request_result[1]% [' + response.status + '] %request_result[2]%: [' + (response.data || '') + ']');
							
							}.bind({ url : urlToCall, logger : this.logger })).catch(function(err) {

								this.logger.log('error', accessory.id, accessory.letters, '[' + accessory.name + '] %request_result[0]% [' + this.url + '] %request_result[1]% [' + (err.response != null ? err.response.status : -1)+ '] %request_result[2]%: [' + (err.response != null ? err.response.data : '') + ']', err);
							
							}.bind({ url : urlToCall, logger : this.logger })).then(function() {

								finished++;

								if(finished >= counter)
								{
									if(success == 0 && this.typeManager.letterToType(accessory.letters) == 'relais')
									{
										resolve(err || new Error('Request to [' + this.url + '] was not succesful.'));
									}
									else
									{
										resolve(null);
									}
								}

							}.bind({ url : urlToCall, typeManager : this.typeManager }));
						}
						else if(accessory.options.requests[i].trigger.toLowerCase() == 'color')
						{
							var colors = [state.hue, state.saturation, state.brightness];

							if(accessory.options.spectrum == 'RGB')
							{
								colors = convert.hsv.rgb([state.hue, state.saturation, state.brightness]);
							}

							axios.get(urlToCall + colors[0] + ',' + colors[1] + ',' + (state.power ? colors[2] : 0), theRequest).then(function(response) {

								this.logger.log('success', accessory.mac, accessory.letters, '[' + accessory.name + '] %request_result[0]% [' + this.url + '] %request_result[1]% [' + response.status + '] %request_result[2]%: [' + (response.data || '') + '] ');
							
							}.bind({ url : theRequest.url, logger : this.logger })).catch(function(err) {

								this.logger.log('error', accessory.mac, accessory.letters, '[' + accessory.name + '] %request_result[0]% [' + this.url + '] %request_result[1]% [' + (err.response != null ? err.response.status : -1) + '] %request_result[2]%: [' + (err.response != null ? err.response.data : '') + ']', err);
							
							}.bind({ url : theRequest.url, logger : this.logger })).then(function() {

								finished++;

								if(finished >= counter)
								{
									resolve(null);
								}
							});
						}
						else if(accessory.options.requests[i].trigger.toLowerCase() == 'dimmer')
						{
							axios.get(urlToCall + state.brightness, theRequest).then(function() {

								this.logger.log('success', accessory.mac, accessory.letters, '[' + accessory.name + '] %request_result[0]% [' + this.url + '] %request_result[1]% [' + response.status + '] %request_result[2]%: [' + (response.data || '') + '] ');
							
							}.bind({ url : theRequest.url, logger : this.logger })).catch(function(err) {

								this.logger.log('error', accessory.mac, accessory.letters, '[' + accessory.name + '] %request_result[0]% [' + this.url + '] %request_result[1]% [' + (err.response != null ? err.response.status : -1) + '] %request_result[2]%: [' + (err.response != null ? err.response.data : '') + ']', err);
							
							}.bind({ url : theRequest.url, logger : this.logger })).then(function() {

								finished++;

								if(finished >= counter)
								{
									resolve(null);
								}
							});
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