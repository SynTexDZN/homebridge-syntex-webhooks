const convert = require('color-convert');

module.exports = class DeviceManager
{
	constructor(platform)
	{
		this.connections = {};

		this.logger = platform.logger;

		this.RequestManager = platform.RequestManager;
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

		this.RequestManager.fetch(url, { timeout : 25000 }).then((data) => {

			if(data != null)
			{
				this.connections[url] = 0;

				if(accessory.setConnectionState != null)
				{
					accessory.setConnectionState(true, null, true);
				}
			}
			else
			{
				if(this.connections[url] < 2)
				{
					this.connections[url]++;
				}
				else if(accessory.setConnectionState != null)
				{
					accessory.setConnectionState(false, null, true);
				}
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
							this.RequestManager.fetch(urlToCall, theRequest).then(function(data, err) {

								if(data != null)
								{
									success++;

									this.logger.log('success', service.id, service.letters, '[' + service.name + '] %request_result[0]% [' + this.url + '] %request_result[1]% [200] %request_result[2]%: [' + (data || '') + ']');
								}
								else
								{
									this.logger.log('error', service.id, service.letters, '[' + service.name + '] %request_result[0]% [' + this.url + '] %request_result[1]% [' + (err.response != null ? err.response.status : -1)+ '] %request_result[2]%: [' + (err.response != null ? err.response.data : '') + ']', err.stack);
								}

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
							
							}.bind({ url : urlToCall, logger : this.logger, TypeManager : this.TypeManager }));
						}
						else if(service.options.requests[i].trigger.toLowerCase() == 'color')
						{
							var colors = [state.hue, state.saturation, state.brightness];

							if(service.options.spectrum == 'RGB')
							{
								colors = convert.hsv.rgb([state.hue, state.saturation, state.brightness]);
							}

							this.RequestManager.fetch(urlToCall + colors[0] + ',' + colors[1] + ',' + (state.value ? colors[2] : 0), theRequest).then(function(data, err) {

								if(data != null)
								{
									this.logger.log('success', service.id, service.letters, '[' + service.name + '] %request_result[0]% [' + this.url + '] %request_result[1]% [200] %request_result[2]%: [' + (data || '') + '] ');
								}
								else
								{
									this.logger.log('error', service.id, service.letters, '[' + service.name + '] %request_result[0]% [' + this.url + '] %request_result[1]% [' + (err.response != null ? err.response.status : -1) + '] %request_result[2]%: [' + (err.response != null ? err.response.data : '') + ']', err.stack);
								}

								finished++;

								if(finished >= counter)
								{
									if(service.setConnectionState != null)
									{
										service.setConnectionState(success > 0, null, true);
									}
									
									resolve(true);
								}
							
							}.bind({ url : urlToCall + colors[0] + ',' + colors[1] + ',' + (state.value ? colors[2] : 0), logger : this.logger }));
						}
						else if(service.options.requests[i].trigger.toLowerCase() == 'dimmer')
						{
							this.RequestManager.fetch(urlToCall + state.brightness, theRequest).then(function(data, err) {

								if(data != null)
								{
									this.logger.log('success', service.id, service.letters, '[' + service.name + '] %request_result[0]% [' + this.url + '] %request_result[1]% [200] %request_result[2]%: [' + (data || '') + '] ');
								}
								else
								{
									this.logger.log('error', service.id, service.letters, '[' + service.name + '] %request_result[0]% [' + this.url + '] %request_result[1]% [' + (err.response != null ? err.response.status : -1) + '] %request_result[2]%: [' + (err.response != null ? err.response.data : '') + ']', err.stack);
								}

								finished++;

								if(finished >= counter)
								{
									if(service.setConnectionState != null)
									{
										service.setConnectionState(success > 0, null, true);
									}
									
									resolve(true);
								}
							
							}.bind({ url : urlToCall + state.brightness, logger : this.logger }));
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