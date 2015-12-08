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
 *     Ethan Papp
 */

module.exports = function (io, user, project, main_path) {
  var self = this;
  this.io = io;
  this.user = user;
  this.project = project;
  this.main_path = main_path;
  this.fs = require("fs");
  this.apps = {};

  //Creating socket.io server
  this.io.of("/settings").on("connection", function (socket) {
    socket.on("get_settings", function(obj) {
      //User Settings
      self.user.findOne({_id: obj.user_id}, "settings", function (err, data) {
        data.settings = self.check_settings(data.settings, obj.user_id);
        socket.emit("receive_settings", {user_id: obj.user_id, settings: data.settings, global_settings: self.global_settings});
      });

      //Project Settings
      self.project.findOne({_id: obj.project_id}, "settings", function (err, data) {
        if(!data.settings)
          data.settings = {};
        socket.emit("receive_settings", {project_id: obj.project_id, settings: data.settings});
      });
    });

    socket.on("reset_settings", function (obj) {
      if(!obj.user_id)
        return;
      console.log("Settings: resetting user " + obj.user_id);
      self.save_default_settings(obj.user_id, self.default_settings, function (st) {
        self.io.of("/settings").emit("receive_settings", {user_id: obj.user_id, settings: st, global_settings: self.global_settings});
      });
    });

    socket.on("update_setting", function (obj) {
      var ent, id;
      if(obj.user_id) {
        console.log("Settings: update for user " + obj.user_id);
        self.user.findOne({_id: obj.user_id}, "settings", function (err, data) {
          if(!data.settings)
            data.settings = {};
          data.settings[obj.name] = obj.value;
          self.user.update({_id: obj.user_id}, {$set: {settings: data.settings}}, function () {
            self.io.of("/settings").emit("receive_settings", {user_id: obj.user_id, settings: data.settings, global_settings: self.global_settings});
          });
        });
      } else if(obj.project_id) { 
        console.log("Settings: update for project " + obj.project_id);
        self.project.findOne({_id: obj.project_id}, "settings", function (err, data) {
          if(!data.settings)
            data.settings = {};
          data.settings[obj.name] = obj.value;
          self.project.update({_id: obj.project_id}, {$set: {settings: data.settings}}, function () {
            self.io.of("/settings").emit("receive_settings", {project_id: obj.project_id, settings: data.settings});
          });
        });  
      }
    });

    socket.on("log_new_git_token", function(obj){
      console.log("Adding new git token for " + obj.user_id + " in project " + obj.project_id);
      
      self.user.update({_id: obj.user_id}, {$set: {git_token: obj.token}}, function () {
        console.log("Token added.");
        socket.emit("log_new_git_token_suceed");
      });

      //self.user.findOne({_id: obj.user_id}, "git_token", function (err, data) {
      //  console.log("LOOK WE GOT IT: " + data + "OR: " + err);

      //});
    });

    socket.on("log_new_pubpriv_pair", function(obj){
      console.log("Adding new pub/priv key for " + obj.user_id + " in project " + obj.project_id);
      //console.log("pub: \n" + obj.pub + "\n");
      //console.log("priv: \n" + obj.priv + "\n");


      self.user.update({_id: obj.user_id}, {$set: {git_pub_key: obj.pub}}, function () {
        self.user.update({_id: obj.user_id}, {$set: {git_priv_key: obj.priv}}, function () {
          console.log("Pub/priv pair added.");
          socket.emit("log_new_pubpriv_suceed");    

        });
      });
    });

    socket.on("log_new_pub", function(obj){
      console.log("Adding new pub key for " + obj.user_id + " in project " + obj.project_id);      
      self.user.update({_id: obj.user_id}, {$set: {git_pub_key: obj.pub}}, function () {
          console.log("Pub key added.");
          socket.emit("log_new_pub_suceed");    

      });
    });

    socket.on("log_new_priv", function(obj){
      console.log("Adding new priv key for " + obj.user_id + " in project " + obj.project_id);      
      self.user.update({_id: obj.user_id}, {$set: {git_priv_key: obj.priv}}, function () {
          console.log("Priv key added.");
          socket.emit("log_new_priv_suceed");    

      });
    });

    socket.on("erase_user_pubpriv", function(obj){
      
      self.user.update({_id: obj.user_id}, {$set: {git_priv_key: "erased"}}, function () {
          console.log("Set user " + obj.user_id + " priv key as undefined");   
 
      });

      self.user.update({_id: obj.user_id}, {$set: {git_pub_key: "erased"}}, function () {
          console.log("Set user " + obj.user_id + " pub key as undefined");   

      });

    });

    socket.on("erase_user_token", function(obj){
      
      self.user.update({_id: obj.user_id}, {$set: {git_token: "erased"}}, function () {
          console.log("Set user " + obj.user_id + " token as undefined");   
 
      });

    });

  });
  
  this.check_settings = function (cur, user_id) {
    if(! cur) {
      self.save_default_settings(user_id, self.default_settings);
      return self.default_settings;
    }

    var needs_update = false;
    for(var key in self.default_settings) {
      if(! cur[key]) {
        cur[key] = self.default_settings[key];
        needs_update = true;
      } else {
        if(typeof(self.default_settings[key]) == "object") {
          for(var k2 in self.default_settings[key]) {
            if(!cur[key][k2]) {
              cur[key][k2] = self.default_settings[key][k2];
              needs_update = true;
            }
          }
        }
      }
    }

    if(needs_update)
      self.save_default_settings(user_id, cur);
    return cur;
  };

  this.save_default_settings = function (user_id, cur, callback) {
    self.user.update({_id: user_id}, {$set: {settings: cur}}, function () {
      console.log("Default settings updated for user " + user_id);
      if(callback)
        callback(cur);
    });
  };

  this.update_app_list = function () {
    self.fs.readdir(self.main_path + "/public/apps/", function(err, list){
      //load app descriptors
      self.apps = {};
      list.forEach(function (appname) {
        if(self.fs.existsSync(self.main_path + "/public/apps/" + appname + "/descriptor.json")) {
          self.apps[appname] = JSON.parse(self.fs.readFileSync(self.main_path + "/public/apps/" + appname + "/descriptor.json"));
        }
      });

      //load global and default settings
      self.global_settings = JSON.parse(self.fs.readFileSync(self.main_path + "/conf/global_settings.json"));
      self.default_settings = JSON.parse(self.fs.readFileSync(self.main_path + "/conf/default_settings.json"));

      //add app shortcuts
      for(var appname in self.apps) {
        app = self.apps[appname];
        if(app.shortcut !== "") {
          self.global_settings.shortcuts[app.name] = {};
          self.global_settings.shortcuts[app.name].title = app.title;
          self.global_settings.shortcuts[app.name].function = "apps." + app.name + ".open()";
          self.default_settings.user_scuts[app.name] = app.shortcut;
        }
      }
    });
  };

  self.update_app_list();
};