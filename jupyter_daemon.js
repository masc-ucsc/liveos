var terminal_server = require('./server/lib/terminal_server.js');
var ts = new terminal_server(__dirname);
ts.run('ipython notebook --profile live', 'files/', function(stdout) {
  console.log(stdout);
}, function(stderr) {
  console.log(stderr);
});
