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

function user_client () {
	//defining fields
	var self = this;
	this.chc = apps.chat;
	this.app_open = false;
	this.app = null;

	this.open = function () {
		if(!self.app_open)
		{
			self.app = new user_manager(self);
			self.app_open = true;
		}
	};

	this.on_close = function () {
		this.app = null;
		this.app_open = false;
	};

}

function user_manager (parent) {
	//defining fields
	var self = this;
	this.parent = parent;
	this.chc = parent.chc;
	this.socket = io.connect(':' + PORTS.main + '/user_server', {'force new connection': true, query: $.param({token: TOKEN})});

	this.app_div = document.createElement('div');
	this.app_div.className = "user_container";
	this.invite_container = document.createElement('div');
	this.invite_container.id = "invite_user_container";
	this.app_div.appendChild(this.invite_container);

	this.invite_input = document.createElement('input');
	this.invite_input.type = "text";
	this.invite_input.id = "search_user_input";
	this.invite_input.value = "Search for users";
	this.invite_input.className = "search_user_input livos_textbox";
	this.invite_container.appendChild(this.invite_input);

	this.user_container = document.createElement('div');
	this.user_container.id = "user_container";
	this.app_div.appendChild(this.user_container);


	this.invite_input.onfocus = function (e) {
		if(self.invite_input.value == "Search for users")
	    	self.invite_input.value = "";
	};

	this.invite_input.onblur = function (e) {
		if(self.invite_input.value === "")
			self.invite_input.value = "Search for users";
	};
	
	this.invite_input.onkeyup = function(e) {
		
		self.get_project_users();
	};

	//getting the users in the project
	this.get_project_users = function ()
	{
		search_key = self.invite_input.value;
		if(search_key == "Search for users")
			search_key = '';
		self.socket.emit("get_project_users", {project_id: PROJECT_ID, full_name : search_key});
	};

	//adding a user to this project
	this.add_user_to_project = function(user_id)
	{
		self.socket.emit('add_user_to_project', {project_id: PROJECT_ID, user_id: user_id});
	};

	//Chat and related functions
	this.select_user = function (user_name,user_id)
	{
		self.chc.new_chat(user_id, user_name);
	};

	//On receiving search results
	this.socket.on("receive_project_users", function(obj) {
		self.user_container.innerHTML = "";
		if(obj.users.length > 0)
  			self.user_container.innerHTML += '<div class="other_users_label">Project users:</div>';
  		obj.users.forEach(function(project_user) {
  			if(project_user._id != USER_ID)
  			{
	  			if(obj.user_status[project_user._id] == 1)
	  				html='<div class="project_user project_user_online" onclick="apps[\'user_manager\'].app.select_user(\''+project_user.full_name+'\',\''+project_user._id+'\')" id="'+project_user._id+'">'+project_user.full_name+'<div class="user_status"><img src="img/online.png" /></div></div>';
	  			else
	  				html='<div class="project_user" onclick="apps[\'user_manager\'].app.select_user(\''+project_user.full_name+'\',\''+project_user._id+'\')" id="'+project_user._id+'">'+project_user.full_name+'<div class="user_status"><img src="img/offline.png" /></div></div>';
	  			self.user_container.innerHTML += html;
  			}
  		});
  		if(obj.other_users.length > 0)
  			self.user_container.innerHTML += '<div class="other_users_label">Other users:</div>';
  		obj.other_users.forEach(function(user) {
  			if(obj.other_user_status[user._id] == 1)
	  			html='<div class="project_user project_user_online"><span onclick="apps[\'user_manager\'].app.select_user(\''+user.full_name+'\',\''+user._id+'\')" id="'+user._id+'">'+user.full_name+' ('+user.email+')'+'</span><div class="user_status"><img src="img/online.png" /></div><div class="add_user_to_project" onclick="apps[\'user_manager\'].app.add_user_to_project(\''+user._id+'\')"><img src="img/add16.png" /></div></div>';
	  		else
	  			html='<div class="project_user" id="'+user._id+'">'+user.full_name+' ('+user.email+')'+'<div class="user_status"><img src="img/offline.png" /></div><div class="add_user_to_project" onclick="apps[\'user_manager\'].app.add_user_to_project(\''+user._id+'\')"><img src="img/add16.png" /></div></div>';
	  		self.user_container.innerHTML += html;
  		});
	});
	
	//On a successful user add
	this.socket.on('user_added_to_project', function(obj) {
		self.invite_input.value = '';
		self.get_project_users();
	});

	this.on_close = function () {
		clearInterval(self.updater);
		self.socket.disconnect();
		self.app_div = null;
		parent.on_close();
	};

	//creating a new window
	this.app_window = wm.openElement(self.app_div, 320, 500, 'random', 'random', {'title': 'User Manager'}, {}, self.on_close);
	this.app_window.activate_menu();

	//this.app_window = wm.openElement(this.app_window.return_appDiv(), 300, 400, 'random', 'random', {}, {}, self.on_close);
	//Getting the user list for the first time
	self.get_project_users();

	//Updating user list
	this.updater = setInterval(function () {
		self.get_project_users();
	}, 1000);
}
