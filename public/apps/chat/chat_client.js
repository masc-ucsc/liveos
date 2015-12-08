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

function chat_client()
{
	//defining fields
	var self = this;
	this.cws = [];
	this.cc = new chat_comm(self);

	this.new_chat = function(target_id, target_name)
	{
		if(!self.cws[target_id])
		{
			//adding chat
			self.cws[target_id] = new chat_window(target_id, target_name, self.cc, function (tid) {
				//on_close
				self.cws[tid] = null;
			});

			//retrieving one hour history
			self.cc.request_history(target_id, 1);
		}
	};

	//send a new message
	this.send_message = function(target_id, message)
	{
		self.cc.send_message(target_id, message);
	};

	//receive a new message
	this.show_message = function (user_id, user_name, message)
	{
		self.new_chat(user_id, user_name);
		self.cws[user_id].show_message(user_name,": ",message);
	};

	//user leaves
	this.user_left = function (user_id, user_name)
	{
		if(self.cws[user_id])
		{
			self.cws[user_id].show_message(user_name," ","left.");
		}
	};

	//user joins
	this.user_joined = function (user_id, user_name)
	{
		if(self.cws[user_id])
		{
			self.cws[user_id].show_message(user_name," ","joined.");
		}
	};

	//retrieve chat history
	this.show_history = function (user_id, users, names, history)
	{
		self.cws[user_id].show_history(names, history, ": ");
	};
}

function chat_comm(chc)
{
	//pre-setting the fields
	var self = this;
	var chat_socket = io.connect(":" + PORTS.main + "/chat", {query: $.param({token: TOKEN})});//need to change this for the correct port
	this.user_id = USER_ID;

	//introduce yourself to the server
	chat_socket.emit("connect_to_server", {user_id: this.user_id, signature: SIGNATURE});

	//send a message to the target if exists
	this.send_message = function(target_id, message)
	{
        chat_socket.emit("send_message" ,{target_id: target_id, message: message});
	};

	//receive a message
	chat_socket.on("receive_message", function (obj) {
		chc.show_message(obj.user_id, obj.user_name, obj.message);
  	});

  	//a user leaves
  	chat_socket.on("user_left", function (obj) {
		chc.user_left(obj.user_id, obj.user_name);
  	});

  	//a user joins
  	chat_socket.on("user_joined", function (obj) {
		chc.user_joined(obj.user_id, obj.user_name);
  	});

  	//ask history
  	this.request_history = function(target_id, mode)
  	{
  		chat_socket.emit("request_chat_history" ,{target_id: target_id, mode: mode});
  	};

  	//history is retrieved
  	chat_socket.on("receive_chat_history", function (obj) {
  		var other_user_id = (obj.users[0] == self.user_id) ? obj.users[1] : obj.users[0];
		chc.show_history(other_user_id, obj.users, obj.names, obj.history);
  	});
}

function chat_window(target_id, target_name, cc, on_close)
{
	var self = this;
	this.target_id = target_id;
	this.target_name = target_name;
	this.on_close = on_close;
	this.cc = cc;

	//creating html canvas
	this.el_container = document.createElement("div");
	this.el_container.setAttribute("class","chat-container");
	//adding chat board
	this.el_board = document.createElement("div");
	this.el_board.setAttribute("class","chat-board");
	this.el_container.appendChild(this.el_board);
	//adding chat input
	this.el_message = document.createElement("input");
	this.el_message.type = "text";
	this.el_message.setAttribute("class","chat-message");
	this.el_container.appendChild(this.el_message);

	//creating window
	this.title = "Chat with " + this.target_name;
	this.app_window = wm.openElement(this.el_container, 360, 360, "random", "random", {"title" : this.title}, {}, function () { self.on_close(self.target_id); });
	
	//creating menu
	this.menu_items = {};
	this.menu_items.clear = this.app_window.add_menu_item("Clear", "", "title", this.app_window.menu, function () { self.el_board.innerHTML = ""; });
	this.menu_items.last_hour = this.app_window.add_menu_item("Last Hour", "", "title", this.app_window.menu, function () { self.cc.request_history(self.target_id, 1); });
	this.menu_items.last_day = this.app_window.add_menu_item("Last Day", "", "title", this.app_window.menu, function () { self.cc.request_history(self.target_id, 24); });
	this.menu_items.last_week = this.app_window.add_menu_item("Last Week", "", "title", this.app_window.menu, function () { self.cc.request_history(self.target_id, 168); });
	this.menu_items.last_month = this.app_window.add_menu_item("Last Month", "", "title", this.app_window.menu, function () { self.cc.request_history(self.target_id, 720); });
	this.app_window.activate_menu();
	this.app_window.adjust_menu_position(-9,0);

	//send a message to the target if exists
	this.el_message.onkeyup = function(event){
		if(event.keyCode == 13)
    	{
    		self.cc.send_message(self.target_id, this.value);
    		this.value = "";
    	}
	};

	//showing a new message
	this.show_message = function(user_name,mid,message)
	{
		self.el_board.innerHTML+=user_name+mid+message+"<br />";
    	self.el_board.scrollIntoView();
    	self.el_board.scrollTop = self.el_board.scrollHeight;
	};

	//getting chat history
	this.show_history = function(names, history, mid)
	{
		self.el_board.innerHTML = "";
		history.forEach(function(record) {
			self.el_board.innerHTML += names[record.sender] + mid + record.message + "<br />";
		});
		self.el_board.scrollIntoView();
    	self.el_board.scrollTop = self.el_board.scrollHeight;
	};
}
