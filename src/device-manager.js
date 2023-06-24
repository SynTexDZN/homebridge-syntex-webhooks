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

		this.RequestManager.fetch(url, { timeout : 25000 }).then((response) => {

			if(response.data != null)
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
		return new Promise((resolve) => {

			var promiseArray = [];

			if(Array.isArray(service.options.requests))
			{
				for(const request of service.options.requests)
				{
					if(request.type != null && request.url != null)
					{
						var type = request.type.toLowerCase(), url = null;

						if((type == 'on' && state.value == true) || (type == 'off' && state.value == false))
						{
							url = request.url;
						}
						else if(type == 'dimmer')
						{
							url = request.url + state.brightness;
						}
						else if(type == 'color')
						{
							var colors = [state.hue, state.saturation, state.brightness];

							if(service.options.spectrum == 'RGB')
							{
								colors = convert.hsv.rgb([state.hue, state.saturation, state.brightness]);
							}

							if(!state.value)
							{
								colors[2] = 0;
							}

							url = request.url + colors.join(',');
						}
						else if(state[type] != null)
						{
							url = request.url + (request.url.includes('?') ? '&' : '?') + request.type + '=' + state[request.type];
						}

						if(url != null)
						{
							const requestURL = url;
							
							var options = {
								method : request.method || 'GET',
								body : request.body || '',
								form : request.form || '',
								headers : request.headers || '{}',
								timeout : request.timeout || 5000
							};

							try
							{
								options.headers = JSON.parse(options.headers);
							}
							catch(e)
							{
								this.logger.log('error', service.id, service.letters, 'Request Headers %json_parse_error%! ( ' + options.headers + ')', e);
							}

							if(options.method == 'POST' || options.method == 'PUT')
							{
								if(options.form)
								{
									try
									{
										options.data = JSON.parse(options.form);
									}
									catch(e)
									{
										this.logger.log('error', service.id, service.letters, 'Request Form %json_parse_error%! ( ' + options.form + ')', e);
									}
								}
								else if(options.body)
								{
									options.data = options.body;
								}
							}

							promiseArray.push(new Promise((callback) => {

								this.RequestManager.fetch(requestURL, options).then((response) => {
								
									this.logger.log(response.data != null ? 'success' : 'error', service.id, service.letters, '[' + service.name + '] %request_result[0]% [' + requestURL + '] %request_result[1]% [' + (response.status || -1) + '] %request_result[2]%: [' + (response.data || '') + ']', response.error || '');
									
									callback(response.data != null);
								});
							}));
						}
					}
				}
			}
			
			if(promiseArray.length > 0)
			{
				Promise.all(promiseArray).then((result) => {

					var type = this.TypeManager.letterToType(service.letters);
	
					if(service.setConnectionState != null)
					{
						service.setConnectionState(result.includes(true), null, true);
					}
	
					resolve(type != 'relais' || result.includes(true));
				});
			}
			else
			{
				resolve(true);
			}
		});
	}
}