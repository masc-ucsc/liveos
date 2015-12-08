module.exports = function (main_path, io, ts) {
  var self = this;
  this.fs  = require('fs');
  this.dl  = require('delivery');
  this.ts  = ts;

  this.yosys_src     = main_path + '/yosys';
  this.yosys_bin     = main_path + '/yosys/yosys';
  this.build_script  = main_path + '/yosys/synthesis.ys'; //not in use yet
  this.source_folder = main_path + '/files/';
  this.source_files  = new Object();

  this.delivery      = new Object();
  this.make_folders  = new Object();

  this.binary          = "~/repository/live/synthesis/yosys/yosys";
  this.frontend_script = "~/repository/live/synthesis/yosys/rtp_front.ys";

  //Creating socket.io server
  io.of('/yosys').on('connection', function (socket) {

    socket.delivery = self.dl.listen(socket);
    self.socket = socket;

    //Registering for file delivery
    socket.on('register_delivery', function (obj) {
      console.log('YOSYS: Registering delivery ' + obj.project_id + this.source_folder + obj.source_file);

      var id = this.source_folder + obj.project_id + obj.source_file;
      var file = this.source_folder + obj.project_id + obj.source_file;

      //removing any previous deliveries
      if(socket.delivery_id) {
        var t = self.delivery[socket.delivery_id].indexOf(socket);
        self.delivery[socket.delivery_id].splice(t, 1);
      }

      //Adding the new delivery
      if(!self.delivery[id])
        self.delivery[id] = new Array();

      self.delivery[id].push(socket);
      socket.delivery_id = id;
      socket.emit('delivery_registered', {});
    });

    //Recompiling
    socket.on('recompile', function(obj) {
      self.recompile(obj.project_id, obj.source_file, function() {
        console.log("completed yosys frontend without errors");
        socket.emit('compilation_complete');
      }, 
      function(err) {
        console.log("error while compiling source");
        console.log(err);
        socket.emit('compilation_error', err);
      });
    });

    //disconnect
    socket.on('disconnect', function (obj) {
      //removing any previous deliveries
      if(socket.delivery_id) {
        console.log('YOSYS: client disconnect');
        var t = self.delivery[socket.delivery_id].indexOf(socket);
        self.delivery[socket.delivery_id].splice(t, 1);
      }
    });
  });


  this.recompile = function (project_id, source_file, success, error) {
    console.log('YOSYS: Recompiling ' + project_id + '/' + source_file);
    //finding source folder and file name
    var cmd;
    var file_name = source_file;
    var t;
    var source;

    while((t = file_name.indexOf('/')) != -1) {
      file_name = file_name.substring(t + 1);
    }

    folder = source_file.replace(file_name, '');

    cmd = self.binary + ' -S ' + file_name + ' ' + self.frontend_script;
    //source = project_id + '/' + source_file;
    console.log(cmd);
    self.ts.run(cmd, 'files/' + project_id + '/' + folder, success, error);
  };

  this.check_extension = function (file, ext) {
    var str = file;
    var t;
    while((t = str.indexOf('.')) != -1)
      str = str.substring(t + 1);
    return (str == ext);
  };
};
