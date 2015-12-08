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

function hello_world()
{
	//defining fields
	var self = this;

	//openin new window
	this.open = function()
	{
		var app_window = new hello_window(self, function () {
			//on close
			app_window = null;
		});
	};
}

function hello_window(parent, on_close)
{
	//defining fields
	var self = this;
	this.parent_close = on_close;
	
	//connecting to server
	this.socket = io.connect(":" + PORTS.hello + "/hello", {"force new connection": true, query: $.param({token: TOKEN})});

	//creating html canvas
	this.app_div = document.createElement("div");
	this.app_div.className = "hello_container";

	//adding html elements
	this.message = document.createElement("div");
	this.message.className = "hello_message";
	this.message.innerHTML = "Hello, World!";
	this.app_div.appendChild(this.message);

	//socket io event
	this.socket.on("poke_back", function (obj) {
		alertify.success("Poke back from server: " + obj.message);
	});

	//menu event function
	this.poke = function () {
		self.socket.emit("poke", {message: "hey"});
	};

	//on close event
	this.on_close = function () {
  	self.parent_close();
  };

	//creating window and menu objects
	this.app_window = wm.openElement(self.app_div, 600, 400, "random", "random", {"title" : "Hello World"}, {}, self.on_close);
	this.menu_items = {};
	this.menu_items.click = this.app_window.add_menu_item("Poke Server", "", "title", this.app_window.menu, this.poke);
	this.app_window.activate_menu();
}
