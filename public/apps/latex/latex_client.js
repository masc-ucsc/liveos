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

function latex_client()
{
	//defining fields
	var self = this;

	this.open = function()
	{
		var app_window = new latex_window(function () {
			app_window = null;
		});
	};
}

function latex_window(on_close)
{
	var self = this;
	this.source_file = "";
	this.parent_close = on_close;
	this.socket = io.connect(":" + PORTS.latex + "/latex", {"force new connection": true, query: $.param({token: TOKEN})});
	this.delivery = null;

	//registering for delivery
	this.socket.on("connect", function () {
		self.delivery = new Delivery(self.socket);

		self.delivery.on("receive.start",function(fileUID){
	    console.log("receiving a file!");
	  });

	  self.delivery.on("receive.success",function(file){
	  	self.el_error.innerHTML = "";
	    self.el_viewer.src = file.dataURL();
	  });

	});

	//First time tun
	this.socket.on("delivery_registered", function (obj) {
		self.get_result();
	});

	this.socket.on("latex_error", function (obj) {
		self.el_viewer.src = "";
		self.el_error.innerHTML = obj.message;
		//self.el_error.innerHTML = self.html_escape(obj.message);
	});

	//creating html canvas
	this.app_div = document.createElement("div");
	this.app_div.className = "latex_container";

	//top bar
	this.top_bar = document.createElement("div");
	this.top_bar.className = "latex_top_bar";
	this.app_div.appendChild(this.top_bar);

	//source input
	this.source_input = document.createElement("input");
	this.source_input.type = "text";
	this.source_input.value = "Enter LaTeX source file here";
	this.source_input.className = "latex_source_input";
	this.top_bar.appendChild(this.source_input);

	this.source_input.onfocus = function () {
		if(self.source_input.value == "Enter LaTeX source file here")
			self.source_input.value = "";
	};

	this.source_input.onblur = function () {
		if(self.source_input.value === "")
			self.source_input.value = "Enter LaTeX source file here";
	};

	this.source_input.onchange = function () {
		self.socket.emit("register_delivery", {project_id: PROJECT_ID, source_file: self.source_input.value});
	};

	//adding viewer
	this.el_viewer = document.createElement("iframe");
	this.el_viewer.id = "pdf_viewer";
	this.el_viewer.className = "pdf_viewer";
	this.app_div.appendChild(this.el_viewer);

	//adding error div
	this.el_error = document.createElement("div");
	this.el_error.className = "latex_error_container";
	this.app_div.appendChild(this.el_error);

	//Sending recompile request to server
	this.recompile = function () {
		self.socket.emit("recompile", {project_id: PROJECT_ID, source_file: self.source_input.value});
	};

	//Sending get result request
	this.get_result = function () {
		self.socket.emit("get_result", {project_id: PROJECT_ID, source_file: self.source_input.value});
	};

  this.on_close = function () {
  	self.socket.disconnect();
  	self.parent_close();
  };

  this.html_escape = function (str) {
    return String(str)
	    .replace(/&/g, "&amp;")
	    .replace(/"/g, "&quot;")
	    .replace(/"/g, "&#39;")
	    .replace(/</g, "&lt;")
	    .replace(/>/g, "&gt;");
	};

	this.app_window = wm.openElement(self.app_div, 600, 600, "random", "random", {"title" : "LaTeX"}, {}, self.on_close);
	this.menu_items = {};
	this.menu_items.recompile = this.app_window.add_menu_item("Recompile", "", "title", this.app_window.menu, this.recompile);
	this.app_window.activate_menu();
}
