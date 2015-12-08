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
 *     Sina Hassani
 */

//importing external and internal libraries
var socket_io        = require('socket.io');
var socket_io_client = require('socket.io-client');
var fs               = require('fs');
var beautifier_server     = require('./server/lib/beautifier_server.js');

//check config files
var conf = JSON.parse(fs.readFileSync("etc/server.json"));

//defining constants and variables
var daemons = {};
var global_tokens = {};
global_tokens.keys = [];
global_tokens.map = {};
global_tokens.keys[0] = "JKJKd00_435jmkMM235345tp3456M2^^7820@_++4!";
global_tokens.map.daemons = 0;

//connecting to the main daemon
var io = new socket_io();
var os = new socket_io_client('http://localhost:' + conf.ports.main, {query: 'token=JKJKd00_435jmkMM235345tp3456M2^^7820@_++4!'});
var fsio = new socket_io_client('http://localhost:'  + conf.ports.main + '/file_server', {query: 'token=JKJKd00_435jmkMM235345tp3456M2^^7820@_++4!'});

//creating an instance of server class
var beautifiers = new beautifier_server(io, fsio);

//master daemon events
os.on('connect', function() {
  os.emit('update_tokens_req', {name: 'beautifier'});
});

os.on('update_tokens', function(obj) {
  global_tokens = obj.tokens;
});

//authorization
io.set('authorization', function (req, callback) {
  if(!req || !req._query || !req._query.token) {
    console.log('Authorization: failed, no valid params');
    return false;
  }

  if (req._query.token === undefined || req._query.token.length === 0) {
    console.log('Authorization: failed, empty token');
    return false;
  }

  if(global_tokens.keys.indexOf(req._query.token) != -1) {
    console.log('Authorization: success');
    return callback(null, true);
  } else {
    console.log('Authorization: failed, incorrect token');
    return false;
  }
});

//Start listening
io.listen(conf.ports.beautifier);
console.log('beautifier daemon started successfully on port ' + conf.ports.beautifier);
