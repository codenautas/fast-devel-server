"use strict";

var _ = require('lodash');
var http = require('http');
var fsPromise = require('fs-promise');
var request = require('supertest');
var serveIndex = require('serve-index');
var Promise = require('Promise');
var expect = require('expect.js');
 
describe('dependencies', function(){
    describe('serve-index', function(){
        var datePattern='\w\w\w \w\w\w \d\d \d\d\d\d \d\d:\d\d:\d\d';
        var dateRegExp=new RegExp(datePattern);
        it('control complete output', function(done){
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
        var it_skip=function(){}('record input and output data from "html" function', function(done){
            var oldHtml=serveIndex.html;
            serveIndex.html=function htmlMock(req, res, files, next, dir, showUp, icons, path, view, template, stylesheet){
                Promise.resolve().then(function(){
                    return fsPromise.writeFile('test/outs/html-input.json',JSON.stringify([files, dir, showUp, icons, path, view, template, stylesheet]));
                }).then(function(){
                    var resMock={
                        setHeader:function setHeader(name, value){
                            // res.setHeader('Content-Type', 'text/html; charset=utf-8');
                            // res.setHeader('Content-Length', buf.length);
                            res.setHeader(name, value);
                        },
                        end:function end(content){
                            Promise.resolve().then(function(){
                                return fsPromise.writeFile('test/outs/html-output.txt',content);
                            }).then(function(){
                                res.end(content);
                            }).catch(function(err){
                                done(err);
                            });
                        }
                    }
                    oldHtml(req, resMock, files, next, dir, showUp, icons, path, view, template, stylesheet);
                });
            };
            var server = createServer('examples',{
                hidden: true,
                icons: true,
                view: 'details'
            });
            request(server)
                .get('/example-dir')
                .expect(200, /split/)
                .end(function(err, res){
                    serveIndex.html=oldHtml;
                    if(err) return done(err);
                    done();
                });
        });
        it('control internal output', function(done){
            var oldHtml=serveIndex.html;
            var expectedInputParameters;
            var expectedHeaderOutput;
            var contentRegExp;
            serveIndex.html=function htmlMock(req, res, files, next, dir, showUp, icons, path, view, template, stylesheet){
                expect([files, dir, showUp, icons, path, view, template, stylesheet]).to.eql(expectedInputParameters);
                var resMock={
                    setHeader:function setHeader(name, value){
                        expect(JSON.stringify(expectedHeaderOutput)).to.contain(JSON.stringify([name, value])); // feo, esperando https://github.com/Automattic/expect.js/issues/134
                        res.setHeader(name, value);
                    },
                    end:function end(content){
                        expect(content).to.match(contentRegExp);
                        res.end(content);
                    }
                }
                oldHtml(req, resMock, files, next, dir, showUp, icons, path, view, template, stylesheet);
            };
            Promise.resolve().then(function(){
                return fsPromise.readFile('test/complete-output.html',{encoding: 'utf8'});
            }).then(function(completeContent){
                var pattern=_.escapeRegExp(completeContent).replace(dateRegExp,datePattern);
                contentRegExp=new RegExp(pattern);
                return fsPromise.readFile('test/html-input.json',{encoding: 'utf8'});
            }).then(function(jsonedInputParameters){
                expectedInputParameters=JSON.parse(jsonedInputParameters);
                return fsPromise.readFile('test/header-output.json',{encoding: 'utf8'});
            }).then(function(jsonedHeaderOutput){
                expectedHeaderOutput=JSON.parse(jsonedHeaderOutput);
                
                var server = createServer('examples',{
                    hidden: true,
                    icons: true,
                    view: 'details'
                });
                request(server)
                    .get('/example-dir')
                    .expect(200, contentRegExp, done)
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
