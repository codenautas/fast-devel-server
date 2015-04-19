"use strict";

var _ = require('lodash');
var express = require('express');
var app = express();
var fsPromise = require('fs-promise');
var jade = require('jade');
var serveIndex = require('serve-index');

var extensionServeStatic = require('extension-serve-static');

var server = app.listen(54321, function() {
    console.log('Listening on port %d', server.address().port);
});

var mime = extensionServeStatic.mime;

app.get('/',function(req,res){
    res.end("<h1>Fast Devel Server</h1>");
});

fsPromise.readFile('./server/auto.jade',{encode: 'utf8'}).then(function(jadeContent){
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

app.use('/file',serveIndex('..', {
    hidden: true,
    icons: true,
    view: 'details'
}))

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
