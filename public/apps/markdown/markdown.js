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

function markdown_client()
{
	//defining fields
	var self = this;

	this.open = function(source, on_close)
	{
		var app_window = new markdown_window(source, function () {
      if(on_close)
			  on_close();
			app_window = null;
		});
		return app_window;
	};
}

function markdown_window(source, on_close)
{
	var self = this;
	this.parent_close = on_close;
	this.params = {};
  this.source = source;

	load_lib("libs/marked/marked.js");

	//creating html canvas
	this.app_div = document.createElement("div");
	this.app_div.className = "markdown_container";

	//adding viewer
	this.el_viewer = document.createElement("div");
	this.el_viewer.id = "md_viewer";
	this.el_viewer.className = "md_viewer";
	this.app_div.appendChild(this.el_viewer);

	this.update = function (src) {
		self.el_viewer.innerHTML = marked(src);
    $(".mdparam").each(function () {
      var el = this;
      var html = document.createElement("input");
      html.type = "range";
      html.min = $(el).attr("pmin");
      html.max = $(el).attr("pmax");
      html.step_type = ($(el).attr("pstep")).substring(0, 1);
      if(html.step_type == "^") {
        html.step = 1;
        html.step_base = ($(el).attr("pstep")).substring(1);
      } else {
        html.step = ($(el).attr("pstep")).substring(1);
      }
      html.value = $(el).attr("pdef");
      var pname = $(el).attr("pname");
      html.pname = pname;
      self.params[pname] = el;
      html.oninput = function () {
        var val;
        if(this.step_type == "^")
          val = Math.pow(this.step_base, this.value);
        else
      	  val = this.value;
        self.params[this.pname].innerHTML = round_2(val);
      	var t = self.source.indexOf("!@[" + this.pname + "]");
      	t += 5 + this.pname.length;
      	var ts = self.source;
      	var first = ts.substring(0, t);
      	ts = ts.substring(t + 1);
      	t = ts.indexOf("]");
      	ts = ts.substring(t + 1);
        t = ts.indexOf("]");
        ts = ts.substring(t);
      	self.source = first + val + "][" + this.value + ts;
      };
      html.onchange = function () {
        console.log(self.source);
      };
      var drp = new Drop({
        target: el,
        content: html,
        position: "bottom center",
        openOn: "click",
        classes: "drop-theme-arrows-bounce-dark markdown_drop",
        constrainToScrollParent: false
      });
    });
	};

  this.on_close = function () {
  	self.parent_close();
  };

	this.app_window = wm.openElement(self.app_div, 600, 600, "random", "random", {"title" : "Markdown"}, {}, self.on_close);
	this.menu_items = {};
	this.menu_items.update = this.app_window.add_menu_item("Update", "", "title", this.app_window.menu, this.update);
	this.app_window.activate_menu();

	self.update(source);
}

function round_2 (val) {
  var g = Math.pow(2, 30);
  var m = Math.pow(2, 20);
  var k = Math.pow(2, 10);
  if(val % g === 0)
    return (val / g) + "G";
  if(val % m === 0)
    return (val / m) + "M";
  if(val % k === 0)
    return (val / k) + "K";
  return val;
}