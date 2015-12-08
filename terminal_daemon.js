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
 *     Ethan Papp
 */

//importing external and internal libraries
var socket_io                 = require("socket.io");
var socket_io_client          = require("socket.io-client");
var fs                        = require("fs");
var mongoose                  = require("mongoose");
var terminal_server_shell     = require("./server/lib/terminal_server_shell.js");
var terminal_server           = require("./server/lib/terminal_server.js");
var pty                       = require("pty");
var configDB                  = require("./server/database.js");
var user                      = require("./server/models/user.js");
var project                   = require("./server/models/project.js");
var conf = JSON.parse(fs.readFileSync("etc/server.json"));
var port = conf.ports.terminal;

//defining constants and variables
var global_tokens = {};
global_tokens.keys = [];
global_tokens.map = {};
global_tokens.keys[0] = "JKJKd00_435jmkMM235345tp3456M2^^7820@_++4!";
global_tokens.map.daemons = 0;

//connecting to the main daemon
var io = new socket_io();
var os = new socket_io_client("http://localhost:" + conf.ports.main, {query: "token=JKJKd00_435jmkMM235345tp3456M2^^7820@_++4!"});

//connect to database
connect_to_mongo();

//creating an instances of server classes
var tserver = new terminal_server(__dirname);
var terminals = new terminal_server_shell(__dirname, io, pty, tserver, user, project, conf);

//master daemon events
os.on("connect", function() {
  os.emit("update_tokens_req", {name: "terminal_shell"});
});

os.on("update_tokens", function(obj) {
  global_tokens = obj.tokens;
});

//authorization
io.set("authorization", function (req, callback) {
  if(!req || !req._query || !req._query.token) {
    console.log("Authorization: failed, no valid params");
    return false;
  }

  if (req._query.token === undefined || req._query.token.length === 0) {
    console.log("Authorization: failed, empty token");
    return false;
  }

  if(global_tokens.keys.indexOf(req._query.token) != -1) {
    console.log("Authorization: success");
    return callback(null, true);
  } else {
    console.log("Authorization: failed, incorrect token");
    return false;
  }
});

//Start listening
io.listen(port);
console.log("Terminal daemon started successfully on port " + port);

//try and connect to mongodb
function connect_to_mongo() {
  mongoose.connect(configDB.url, function (err) {
    if(err) {
    console.error("Failed to connect to MongoDB, retrying ...");
    setTimeout(connect_to_mongo, 1000);
    }
  });
}