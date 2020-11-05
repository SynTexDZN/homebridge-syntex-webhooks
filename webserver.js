const http = require('http'), url = require('url'), fs = require('fs'), path = require('path');
var logger, pages = [], head = '';

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
            response.setHeader('Access-Control-Allow-Origin', '*');

            var content = '', data = '', found = false;

            if(filesystem)
            {
                var relPath = await exists(urlPath.substring(1));
                    
                if(relPath)
                {
                    data = await read(relPath);

                    if(path.parse(relPath).ext == '.html')
                    {
                        response.setHeader('Content-Type', 'text/html; charset=utf-8');
                        
                        content = head + data;
                    }
                }
            }
            else
            {
                response.setHeader('Content-Type', 'application/json');
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
                if(data == '')
                {
                    response.statusCode = 404;
                    //response.setHeader('Content-Type', 'text/html; charset=utf-8');
                    //response.write(head + await read(__dirname + '/includes/not-found.html'));
                }
                else if(relPath)
                {
                    var mimeType = {
                        ".html": "text/html; charset=utf-8",
                        ".jpeg": "image/jpeg",
                        ".jpg": "image/jpeg",
                        ".png": "image/png",
                        ".js": "text/javascript",
                        ".css": "text/css",
                        ".ttf": "font/ttf",
                        ".ico": "image/x-icon"
                    };

                    response.setHeader('Content-Type', mimeType[path.parse(relPath).ext] || 'text/html; charset=utf-8');
                    response.write(path.parse(relPath).ext == '.html' ? content : data);
                }
                
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

    setHead(relPath)
    {
        read(relPath).then((H) => {

            head = H;
        });
    }
}

function exists(reqPath)
{
    return new Promise(resolve => {
        
        var pathname = path.join(__dirname, '../' + reqPath);

        var noext = false;

        if(path.parse(pathname).ext == '')
        {
            noext = true;
        }

        fs.exists(pathname, function(exist)
        {
            if(exist && fs.statSync(pathname).isDirectory())
            {
                resolve(exists(reqPath + 'index.html'));
            }
            else if(exist)
            {
                resolve(pathname);
            }
            else if(noext)
            {
                resolve(exists(reqPath + '.html'));
            }
            else
            {
                resolve(false);
            }
        });
    });
}

function read(reqPath)
{
    return new Promise(resolve => {
        
        fs.readFile(reqPath, function(err, res)
        {          
            if(!res || err)
            {
                res = "";
            }

            resolve(res);
        });
    });
}