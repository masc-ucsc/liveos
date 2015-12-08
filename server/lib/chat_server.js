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

module.exports = function(user, users, io)
{
	var self = this;
  this.chat_log = require("../models/chat_log.js");
	this.sockets = [];
	this.online_users = [];

	io.of("/chat").on("connection", function (socket) {
		socket.on("connect_to_server", function(obj2) {
  			users.authenticate(obj2, function(obj) {
  				socket.user_id = obj.user_id;
  				self.sockets[obj.user_id] = socket;
  				self.online_users.push(obj.user_id);
  				user.findOne({_id: obj.user_id}, function(err,data) {
  					socket.user_name = data.full_name;
  					io.of("/chat").emit("user_joined", {user_id: socket.user_id, user_name: socket.user_name});
  				});
  				console.log("User registered: "+socket.user_id);
  			});
  		});

      //on each new message
  		socket.on("send_message", function(obj) {
  			if(self.sockets[obj.target_id])
  			{
  				self.sockets[obj.target_id].emit("receive_message", {user_id: socket.user_id, user_name: socket.user_name, message: obj.message});
  			}
			socket.emit("receive_message", {user_id: obj.target_id, user_name: socket.user_name, message: obj.message});
          	self.store_log(socket.user_id, obj.target_id, obj.message);
  		});

      //on request for chat history
      socket.on("request_chat_history", function(obj) {
        self.get_history([socket.user_id, obj.target_id], obj.mode, socket);
      });

  		socket.on("disconnect", function() {
  			self.sockets[socket.user_id] = null;
  			var t = self.online_users.indexOf(socket.user_id);
  			self.online_users.splice(t,1);
  			console.log("User left: "+socket.user_id);
  			io.of("/chat").emit("user_left", {user_id: socket.user_id, user_name: socket.user_name});
  			io.sockets.emit("user_left", {user_id: socket.user_id});
  		});
	});
  
  //Storing a chat log record to the database
  this.store_log = function(sender, recipient, message)
  {
    var log = new self.chat_log();
    log.timestamp = Date.now();
    log.sender = sender;
    log.recipient = recipient;
    log.message = message;
    log.save(function(err) {
      if(err)
        console.log("Chat Server: Error saving log: " + err);
    });
  };

  //Showing chat history for the past hour, past day, past week, past month
  this.get_history = function(chat_users, mode, socket)
  {
    //generating the correct time criteria
    var cstamp = Date.now();
    var timelimit = cstamp - mode*3600000;

    //finding out participants" names
    user.find({"_id": {$in: chat_users}}, "_id full_name", function(err, data) {
      var users_name = {};
      for(var i=0;i<data.length;i++)
      {
        var t = data[i]._id.toString();
        users_name[t] = data[i].full_name;
      }
      //getting the messages
      self.chat_log
        .find({$or: [{"sender": chat_users[0], "recipient": chat_users[1]}, {"sender": chat_users[1], "recipient": chat_users[0]}]})
        .where("timestamp").gt(timelimit)
        .sort("timestamp")
        .select("sender recipient message")
        .exec(function(err, data) {
          socket.emit("receive_chat_history", {history: data, users: chat_users, names: users_name});
        });
    });
  };
};