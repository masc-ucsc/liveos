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

function credits()
{
	//defining fields
	var self = this;

	//openin new window
	this.open = function()
	{
		var app_window = new credits_window(self, function () {
			//on close
			app_window = null;
		});
	};
}

function credits_window(parent, on_close)
{
	//defining fields
	var self = this;
	this.parent_close = on_close;

	//functions
	this.create_credit = function (name, pos, email) {
		var item = document.createElement("div");
		item.className = "credit_item";
		var ni = document.createElement("div");
		ni.className = "credit_subitem";
		ni.innerHTML = name;
		item.appendChild(ni);
		ni = document.createElement("div");
		ni.className = "credit_subitem";
		ni.innerHTML = pos;
		item.appendChild(ni);
		ni = document.createElement("div");
		ni.className = "credit_subitem";
		ni.innerHTML = email;
		item.appendChild(ni);
		self.holder.appendChild(item);
	};

	//creating html canvas
	this.app_div = document.createElement("div");
	this.app_div.className = "credits_container";
	this.holder = document.createElement("div");
	this.holder.className = "credits_holder";
	this.app_div.appendChild(this.holder);

	//creating individual credits
	self.create_credit("Jose Renau", "Project Advisor", "renau@ucsc.edu");
	self.create_credit("Sina Hassani", "Developer", "sihassan@ucsc.edu");
	self.create_credit("Ethan Papp", "Developer", "epapp@ucsc.edu");
	self.create_credit("Alejandro Aguilar", "UI Developer", "aaguil10@soe.ucsc.edu");

	//copyright
	this.copyright = document.createElement("div");
	this.copyright.className = "credit_copyright";
	this.copyright.innerHTML = "(C) Copyright 2015 Regents of the University of California and LiveOS Project.";
	this.holder.appendChild(this.copyright);

	//on close event
	this.on_close = function () {
  	self.parent_close();
  };

	//creating window and menu objects
	this.app_window = wm.openElement(self.app_div, 700, 400, "random", "random", {"title" : "Credits"}, {}, self.on_close);
	this.menu_items = {};
	this.app_window.activate_menu();
}
