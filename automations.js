let TypeManager = require('./type-manager'), AutomationSystem = require('syntex-automation');
const request = require('request'), store = require('json-fs-store');
var logger, storage, automations = [], accessories = [], DeviceManager;
var eventLock = [], positiveFired = [], negativeFired = [], ready = false;

module.exports = class Automations
{
	constructor(log, storagePath, Manager)
	{
		logger = log;
		storage = store(storagePath);
		DeviceManager = Manager;

		TypeManager = new TypeManager(logger);

		storage.load('automation-lock', (err, obj) => {

			if(!obj || err)
			{
				logger.log('error', 'bridge', 'Bridge', 'Automation-Lock.json %read_error%! ' + err);
			}
			else
			{
				eventLock = obj.eventLock || [];
				positiveFired = obj.positiveFired || [];
				negativeFired = obj.negativeFired || [];
			}
		});
	}

	setAccessories(devices)
	{
		accessories = devices;
	}

	loadAutomations()
	{
		return new Promise(resolve => {
			
			storage.load('automations', (err, obj) => {  

				if(!obj || err)
				{
					resolve(false);
				}
				else
				{
					automations = obj.automations;

					resolve(true);
				}

				ready = true;
			});
		});
	}

	runAutomations(id, letters, value)
	{
		value = value.toString();
		
		for(var i = 0; i < automations.length; i++)
		{
			if(eventLock.includes(automations[i].id))
			{
				for(var j = 0; j < automations[i].trigger.length; j++)
				{
					if(automations[i].trigger[j].id == id && automations[i].trigger[j].letters == letters)
					{
						var index = eventLock.indexOf(automations[i].id);

						if(automations[i].trigger[j].operation == '>' && parseFloat(value) < parseFloat(automations[i].trigger[j].value) && negativeFired.includes(automations[i].trigger[j].id))
						{
							eventLock.splice(index, 1);

							logger.debug('Automation [' + automations[i].name + '] Unterschritten ' + automations[i].id);
						}

						if(automations[i].trigger[j].operation == '<' && parseFloat(value) > parseFloat(automations[i].trigger[j].value) && positiveFired.includes(automations[i].trigger[j].id))
						{
							eventLock.splice(index, 1);

							logger.debug('Automation [' + automations[i].name + '] Überschritten ' + automations[i].id);
						}

						if(automations[i].trigger[j].operation == '=' && value != automations[i].trigger[j].value)
						{
							eventLock.splice(index, 1);

							logger.debug('Automation [' + automations[i].name + '] Ungleich ' + automations[i].id);
						}
					}
				}
			}
		}

		for(var i = 0; i < automations.length; i++)
		{
			if(automations[i].active && !eventLock.includes(automations[i].id))
			{
				checkTrigger(automations[i], id, letters, value.toString());
			}
		}
	}

	isReady()
	{
		return ready;
	}
};

function checkTrigger(automation, id, letters, value)
{
	var trigger = null;

	for(var i = 0; i < automation.trigger.length; i++)
	{
		if(automation.trigger[i].id == id && automation.trigger[i].letters == letters)
		{
			if(automation.trigger[i].operation == '>' && parseFloat(value) > parseFloat(automation.trigger[i].value))
			{
				trigger = automation.trigger[i];
			}

			if(automation.trigger[i].operation == '<' && parseFloat(value) < parseFloat(automation.trigger[i].value))
			{
				trigger = automation.trigger[i];
			}

			if(automation.trigger[i].operation == '=' && value == automation.trigger[i].value)
			{
				trigger = automation.trigger[i];
			}
		}
	}

	if(trigger != null)
	{
		logger.debug('Trigger Ausgelöst');

		if(automation.condition && automation.condition.length > 0)
		{
			checkCondition(automation, trigger);
		}
		else
		{
			executeResult(automation, trigger);
		}
	}
}

