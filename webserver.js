var http = require('http'), url = require('url');
var logger, pages = [];

module.exports = class WebServer
{
    constructor(prefix, log, port)
    {
        logger = log;

        var createServerCallback = (async function(request, response)
        {
            var urlParts = url.parse(request.url, true);
            var urlParams = urlParts.query;
            var urlPath = urlParts.pathname;
            var body = [];
            
            body = Buffer.concat(body).toString();

            response.statusCode = 200;
            response.setHeader('Content-Type', 'application/json');
            response.setHeader('Access-Control-Allow-Origin', '*');

            for(var i = 0; i < pages.length; i++)
            {
                if(urlPath == pages[i].path)
                {
                    if(request.method == 'POST')
                    {
                        var post = '', page = pages[i];

                        request.on('data', (data) => {

                            post += data;
                        });

                        request.on('end', () => {
                        
                            var json = null;

                            if(post != '')
                            {
                                try
                                {
                                    json = JSON.parse(post);
                                }
                                catch(error)
                                {
                                    logger.log('error', 'bridge', 'Bridge', 'JSON String konnte nicht verarbeitet werden! ( ' + post + ')');
                                }
                            }
                            
                            page.callback(response, urlParams, json);
                        });
                    }
                    else
                    {
                        pages[i].callback(response, urlParams, null);
                    }
                }
            }

        }).bind(this);

        http.createServer(createServerCallback).listen(port, '0.0.0.0');
        
        logger.log('info', 'bridge', 'Bridge', prefix + ' Web-Server läuft auf Port [' + port + ']');
    }

    addPage(path, callback)
    {
        pages.push({ path : path, callback : callback });
    }
}