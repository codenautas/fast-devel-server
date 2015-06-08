"use strict";

var _ = require('lodash');
var express = require('express');
var app = express();
var Promise = require('promise');
var fsPromise = require('fs-promise');
var jade = require('jade');
var multilang = require('multilang');
var path = require('path');
var autoDeploy = require('auto-deploy');
var dirInfo = require('dir-info');

app.use(autoDeploy({log:true, scriptName:'start', pid:12345}));

if(false){
    var MarkdownIt = require('markdown-it');
    var markdown = new MarkdownIt();
    var markdownRender=function markdownRender(content){
        return Promise.resolve().then(function(){
            return markdown.render(content);
        });
    }
}else if(false){
    var markdown = require( "markdown" ).markdown;
    var markdownRender=function markdownRender(content){
        return Promise.resolve().then(function(){
            return markdown.toHTML(content,'Maruku');
        });
    }
}else if(false){
    var brucedown  = require( "brucedown" );
    var markdownRender=function markdownRender(content){
        return new Promise(function(resolve, reject){
            brucedown(content,function(err,ok){
                if(err){
                    reject(err);
                }else{
                    resolve(ok);
                }
            });
        });
    }
}else if(true){
    var marked = require("marked");
    marked.setOptions({
        renderer: new marked.Renderer(),
        gfm: true,
        tables: true,
        breaks: false,
        pedantic: false,
        sanitize: false,
        smartLists: true,
        smartypants: false,
        highlightx: function (code, lang, callback) {
            require('pygmentize-bundled')({ lang: lang, format: 'html' }, code, function (err, result) {
                callback(err, result.toString());
            });
        },
        highlight: function(code){
            return require('highlight.js').highlightAuto(code).value;
        }
    });
    var markdownRender=function markdownRender(content){
        return new Promise(function(resolve, reject){
            marked(content,function(err,ok){
                if(err){
                    reject(err);
                }else{
                    var html='<!doctype html>\n<html><head>'+
                        '<link href="/markdown.css" media="all" rel="stylesheet" />'+
                        '<link href="/markdown2.css" media="all" rel="stylesheet" />'+
                        '<link href="/github.css" media="all" rel="stylesheet" />'+
                        '</head><body><article class="markdown-body entry-content" itemprop="mainContentOfPage">'+
                        ok+
                        '</article></body></html>';
                    resolve(html);
                }
            });
        });
    }
}
var serveIndex = require('serve-index');
var path = require('path');

var extensionServeStatic = require('extension-serve-static');
var FDH = require('..');

FDH.html4serveIndex(serveIndex);

var server = app.listen(54321, function() {
    console.log('Listening on port %d', server.address().port);
});

var mime = extensionServeStatic.mime;

app.get('/',function(req,res){
    res.end("<h1>Fast Devel Server</h1>");
});

var externalInfoTemplate=null;

app.use('/auto/!EXTERNAL',function(req,res){
    Promise.resolve(!!externalInfoTemplate).then(function(catched){
        return catched||fsPromise.readFile('./server/external.jade',{encoding: 'utf8'}).then(function(jadeContent){
            externalInfoTemplate=jade.compile(jadeContent);
        });
    }).then(function(){
        res.end(externalInfoTemplate());
    }).catch(function(err){
        res.write('Error al mostrar external.jade');
        res.write(err.toString());
        res.end();
        throw err;
    });
});


fsPromise.readFile('./server/auto.jade',{encoding: 'utf8'}).then(function(jadeContent){
    var autoTemplate=jade.compile(jadeContent);
    app.use('/auto',function(req,res,next){
        res.end(autoTemplate({path:req.path}));
    });
}).catch(function(err){
    console.log('server stopping. ERROR READING auto.jade');
    console.log(err);
    process.exit(1);
});

function middlewareDeLogueo(donde){
    return function(req,res,next){
        next();
    }
}

app.use('/file',middlewareDeLogueo('file'));
app.use('/info',middlewareDeLogueo('info'));

var validExts=_.keys(mime.types);

app.use('/info',function(req,res,next){
    //filter path
    var info={
        mtime:null, 
        originFileName:null
    };
    var fileName='../'+req.path;
    var fileNameForStat=fileName;
    if(req.query["from-original"]){
        fileNameForStat=path.dirname(fileName)+'/'+req.query["from-original"];
    }
    fsPromise.stat(fileNameForStat).then(function(stat){
        info.mtime=stat.mtime;
        if(path.extname(req.path)=='.md'){
            return fsPromise.readFile(fileName, {encoding: 'utf8'}).then(function(content){
                var matches=content.split('\n')[0].match(/^.*<!-- multilang from\s*(\S*)\s*$/);
                if(!matches) return {};
                return {originFileName: matches[1]};
            });
        };
        return {};
    }).then(function(moreInfo){
        res.set('Content-Type', 'application/json');
        for(var attr in moreInfo){
            info[attr]=moreInfo[attr];
        }
        res.end(JSON.stringify(info));
    }).catch(function(err){
        console.log('ERROR /info stat');
        console.log(err);
        next(err);
    });
});

serveIndex.dateTimeToString=function(mtime){
    var today=new Date();
    if(mtime.toDateString()==today.toDateString()){
        return 'today ' + mtime.toLocaleTimeString();
    }
    return mtime.toDateString() + ' ' + mtime.toLocaleTimeString()
}

app.use('/file',serveIndex('..', {
    hidden: true,
    icons: true,
    view: 'details'
}))

var serveConvert=function serveConvert(root, opts){
    return function(req,res,next){
        var ext=path.extname(req.path).substring(1);
        var convert=serveConvert.converters[ext];
        if(!convert){
            next();
        }else{
            var fileName=root+'/'+req.path;
            Promise.resolve().then(function(){
                return fsPromise.readFile(fileName, {encoding: 'utf8'});
            }).then(
                convert
            ).catch(function(err){
                return '<H1>ERROR</H1><PRE>'+err;
            }).then(function(buf){
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                res.setHeader('Content-Length', buf.length);
                res.end(buf);
            });
        }
    };
}

serveConvert.converters={
    jade:function(content){
        return Promise.resolve().then(function(){
            return jade.render(content,{});
        });
    },
    markdown:markdownRender,
    md:markdownRender,
    js:function(content){
        return markdownRender('```js\n'+content+'\n```');
    }
}

app.use('/file',serveConvert('..', {}));

app.use('/file',extensionServeStatic('..', {
    index: ['index.html'], 
    extensions:[''], 
    staticExtensions:validExts
}))

app.use(extensionServeStatic('./server', {
    index: ['index.html'], 
    extensions:[''], 
    staticExtensions:['js','css','html','png']
}))

app.use('/dir-info',function(req,res){
    Promise.resolve().then(function(){
        return dirInfo.getInfo({path:'..'+req.path, net:true, cmd:true});
    }).then(function(info){
        res.end(JSON.stringify(info));
    }).catch(function(err){
        console.log('ERROR',err);
        console.log('stack',err.stack);
        res.end('<H1>ERROR</H1><PRE>'+err);
    });
});