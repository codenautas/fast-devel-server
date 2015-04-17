
var _ = require('lodash');
var express = require('express');
var app = express();

var extensionServeStatic = require('extension-serve-static');

var server = app.listen(54321, function() {
    console.log('Listening on port %d', server.address().port);
});

var mime = extensionServeStatic.mime;

app.get('/',function(req,res){
    res.end("<h1>Fast Devel Server</h1>");
});

console.log(mime.types);

app.use(extensionServeStatic('..', {
    index: ['index.html'], 
    extensions:[''], 
    staticExtensions:_.keys(mime.types)
}))
