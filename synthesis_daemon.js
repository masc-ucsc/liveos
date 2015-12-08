/*
 * (C) Copyright 2015 Regents of the University of California and LiveOS Project.
 *
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the GNU Lesser General Public License
 * (LGPL) version 2.1 which accompanies this distribution, and is available at
 * http://www.gnu.org/licenses/lgpl-2.1.html
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * Contributors:
 *     Rafael Trapani Possignolo
 *     Sina Hassani
 */

//importing external and internal libraries
var socket_io        = require('socket.io');
var socket_io_client = require('socket.io-client');
var terminal_server = require('./server/lib/terminal_server.js');
var yosys           = require('./server/lib/synthesis_server/yosys.js');
var port            = process.env.PORT || 8085;

//defining constants and variables
var daemons = {};
var global_tokens = {};
global_tokens.keys = [];
global_tokens.map = {};
global_tokens.keys[0] = "JKJKd00_435jmkMM235345tp3456M2^^7820@_++4!";
global_tokens.map.daemons = 0;

//connecting to the main daemon
var io = new socket_io();
var os = new socket_io_client('http://localhost:8080', {query: 'token=JKJKd00_435jmkMM235345tp3456M2^^7820@_++4!'});

//creating an instance of server class
var tserver = new terminal_server(__dirname); // jshint ignore:line
var yosyss = new yosys(__dirname, io, tserver); // jshint ignore:line

//master daemon events
os.on('connect', function() {
  os.emit('update_tokens_req', {name: 'latex'});
});

os.on('update_tokens', function(obj) {
  global_tokens = obj.tokens;
});

//authorization
io.set('authorization', function (req, callback) {
  if(!req || !req._query || !req._query.token) {
    console.log('YOSYS Authorization: failed, no valid params');
    return false;
  }

  if (req._query.token === undefined || req._query.token.length === 0) {
    console.log('YOSYS Authorization: failed, empty token');
    return false;
  }

  if(global_tokens.keys.indexOf(req._query.token) != -1) {
    console.log('YOSYS Authorization: success');
    return callback(null, true);
  } else {
    console.log('YOSYS Authorization: failed, incorrect token');
    return false;
  }
});

//Start listening
io.listen(port);
console.log('YOSYS daemon started successfully on port ' + port);
