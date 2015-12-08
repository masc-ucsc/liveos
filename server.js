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

//define external libraries and tools to be used
var express         = require("express");
var morgan          = require("morgan");
var bodyParser      = require("body-parser");
var cookieParser    = require("cookie-parser");
var session         = require("express-session");
var mongoose        = require("mongoose");
var passport        = require("passport");
var flash           = require("connect-flash");
var socketIO        = require("socket.io");
var http            = require("http");
var path            = require("path");
var terminal        = require("term");
var fs              = require("fs");
var fse             = require("fs-extra");

//define internal tools and libraries to be used
var configDB        = require("./server/database.js");
var user            = require("./server/models/user.js");
var ot_model        = require("./server/models/ot_model.js");
var project         = require("./server/models/project.js");
var users_lib       = require("./server/lib/user_server.js");
var chat_server     = require("./server/lib/chat_server.js");
var file_server     = require("./server/lib/file_server.js");
var terminal_server = require("./server/lib/terminal_server.js");
var settings_server = require("./server/lib/settings_server.js");
var index           = require("./server/models/index.js");

//check config files
if(! fs.existsSync("etc/server.json")) {
  fs.mkdirSync("etc");
  fse.copySync("conf/server.json", "etc/server.json");
  fse.copySync("conf/debug.json", "etc/debug.json");
}
var conf = JSON.parse(fs.readFileSync("etc/server.json"));

// Define required variables and objects
var port = conf.ports.main;
var app = express();

var daemons = {};
var global_tokens = {};
global_tokens.keys = [];
global_tokens.map = {};
global_tokens.keys[0] = "JKJKd00_435jmkMM235345tp3456M2^^7820@_++4!";
global_tokens.map.daemons = 0;

//connect to database
connect_to_mongo();

//passport.js
require("./server/passport")(passport, conf);

//set up express.js
var appServer = http.createServer(app);
app.use(cookieParser());
app.use(bodyParser());
app.use(express.static(path.join(__dirname, "/public")));
app.set("view engine", "ejs");

//passport.js configuration
app.use(session({ secret: "sdfklsdjr4__23942jk34hjHNB!" }));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use(index.middleware());
app.use(function(req, res, next) {
  var setHeader = res.setHeader;
  res.setHeader = function(name) {
    switch (name) {
      case "Cache-Control":
      case "Last-Modified":
      case "ETag":
        return;
    }
    return setHeader.apply(res, arguments);
  };
  next();
});

//start listening to socket.io connections
var io = socketIO.listen(appServer);  

//initialize servers
var users = new users_lib(user, project, io, mongoose);
var chserver = new chat_server(user, users, io);
var tserver = new terminal_server(__dirname);
var fserver = new file_server(path, __dirname, users, user, io, tserver, ot_model);
var settingss = new settings_server(io, user, project, __dirname);

//set up passport.js routes
require("./server/routes.js")(app, passport, project, global_tokens, generate_token, remove_token, settingss, conf);

//project-related events
io.sockets.on("connection", function (socket) {

//getting the list of all projects
  socket.on("get_projects", function(obj2) {
    users.authenticate(obj2, function(obj) {
      project.find({users: obj.user_id}, function (err, data) {
        socket.emit("receive_projects", {projects: data});
      });
    });
  });

  socket.on("update_tokens_req", function (obj) {
    socket.emit("update_tokens", {tokens: global_tokens});
    daemons[obj.name] = socket;
    console.log("Daemon Registered: " + obj.name);
  });

  //searching in projects
  socket.on("search_projects", function(obj2) {
    users.authenticate(obj2, function(obj) {
      project.find({users: obj.user_id, "name": {"$regex": obj.search_key, "$options": "i"}}, function (err, data) {
        socket.emit("search_projects_result", {projects: data});
      });
    });
  });


  //creating a new project
  socket.on("new_project", function(obj2) {
    users.authenticate(obj2, function(obj) {
      project.findOne({name: obj.name}, function (err, data) {
        if(data)
          socket.emit("project_name_exists",{});
        else
        {
          //adding the project record
          var new_project = new project();
          new_project.name = obj.name;
          //adding the current user to the project
          var project_users = [];
          project_users.push(obj.user_id);
          new_project.users = project_users;
          //saving the record
          new_project.save(function(err) {
            if(err)
              socket.emit("creat_project_error", {message: err});
            else
            {
              project.findOne({name: obj.name}, function(err, data2) {
                fserver.create_project_folder(data2._id);
                socket.emit("project_added", {project: data2});
              });
            }
            
          });
        }
      });
    });
  });
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

//start listening
appServer.listen(port);
console.log("Server started successfully on port " + port);

//fgenerate new secret token
function generate_token (tokens, user_id) {
  if(tokens.map[user_id] !== null && tokens.keys[tokens.map[user_id]])
    return tokens.keys[tokens.map[user_id]];
  var length = 128;
  var chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  var result = "";
  for (var i = length; i > 0; --i) 
    result += chars[Math.round(Math.random() * (chars.length - 1))];
  if(tokens.keys.indexOf(result) != -1) {
    return generate_token(tokens, user_id);
  } else {
    tokens.keys.push(result);
    tokens.map[user_id] = tokens.keys.indexOf(result);
    update_daemons();
    return result;
  }
}

//expire secret token
function remove_token (tokens, user_id) {
  var t = tokens.map[user_id];
  if(t !== null) {
    tokens.keys.splice(t, 1);
    tokens.map[user_id] = null;
    update_daemons();
  }
}

//synchronize tokens with other daemons
function update_daemons () {
  for(var d in daemons) {
    if(daemons[d])
      daemons[d].emit("update_tokens", {tokens: global_tokens});
  }
}

//try and connect to mongodb
function connect_to_mongo() {
  mongoose.connect(configDB.url, function (err) {
    if(err) {
    console.error("Failed to connect to MongoDB, retrying ...");
    setTimeout(connect_to_mongo, 1000);
    }
  });
}