var socket_io        = require('socket.io');
var socket_io_client = require('socket.io-client');
//var express          = require('express');
//var https            = require('https');
//var httpsc           = require('https');
var fs               = require('fs');
var terminal_server  = require('./server/lib/terminal_server.js');
var livesim_server     = require('./server/lib/livesim_server/livesim_server.js');
var conf = JSON.parse(fs.readFileSync("etc/server.json"));
var port = conf.ports.livesim;

var global_tokens = new Object();
global_tokens['keys'] = new Array();
global_tokens['map'] = new Object();
global_tokens['keys'][0] = 'JKJKd00_435jmkMM235345tp3456M2^^7820@_++4!';
global_tokens['map']['daemons'] = 0;


/*var app = express();
var private_key = fs.readFileSync('conf/server.key');
var certificate = fs.readFileSync('conf/server.crt');
var appServer = https.createServer({
  key: private_key,
  cert: certificate
}, app);*/

//httpsc.globalAgent.options.rejectUnauthorized = false;
//var io = socket_io.listen(appServer);
var io = new socket_io();
var os = new socket_io_client('http://localhost:' + conf.ports.main, {/*agent: httpsc.globalAgent, */query: 'token=JKJKd00_435jmkMM235345tp3456M2^^7820@_++4!'});
var fsio = new socket_io_client('http://localhost:'  + conf.ports.main + '/file_server', {/*agent: httpsc.globalAgent, */query: 'token=JKJKd00_435jmkMM235345tp3456M2^^7820@_++4!'});

var tserver = new terminal_server(__dirname); // jshint ignore:line
var livesims = new livesim_server(tserver, io, fsio); // jshint ignore:line


os.on('connect', function() {
  console.log('Connected to main server');
  os.emit('update_tokens_req', {name: 'livesim'});
});

os.on('update_tokens', function(obj) {
  console.log('Tokens updated');
  global_tokens = obj.tokens;
});

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

// launch ======================================================================
//appServer.listen(port);
io.listen(port);
console.log('livesim daemon started successfully on port ' + port);