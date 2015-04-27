"use strict";

var _ = require('lodash');
var express = require('express');
var app = express();
var Promise = require('promise');
var fsPromise = require('fs-promise');
var jade = require('jade');
var MarkdownIt = require('markdown-it');
var markdown = new MarkdownIt();
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

var validExts=_.keys(mime.types);

app.use('/info',function(req,res,next){
    //filter path
    fsPromise.stat('../'+req.path).then(function(stat){
        res.set('Content-Type', 'application/json');
        res.end(JSON.stringify({mtime:stat.mtime}));
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
        var convert=serveConvert.converters[path.extname(req.path).substring(1)];
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
        return jade.render(content,{});
    },
    markdown:function(content){
        return markdown.render(content);
    }
}

serveConvert.converters.md=serveConvert.converters.markdown;

app.use('/file',serveConvert('..', {}));

app.use('/file',extensionServeStatic('..', {
    index: ['index.html'], 
    extensions:[''], 
    staticExtensions:validExts
}))

app.use(extensionServeStatic('./server', {
    index: ['index.html'], 
    extensions:[''], 
    staticExtensions:['js','css','html']
}))
