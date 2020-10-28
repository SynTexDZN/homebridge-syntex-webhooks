var http = require('http'), url = require('url');
var logger, pages = [];

module.exports = class WebServer
{
    constructor(prefix, log, port, filesystem)
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

            var content = '', found = false;

            if(filesystem)
            {
                HTMLQuery.exists(urlPath.substring(1)).then(async function(relPath)
                {            
                    if(relPath)
                    {
                        var data = await HTMLQuery.read(relPath);
                        var head = await HTMLQuery.read(__dirname + '/includes/head.html');
                        var mimeType = {
                            ".html": "text/html; charset=utf-8",
                            ".jpeg": "image/jpeg",
                            ".jpg": "image/jpeg",
                            ".png": "image/png",
                            ".js": "text/javascript",
                            ".css": "text/css",
                            ".ttf": "font/ttf"
                        };

                        response.setHeader('Content-Type', mimeType[path.parse(relPath).ext] || 'text/html; charset=utf-8');

                        content = head + data;
                    }
                });
            }

            for(var i = 0; i < pages.length; i++)
            {
                if(urlPath == pages[i].path || urlPath == pages[i].path + '.html')
                {
                    found = true;

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
                            
                            page.callback(response, urlParams, content, json);
                        });
                    }
                    else
                    {
                        pages[i].callback(response, urlParams, content, null);
                    }
                }
            }

            if(!found)
            {
                if(content == '')
                {
                    content = await HTMLQuery.read(__dirname + '/includes/head.html');
                    content += await HTMLQuery.read(__dirname + '/includes/not-found.html');
                    
                    response.write(content);
                    response.end();
                }

                response.write(content);
                response.end();
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