async function checkCondition(automation, trigger)
{
	var condition = 0;

	for(var i = 0; i < automation.condition.length; i++)
	{
		var value = DeviceManager.readAccessoryService(automation.condition[i].id, automation.condition[i].letters, true);

		if(value != null)
		{
			value = value.toString();

			if(automation.condition[i].operation == '>' && parseFloat(value) > parseFloat(automation.condition[i].value))
			{
				condition++;
			}

			if(automation.condition[i].operation == '<' && parseFloat(value) < parseFloat(automation.condition[i].value))
			{
				condition++;
			}

			if(automation.condition[i].operation == '=' && value == automation.condition[i].value)
			{
				condition++;
			}
		}
	}

	if(condition > 0 && ((!automation.combination || automation.combination == 'ALL') && condition >= automation.condition.length) || automation.condition.combination == 'ONE')
	{
		logger.debug('Condition Erfüllt');

		executeResult(automation, trigger);
	}
}

function executeResult(automation, trigger)
{
	for(var i = 0; i < automation.result.length; i++)
	{
		var url = '';

		if(automation.result[i].url)
		{
			url = automation.result[i].url;
		}

		if(automation.result[i].id && automation.result[i].letters && automation.result[i].value && automation.result[i].name)
		{
			for(const accessory of accessories)
			{
				if(accessory[1].id == automation.result[i].id && JSON.stringify(accessory[1].services).includes(TypeManager.letterToType(automation.result[i].letters[0])))
				{
					var count = Array.isArray(accessory[1].services) ? accessory[1].services.length : 1;

					for(var k = 1; k <= count; k++)
					{
						if(accessory[1].service[k] != null)
						{
							if(accessory[1].service[k].letters == automation.result[i].letters)
							{
								var state = null;

								if((state = TypeManager.validateUpdate(automation.result[i].id, automation.result[i].letters, { value : automation.result[i].value })) != null)
								{
									if(TypeManager.letterToType(automation.result[i].letters[0]) == 'statelessswitch')
									{
										state.event = parseInt(automation.result[i].value);
										state.value = 0;
									}

									accessory[1].service[k].changeHandler(state);
								}
								else
								{
									logger.log('error', automation.result[i].id, automation.result[i].letters, '[' + automation.result[i].value + '] %invalid-value%! ( ' + automation.result[i].id + ' )');
								}

								//DeviceManager.setDevice(automation.result[i].id, automation.result[i].letters, TypeManager.validateUpdate(automation.result[i].id, automation.result[i].letters, automation.result[i].value));
							}
						}
					}
				}
			}
		}

		if(!eventLock.includes(automation.id))
		{
			eventLock.push(automation.id);

			storage.add({ id : 'automation-lock', eventLock : eventLock, positiveFired : positiveFired, negativeFired : negativeFired }, (err) => {

				if(err)
				{
					logger.log('error', 'bridge', 'Bridge', 'Automation-Lock.json %update_error%! ' + err);
				}
			});
		}

		if(trigger.operation == '<')
		{
			if(!negativeFired.includes(trigger.id))
			{
				negativeFired.push(trigger.id);

				var index = positiveFired.indexOf(trigger.id);

				if(index > -1)
				{
					positiveFired.splice(index, 1);
				}
			}
		}
		else if(trigger.operation == '>')
		{
			if(!positiveFired.includes(trigger.id))
			{
				positiveFired.push(trigger.id);

				var index = negativeFired.indexOf(trigger.id);

				if(index > -1)
				{
					negativeFired.splice(index, 1);
				}
			}
		}

		storage.add({ id : 'automation-lock', eventLock : eventLock, positiveFired : positiveFired, negativeFired : negativeFired }, (err) => {
			
			if(err)
			{
				logger.log('error', 'bridge', 'Bridge', 'Automation-Lock.json %update_error%! ' + err);
			}
		});

		if(url != '')
		{
			var theRequest = {
				method : 'GET',
				url : url,
				timeout : 10000
			};

			request(theRequest, function(err, response, body)
			{
				var statusCode = response && response.statusCode ? response.statusCode : -1;

				if(err || statusCode != 200)
				{
					logger.log('error', 'bridge', 'Bridge', '[' + this.name + '] %request_result[0]% [' + this.url + '] %request_result[1]% [' + statusCode + '] %request_result[2]%: [' + (body || '') + '] ' + (err ? err : ''));
				}
				
			}.bind({ url : theRequest.url, name : automation.name }));
		}
	}

	logger.log('success', trigger.id, trigger.letters, '[' + trigger.name + '] %automation_executed[0]% [' + automation.name + '] %automation_executed[1]%!');
}