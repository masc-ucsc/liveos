/*
 * (C) Copyright 2015 Regents of the University of California and LiveSim Project.
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

function livesim_conf (on_close) {
  //defining fields
  var self = this;
  this.parent_on_close = on_close;
  this.app_window = null;
  this.menu_items = null;
  this.is_editing = true;
  this.has_changed = false;
  this.source = "";
  this.params = {};
  this.doms = {};
  this.socket = io.connect(":" + PORTS.livesim + "/livesim", {"force new connection": true, query: $.param({token: TOKEN})});

  load_lib("libs/marked/marked.js");

  //Defining HTML elements
  this.app_div = document.createElement("div");
  this.main_container = document.createElement("div");
  this.main_container.className = "livesim_conf_container";
  this.app_div.appendChild(this.main_container);

  this.open = function ()
  {
    //creating a new window
    var title = "LiveSim Configuration";
    self.app_window = wm.openElement(self.app_div, 680, 380, "random", "random", {}, {}, self.on_close);
    self.menu_items = {};
    self.menu_items.download = self.app_window.add_menu_item("Download", "", "title", self.app_window.menu, self.download);
    self.app_window.activate_menu();
    self.is_open = true;
    self.socket.emit("get_conf_md", {project_id: PROJECT_ID});
  };

  this.on_close = function () {
    self.parent_on_close();
  };

  this.download = function () {
    var data = self.source;
    while(data.indexOf("!@[") != -1) {
      var t = data.indexOf("!@[");
      var i = t + 3;
      var hits = 0;
      var val = "";
      while(i < data.length && hits < 6) {
        if(hits == 1 && data.charAt(i) != "[" && data.charAt(i) != "]")
          val += (data.charAt(i)).toString();
        if(data.charAt(i) == "]")
          hits++;
        i++;
      }
      data = data.substring(0, t) + val + data.substring(i);
    }
    var link = document.createElement("a");
    link.download = "conf.md";
    link.href = "data:," + encodeURI(data);
    link.click();
  };

  this.socket.on("receive_conf_md", function (obj) {
    self.source = obj.source;
    self.main_container.innerHTML = marked(obj.source);
    self.params = {};
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
        self.has_changed = true;
        self.is_editing = true;
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
  });

  this.auto_save = setInterval(function () {
    if(self.has_changed && (! self.is_editing)) {
      self.socket.emit("update_conf_md", {project_id: PROJECT_ID, source: self.source});
      self.has_changed = false;
    }
    self.is_editing = false;
  }, 500);
}