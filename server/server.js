"use strict";

var _ = require('lodash');
var express = require('express');
var app = express();
var Promises = require('best-promise');
var fsPromise = require('fs-promise');
var jade = require('jade');
var moment = require('moment');
var multilang = require('multilang');
var numeral = require('numeral');
var path = require('path');
numeral.language('ar', {
    delimiters: {
        thousands: '.',
        decimal: ','
    },
    abbreviations: {
        thousand: 'Kb',
        million: 'Mb',
        billion: 'Gb',
        trillion: 'Tb'
    },
    ordinal : function (number) {
        return number === 1 ? 'er' : 
               number === 2 ? 'do' :
               number === 3 ? 'ro' :
               number === 4 ? 'to' :
               number === 5 ? 'to' :
               number === 6 ? 'to' :
               number === 7 ? 'mo' :
               number === 8 ? 'vo' :
               number === 9 ? 'no' :
               number === 10 ? 'mo' : 'mo' ;
    },
    currency: {
        symbol: '$'
    }
});
numeral.language('ar');
var toBinary = require('to-binary');

var html = require('js-to-html').html;
var autoDeploy = require('auto-deploy');
var dirInfo = require('dir-info');
var kill9 = require('kill-9');

app.use('/tools',autoDeploy.middleware({pid:1234}));

if(false){
    var MarkdownIt = require('markdown-it');
    var markdown = new MarkdownIt();
    var markdownRender=function markdownRender(content){
        return Promises.start(function(){
            return markdown.render(content);
        });
    }
}else if(false){
    var markdown = require( "markdown" ).markdown;
    var markdownRender=function markdownRender(content){
        return Promises.start(function(){
            return markdown.toHTML(content,'Maruku');
        });
    }
}else if(false){
    var brucedown  = require( "brucedown" );
    var markdownRender=Promises.wrapErrRes(brucedown);
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
        return Promises.make(function(resolve, reject){
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
    Promises.Promise.resolve(!!externalInfoTemplate).then(function(catched){
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
    view: 'details',
    template: function(locals, done){
        if(locals.directory.match(/\/$/)){
            locals.directory=locals.directory.replace(/\/$/,'');
        }
        var content=html.div({'class':'main-dir'},
        [ 
            html.div({'class':'path-title'},_.map(locals.directory.split('/'),function(part, index, parts){
                if(index==parts.length-1) return html.span(part);
                return html.span([html.a({href: parts.slice(0,index-2).join('/')},part),' / ']);
            })),
            html.table({'class':'file-list'},[html.tr({'class':'title'},[
                html.th(''),
                html.th('name'),
                html.th('ext'),
                html.th('size'),
                html.th('date'),
                html.th('info'),
                html.th('actions'),
            ])].concat(_.map(locals.fileList,function(fileInfo,index){
                var href=locals.directory+'/'+fileInfo.name;
                if(fileInfo.stat.isDirectory()){
                    var fileNameClass='dir-name';
                    var fileNameContent=fileInfo.name;
                }else{
                    var fileNameClass='name';
                    var fileNameContent=[
                        html.span(path.basename(fileInfo.name,path.extname(fileInfo.name))),
                        html.span({'class':'ext-name'},path.extname(fileInfo.name))
                    ]
                }
                return html.tr([
                    html.td({'class':'icon'},fileInfo.stat.isDirectory()?'D':'A'),
                    html.td({'class':fileNameClass},html.a({href:href},fileNameContent)),
                    (fileInfo.stat.isDirectory()?
                        html.td({'class':'ext-dir',colSpan:2},html.a({href:href},'<DIR>')):
                        html.td({'class':'ext'},path.extname(fileInfo.name))
                    ),
                    (fileInfo.stat.isDirectory()?null:
                        html.td({'class':'size'},numeral(fileInfo.stat.size).format())
                    ),
                    html.td({'class':'date'},moment(fileInfo.stat.mtime).format('DD/MM/YYYY HH:mm:ss')),
                    html.td({
                        'class':'info',
                        'data-dirinfo':'dirinfo',
                        'data-dirinfotype':fileInfo.stat.isDirectory() && locals.fileList[0].name==='..' && index?'sub':'',
                        id:"dirinfo-"+fileInfo.name,
                        'data-name':fileInfo.name,
                        'data-path':locals.directory.replace(/^\/file(?=\/|$)/,'/dir-info')+(fileInfo.name=='..'?'':'/'+fileInfo.name)
                    }),
                    html.td({
                        'class':'actions',
                        'data-execaction':'execaction',
                        id:"execaction-"+fileInfo.name,
                        'data-path':locals.directory.replace(/^\/file(?=\/|$)/,'/exec-action')+(fileInfo.name=='..'?'':'/'+fileInfo.name)
                    })
                ]);
            })))
        ]);
        var result=html.html([
            html.head([
                html.meta({charset:'utf8'}),
                html.title(locals.directory+' - fast-devel-server'),
                html.link({rel:"stylesheet", type:"text/css", href:"/dir.css"})
            ]),
            html.body(content)
        ]);
        done(null, result.toHtmlText({pretty:true}));
    }
}))

var serveConvert=function serveConvert(root, opts){
    return function(req,res,next){
        var ext=path.extname(req.path).substring(1);
        var convert=serveConvert.fileConverters[path.basename(req.path)]||serveConvert.converters[ext];
        if(!convert){
            next();
        }else{
            var fileName=root+'/'+req.path;
            Promises.start(function(){
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

function sourceRenderer(type){
    return function(content){
        return markdownRender('```'+type+'\n'+content+'\n```');
    }
}

serveConvert.converters={
    '':sourceRenderer(''),
    bat:sourceRenderer('dos'),
    css:sourceRenderer('css'),
    diff:sourceRenderer('diff'),
    gitignore:sourceRenderer(''),
    ini:sourceRenderer('ini'),
    jade:function(content){
        return Promises.start(function(){
            return jade.render(content,{});
        });
    },
    js:sourceRenderer('js'),
    json:sourceRenderer('json'),
    less:sourceRenderer('less'),
    makefile:sourceRenderer('makefile'),
    markdown:markdownRender,
    md:markdownRender,
    php:sourceRenderer('php'),
    psql:sourceRenderer('sql'),
    sh:sourceRenderer('bash'),
    sql:sourceRenderer('sql'),
    xml:sourceRenderer('xml'),
    yaml:sourceRenderer('json'),
    yml:sourceRenderer('json'),
}

serveConvert.fileConverters={
    '.htaccess': sourceRenderer('apache'),
    'httpd.conf': sourceRenderer('apache'),
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
    Promises.start(function(){
        return dirInfo.getInfo(path.normalize('..'+req.path), {net:true, cmd:true});
    }).then(function(info){
        res.end(JSON.stringify(info));
    }).catch(function(err){
        console.log('ERROR',err);
        console.log('stack',err.stack);
        res.end('<H1>ERROR</H1><PRE>'+err);
    });
});