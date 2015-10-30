"use strict";
/*jshint eqnull:true */
/*jshint globalstrict:true */
/*jshint node:true */

// APP

var _ = require('lodash');
var express = require('express');
var app = express();
var Promises = require('best-promise');
var fs = require('fs-promise');
var jade = require('jade');
var moment = require('moment');
var multilang = require('multilang');
var numeral = require('numeral');
var Path = require('path');

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
var qaControl = require('qa-control');
var kill9 = require('kill-9');
var execToHmtl = require('exec-to-html');
var MiniTools = require('mini-tools');

app.use('/ajax-best-promise.js',function(req,res){
    res.sendFile(process.cwd()+'/node_modules/ajax-best-promise/bin/ajax-best-promise.js');
});

app.use('/tools',autoDeploy.middleware({pid:1234}));

app.use('/exec-action',execToHmtl.middleware({baseDir:'../', control:true}));

if(false){
    var MarkdownIt = require('markdown-it');
    var markdown = new MarkdownIt();
    var markdownRender=function markdownRender(content){
        return Promises.start(function(){
            return markdown.render(content);
        });
    };
}else if(false){
    var markdown = require( "markdown" ).markdown;
    var markdownRender=function markdownRender(content){
        return Promises.start(function(){
            return markdown.toHTML(content,'Maruku');
        });
    };
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
                    var html='<!doctype html>\n<html><head>\n'+
                        '<link href="/markdown.css" media="all" rel="stylesheet" />\n'+
                        '<link href="/markdown2.css" media="all" rel="stylesheet" />\n'+
                        '<link href="/github.css" media="all" rel="stylesheet" />\n'+
                        '<link rel="shortcut icon" href="/favicon.png" type="image/png" />\n'+
                        '<link rel="apple-touch-icon", href="/favicon.png" />\n'+
                        '</head><body><article class="markdown-body entry-content" itemprop="mainContentOfPage">\n'+
                        ok+
                        '\n</article></body></html>';
                    resolve(html);
                }
            });
        });
    };
}
var serveIndex = require('serve-index');

var extensionServe = require('extension-serve');
var FDH = require('..');

var server = app.listen(54321, function() {
    console.log('Listening on port %d', server.address().port);
});

var mime = extensionServe.mime;

app.get('/',function(req,res){
    res.end("<h1>Fast Devel Server</h1>");
});

var externalInfoTemplate=null;

