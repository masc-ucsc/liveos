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

module.exports = function(path, main_path, users, user, io, ts, ot_model)
{
	var self = this;
	this.ot  = require("ot");
	this.fs = require("fs");
	this.fse = require("fs-extra");
	this.dl = require("delivery");
	this.home_folder = main_path+"/files";
	this.admin_path = main_path;
	this.cm_servers = [];
	this.io = io;
	this.users = users;
	this.user = user;
	this.ts = ts;
	this.ot_model = ot_model; //use this, not USER!
	this.touch_flags = {};
	this.watch_touch = {};
	this.self_touch = {};
	this.save_session_obj = {};
  this.save_user_id = "";
  this.personal_slider_old_time = "";
  this.personal_slider_time_delta = "";
  this.all_slider_old_time = "";
  this.all_slider_time_delta = "";
  this.subset_slider_old_time = "";
  this.subset_slider_time_delta = "";

	//make sure that the home folder exists
	if(! self.fs.existsSync(self.home_folder))
		self.fs.mkdirSync(self.home_folder);

	this.io.of("/file_server").on("connection", function (socket) {
		//Delivery service
		socket.delivery = self.dl.listen(socket);
		socket.delivery.save_path = "";
		socket.delivery.on("receive.success",function(file){
			self.fs.writeFile(self.home_folder + "/" + socket.delivery.save_path + "/" + file.name, file.buffer, function(err) {
	      if(err) {
	      	console.log(file.name);
	        console.log("File could not be saved.");
	      } else {
	        console.log("File saved.");
	        var file_id = socket.delivery.save_path + "/" + file.name;
	        self.io.of("/file_server").emit("file_add_node", {parent: socket.delivery.save_path, file_name: file.name, file_id: file_id, file_type: "file"});
	      }
	    });
		});

		socket.on("wait_for_upload", function (obj) {
			socket.delivery.save_path = obj.path;
			socket.emit("upload_ack", {});
		});

		socket.on("download", function (obj) {
			if(!self.fs.existsSync(self.home_folder + "/" + obj.id)) {
				console.error("File does not exist: " + obj.id);
				return;
			}
			if(obj.type == "folder") {
				self.ts.run("zip -r " + self.home_folder + "/" + obj.id + ".zip " + self.home_folder + "/" + obj.id, self.home_folder, function () {
					try {
						socket.delivery.send({name: obj.name + ".zip", path: self.home_folder + "/" + obj.id + ".zip"});
					} catch (err) {
						console.error(err);
					}
				});
			} else {
				socket.delivery.send({name: obj.name, path: self.home_folder + "/" + obj.id});
			}
		});

		//handling file request
		socket.on("file_request", function(obj) {
			console.log("file request", self.cm_servers[obj.file_id]);

			self.user.findOne({_id: obj.user_id}, function (err, data) {
				if(data && (!obj.admin_mode || data.admin)) {
					if(self.cm_servers[obj.file_id]) {
						socket.emit("file_request_granted", {file_id: obj.file_id});
					} else {
						self.create_ot(obj.file_id, function () {
							socket.emit("file_request_granted", {file_id: obj.file_id});
						}, function (msg) {
							socket.emit("file_request_denied", {file_id: obj.file_id, msg: msg});
						}, obj.admin_mode);
					}
				} else {
					socket.emit("file_request_denied", {file_id: obj.file_id, msg: "You do not have admin access"});
				}
			});
		});

		socket.on("create_file", function(obj) {
			var full_path = self.home_folder+"/"+obj.file_id;
			self.fs.readFile(full_path, {encoding: "utf-8"}, function(err,data){
				if(!err)
				{
					socket.emit("create_file_error", {message: "File already exists."});
				}
				else
				{
					if(obj.new_ot_rev_content === undefined) {
						self.fs.writeFile(full_path, "", function(err) {
							if(!err)
								socket.emit("file_created", {file_id: obj.file_id});
						});
					}else if(obj.new_ot_rev_content){
						self.fs.writeFile(full_path, obj.new_ot_rev_content, function(err) {
							if(!err)
								socket.emit("file_created", {file_id: obj.file_id});
								//self.io.of("/file_server").emit("new_ot_revision_file_refresh");
								self.io.of("/file_server").emit("file_add_node", {project_id: obj.project_id, file_id: obj.file_id, file_name: obj.file_name, parent: obj.parent, type: obj.file_type});
						});
					}
				}
			});
		});

		//File delete
		socket.on("delete_file", function(obj) {
			var full_path = self.home_folder+"/"+obj.file_id;
			self.fs.unlink(full_path, function (err) {
				if(err)
					socket.emit("delete_file_error", {message: err});
				else
					socket.emit("file_deleted", {file_id: obj.file_id});
			});
		});

		//getting the list of project files in a path
		socket.on("get_file_list", function(obj) {
			var full_path = self.home_folder+"/"+obj.path;
			self.fs.readdir(full_path, function (err, stats) {
				if (err)
					console.log(err);
				else
				{
					folders = [];
					files = [];
					for(i=0;i<stats.length;i++)
					{
						if(self.fs.statSync(full_path+"/"+stats[i]).isDirectory())
							folders.push(stats[i]);
						else
							files.push(stats[i]);
					}
			    	socket.emit("receive_file_list", {files: files, folders: folders, root: obj.path});
				}
			});
		});

		//Renaming and adding files
		socket.on("file_rename", function(obj) {
			//check if the file is loaded in the OT server, save and kill
			if(self.cm_servers[obj.file_id])
			{
				self.update_file(obj.file_id, function() {
					self.kill_file_ot(obj.file_id);
				});
			}
			var old_path = self.home_folder+"/"+obj.file_id;
			var new_path = self.home_folder+"/"+obj.parent+"/"+obj.name;

			//if the old file exists it means rename, otherwise it"s a new file
			if(self.fs.existsSync(old_path))
			{
				self.fs.rename(old_path, new_path, function (err, files) {
					if (err)
						socket.emit("file_rename_error", {message: err, file_id: obj.file_id});
					else
						self.io.of("/file_server").emit("file_rename_success", {file_id: obj.file_id, parent: obj.parent, name: obj.name});
				});
			}
			else
			{
				if(obj.type == "folder")
				{
					self.fs.mkdir(new_path, function(err) {
					if (err)
						socket.emit("file_rename_error", {message: err, file_id: obj.file_id, });
					else
						self.io.of("/file_server").emit("file_rename_success", {file_id: obj.file_id, parent: obj.parent, name: obj.name});
					});
				}
				else
				{
					self.fs.writeFile(new_path, "", function(err) {
						if(err)
							console.log(err);
						else
							self.io.of("/file_server").emit("file_rename_success", {file_id: obj.file_id, parent: obj.parent, name: obj.name});
					});
				}
			}
		});

		socket.on("file_remove", function(obj) {
			var full_path = self.home_folder+"/"+obj.file_id;
			self.fse.remove(full_path, function(err){
				if (err) 
			  		console.error(err);
			  	else
			  		self.io.of("/file_server").emit("file_remove_node", {file_id: obj.file_id});
			});
		});

		socket.on("file_copy", function(obj) {
			var file_id = obj.target_id + "/" + obj.file_name;
			self.fse.copy(self.home_folder+"/"+obj.source_id, self.home_folder+"/"+file_id, function(err){
				if (err) 
			  		console.error(err);
			    else
						self.io.of("/file_server").emit("file_add_node", {parent: obj.target_id, file_name: obj.file_name, file_id: file_id, file_type: obj.file_type});
			});
		});

		socket.on("file_cut", function(obj) {
			var file_id = obj.target_id + "/" + obj.file_name;
			self.fse.copy(self.home_folder+"/"+obj.source_id, self.home_folder+"/"+file_id, function(err){
				if (err) 
			  		console.error(err);
			    else
			    {
					self.io.of("/file_server").emit("file_add_node", {parent: obj.target_id, file_name: obj.file_name, file_id: file_id, file_type: obj.file_type});
			    	self.fse.remove(self.home_folder+"/"+obj.source_id, function(err){
			    		if (err) 
			  				console.error(err);
			  			else
			  				self.io.of("/file_server").emit("file_remove_node", {file_id: obj.source_id});
			    	});
			    }
			});
		});

		socket.on("request_personal_timestamp_hover", function(obj){
			var hover_date = new Date(self.personal_slider_old_time + ((obj.slider_val/100) * self.personal_slider_time_delta));
			var string_hover_date = hover_date.toString();
			//console.log("hover val: " + string_hover_date);
			socket.emit("personal_timestamp_hover", {hover_val: string_hover_date});
		});


		socket.on("request_personal_ot_revs", function(obj) {

			var cstamp = Date.now();
			var new_time;
			var old_time;
			var time_delta;

			self.ot_model //THIS EXEC GETS THE OLDEST TIMESTAMP
      .find({$and: [ {"file_id": obj.file_id}, {"user_id": obj.user_id}]})
      .where("timestamp").lt(cstamp)
      .sort("timestamp")
      .select("timestamp")
      .exec(function(err, data) { 
      	if(data === undefined || data[0] === undefined){
      		socket.emit("no_ot_info");
      	} else {
      		new_time = data[data.length - 1].timestamp;
      		old_time = data[0].timestamp;
      		time_delta = (data[data.length - 1].timestamp) - (data[0].timestamp); //this should be the oldest timestamp in the query results
        	socket.emit("personal_old_date", {old_date: old_time, new_date: new_time}); //this is to populate the "oldest time" on the GUI slider for personal OT revisions
        	self.personal_slider_old_time = old_time; //set the params to populte the popup over the slider
  				self.personal_slider_time_delta = time_delta;

        }
				
        if(obj.log_flag === false){ //this is for the DB query that handles the diff view, notice the GT time query
	        self.ot_model //THIS EXEC GETS THE INFO REQUESTED
	        .find({$and: [ {"file_id": obj.file_id}, {"user_id": obj.user_id}]})
	        .where("timestamp").gt(old_time + ((obj.slider_val/100) * time_delta)) 
	        .sort("timestamp")
	        .select("operation timestamp user_id")
	        .exec(function(err, data) {
	        	if(data === undefined || data[0] === undefined){
	        	} else {
	        		if(obj.log_flag === false && obj.refresh_req === true){ //we only need an updated CM file string if the user has hit the refresh button
	        			//send CM file string here
	        			socket.emit("personal_ot_revs_suc", {ot_history: data, cm_content: self.cm_servers[obj.file_id].document});

	        		} else {

	        			socket.emit("personal_ot_revs_suc", {ot_history: data, cm_content: null});

	        		}

	          }
	        });
	      } else if(obj.log_flag === true){ //this is for the DB query that handles the diff view, notice the LT time query
	      	self.ot_model //THIS EXEC GETS THE INFO REQUESTED
	        .find({$and: [ {"file_id": obj.file_id}, {"user_id": obj.user_id}]})
	        .where("timestamp").lt(old_time + ((obj.slider_val/100) * time_delta)) 
	        .sort("timestamp")
	        .select("operation timestamp user_id")
	        .exec(function(err, data) {
	        	if(data === undefined || data[0] === undefined){
	        		//console.log("oops there was an OT DB error: " + err);
	        		socket.emit("no_ot_info");
	        	} else {
	        		//console.log("personal OT_info success");
	        		if(obj.log_flag === false && obj.refresh_req === true){ //we only need an updated CM file string if the user has hit the refresh button
	        			//send CM file string here
	        			//console.log("WEEWOO: " + self.cm_servers[obj.file_id].document);
	        			socket.emit("personal_ot_revs_suc", {ot_history: data, cm_content: self.cm_servers[obj.file_id].document});

	        		} else {

	        			socket.emit("personal_ot_revs_suc", {ot_history: data, cm_content: null});

	        		}

	          }
	        });
	      }
      });
		});	

		socket.on("request_all_timestamp_hover", function(obj){
			var hover_date = new Date(self.all_slider_old_time + ((obj.slider_val/100) * self.all_slider_time_delta));
			var string_hover_date = hover_date.toString();
			//console.log("hover val: " + string_hover_date);
			socket.emit("all_timestamp_hover", {hover_val: string_hover_date});


		});

		socket.on("request_all_ot_revs", function(obj) { //need to look up user_id -> full name conversion here
			var obj_array = [];
			var cstamp = Date.now();
			var new_time;
      var old_time;
      var time_delta;

			self.ot_model //THIS EXEC GETS THE OLDEST TIMESTAMP
      .find({"file_id": obj.file_id})
      .where("timestamp").lt(cstamp)
      .sort("timestamp")
      .select("timestamp")
      .exec(function(err, data) { 
      	//console.log(data);
      	//console.log("..er: " + err);
      	if(data === undefined || data[0] === undefined){
      		//console.log("oops there was an OT DB error: " + err);
      		socket.emit("no_ot_info");
      	} else {
      		//console.log("personal OT_info success");
      		new_time = data[data.length - 1].timestamp;
      		old_time = data[0].timestamp;
      		time_delta = (data[data.length - 1].timestamp) - (data[0].timestamp); //this should be the oldest timestamp in the query results
      		socket.emit("all_old_date", {old_date: old_time, new_date: new_time}); //this is to populate the "oldest time" on the GUI slider for ALL OT revisions
      		self.all_slider_old_time = old_time; //set the params to populte the popup over the slider
  				self.all_slider_time_delta = time_delta;
        }

        if(obj.log_flag === false){
					self.ot_model 
	        .find({"file_id": obj.file_id})
	        .where("timestamp").gt(old_time + ((obj.slider_val/100) * time_delta))
	        .sort("timestamp")
	        .select("operation timestamp user_id")
	        .exec(function(err, data) {
	        	//console.log(data);
	        	//console.log("..er: " + err);
	        	if(data === undefined || data[0] === undefined){
	        		//console.log("oops there was an OT DB error: " + err);
	        		//socket.emit("no_ot_info");
	        	} else {
	        		//console.log("all OT_info success");
	          	var num_items = data.length;
	          	var i = 0;
	          	//console.log(num_items);

	          	data.forEach(function(record) {
					      //record.operation + " AT " + record.timestamp + " BY " + record.user_id + "<br />";

					      self.user.findOne({_id: record.user_id}, "full_name", function (err, data2) { //need this DB lookup to get the actual name of the person who edited, using their ID
	         				if(err || data2 === null || data2.full_name === undefined || data2 === undefined || data2.full_name === null){
	         					console.log("dont know1: " + err);
	         				} else	{
	         					i++;
	         					if(i == num_items - 1){

	         						if(obj.log_flag === false && obj.refresh_req === true){ //we only need an updated CM file string if the user has hit the refresh button
					        			//send CM file string here
					        			socket.emit("all_ot_revs_end", {cm_content: self.cm_servers[obj.file_id].document});

					        		} else {

					        			socket.emit("all_ot_revs_end", {cm_content: null});

					        		}


							      } else {			

	                		socket.emit("all_ot_revs_suc", {users_op: record.operation, users_timestamp: record.timestamp, users_name: data2.full_name}); //need to re-sort on the server side because nested DB calls distort the timing
	                	
	                	}
	              	}

	              });

					    });
	          }
	        });
				} else if (obj.log_flag === true){
					self.ot_model 
	        .find({"file_id": obj.file_id})
	        .where("timestamp").lt(old_time + ((obj.slider_val/100) * time_delta))
	        .sort("timestamp")
	        .select("operation timestamp user_id")
	        .exec(function(err, data) {
	        	//console.log(data);
	        	//console.log("..er: " + err);
	        	if(data === undefined || data[0] === undefined){
	        		//console.log("oops there was an OT DB error: " + err);
	        		socket.emit("no_ot_info");
	        	} else {
	        		//console.log("all OT_info success");
	          	var num_items = data.length;
	          	var i = 0;
	          	//console.log(num_items);

	          	data.forEach(function(record) {
					      //record.operation + " AT " + record.timestamp + " BY " + record.user_id + "<br />";

					      self.user.findOne({_id: record.user_id}, "full_name", function (err, data2) { //need this DB lookup to get the actual name of the person who edited, using their ID
	         				if(err || data2 === null || data2.full_name === undefined || data2 === undefined || data2.full_name === null){
	         					console.log("dont know2: " + err);
	         				} else	{
	         					i++;
	         					if(i == num_items - 1){

	         						if(obj.log_flag === false && obj.refresh_req === true){ //we only need an updated CM file string if the user has hit the refresh button
					        			//send CM file string here
					        			//console.log("WEEWOO: " + self.cm_servers[obj.file_id].document);
					        			socket.emit("all_ot_revs_end", {cm_content: self.cm_servers[obj.file_id].document});

					        		} else {

					        			socket.emit("all_ot_revs_end", {cm_content: null});

					        		}


							      } else {			

	                		socket.emit("all_ot_revs_suc", {users_op: record.operation, users_timestamp: record.timestamp, users_name: data2.full_name}); //need to re-sort on the server side because nested DB calls distort the timing
	                	
	                	}
	              	}

	              });

					    });
	          }
	        });
				}

			});
		});	


		socket.on("selected_subset", function(obj) {

			var uniq_username = [];
			var cstamp = Date.now();
			self.ot_model
      .find({"file_id": obj.file_id})
      .where("timestamp").lt(cstamp)
      .sort("timestamp")
      .select("user_id")
      .exec(function(err, data) {
      	//console.log(data);
      	//console.log("..er: " + err);
      	if(data === undefined || data[0] === undefined){
      		//console.log("oops there was an OT DB error: " + err);
      		socket.emit("no_ot_info");
      	} else {

      		var num_items = data.length;
      		//console.log(data.length);
          var i = 0;

      		data.forEach(function(record) {

			      //record.operation + " AT " + record.timestamp + " BY " + record.user_id + "<br />";
		      	
			      self.user.findOne({_id: record.user_id}, "full_name", function (err, data2) { //need this DB lookup to get the actual name of the person who edited, using their ID
       				if(err || data2 === null || data2.full_name === undefined || data2 === undefined || data2.full_name === null){
       					console.log("dont know3: " + err);
       				} else	{
       					i++;
       					if(i == num_items - 1){
       						//console.log("sent end there");
					      	socket.emit("selected_subset_end");

					      } else {

					      	if(uniq_username.indexOf(record.user_id) == -1){ 	
					      		//console.log(i);
					      		uniq_username.push(record.user_id);		
						      	//console.log("sent suc");

	              		socket.emit("selected_subset_suc", {subset_users: data2.full_name, subset_user_id: record.user_id}); //need to re-sort on the server side because nested DB calls distort the timing
	              		//console.log(data2.full_name);

              		}else{

              			if(i == num_items - 1){
						      		//console.log("sent end here");
							      	socket.emit("selected_subset_end");
							      }

              		}

              	}

              	
            	}

            });						
			      	
			    });

        }

	    });

		});	

		socket.on("request_subset_timestamp_hover", function(obj){
			var hover_date = new Date(self.subset_slider_old_time + ((obj.slider_val/100) * self.subset_slider_time_delta));
			var string_hover_date = hover_date.toString();
			//console.log("hover val: " + string_hover_date);
			socket.emit("subset_timestamp_hover", {hover_val: string_hover_date});


		});

		socket.on("checked_array_contents", function(obj) {
			var cstamp = Date.now();
			var new_time;
  		var old_time;
  		var time_delta;

			self.ot_model //THIS EXEC GETS THE OLDEST TIMESTAMP
      .find({$and: [ {"file_id": obj.file_id}, {"user_id": { $in: obj.users_ids}}]})
      .where("timestamp").lt(cstamp)
      .sort("timestamp")
      .select("timestamp")
      .exec(function(err, data) { 
      	//console.log(data);
      	//console.log("..er: " + err);
      	if(data === undefined || data[0] === undefined){
      		//console.log("oops there was an OT DB error: " + err);
      		socket.emit("no_ot_info");
      	} else {
      		//console.log("personal OT_info success");
      		new_time = data[data.length - 1].timestamp;
      		old_time = data[0].timestamp;
      		time_delta = (data[data.length - 1].timestamp) - (data[0].timestamp); //this should be the oldest timestamp in the query results
      		socket.emit("subset_old_date", {old_date: old_time, new_date: new_time}); //this is to populate the "oldest time" on the GUI slider for ALL OT revisions
      		self.subset_slider_old_time = old_time;
      		self.subset_slider_time_delta = time_delta;

        }

        var ddd = new Date(old_time + ((obj.slider_val/100) * time_delta));
        console.log("looking for subset records older than : " + ddd);

        if(obj.log_flag === false){
					self.ot_model //THIS EXEC GETS THE INFO REQUESTED
	        .find({$and: [ {"file_id": obj.file_id}, {"user_id": { $in: obj.users_ids}}]}) //should get records for the file with all users who are checked in the GUI
	        .where("timestamp").gt(old_time + ((obj.slider_val/100) * time_delta))
	        .sort("timestamp")
	        .select("operation timestamp user_id")
	        .exec(function(err, data) {
	        	//console.log(data);
	        	//console.log("..er: " + err);
	        	if(data === undefined || data[0] === undefined){
	        		//console.log("oops there was an OT DB error: " + err);
	        		//socket.emit("no_ot_info");
	        	} else {
	        		//console.log("personal OT_info success");
	          	
	        		var num_items = data.length;
	          	var i = 0;
	          	//console.log(num_items);

	          	data.forEach(function(record) {
					      //record.operation + " AT " + record.timestamp + " BY " + record.user_id + "<br />";

					      self.user.findOne({_id: record.user_id}, "full_name", function (err, data2) { //need this DB lookup to get the actual name of the person who edited, using their ID
	         				if(err || data2 === null || data2.full_name === undefined || data2 === undefined || data2.full_name === null){
	         					console.log("dont know4: " + err);
	         				} else	{
	         					i++;
	         					if(i == num_items - 1){

	         						if(obj.log_flag === false && obj.refresh_req === true){ //we only need an updated CM file string if the user has hit the refresh button
					        			//send CM file string here
					        			socket.emit("subset_checked_users_end", {cm_content: self.cm_servers[obj.file_id].document});

					        		} else {

					        			socket.emit("subset_checked_users_end", {cm_content: null});

					        		}


							      } else {			

	                		socket.emit("subset_checked_users_suc", {users_op: record.operation, users_timestamp: record.timestamp, users_name: data2.full_name}); //need to re-sort on the server side because nested DB calls distort the timing
	                	
	                	}
	              	}

	              });

					    });
	          }
	        });
				} else if (obj.log_flag === true){
					self.ot_model //THIS EXEC GETS THE INFO REQUESTED
	        .find({$and: [ {"file_id": obj.file_id}, {"user_id": { $in: obj.users_ids}}]}) //should get records for the file with all users who are checked in the GUI
	        .where("timestamp").lt(old_time + ((obj.slider_val/100) * time_delta))
	        .sort("timestamp")
	        .select("operation timestamp user_id")
	        .exec(function(err, data) {
	        	//console.log(data);
	        	//console.log("..er: " + err);
	        	if(data === undefined || data[0] === undefined){
	        		//console.log("oops there was an OT DB error: " + err);
	        		socket.emit("no_ot_info");
	        	} else {
	        		//console.log("personal OT_info success");
	          	
	        		var num_items = data.length;
	          	var i = 0;
	          	//console.log(num_items);

	          	data.forEach(function(record) {
					      //record.operation + " AT " + record.timestamp + " BY " + record.user_id + "<br />";

					      self.user.findOne({_id: record.user_id}, "full_name", function (err, data2) { //need this DB lookup to get the actual name of the person who edited, using their ID
	         				if(err || data2 === null || data2.full_name === undefined || data2 === undefined || data2.full_name === null){
	         					console.log("dont know5: " + err);
	         				} else	{
	         					i++;
	         					if(i == num_items - 1){

	         						if(obj.log_flag === false && obj.refresh_req === true){ //we only need an updated CM file string if the user has hit the refresh button
					        			//send CM file string here
					        			socket.emit("subset_checked_users_end", {cm_content: self.cm_servers[obj.file_id].document});

					        		} else {

					        			socket.emit("subset_checked_users_end", {cm_content: null});

					        		}


							      } else {			

	                		socket.emit("subset_checked_users_suc", {users_op: record.operation, users_timestamp: record.timestamp, users_name: data2.full_name}); //need to re-sort on the server side because nested DB calls distort the timing
	                	
	                	}
	              	}

	              });

					    });
	          }
	        });

				}

	    });

		});	


		socket.on("watch_touch", function(obj) {
			if(!self.watch_touch[obj.path])
				self.watch_touch[obj.path] = [];
			self.watch_touch[obj.path].push(socket);
		});	



		socket.on("send_session", function(obj) {
    //self.user.findOne({_id: obj.user_id}, "settings", function (err, data) {
      //data.settings = self.check_settings(data.settings, obj.user_id);
      self.save_session_obj = obj.session_obj;
      self.save_user_id = obj.user_id;

      self.user.update({_id: obj.user_id}, {$set: {sessions: obj.session_obj}}, function () {

        console.log("session update finished");
      
      });

      //console.log("obj: " + self.save_session_obj + " ID: " + self.save_user_id);
      //socket.emit("receive_settings", {user_id: obj.user_id, settings: data.settings, global_settings: self.global_settings});
    });
		

		socket.on("get_session", function(obj){

			//edit this
			self.user.findOne({_id: obj.user_id}, "sessions", function (err, data) { //need this DB lookup to get the actual name of the person who edited, using their ID
 				if(data.sessions === undefined){
 					console.log("session is undefined");
 				} else	{

 					socket.emit("receive_session", {user_id: self.save_user_id, session: data.sessions});

      	}

      });


		});



	});
	
	this.update_file = function(file_id, callback, admin_mode)
	{
		var full_path;
		if(admin_mode)
			full_path = self.admin_path + "/" + file_id;
		else
			full_path = self.home_folder + "/" + file_id;
		self.fs.writeFile(full_path, self.cm_servers[file_id].document, function(err) {
			if(err) {
				console.log(err);
			} else {
				self.file_touched(file_id);
				callback();
			}
		});
	};

	this.delete_children = function(file_id)
	{
		/*file.find({parent: file_id}, "_id", function(err, data)
		{
			if(data)
			{
				data.forEach(function(fid) {
					self.delete_children(fid);
				});
			}
			file.remove({parent: file_id}, function(err, data) {
			});
		}); */
	};

	this.create_project_folder = function(project_id)
	{
		var full_path = path.join(self.home_folder+"/"+project_id);
		self.fs.mkdirSync(full_path);
	};

	this.rdelete = function(path)
	{
	    var files = [];
	    if( self.fs.existsSync(path) ) 
	    {
	    	if(self.fs.lstatSync(path).isDirectory())
	    	{
		        files = self.fs.readdirSync(path);
		        files.forEach(function(file,index)
		        {
		            var curPath = path + "/" + file;
		            if(self.fs.lstatSync(curPath).isDirectory()) 
		            { // recurse
		                self.rdelete(curPath);
		            } 
		            else 
		            { // delete file
		                self.fs.unlinkSync(curPath);
		                //kill open cm_servers
		                file_id = curPath.substr(self.home_folder.length);
		           
		            }
		        });
		        self.fs.rmdirSync(path);
	    	}
	    	else
	    	{
	    		// delete file
		        self.fs.unlinkSync(path);
                //kill open cm_servers
                file_id = path.substr(self.home_folder.length);
                self.kill_file_ot(file_id);
	    	}
	    }		
	};

	this.kill_file_ot = function(file_id)
	{
		if(! self.cm_servers[file_id])
			return;
		self.io.of("/ot/"+file_id+"/").emit("kill",{});
		self.cm_servers[file_id].cmsockets.forEach (function (cmsocket) {
			cmsocket.disconnect("unauthorized");
		});
		self.io.of("/ot/"+file_id+"/").removeAllListeners();
		delete self.cm_servers[file_id];
		var full_path = self.home_folder + "/" + file_id;
		self.fs.unwatchFile(full_path);
	};

	this.create_ot = function (file_id, on_succes, on_error, admin_mode) {
		//THIS IS ONLY HAPPENING ONCE WHICH IS WHY THE USERID GETS STALE 
		console.log("File: open in OT server " + file_id);

		//if the file is not already open in OT, open it
		var full_path;

		if(admin_mode)
			full_path = self.admin_path + "/" + file_id;
		else
			full_path = self.home_folder + "/" + file_id;
		if(! self.fs.existsSync(full_path)) {
			on_error("file does not exist");
			return;
		}
		self.fs.readFile(full_path, {encoding: "utf-8"}, function(err,data){
			if (err) {
				console.log("File: error opening " + file_id + " : " + err);
				on_error(err);
				return;
			}
			
			//create codemirror server
			self.cm_servers[file_id] = new self.ot.EditorSocketIOServer(data, [], file_id, function (socket2, cb) {

				cb(!!socket2.mayEdit);
			});

			//handle connections
			self.cm_servers[file_id].cmsockets = [];
			self.io.of("/ot/"+file_id+"/").on("connection", function (cmsocket) {
				//the CMuser socket now has a global name field called "user_id" that is the user who is changing the OT currently
				//CMSOCKET IS NOT STALE BUT THE USERID I AM ATTACHING TO IT IS STALE FROM THE CREATEOT EVENT
				//cmsocket.user_id = global_ot_user_id;

				//this function is called each time an operation happens and contains all information we need to know
				cmsocket.on("operation", function(revision, operation, cursor){
					//console.log("file: " + file_id + ".....REV#: " + revision + ".....OP: " + operation + ".....CUR: " + cursor);
					//console.log("USER: " + ot_user_id + "....and CMsockedID: " + cmsocket.user_id);
					//var d = new Date();
					//var minute = d.getMinutes();
					//var hour = d.getHours();
					//var day = d.getDate();
					//var year = d.getFullYear();
					//var second = d.getSeconds();
					//var month = d.getMonth();

					//var y = day + "|" + month + "|" + year + "||" + hour + ":" + minute + ":" + second;

					//putting current OT info into array to push into the DB 
					//var ot_info_array = []
					//ot_info_array.push(file_id);
					//ot_info_array.push(revision);
					//ot_info_array.push(operation);
					//ot_info_array.push(cursor);
					//ot_info_array.push(y);

					//store to DB here
					//the functionality below does a meaningless mongoDB transaction for the user who is typing/changing OT

					//dont use update, dont use user use OT schema
	        /*self.user.update({_id: ot_user_id}, {$set: {OT_info: ot_info_array}}, function () {
	          console.log("OT_info stored, reading it back to you..."); 
	          
	          //the functionality below does a meaningless mongoDB transaction for the user who is typing/changing OT
	          self.user.findOne({_id: ot_user_id}, "OT_info", function (err, data) {
		          if(data.OT_info === undefined){
		          	console.log("oops OT_info is undef.");
		          }else{
		          	console.log(data.OT_info[0] + "...." + data.OT_info[1] + "...." + data.OT_info[2] + "...." + data.OT_info[3] + "..big mama.." + data.OT_info[4]);
		          }
		        });
		      });*/

					var log = new self.ot_model();
			    log.timestamp = Date.now();
			    log.file_id = file_id;
			    log.revision = revision;
			    log.operation = operation;
			    log.cursor = cursor;
			    log.user_id = cmsocket.user_ot_id;
			    log.save(function(err) {
			      if(err)
			        console.log("OT Server: Error saving log: " + err);
			    });

				});


				//bugfix for ot.js
				cmsocket.manager = {};
				cmsocket.manager.sockets = {};
				cmsocket.manager.sockets.clients = function (id) {
					return [0];
				};

				self.cm_servers[file_id].addClient(cmsocket);
				//accessing the file
				self.cm_servers[file_id].cmsockets.push(cmsocket);
				console.log("File: rquest for " + file_id);
				cmsocket.on("access_request", function(obj2) {

					cmsocket.user_ot_id = obj2.user_id;

					console.log("access_request");
					self.users.authenticate(obj2, function(obj3) {
						cmsocket.mayEdit = true;
						self.cm_servers[file_id].setName(cmsocket, obj3.name);
						cmsocket.emit("access_granted", {});
					});
				});

				//saving the file
				cmsocket.on("save", function(obj2) {
					//if(obj2.ot_rev_save_content === undefined){
						self.update_file(file_id, function() {
							console.log("File: auto-save for " + file_id);
							cmsocket.emit("saved", {});
						}, obj2.admin_mode);

					/*} else if(obj2.ot_rev_save_content){
						//maybe a fs.createfile here
						self.update_file(obj2.ot_rev_save_content, function() {
							console.log("File: auto-save new OT rev file for " + file_id);
							cmsocket.emit("saved", {});
						}, obj2.admin_mode);
					}*/
				});
				
				//on close
				cmsocket.on("disconnect", function (obj2) {
					console.log("File: client disconnected from OT " + file_id);
				});
			});

			console.log("File: OT server created for " + file_id);
			on_succes();
		});

		//watch for changes
		self.fs.watchFile(full_path, {persistent: true, interval: 5000}, function(curr, prev) {
			self.fs.readFile(full_path, {encoding: "utf-8"}, function(err,data){
				if (err) {
					console.log("File: error opening " + file_id + " : " + err);
					on_error(err);
					return;
				}
				if(self.self_touch[file_id]) {
					self.self_touch[file_id] = false;
				} else {
					self.cm_servers[file_id].document = data;
					self.cm_servers[file_id].cmsockets.forEach(function (cmsocket) {
						cmsocket.emit("rewrite", {});
					});
				}
			});
		});		
	};

	this.file_touched = function (file_id) {
		self.self_touch[file_id] = true;
		for(var key in self.watch_touch) {
			if(file_id.indexOf(key) != -1) {
				self.watch_touch[key].forEach(function (socket) {
					if(socket)
						socket.emit("file_touched", {path: key, file_id: file_id});
				});
			}
		}
	};
};