let DeviceManager = require('./device-manager'), TypeManager = require('./type-manager'), Automations = require('./automations');
var Service, Characteristic, restart = true;

const { DynamicPlatform } = require('homebridge-syntex-dynamic-platform');

const SynTexAccessory = require('./accessories/accessory'), SynTexStatelessswitchAccessory = require('./accessories/statelessswitch');

const pluginID = 'homebridge-syntex-webhooks';
const pluginName = 'SynTexWebHooks';

module.exports = (homebridge) =>
{
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;

    homebridge.registerPlatform(pluginID, pluginName, SynTexWebHookPlatform, true);
};

class SynTexWebHookPlatform extends DynamicPlatform
{
    constructor(log, config, api)
    {
        super(config, api, pluginID, pluginName);

        this.devices = config['accessories'] || [];
    
        this.cacheDirectory = config['cache_directory'] || './SynTex';
        
        if(this.api && this.logger)
		{
			this.api.on('didFinishLaunching', () => {

                TypeManager = new TypeManager();
                DeviceManager = new DeviceManager(logger, this.cacheDirectory);
                Automations = new Automations(logger, this.cacheDirectory, DeviceManager);

                this.initWebServer();

                Automations.loadAutomations().then((loaded) => {
                    
                    if(loaded)
                    {
                        logger.log('success', 'bridge', 'Bridge', 'Hintergrundprozesse wurden erfolgreich geladen und aktiviert!');
                    }
                    else
                    {
                        logger.log('warn', 'bridge', 'Bridge', 'Es wurden keine Hintergrundprozesse geladen!');
                    }

                    restart = false;
                });
            });
        }
    }

    initWebServer()
    {
        this.WebServer.addPage('/devices', async (response, urlParams) => {
	
            if(urlParams.mac != null)
            {
                var accessory = null;
                        
                for(var i = 0; i < accessories.length; i++)
                {
                    if(accessories[i].mac == urlParams.mac)
                    {
                        if(urlParams.event != null)
                        {
                            accessory = accessories[i];
                        }
                        else
                        {
                            for(var j = 0; j < accessories[i].service.length; j++)
                            {
                                if(accessories[i].service[j].mac != null && accessories[i].service[j].letters != null)
                                {
                                    if((urlParams.type == null || accessories[i].service[j].letters[0] == TypeManager.typeToLetter(urlParams.type)) && (urlParams.counter == null || accessories[i].service[j].letters[1] == urlParams.counter))
                                    {
                                        accessory = accessories[i].service[j];
                                    }
                                }
                            }
                        }
                    }
                }

                if(accessory == null)
                {
                    logger.log('error', urlParams.mac, '', 'Es wurde kein passendes ' + (urlParams.event ? 'Event' : 'Gerät') + ' in der Config gefunden! ( ' + urlParams.mac + ' )');

                    response.write('Error');
                }
                else if(urlParams.event != null)
                {
                    accessory.changeHandler(accessory.name, urlParams.event, urlParams.value || 0);

                    response.write('Success');
                }
                else if(urlParams.value != null)
                {
                    var state = null;

                    if((state = TypeManager.validateUpdate(urlParams.mac, accessory.letters, urlParams.value)) != null)
                    {
                        accessory.changeHandler(state);
                    }
                    else
                    {
                        logger.log('error', urlParams.mac, accessory.letters, '[' + urlParams.value + '] ist kein gültiger Wert! ( ' + urlParams.mac + ' )');
                    }

                    DeviceManager.setDevice(urlParams.mac, accessory.letters, urlParams.value);
                        
                    response.write(state != null ? JSON.stringify(state) : 'Error');
                }
                else
                {
                    var state = await DeviceManager.getDevice(urlParams.mac, accessory.letters);

                    response.write(state != null ? JSON.stringify(state) : 'Error');
                }

                response.end();
            }
        });

        this.WebServer.addPage('/reload-automation', async (response) => {

            if(await Automations.loadAutomations())
            {
                logger.log('success', 'bridge', 'Bridge', 'Hintergrundprozesse wurden erfolgreich geladen und aktiviert!');
                response.write('Success');
            }
            else
            {
                logger.log('warn', 'bridge', 'Bridge', 'Es wurden keine Hintergrundprozesse geladen!');
                response.write('Error');
            }
            
            response.end();
        });

        this.WebServer.addPage('/accessories', (response) => {
	
			var accessories = [];

			for(const accessory of this.accessories)
			{
				accessories.push({
					id: accessory[1].id,
					name: accessory[1].name,
					services: accessory[1].services,
					version: '99.99.99',
					plugin: pluginName
				});
			}
	
			response.write(JSON.stringify(accessories));
			response.end();
		});

        this.WebServer.addPage('/serverside/version', (response) => {

            response.write(require('./package.json').version);
            response.end();
        });

        this.WebServer.addPage('/serverside/check-restart', (response) => {

            response.write(restart.toString());
            response.end();
        });

        this.WebServer.addPage('/serverside/update', (response, urlParams) => {

            var version = urlParams.version != null ? urlParams.version : 'latest';

            const { exec } = require('child_process');
            
            exec('sudo npm install ' + pluginID + '@' + version + ' -g', (error, stdout, stderr) => {

                try
                {
                    if(error || stderr.includes('ERR!'))
                    {
                        logger.log('warn', 'bridge', 'Bridge', 'Das Plugin ' + pluginName + ' konnte nicht aktualisiert werden! ' + (error || stderr));
                    }
                    else
                    {
                        logger.log('success', 'bridge', 'Bridge', 'Das Plugin ' + pluginName + ' wurde auf die Version [' + version + '] aktualisiert!');

                        restart = true;

                        logger.log('warn', 'bridge', 'Bridge', 'Die Homebridge wird neu gestartet ..');

                        exec('sudo systemctl restart homebridge');
                    }

                    response.write(error || stderr.includes('ERR!') ? 'Error' : 'Success');
                    response.end();
                }
                catch(e)
                {
                    logger.err(e);
                }
            });
        });
    }

    loadAccessories()
	{
		for(const device of this.devices)
		{
			const homebridgeAccessory = this.getAccessory(device.id);

            if(device.services == 'statelessswitch')
            {
                this.addAccessory(new SynTexStatelessswitchAccessory(this.devices[i], { Service, Characteristic, TypeManager, logger, DeviceManager, Automations }));
            }
            else
            {
                this.addAccessory(new SynTexAccessory(this.devices[i], { Service, Characteristic, TypeManager, logger, DeviceManager, Automations }));
            }
        }
        
        Automations.setAccessories(this.accessories);
	}
}