function middlewareDeLogueo(donde){
    return function(req,res,next){
        next();
    };
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
        fileNameForStat=Path.dirname(fileName)+'/'+req.query["from-original"];
    }
    fs.stat(fileNameForStat).then(function(stat){
        info.mtime=stat.mtime;
        if(Path.extname(req.path)=='.md'){
            return fs.readFile(fileName, {encoding: 'utf8'}).then(function(content){
                var matches=content.split('\n')[0].match(/^.*<!-- multilang from\s*(\S*)\s*$/);
                if(!matches){
                    return {};
                }
                return {originFileName: matches[1]};
            });
        }
        return {};
    }).then(function(moreInfo){
        res.set('Content-Type', 'application/json');
        /*jshint forin:false */
        for(var attr in moreInfo){
            info[attr]=moreInfo[attr];
        }
        /*jshint forin:true */
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
    return mtime.toDateString() + ' ' + mtime.toLocaleTimeString();
};

var fdsServeIndex = serveIndex('..', {
    hidden: true,
    icons: true,
    view: 'details',
    template: function(locals, done){
        if(locals.directory.match(/\/$/)){
            locals.directory=locals.directory.replace(/\/$/,'');
        }
        var pathParts=locals.directory.split('/');
        var content=html.div({'class':'main-dir'},
        [ 
            html.div({'class':'path-title'},_.map(pathParts,function(part, index, parts){
                if(index==parts.length-1){
                    return html.span(part);
                }
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
                var fileNameClass;
                var fileNameContent;
                if(fileInfo.stat.isDirectory()){
                    fileNameClass='dir-name';
                    fileNameContent=fileInfo.name;
                }else{
                    fileNameClass='name';
                    fileNameContent=[
                        html.span(Path.basename(fileInfo.name,Path.extname(fileInfo.name))),
                        html.span({'class':'ext-name'},Path.extname(fileInfo.name))
                    ];
                }
                return html.tr([
                    html.td({'class':'icon'},fileInfo.name==='..'?'\uD83D\uDCC2':(fileInfo.stat.isDirectory()?'\uD83D\uDCC1':'\u274f')),
                    //html.td({'class':'icon'},fileInfo.name==='..'?'\u2711':(fileInfo.stat.isDirectory()?'\u274d':'\u274f')),
                    // html.td({'class':'icon'},fileInfo.name==='..'?'D':(fileInfo.stat.isDirectory()?'d':'-')),
                    html.td({'class':fileNameClass},html.a({href:href},fileNameContent)),
                    (fileInfo.stat.isDirectory()?
                        html.td({'class':'ext-dir',colSpan:2},html.a({href:href},'<DIR>')):
                        html.td({'class':'ext'},Path.extname(fileInfo.name))
                    ),
                    (fileInfo.stat.isDirectory()?null:
                        html.td({'class':'size'},numeral(fileInfo.stat.size).format())
                    ),
                    html.td({'class':'date'},moment(fileInfo.stat.mtime).format('DD/MM/YYYY HH:mm:ss')),
                    html.td({
                        'class':'info',
                        'data-dirinfo':'dirinfo',
                        'data-dirinfotype':fileInfo.stat.isDirectory()?(locals.fileList[0].name==='..' && index?'sub':'dir'):'file',
                        id:"dirinfo-"+fileInfo.name,
                        'data-name':fileInfo.name,
                        'data-parent':pathParts[pathParts.length-1],
                        'data-path':locals.directory.replace(/^\/(file|auto)(?=\/|$)/,'/dir-info')+(fileInfo.name=='..'?'':'/'+fileInfo.name)
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
                html.link({rel:"stylesheet", type:"text/css", href:"/dir.css"}),
				html.link({rel:"shortcut icon", href:"/favicon.png", type:"image/png"}),
				html.link({rel:"apple-touch-icon", href:"/favicon.png"})
            ]),
            html.body([content,html.script({src:"/auto-dir-info.js"})])
        ]);
        done(null, result.toHtmlText({pretty:true}));
    }
});

app.use('/file',fdsServeIndex);
app.use('/auto',fdsServeIndex);

var serveConvert=function serveConvert(root, opts, adapter){
    if(!adapter){
        adapter=function(){ return function(x){ return x; }; };
    }
    return function(req,res,next){
        var ext=Path.extname(req.path).substring(1);
        var convert=serveConvert.fileConverters[Path.basename(req.path)]||serveConvert.converters[ext];
        if(!convert){
            next();
        }else{
            var fileName=root+'/'+req.path;
            Promises.start(function(){
                return fs.readFile(fileName, {encoding: 'utf8'});
            }).then(
                convert
            ).catch(function(err){
                return '<H1>ERROR</H1><PRE>'+err;
            }).then(adapter(req.path)).then(function(buf){
                MiniTools.serveText(buf,'html')(req,res,next);
            }).catch(MiniTools.serveErr(res,req,next));
        }
    };
};

function sourceRenderer(type){
    return function(content){
        return markdownRender('```'+type+'\n'+content+'\n```');
    };
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
};

function autoViewer(path){
    return function(htmlContent){
        return Promises.start(function(){
            return fs.readFile('./server/auto-view-template.html', {encoding: 'utf8'});
        }).then(function(jsCode){
            jsCode = jsCode.replace(/"##PATH##"/g, JSON.stringify(path));
            return htmlContent.replace(/<\/html>\s*$/m,'\n'+jsCode+'\n</html>');
        });
    };
}

serveConvert.fileConverters={
    '.htaccess': sourceRenderer('apache'),
    'httpd.conf': sourceRenderer('apache'),
};

app.use('/file',serveConvert('..', {}));

app.use('/auto',serveConvert('..', {}, autoViewer));

app.use('/file',extensionServe('..', {
    index: ['index.html'], 
    extensions:[''], 
    staticExtensions:validExts
}));

app.use(extensionServe('./server', {
    index: ['index.html'], 
    extensions:[''], 
    staticExtensions:['js','css','html','png']
}));

app.use('/dir-info',function(req,res){
    Promises.start(function(){
        return dirInfo.getInfo(Path.normalize('..'+req.path), {net:true, cmd:true});
    }).then(function(info){
        res.end(JSON.stringify(info));
    }).catch(MiniTools.serveErr(req,res));
});

app.use('/qa-control',function(req,res){
    Promises.start(function(){
        var path=Path.normalize(process.cwd()+'/..'+req.path);
        return qaControl.controlProject(path);
    }).then(function(warnings){
        res.end(JSON.stringify(warnings));
    }).catch(MiniTools.serveErr(req,res));
});