const axios = require('axios'), convert = require('color-convert');

module.exports = class DeviceManager
{
	constructor(platform)
	{
		this.connections = {};

		this.logger = platform.logger;
		this.TypeManager = platform.TypeManager;

		this.accessories = platform.accessories;

		if(this.checkInterval == null)
		{
			this.checkInterval = setInterval(() => this.pingAccessories(), 30000);

			this.pingAccessories();
		}
	}

	pingAccessories()
	{
		for(const accessory of this.accessories)
		{
			if(accessory[1].pingURL != null)
			{
				this.checkConnections(accessory[1]);
			}
		}
	}

	checkConnections(accessory)
	{
		var url = accessory.pingURL;

		if(this.connections[url] == null)
		{
			this.connections[url] = 0;
		}

		axios.get(url, { timeout : 25000 }).then(() => {

			this.connections[url] = 0;

			if(accessory.setConnectionState != null)
			{
				accessory.setConnectionState(true, null, true);
			}

		}).catch(() => {

			if(this.connections[url] < 2)
			{
				this.connections[url]++;
			}
			else if(accessory.setConnectionState != null)
			{
				accessory.setConnectionState(false, null, true);
			}
		});
	}

	fetchRequests(service, state)
	{
		return new Promise(resolve => {

			var counter = 0, finished = 0, success = 0;

			for(let i = 0; i < service.options.requests.length; i++)
			{
				if(service.options.requests[i].trigger != null && state.value != null
				&& (state.value && service.options.requests[i].trigger.toLowerCase() == 'on'
				|| !state.value && service.options.requests[i].trigger.toLowerCase() == 'off'
				|| service.options.requests[i].trigger.toLowerCase() == 'color'
				|| service.options.requests[i].trigger.toLowerCase() == 'dimmer'))
				{
					counter++;
				}
			}

			for(let i = 0; i < service.options.requests.length; i++)
			{
				if(service.options.requests[i].trigger != null && state.value != null)
				{
					var urlMethod = service.options.requests[i].method || '';
					var urlToCall = service.options.requests[i].url || '';
					var urlBody = service.options.requests[i].body || '';
					var urlForm = service.options.requests[i].form || '';
					var urlHeaders = service.options.requests[i].body || '{}';

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
							this.logger.log('error', service.id, service.letters, 'Request Headers %json_parse_error%! ( ' + theRequest.headers + ')', e);
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
									this.logger.log('error', service.id, service.letters, 'Request Form %json_parse_error%! ( ' + theRequest.headers + ')', e);
								}
							}
							else if(urlBody)
							{
								theRequest.data = urlBody;
							}
						}

						if(state.value && service.options.requests[i].trigger.toLowerCase() == 'on'
						|| !state.value && service.options.requests[i].trigger.toLowerCase() == 'off')
						{
							axios.get(urlToCall, theRequest).then(function(response) {

								success++;

								this.logger.log('success', service.id, service.letters, '[' + service.name + '] %request_result[0]% [' + this.url + '] %request_result[1]% [' + response.status + '] %request_result[2]%: [' + (response.data || '') + ']');
							
							}.bind({ url : urlToCall, logger : this.logger })).catch(function(err) {

								this.logger.log('error', service.id, service.letters, '[' + service.name + '] %request_result[0]% [' + this.url + '] %request_result[1]% [' + (err.response != null ? err.response.status : -1)+ '] %request_result[2]%: [' + (err.response != null ? err.response.data : '') + ']', err.stack);
							
							}.bind({ url : urlToCall, logger : this.logger })).then(function() {

								finished++;

								if(finished >= counter)
								{
									if(service.setConnectionState != null)
									{
										service.setConnectionState(success > 0, null, true);
									}
									
									if(success == 0 && this.TypeManager.letterToType(service.letters) == 'relais')
									{
										resolve(false);
									}
									else
									{
										resolve(true);
									}
								}

							}.bind({ url : urlToCall, TypeManager : this.TypeManager }));
						}
						else if(service.options.requests[i].trigger.toLowerCase() == 'color')
						{
							var colors = [state.hue, state.saturation, state.brightness];

							if(service.options.spectrum == 'RGB')
							{
								colors = convert.hsv.rgb([state.hue, state.saturation, state.brightness]);
							}

							axios.get(urlToCall + colors[0] + ',' + colors[1] + ',' + (state.value ? colors[2] : 0), theRequest).then(function(response) {

								this.logger.log('success', service.id, service.letters, '[' + service.name + '] %request_result[0]% [' + this.url + '] %request_result[1]% [' + response.status + '] %request_result[2]%: [' + (response.data || '') + '] ');
							
							}.bind({ url : urlToCall + colors[0] + ',' + colors[1] + ',' + (state.value ? colors[2] : 0), logger : this.logger })).catch(function(err) {

								this.logger.log('error', service.id, service.letters, '[' + service.name + '] %request_result[0]% [' + this.url + '] %request_result[1]% [' + (err.response != null ? err.response.status : -1) + '] %request_result[2]%: [' + (err.response != null ? err.response.data : '') + ']', err.stack);
							
							}.bind({ url : urlToCall + colors[0] + ',' + colors[1] + ',' + (state.value ? colors[2] : 0), logger : this.logger })).then(() => {

								finished++;

								if(finished >= counter)
								{
									if(service.setConnectionState != null)
									{
										service.setConnectionState(success > 0, null, true);
									}
									
									resolve(true);
								}
							});
						}
						else if(service.options.requests[i].trigger.toLowerCase() == 'dimmer')
						{
							axios.get(urlToCall + state.brightness, theRequest).then(function(response) {

								this.logger.log('success', service.id, service.letters, '[' + service.name + '] %request_result[0]% [' + this.url + '] %request_result[1]% [' + response.status + '] %request_result[2]%: [' + (response.data || '') + '] ');
							
							}.bind({ url : urlToCall + state.brightness, logger : this.logger })).catch(function(err) {

								this.logger.log('error', service.id, service.letters, '[' + service.name + '] %request_result[0]% [' + this.url + '] %request_result[1]% [' + (err.response != null ? err.response.status : -1) + '] %request_result[2]%: [' + (err.response != null ? err.response.data : '') + ']', err.stack);
							
							}.bind({ url : urlToCall + state.brightness, logger : this.logger })).then(() => {

								finished++;

								if(finished >= counter)
								{
									if(service.setConnectionState != null)
									{
										service.setConnectionState(success > 0, null, true);
									}
									
									resolve(true);
								}
							});
						}
					}
				}
			}

			if(counter == 0)
			{
				resolve(true);
			}
		});
	}
}