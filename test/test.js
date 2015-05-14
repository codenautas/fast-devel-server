"use strict";

var _ = require('lodash');
var http = require('http');
var fsPromise = require('fs-promise');
var request = require('supertest');
var serveIndex = require('serve-index');
var Promise = require('promise');
var expect = require('expect.js');
var path = require('path');
var FDS = require('..');
 
describe('dependencies', function(){
    describe('serve-index', function(){
        var toLower=function toLower(x){
            return _.isString(x)?x.toLowerCase():x;
        }
        var datePattern='\\w\\w\\w \\w\\w\\w \\d?\\d \\d\\d\\d\\d \\d?\\d:\\d?\\d:\\d?\\d ?\\w?\\w?';
        var dateRegExp=new RegExp(datePattern,'g');
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
        var used_only_once__not_need_now_exept_if_the_original_module_changes=function(){}('record input and output data from "html" function', function(done){
            var oldHtml=serveIndex.html;
            serveIndex.html=function htmlMock(req, res, files, next, dir, showUp, icons, path, view, template, stylesheet){
                Promise.resolve().then(function(){
                    return fsPromise.writeFile('test/outs/html-input.json',JSON.stringify([files, dir, showUp, icons, path, view, template, stylesheet]));
                }).then(function(){
                    var resMock={
                        setHeader:function setHeader(name, value){
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
                expect([files, dir, showUp, icons, path, view, template, stylesheet].map(toLower)).to.eql(expectedInputParameters);
                var resMock={
                    setHeader:function setHeader(name, value){
                        if(process.env.TRAVIS){
                            if(!JSON.stringify(expectedHeaderOutput).indexOf(JSON.stringify([name, value]))){
                                console.log("************************** WARNING **********************");
                                console.log([name, value],'not contained in',expectedHeaderOutput);
                            }
                        }else{
                            expect(JSON.stringify(expectedHeaderOutput)).to.contain(JSON.stringify([name, value])); // feo, esperando https://github.com/Automattic/expect.js/issues/134
                        }
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
                expectedInputParameters=expectedInputParameters.map(function(elemento){
                    if(typeof elemento=='string'){
                        return elemento.replace(/\|/g,path.sep).replace("#ROOT#",process.cwd());
                    }
                    return elemento;
                });
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

describe('my service functions', function(){
    before(function(){
        serveIndex.html=FDH.html4serveIndex;
    });
    describe('serve-index.html', function(){
        
    
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
