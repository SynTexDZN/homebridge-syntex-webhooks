let DeviceManager = require('./device-manager'), TypeManager = require('./type-manager'), Automations = require('./automations'), WebServer = require('./webserver'), logger = require('./logger');
var Service, Characteristic, restart = true;
const SynTexAccessory = require('./accessories/accessory'), SynTexStatelessswitchAccessory = require('./accessories/statelessswitch');

const pluginID = 'homebridge-syntex-webhooks';
const pluginName = 'SynTexWebHooks';

module.exports = function(homebridge)
{
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;

    homebridge.registerPlatform(pluginID, pluginName, SynTexWebHookPlatform);
};

function SynTexWebHookPlatform(log, config, api)
{
    this.devices = config['accessories'] || [];
    
    this.cacheDirectory = config['cache_directory'] || './SynTex';
    this.logDirectory = config['log_directory'] || './SynTex/log';
    this.port = config['port'] || 1710;
    
    TypeManager = new TypeManager();
    logger = new logger(pluginName, this.logDirectory, api.user.storagePath());
    DeviceManager = new DeviceManager(logger, this.cacheDirectory);
    WebServer = new WebServer(pluginName, logger, this.port, false);
    Automations = new Automations(logger, this.cacheDirectory, DeviceManager);

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
}

SynTexWebHookPlatform.prototype = {
    
    accessories : function(callback)
    {
        var accessories = [];

        for(var i = 0; i < this.devices.length; i++)
        {
            if(this.devices[i].services == 'statelessswitch')
            {
                accessories.push(new SynTexStatelessswitchAccessory(this.devices[i], { Service, Characteristic, TypeManager, logger, DeviceManager, Automations }));
            }
            else
            {
                accessories.push(new SynTexAccessory(this.devices[i], { Service, Characteristic, TypeManager, logger, DeviceManager, Automations }));
            }
        }

        Automations.setAccessories(accessories);
        
        callback(accessories);

        WebServer.addPage('/devices', async (response, urlParams) => {
	
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
                        
                    response.write(state != null ? state.toString() : 'Error');
                }
                else
                {
                    var state = await DeviceManager.getDevice(urlParams.mac, accessory.letters);

                    response.write(state != null ? state.toString() : 'Error');
                }

                response.end();
            }
        });

        WebServer.addPage('/reload-automation', async (response) => {

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

        WebServer.addPage('/serverside/version', (response) => {

            response.write(require('./package.json').version);
            response.end();
        });

        WebServer.addPage('/serverside/check-restart', (response) => {

            response.write(restart.toString());
            response.end();
        });

        WebServer.addPage('/serverside/update', async (response, urlParams) => {

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
}