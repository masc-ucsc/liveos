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

module.exports = function (main_path, io, ts) {
  var self = this;
  this.fs = require("fs");
  this.dl = require("delivery");
  this.ts = ts;
  this.source_folder = main_path + "/files/";
  this.source_files = {};
  this.delivery = {};
  this.make_folders = {};

  //Creating socket.io server
  io.of("/latex").on("connection", function (socket) {

    socket.delivery = self.dl.listen(socket);

    //Registering for file delivery
    socket.on("register_delivery", function (obj) {
      console.log("LaTeX: Registering delivery " + obj.project_id + "/" + obj.source_file);
      var id = obj.project_id + "/" + obj.source_file;

      //removing any previous deliveries
      if(socket.delivery_id) {
        var t = self.delivery[socket.delivery_id].indexOf(socket);
        self.delivery[socket.delivery_id].splice(t, 1);
      }

      //Adding the new delivery
      if(!self.delivery[id])
        self.delivery[id] = [];
      self.delivery[id].push(socket);
      socket.delivery_id = id;
      socket.emit("delivery_registered", {});
    });

    //Recompiling
    socket.on("recompile", function(obj) {
      self.recompile(obj.project_id, obj.source_file);
    });

    //File request
    socket.on("get_result", function (obj) {
      var pdf_file;
      console.log("LaTeX: Result request for " + obj.project_id + "/" + obj.source_file);
      if(self.check_extension(obj.source_file, "tex") && self.fs.existsSync(self.source_folder + obj.project_id + "/" + obj.source_file)) {
        pdf_file = obj.source_file.substring(0, obj.source_file.length - 4) + ".pdf";
      } else if(self.fs.existsSync(self.source_folder + obj.project_id + "/" + obj.source_file + "Makefile")) {
        pdf_file = obj.source_file + "main.pdf";
        self.make_folders[obj.project_id + "/" + obj.source_file] = true;
      } else {
        console.log("LaTeX: Invalid source file " + obj.project_id + "/" + obj.source_file);
        socket.emit("latex_error", {message: "Invalid source file!"});
        return;
      }
      if(self.fs.existsSync(self.source_folder + obj.project_id + "/" + pdf_file)) {
        self.send_file(socket.delivery, obj.project_id, pdf_file);
      } else {
        self.recompile(obj.project_id, obj.source_file);
      }
    });

    //disconnect
    socket.on("disconnect", function (obj) {
      //removing any previous deliveries
      if(socket.delivery_id) {
        console.log("LaTeX: client disconnect");
        var t = self.delivery[socket.delivery_id].indexOf(socket);
        self.delivery[socket.delivery_id].splice(t, 1);
      }
    });
  });
  
  this.send_file = function (d, project_id, pdf_file) {
    console.log("LaTeX: Sending file " + project_id + "/" + pdf_file);
    var file_name = pdf_file;
    var t;
    while((t = file_name.indexOf("/")) != -1)
      file_name = file_name.substring(t + 1);

    d.send({
      name: file_name,
      path: self.source_folder + project_id + "/" + pdf_file
    });
  };

  this.recompile = function (project_id, source_file) {
    console.log("LaTeX: Recompiling " + project_id + "/" + source_file);
    //finding source folder and file name
    var cmd;
    var file_name = source_file;
    var t;
    var source;
    while((t = file_name.indexOf("/")) != -1)
      file_name = file_name.substring(t + 1);
    folder = source_file.replace(file_name, "");
    if(self.make_folders[project_id + "/" + folder]) {
      cmd = "make";
      source = project_id + "/" + folder;
    } else {
      cmd = "rubber -W refs -W misc -f -m xelatex -d " + file_name;
      source = project_id + "/" + source_file;
    }
    self.ts.run(cmd, "files/" + project_id + "/" + folder, function () {
      if(!self.delivery[source])
        return;
      var pdf_file;
      if(self.make_folders[project_id + "/" + folder])
        pdf_file = self.find_pdf_file(project_id, folder);
      else
        pdf_file = source_file.substring(0, source_file.length - 4) + ".pdf";
      if(pdf_file === "") {
        console.log("no pdf file found");
        return;
      }
      self.delivery[source].forEach(function (d) {
        self.send_file(d.delivery, project_id, pdf_file);
      });
    }, function (err) {
      if(!self.delivery[source])
        return;
      self.delivery[source].forEach(function (d) {
        d.emit("latex_error", {message: err});
      });
    });
  };

  this.check_extension = function (file, ext) {
    var str = file;
    var t;
    while((t = str.indexOf(".")) != -1)
      str = str.substring(t + 1);
    return (str == ext);
  };

  this.find_pdf_file = function (project_id, folder) {
    if(self.fs.existsSync(self.source_folder + project_id + "/" + folder + "main.pdf"))
      return folder + "main.pdf";

    var files = self.fs.readdirSync(self.source_folder + project_id + "/" + folder);
    for(var i = 0; i < files.length; i++) {
      if(files[i].search(".pdf") != -1)
        return folder + files[i];
    }

    return "";    
  };
};