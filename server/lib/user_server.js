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

module.exports = function(user, project, io, mongoose)
{
	//Defining the fields
	var self = this;
	this.user = user;
	this.project = project;
	this.io = io;
	this.mongoose = mongoose;
	this.online_users = [];
	this.online_sockets = [];

	this.io.of("/user_server").on("connection", function (socket) {
		//getting the list of users in a project
		socket.on("get_project_users", function(obj) {
			self.project.findOne({_id: obj.project_id}, "users", function(err, data) {
				var user_ids = [];
				data.users.forEach(function(user_id) {
					var t = self.mongoose.Types.ObjectId(user_id);
					user_ids.push(t);
				});
				self.user.find({_id: {$in: user_ids}, "full_name": {"$regex": obj.full_name, "$options": "i"}}, "_id full_name", {limit: 20}, function(err, data2) {
					//taking care of in-project users
					if(err)
						console.log(err);
					else
					{
						var user_stat = {};
						data2.forEach(function(user) {
							var useridstr = user._id.toString();
							if(self.online_users.indexOf(useridstr) == -1)
								user_stat[useridstr]=0;
							else
								user_stat[useridstr]=1;
						});
					}
					//taking care of other users
					user.find({_id: {$not: {$in: user_ids}}, "full_name": {"$regex": obj.full_name, "$options": "i"}}, "_id full_name email", {limit: 20-data2.length}, function(err, data3) {
						if(err)
							console.log(err);
						else
						{
							var other_user_stat = {};
							data3.forEach(function(user) {
								var useridstr = user._id.toString();
								if(self.online_users.indexOf(useridstr) == -1)
									other_user_stat[useridstr]=0;
								else
									other_user_stat[useridstr]=1;
							});
							socket.emit("receive_project_users", {users: data2, user_status: user_stat, other_users: data3, other_user_status: other_user_stat});
						}
					});
	   			});
			});
		});

		//getting the list of all users
		socket.on("get_all_users", function(obj) {
			self.user.find({"full_name": {"$regex": obj.full_name, "$options": "i"}}, "_id full_name", function(err, data) {
				self.project.findOne({_id: obj.project_id}, "users", function(err, data2) {
	        		socket.emit("receive_all_users", {users: data, project_users: data2});
	        	});
	   		});
		});

		//adding a user to a project
		socket.on("add_user_to_project", function(obj) {
			self.project.update({_id: obj.project_id}, {$push: {users: obj.user_id}}, function() {
				socket.emit("user_added_to_project");
			});
		});
	});

	this.io.sockets.on("connection", function (socket) {
		//registration and authentication
		socket.on("connect_to_server", function(obj2) {
			self.authenticate(obj2, function(obj) {
				socket.user_id = obj.user_id;
				self.online_users.push(obj.user_id);
				self.online_sockets[obj.user_id] = socket;
			});
		});

		//disconnection
		socket.on("disconnect", function() {
			if(socket.user_id)
			{
				var t = self.online_users.indexOf(socket.user_id);
				self.online_users.splice(t,1);
				if(self.online_sockets[socket.user_id])
					self.online_sockets[socket.user_id] = null;
			}
		});
	});

	this.authenticate = function(obj, success)
	{
		self.user.findOne({_id: obj.user_id}, function(err, data)
		{
			if(data !== null && data.signature !== null && data.signature == obj.signature)
				success(obj);
			else
				console.log("Authorization failed");
		});
	};	
};