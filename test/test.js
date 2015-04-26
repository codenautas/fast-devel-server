"use strict";

var _ = require('lodash');
var http = require('http');
var fsPromise = require('fs-promise');
var request = require('supertest');
var serveIndex = require('serve-index');
var Promise = require('Promise');
 
describe('dependencies', function(){
    describe('serve-index', function(){
        var datePattern='\w\w\w \w\w\w \d\d \d\d\d\d \d\d:\d\d:\d\d';
        var dateRegExp=new RegExp(datePattern);
        it('control obtained dir', function(done){
            Promise.resolve().then(function(){
                return fsPromise.readFile('test/complete-output.html',{encoding: 'utf8'});
            }).then(function(completeContent){
                var pattern=_.escapeRegExp(completeContent).replace(dateRegExp,datePattern);
                var server = createServer('examples',{
                    hidden: true,
                    icons: true,
                    view: 'details'
                });
                request(server)
                    .get('/example-dir')
                    .expect(200, new RegExp(pattern),done)
            }).catch(function(err){
                done(err);
            });
        });
    });
});

function createServer(dir, opts) {
  var _serveIndex = serveIndex(dir, opts)

  return http.createServer(function (req, res) {
    _serveIndex(req, res, function (err) {
      res.statusCode = err ? (err.status || 500) : 404
      res.end(err ? err.message : 'Not Found')
    })
  })
}
