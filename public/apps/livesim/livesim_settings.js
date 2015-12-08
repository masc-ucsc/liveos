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

function livesim_settings (on_close) {
  //defining fields
  var self = this;
  this.parent_on_close = on_close;
  this.app_window = null;
  this.menu_items = null;
  this.doms = {};
  this.dom_types = {};
  this.socket = io.connect(":" + PORTS.livesim + "/livesim", {"force new connection": true, query: $.param({token: TOKEN})});

  //Defining HTML elements
  this.app_div = document.createElement("div");
  this.main_container = document.createElement("div");
  this.main_container.className = "livesim_settings_container";
  this.app_div.appendChild(this.main_container);
  this.tab_holder = new live_tab_holder("livesim_tab");
  this.main_container.appendChild(this.tab_holder.container);

  this.create_field = function (name, title, value, mc) {
    var container = "container_" + name;
    var label = "label_" + name;
    self.dom_types[name] = "text";
    self.doms[container] = document.createElement("div");
    self.doms[container].className = "livesim_field_container";
    mc.appendChild(self.doms[container]);
    self.doms[label] = document.createElement("label");
    self.doms[label].innerHTML = title + ":";
    self.doms[label].className = "livesim_field_label";
    self.doms[container].appendChild(self.doms[label]);
    self.doms[name] = document.createElement("input");
    self.doms[name].type = "text";
    self.doms[name].value = value;
    self.doms[name].className = "livesim_settings_field";
    self.doms[name].onchange = function () {
      self.socket.emit("set_conf", {project_id: PROJECT_ID, conf_name: name, conf_val: this.value, history_name: ""});
    };
    self.doms[name].className = "livesim_field_itself livos_textbox";
    self.doms[container].appendChild(self.doms[name]);
  };

  this.create_check = function (name, title, value, mc) {
    var container = "container_" + name;
    var label = "label_" + name;
    self.dom_types[name] = "check";
    self.doms[container] = document.createElement("div");
    self.doms[container].className = "livesim_field_container";
    mc.appendChild(self.doms[container]);
    self.doms[name] = document.createElement("input");
    self.doms[name].type = "checkbox";
    self.doms[name].className = "livesim_settings_check";
    self.doms[name].value = 1;
    self.doms[name].checked = 0;
    self.doms[name].onchange = function () {
      var val = 0;
      if(this.checked)
        val = 1;
      self.socket.emit("set_conf", {project_id: PROJECT_ID, conf_name: name, conf_val: val, history_name: ""});
    };
    self.doms[container].appendChild(self.doms[name]);
    self.doms[label] = document.createElement("label");
    self.doms[label].innerHTML = title;
    self.doms[label].className = "livesim_settings_check_label";
    self.doms[container].appendChild(self.doms[label]);
  };

  this.create_select = function (name, title, options) {
    var container = "container_" + name;
    var label = "label_" + name;
    self.doms[container] = document.createElement("div");
    self.doms[container].className = "livesim_field_container";
    self.main_container.appendChild(self.doms[container]);
    self.doms[label] = document.createElement("label");
    self.doms[label].innerHTML = title + ":";
    self.doms[label].className = "livesim_field_label";
    self.doms[container].appendChild(self.doms[label]);
    self.doms[name] = document.createElement("select");
    self.doms[name].className = "livesim_settings_select livos_dropdown";
    for(var i = 0; i < options.length; i++) {
      var opt = document.createElement("option");
      opt.value = options[i].value;
      opt.innerHTML = options[i].title;
      self.doms[name].add(opt);
    }
    self.doms[name].onchange = function () {
      self.socket.emit("set_conf", {project_id: PROJECT_ID, conf_name: name, conf_val: $(self.doms[name]).val(), history_name: ""});
    };
    self.doms[container].appendChild(self.doms[name]);
  };

  //Benchmarks
  this.tab_holder.add_tab("benchmarks", "Benchmarks");
  this.tab_holder.tabs.benchmarks.style.display = "";
  this.tab_holder.tab_buttons.benchmarks.className = "live_tab_button";

  //CSV
  this.tab_holder.add_tab("csv", "Saving");
  this.create_check("dump_all", "Full History", "0", this.tab_holder.tabs.csv);
  this.create_check("csv_raw_stats", "Store Raw Stats", "0", this.tab_holder.tabs.csv);
  this.create_check("csv_dump_conf", "Store Configuration", "0", this.tab_holder.tabs.csv);
  this.create_check("csv_dump_summary", "Store Summary Stats", "0", this.tab_holder.tabs.csv);
  this.create_check("csv_dump_check", "Store Checkpoint Stats", "0", this.tab_holder.tabs.csv);
  this.create_check("csv_dump_full", "Store Point Stats", "0", this.tab_holder.tabs.csv);
  this.create_check("csv_cpi_history", "Store CPI History", "0", this.tab_holder.tabs.csv);

  //Precision
  this.tab_holder.add_tab("precision", "Precision");
  this.create_field("ci_certainity", "CI Certainity", "0", this.tab_holder.tabs.precision);
  this.create_field("max_ci", "Max CI", "0", this.tab_holder.tabs.precision);
  this.create_field("histogram_interval", "Histogram Interval", "0", this.tab_holder.tabs.precision);
  this.create_field("init_checkpoints", "Initial Checkpoints", "0", this.tab_holder.tabs.precision);
  this.create_field("sample_size", "Sub-Sample Size", "0", this.tab_holder.tabs.precision);
  this.create_field("general_warmup", "General Warmup", "0", this.tab_holder.tabs.precision);
  this.create_field("detailed_warmup", "Detailed Warmup", "0", this.tab_holder.tabs.precision);
  this.create_field("range_to", "Initial Range", "0", this.tab_holder.tabs.precision);
  this.create_field("min_sim_sample_size", "Minimum Range", "0", this.tab_holder.tabs.precision);
  this.create_check("naive_ci", "Naive Confidence Interval", "0", this.tab_holder.tabs.precision);

  //Sampling
  this.tab_holder.add_tab("sampling", "Sampling");
  this.create_field("ci_method", "CI Method", "0", this.tab_holder.tabs.sampling);
  this.create_field("cluster_method", "Cluster Method", "0", this.tab_holder.tabs.sampling);
  this.create_field("range_method", "Range Method", "0", this.tab_holder.tabs.sampling);
  this.create_field("range_threshold", "Range Threshold", "0", this.tab_holder.tabs.sampling);
  this.create_field("spike_avoidance", "Spike Avoidance", "0", this.tab_holder.tabs.sampling);
  this.create_check("do_cluster", "Enable Clustering", "0", this.tab_holder.tabs.sampling);
  this.create_check("range_abs", "Drop any trend", "0", this.tab_holder.tabs.sampling);
  this.create_check("fixed_range", "Fixed Delta Range", "0", this.tab_holder.tabs.sampling);
  this.create_check("live_cache", "Enable LiveCache", "0", this.tab_holder.tabs.sampling);
  this.create_check("only_cpi", "Only simulate CPI", "0", this.tab_holder.tabs.sampling);

  this.open = function ()
  {
    //creating a new window
    var title = "LiveSim Settings";
    self.app_window = wm.openElement(self.app_div, 420, 560, "random", "random", {}, {}, self.on_close);
    self.app_window.activate_menu();
    self.is_open = true;
    this.socket.emit("get_conf", {project_id: PROJECT_ID, history_name: "", comparables: JSON.stringify([])});
  };

  this.on_close = function () {
    self.parent_on_close();
  };

  this.socket.on("receive_conf", function (obj) {
    var conf = JSON.parse(obj.conf);
    self.tab_holder.tabs.benchmarks.innerHTML = "";
    for(var i in conf.benchmarks) {
      var optc = document.createElement("div");
      optc.className = "livesim_benchmark_option_container";
      self.tab_holder.tabs.benchmarks.appendChild(optc);
      var chk = document.createElement("input");
      chk.type = "checkbox";
      chk.className = "livesim_benchmark_option";
      chk.value = i;
      chk.checked = conf.selected_benchmarks[i];
      chk.onchange = function () {
        var conf_val = "0";
        if(this.checked)
          conf_val = 1;
        self.socket.emit("set_conf", {project_id: PROJECT_ID, conf_name: "benchmark", index: this.value, conf_val: conf_val, history_name: ""});
      };
      optc.appendChild(chk);
      var optl = document.createElement("label");
      optl.innerHTML = i;
      optl.className = "livesim_benchmark_option_label";
      optc.appendChild(optl);
    };

    for(var param in conf.settings) {
      if(self.dom_types[param] == "check") {
        self.doms[param].checked = conf.settings[param];
      } else {
        self.doms[param].value = conf.settings[param];
      } 
    }
  });
}
