"use strict";

var _ = require('lodash');
var http = require('http');
var Promises = require('best-promise');
var fsPromise = require('fs-promise');
var request = require('supertest');
var serveIndex = require('serve-index');
var expect = require('expect.js');
var path = require('path');
var FDS = require('..');
 
describe('dependencies', function(){
    describe('serve-index', function(){
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
