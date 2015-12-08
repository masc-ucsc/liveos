var socket_io_client = require('socket.io-client');
//var httpsc = require('https');
var exec = require('child_process').exec;
var ss = require('socket.io-stream');
var fs = require('fs');
var id;
var tbt = new Array();
var tbts = new Array();
var file_checker = null;

var conf = JSON.parse(fs.readFileSync('controller.json'));

//httpsc.globalAgent.options.rejectUnauthorized = false;
var socket = new socket_io_client('http://' + conf['server'] + ':8086/livesim' , {/*agent: httpsc.globalAgent, */query: 'token=JKJKd00_435jmkMM235345tp3456M2^^7820@_++4!'});

socket.on('connect', function () {
  socket.emit('reg_controller', {host: conf['host'], core_count: conf['core_count'], is_local: conf['is_local']});
});

socket.on('reg_success', function (obj) {
  id = obj.id;
});

socket.on('setup', function (obj) {
  console.log('Setting up benchmark ' + obj.name);
  var child = exec(obj.run_str, {}, function (error, stdout, stderr) {
    fs.writeFileSync("log." + obj.name, stdout);
    fs.writeFileSync("err." + obj.name, stderr);
  });
  //console.log(obj.run_str);
});

socket.on('wait_for_files', function (obj) {
  if(conf['is_local']) {
    socket.emit('controller_ready', {});
    return;
  }
  console.log('Files have changed');
  tbt = obj.tbt;
  tbts = obj.tbts;
  for(var i = 0; i < tbt.length; i++) {
    fname = convert_path(tbt[i]);
    fs.unlinkSync(fname);
  }

  file_checker = setInterval(function () {
    for(var i = 0; i < tbt.length; i++) {
      fname = convert_path(tbt[i]);
      if(fs.existsSync(fname) && fs.statSync(fname)['size'] != tbts[i])
        return;
    }
    setTimeout(function () {
      socket.emit('controller_ready', {});
    }, 50);
    clearInterval(file_checker);
    file_checker = null;
  }, 10);
});

ss(socket).on('file', function (stream, data) {
  if(conf['is_local'])
    return;
  console.log('Updating file ' + data.name);
  fname = convert_path(data.name);
  stream.pipe(fs.createWriteStream(fname));
});

socket.on('kill', function (obj) {
  try {
    process.kill(obj.pid, 'SIGKILL');  
  } catch (err) {
    console.log('livesim: Error -> ' + err);
  };
});

socket.on('disconnect', function (obj) {
  exec("pkill -9 live");
  console.log('Reconnecting ...');
  socket = new socket_io_client('http://' + conf['server'] + ':8086/livesim' , {/*agent: httpsc.globalAgent, */query: 'token=JKJKd00_435jmkMM235345tp3456M2^^7820@_++4!'});
  reset_data();
  //socket.connect();
});

function reset_data () {
  id = -1;
  tbt = new Array();
  tbts = new Array();
  file_checker = null;
}

function convert_path (name) {
  if(name == 'main/libesescso.so')
    return '../main/libesescso.so';
  else
    return name.replace('run/', '');
};
