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

function livesim_app()
{
	//Defining class fields
	var self = this;
	this.livesim_windows = [];

	this.open = function () {
		var i = self.get_id();
		self.livesim_windows[i] = new livesim_window(i, self);
	};

	this.get_id = function () {
		var i = 0;
		while (self.livesim_windows[i] !== null && i < self.livesim_windows.length)
			i++;
		return i;
	};

	this.on_window_close = function (id) {
		this.livesim_windows[id] = null;
	};
}


function livesim_window (id, ea) {
	///////// Fields /////////
	//Static fields
	var self = this;
	this.id = id;
	this.ea = ea;
	this.socket = io.connect(":" + PORTS.livesim + "/livesim", {"force new connection": true, query: $.param({token: TOKEN})});

	//Initilized variables
	this.doms = {};
	this.bench_index = {};
	this.plot = null;
	this.app_window = null;
	this.plot_el = null;
	this.updater = null;
	this.data = null;
	this.plot_type = "bar";
	this.metric = "cpi";
	this.benchmark = "";
	this.max_trace = 0;
	this.is_simulating = false;
	this.history_name = "";
	this.history_window = null;
	this.compare_window = null;
	this.comparables = [];
	this.comparables_del = 0;
	this.resize_requests = 0;
	this.multiselects = [];
	this.conf = null;
	this.status_array = {};
	this.is_baseline = true;
	this.settings_window = null;
	this.conf_window = null;
	this.csv_status = "inactive";
	this.prev_benchmark = "";
	this.checkpoint = 0;
	this.check_count = 0;

	//Parameters
	this.colors = ["1f77b4", "ff7f0e", "2ca02c", "d62728", "9467bd", "8c564b", "e377c2", "7f7f7f", "bcbd22", "17becf"];
	this.update_rate = 1000;
	this.metric_options = [
		{"value": "cpi", "title": "CPI"},
		{"value": "ipc", "title": "IPC"},
		{"value": "uipc", "title": "uIPC"},
		//{"value": "bpredtime", "title": "Average Branch Time"},
		{"value": "bpredrate", "title": "Branch Predictor Success Rate"},
		{"value": "IL1_lat", "title": "IL1 Latency"},
		{"value": "ITLB_lat", "title": "ITLB Latency"},
		{"value": "DL1_lat", "title": "DL1 Latency"},
		{"value": "L2_lat", "title": "L2 Latency"},
		{"value": "L3_lat", "title": "L3 Latency"},
		{"value": "IL1_missrate", "title": "IL1 Miss Rate"},
		{"value": "ITLB_missrate", "title": "ITLB Miss Rate"},
		{"value": "DL1_missrate", "title": "DL1 Miss Rate"},
		{"value": "L2_missrate", "title": "L2 Miss Rate"},
		{"value": "L3_missrate", "title": "L3 Miss Rate"},
		{"value": "time", "title": "Simulation Time"}
	];


	///////// Functions /////////

	//HTML Select Creator
	this.create_select = function (name, title, hidden, multi, options, onchange) {
		var container = name + "_container";
		var label = name + "_label";
		var select = name + "_select";
		self.doms[container] = document.createElement("div");
		if(hidden)
			self.doms[container].style.display = "none";
		self.doms[container].className = "livesim_select_container";
		self.top_bar.appendChild(self.doms[container]);
		/*self.doms[label] = document.createElement("label");
		self.doms[label].innerHTML = title + ":";
		self.doms[label].className = "livesim_topbar_label";
		self.doms[container].appendChild(self.doms[label]); */
		self.doms[select] = document.createElement("select");
		if(multi)
			self.doms[select].multiple = true;
		self.doms[select].className = "livesim_select multiselect";
		for(var i = 0; i < options.length; i++) {
			var opt = document.createElement("option");
			opt.value = options[i].value;
			opt.innerHTML = options[i].title;
			self.doms[select].add(opt);
		}
		self.doms[select].onchange = onchange;
		self.doms[container].appendChild(self.doms[select]);
		self.multiselects.push(select);
	};

	this.update_benchmark_select = function (conf) {
		self.doms.benchmark_select.innerHTML = "";
		for(var i in self.conf.selected_benchmarks) {
			var opt = document.createElement("option");
			opt.value = i;
			if(i == self.prev_benchmark)
				opt.selected = "selected";
			opt.innerHTML = i;
			self.doms.benchmark_select.add(opt);
		}
		$(self.doms.benchmark_select).multiselect("rebuild");
		self.benchmark = $(self.doms.benchmark_select).val();
	};

	this.update_selects = function (metric, benchmark, checkpoint) {
		if(metric)
			self.doms.metric_container.style.display = "";
		else
			self.doms.metric_container.style.display = "none";
		if(benchmark)
			self.doms.benchmark_container.style.display = "";
		else
			self.doms.benchmark_container.style.display = "none";
		if(checkpoint)
			self.doms.checkpoint_container.style.display = "";
		else
			self.doms.checkpoint_container.style.display = "none";
	};

	this.create_plot = function () {
		self.reset_data(true);
		switch (self.plot_type) {
			case "bar": 
				self.update_selects(true, false, false);
				self.create_bar_plot();
			break;
			case "delta":
				self.update_selects(true, false, false); 
				self.create_bar_plot();
			break;
			case "checkpoint": 
				self.update_selects(true, true, false);
				self.create_bar_plot();
			break;
			case "trace": 
				self.update_selects(true, true, false);
				self.create_line_plot(3);
			break;
			case "sweep": 
				self.update_selects(true, true, false);
				self.create_line_plot(1);
			break;
			case "sample":
				self.update_selects(true, true, true); 
				self.create_line_plot(3);
			break;
			case "histogram": 
				self.update_selects(true, true, false);
				self.create_bar_plot();
			break;
			case "delta_histogram": 
				self.update_selects(true, true, false);
				self.create_bar_plot();
			break;
		}
	};

	this.create_bar_plot = function () {
		self.reset_bar_data();
		self.plot_el_container.innerHTML = "";
		delete self.plot_el;
		self.plot_el = document.createElement("div");
		self.plot_el.id = "plot_el";
		self.plot_el.className = "livesim_plot  epoch";
		self.plot_el_container.appendChild(self.plot_el);
		if(self.comparables.length > 0) {
			self.plot_el_container.className = "livesim_plot_el_container2";
			self.legend_container.style.display = "";
			self.legend_container.innerHTML = "";
		} else {
			self.plot_el_container.className = "livesim_plot_el_container";
			self.legend_container.style.display = "none";
			self.legend_container.innerHTML = "";
		}
	  self.plot = $(self.plot_el).epoch({
	    type: "bar",
	    data: self.data
		});
		self.socket.emit("get_conf", {project_id: PROJECT_ID, history_name: self.history_name, comparables: JSON.stringify(self.comparables)});
	};

	this.create_line_plot = function (scount) {
		self.reset_line_data(scount);
		self.plot_el_container.innerHTML = "";
		delete self.plot_el;
		self.plot_el = document.createElement("div");
		self.plot_el.id = "plot_el";
		self.plot_el.className = "livesim_plot  epoch";
		self.plot_el_container.appendChild(self.plot_el);
		self.plot_el_container.className = "livesim_plot_el_container";
		self.legend_container.style.display = "none";
		self.plot = $(self.plot_el).epoch({
	    type: "line",
	    data: self.data
		});
		self.socket.emit("get_conf", {project_id: PROJECT_ID, history_name: self.history_name, comparables: JSON.stringify(self.comparables)});
	};

	this.reset_data = function (force) {
		switch (self.plot_type) {
			case "bar": self.reset_bar_data(force);
			break;
			case "delta": self.reset_bar_data(force);
			break;
			case "checkpoint": self.reset_bar_data();
			break;
			case "trace": self.reset_line_data(3);
			break;
			case "sweep": self.reset_line_data(1);
			break;
			case "sample": self.reset_line_data(3);
			break;
			case "histogram": self.reset_bar_data();
			break;
			case "delta_histogram": self.reset_bar_data();
			break;
		}
		self.plot.update(self.data);
	};

	this.reset_bar_data = function (force) {
		var i;
		if(force || ! self.data) {
			self.data = [];
			for(i = 0; i <= self.comparables.length; i++) {
				self.data[i] = {};
				self.data[i].label = (i === 0) ? self.history_name : self.comparables[i - 1];
				self.data[i].values = [];
			}			
		} else {
			for(i = 0; i <= self.comparables.length; i++) {
				self.data[i].values.forEach(function (bar) {
					bar.y = 0;
					bar.c = 0;
					bar.h = 0;
					bar.l = 0;
				});
			}
		}
	};

	this.reset_line_data = function (scount) {
		self.data = [];
		for(var i = 0; i < scount; i++) {
			self.data[i] = {};
			self.data[i].label = "val";
			self.data[i].values = [];
		}
	};

	//Requesting for stats
	this.update_plot = function () {
		clearInterval(self.updater);
		if(self.plot_type == "trace" || self.plot_type == "sample")
			self.reset_line_data(3);
		else if(self.plot_type == "sweep")
			self.reset_line_data(1);
		self.get_data();
		if(self.type != "sweep")
			self.set_updater();
	};

	//Setting the updater
	this.set_updater = function () {
		if(!self.is_simulating)
			return;
		self.updater = setInterval(function () {
			self.get_data();
		}, self.update_rate);
	};

	//Request for result update
	this.get_data = function () {
		switch(self.plot_type) {
			case "bar": self.socket.emit("get_results", {project_id: PROJECT_ID, plot_type: "bar", metric: self.metric, history_name: self.history_name, comparables: JSON.stringify(self.comparables)});
			break;
			case "delta": self.socket.emit("get_results", {project_id: PROJECT_ID, plot_type: "delta", metric: self.metric, history_name: self.history_name, comparables: JSON.stringify(self.comparables)});
			break;
			case "trace": self.socket.emit("get_results", {project_id: PROJECT_ID, plot_type: "trace", benchmark: self.benchmark, metric: self.metric, start: (self.max_trace + 1).toString(), history_name: self.history_name});
			break;
			case "sweep": self.socket.emit("get_results", {project_id: PROJECT_ID, plot_type: "sweep", benchmark: self.benchmark, metric: self.metric, history_name: self.history_name});
			break;
			case "sample": self.socket.emit("get_results", {project_id: PROJECT_ID, plot_type: "sample", benchmark: self.benchmark, checkpoint: self.checkpoint, metric: self.metric, start: 0, history_name: self.history_name});
			break;
			case "checkpoint": self.socket.emit("get_results", {project_id: PROJECT_ID, plot_type: "checkpoint", benchmark: self.benchmark, metric: self.metric, history_name: self.history_name});
			break;
			case "histogram": self.socket.emit("get_results", {project_id: PROJECT_ID, plot_type: "histogram", benchmark: self.benchmark, metric: self.metric, history_name: self.history_name});
			break;
			case "delta_histogram": self.socket.emit("get_results", {project_id: PROJECT_ID, plot_type: "delta_histogram", benchmark: self.benchmark, metric: self.metric, history_name: self.history_name});
			break;
		}
	};

	this.set_bar_conf = function (conf) {
		self.legend_container.innerHTML = "";
		for(var i = 0; i < self.data.length; i++) {
			self.data[i].values = [];
			self.bench_index = {};
			var index = 0;
			for(var j in self.conf.benchmarks) {
        if(self.conf.selected_benchmarks[j]) {
				  self.data[i].values[index] = {};
				  self.data[i].values[index].x = j;
				  self.data[i].values[index].y = 0;
				  self.data[i].values[index].c = 0;
				  self.data[i].values[index].h = 0;
				  self.data[i].values[index].l = 0;
				  self.bench_index[j] = index;
				  index++;
        }
			}
			self.data[i].values[index] = {};
			self.data[i].values[index].x = "Average";
			self.data[i].values[index].y = 0;
			self.data[i].values[index].c = 0;
			self.data[i].values[index].h = 0;
			self.data[i].values[index].l = 0;

			if(self.data.length > 1) {
				var le = document.createElement("div");
				le.className = "livesim_legend_item";
				le.style.color = "#" + self.colors[i];
				le.innerHTML = (i === 0) ? ((self.history_name === "") ? "Current" : self.history_name) : self.comparables[i - 1];
				self.legend_container.appendChild(le);
			}
		}
	};

	this.set_delta_conf = function (conf) {
		self.legend_container.innerHTML = "";
		for(var i = 0; i < self.data.length; i++) {
			self.data[i].values = [];
			self.bench_index = {};
			var index = 0;
			for(var j in self.conf.benchmarks) {
        if(self.conf.selected_benchmarks[j]) {
				  self.data[i].values[index] = {};
				  self.data[i].values[index].x = j;
				  self.data[i].values[index].y = 0;
				  self.data[i].values[index].c = 0;
				  self.data[i].values[index].h = 0;
				  self.data[i].values[index].l = 0;
				  self.bench_index[j] = index;
				  index++;
        }
			}
			self.data[i].values[index] = {};
			self.data[i].values[index].x = "Average";
			self.data[i].values[index].y = 0;
			self.data[i].values[index].c = 0;
			self.data[i].values[index].h = 0;
			self.data[i].values[index].l = 0;

			if(self.data.length > 1) {
				var le = document.createElement("div");
				le.className = "livesim_legend_item";
				le.style.color = "#" + self.colors[i];
				le.innerHTML = (i === 0) ? ((self.history_name === "") ? "Current" : self.history_name) : self.comparables[i - 1];
				self.legend_container.appendChild(le);
			}
		}
	};

	this.set_sample_conf = function (conf) {
		self.update_benchmark_select(conf);
		self.doms.checkpoint_select.innerHTML = "";
		$(self.doms.checkpoint_select).multiselect("rebuild");
		self.checkpoint = 0;
	};

	this.set_sweep_conf = function (conf) {
		self.update_benchmark_select(conf);
		var opta = document.createElement("option");
		opta.value = "-1";
		opta.innerHTML = "Average";
		self.doms.benchmark_select.add(opta);
		$(self.doms.benchmark_select).multiselect("rebuild");
		self.benchmark = $(self.doms.benchmark_select).val();
	};

	this.bar_plot_stats = function (obj) {
		self.reset_bar_data();
		var cnt, avg, avg_max, avg_min, c, p;
		var stats = obj.stats;
		for(var j = 0; j < stats.length; j++) {
			cnt = 0;
      avg= 0;
      avg_max = 0;
      avg_min = 0;
			for(var i in self.conf.selected_benchmarks) {
				if(stats[j][i] && self.bench_index[i] !== null && stats[j][i].value) {
					var t = self.bench_index[i];
					if(self.data[j].values[t]) {
						self.data[j].values[t].y = stats[j][i].value;
						self.data[j].values[t].l = stats[j][i].min;
						self.data[j].values[t].h = stats[j][i].max;
            c = Math.round((self.data[j].values[t].h - self.data[j].values[t].l) * 50) / 100; 
						p = Math.round((c / stats[j][i].value) * 10000) / 100;
            self.data[j].values[t].c = c.toString() + " (" + p.toString() + "%)";
						cnt ++;
            avg += parseFloat(stats[j][i].value);
            avg_max += parseFloat(stats[j][i].max);
            avg_min += parseFloat(stats[j][i].min);
					}
				}
			}
			if(cnt !== 0) {
				self.data[j].values[cnt].y = Math.round((avg / cnt) * 100) / 100;
				self.data[j].values[cnt].l = Math.round((avg_min / cnt) * 100) / 100;
				self.data[j].values[cnt].h = Math.round((avg_max / cnt) * 100) / 100;
        c = Math.round((self.data[j].values[cnt].h - self.data[j].values[cnt].l) * 50) / 100; 
			  p = Math.round((c / avg) * 10000) / 100;
				self.data[j].values[cnt].c = c.toString() + " (" + p.toString() + "%)";
			}
		}
		self.plot.update(self.data); 
	};

	this.delta_plot_stats = function (obj) {
		var cnt, avg, avg_max, avg_min;
		var stats = obj.stats;
		for(var j = 0; j < stats.length; j++) {
			cnt = 0;
      avg= 0;
      avg_max = 0;
      avg_min = 0;
			for(var i in self.conf.selected_benchmarks) {
				if(stats[j][i] && self.bench_index[i] !== null && stats[j][i].value) {
					var t = self.bench_index[i];
					if(self.data[j].values[t]) {
						self.data[j].values[t].y = parseFloat(stats[j][i].value);
						self.data[j].values[t].l = parseFloat(stats[j][i].min);
						self.data[j].values[t].h = parseFloat(stats[j][i].max);
						self.data[j].values[t].c = (self.data[j].values[t].h - self.data[j].values[t].l) / 2;
						cnt ++;
            avg += parseFloat(stats[j][i].value);
            avg_max += parseFloat(stats[j][i].max);
            avg_min += parseFloat(stats[j][i].min);
					}
				}
			}
			if(cnt !== 0) {
				self.data[j].values[cnt].y = avg / cnt;
				self.data[j].values[cnt].l = avg_min / cnt;
				self.data[j].values[cnt].h = avg_max / cnt;
				self.data[j].values[cnt].c = (self.data[j].values[cnt].h - self.data[j].values[cnt].l) / 2;
			}
		}
		self.plot.update(self.data); 
	};

	this.trace_plot_stats = function (obj) {
		self.benchmark = $(self.doms.benchmark_select).val();
		for(var i = 0; i < 3; i++) {
			self.data[i].values = obj.stats[i];
		}
		self.plot.update(self.data);
	};

	this.checkpoint_plot_stats = function (obj) {
		self.benchmark = $(self.doms.benchmark_select).val();
		self.reset_bar_data(true);
		var stats = obj.stats;
		var cnt = 0;
    	var avg= 0;
    	var t = 0;
		for(var i in stats) {
			var val = parseFloat(stats[i].value);
			self.data[0].values[t] = {};
			self.data[0].values[t].x = i;
			self.data[0].values[t].y = val;
			self.data[0].values[t].l = val;
			self.data[0].values[t].h = val;
			self.data[0].values[t].c = 0;
			cnt ++;
      avg += val;
      t ++;
		}
		if(cnt !== 0) {
			avg = avg / cnt;
			self.data[0].values[t] = {};
			self.data[0].values[t].x = "average";
			self.data[0].values[t].y = avg;
			self.data[0].values[t].l = avg;
			self.data[0].values[t].h = avg;
			self.data[0].values[t].c = 0;
		}
		self.plot.update(self.data); 
	};

	this.histogram_plot_stats = function (obj) {
		self.benchmark = $(self.doms.benchmark_select).val();
		self.reset_bar_data(true);
		var stats = obj.stats;
    var t = 0;
		for(var i = 0; i < stats.length; i++) {
			var val = parseFloat(stats[i].y);
			self.data[0].values[t] = {};
			self.data[0].values[t].x = (stats[i].x).toString();
			self.data[0].values[t].y = val;
			self.data[0].values[t].l = 0;
			self.data[0].values[t].h = 0;
			self.data[0].values[t].c = 0;
      t ++;
		}
		self.plot.update(self.data); 
	};

	this.delta_histogram_plot_stats = function (obj) {
		self.benchmark = $(self.doms.benchmark_select).val();
		self.reset_bar_data(true);
		var stats = obj.stats;
    var t = 0;
		for(var i = 0; i < stats.length; i++) {
			var val = parseFloat(stats[i].y);
			self.data[0].values[t] = {};
			self.data[0].values[t].x = (stats[i].x).toString();
			self.data[0].values[t].y = val;
			self.data[0].values[t].l = val;
			self.data[0].values[t].h = val;
			self.data[0].values[t].c = 0;
      t ++;
		}
		self.plot.update(self.data); 
	};

	this.sample_plot_stats = function (obj) {
    self.benchmark = $(self.doms.benchmark_select).val();
		//self.checkpoint = $(self.doms.checkpoint_select).val();
		if(self.update_checkpoint_select(obj.stats.checks)) {
			var points = obj.stats.results;
			self.data[0].values = [];
			self.data[1].values = [];
			self.data[2].values = [];
			for(var i = 0; i < 3; i ++) {
				for(var j = 0; j < points[i].length; j++) {
					self.data[i].values.push({"x": points[i][j].x, "y": parseFloat(points[i][j].y)});
				}
			}
			self.plot.update(self.data);
		}
	};

	this.sweep_plot_stats = function (obj) {
    self.benchmark = $(self.doms.benchmark_select).val();
		var points = obj.stats;
		points.forEach(function (point) {
			self.data[0].values.push({"x": point.x, "y": parseFloat(point.y)});
		});
		self.data[0].values.sort(function (a, b) {
			return a.x - b.x;
		});
		self.max_trace += points.length;
		self.plot.update(self.data);
	};

	this.load_history_list = function (search_key) {
		self.socket.emit("get_history_list", {project_id: PROJECT_ID, search_key: search_key});
	};

	this.save_history = function () {
		var d = new Date();
		alertify.prompt("Please choose a name", function(e, str) {
			if(e)
				self.socket.emit("dump_results", {project_id: PROJECT_ID, name: str});
		}, d.toString());
	};

	this.delete_history = function () {
		if(self.history_name !== "" && self.history_name != "current") {
			alertify.confirm("Please confirm deleting livesim history " + self.history_name, function (e) {
				if(e)
					self.socket.emit("remove_dump", {project_id: PROJECT_ID, name: self.history_name});
			});
		}
	};

	this.update_status_html = function (starr) {
    var out = "<table class=\"livesim_stats\">";
		out += "<th><tr><td>Benchmark</td><td>Done</td><td>Running</td><td>Unreliable</td><td>Clusters</td><td>Status</td></th></tr>";
		for(var i in self.conf.selected_benchmarks) {
			out += "<tr><td>" + i + "</td><td>" + starr[i].done_checkpoints + "</td><td>" + starr[i].running_checkpoints + "</td><td>" + starr[i].unreliable_checkpoints + "</td><td>" + starr[i].clusters + "</td><td>" + starr[i].status + "</td></tr>";
		}
		out += "</table>";
		self.status_drop_content.innerHTML = out;
	};


	///////// Menu Functions and Events /////////

	//Download Plot
	this.download_plot = function () {
		var filename = "";
		if(self.history_name)
			filename = self.history_name + "_";
		if(self.plot_type == "mips")
      filename += "_mips";
    else
      filename += self.plot_type + "_" + self.metric;
		if(self.plot_type != "bar" && self.plot_type != "delta" && self.plot_type != "mips" && self.benchmark >= 0)
			filename += "_" + self.conf.benchmarks[self.benchmark].name;
    filename += ".svg";
		var content = self.plot_el.innerHTML;
		var css_content = "<style type=\"text/css\" >  <![CDATA[  .axis path,.axis line {   fill:none;   stroke:#000;   shape-rendering:crispEdges }  .axis.canvas .tick line {   shape-rendering:geometricPrecision }  .axis .tick text {   font-size:9pt }  .line {   fill:none;   stroke-width:2px } .sparklines .line {   stroke-width:1px }  .gauge-labels .value {   text-anchor:middle;   font-size:140%;   fill:#666 } .gauge-tiny {   width:120px;   height:90px } .gauge-tiny .gauge-labels .value {   font-size:80% } .gauge-tiny .gauge .arc.outer {   stroke-width:2px } .gauge-small {   width:180px;   height:135px } .gauge-small .gauge-labels .value {   font-size:120% } .gauge-small .gauge .arc.outer {   stroke-width:3px } .gauge-medium {   width:240px;   height:180px } .gauge-medium .gauge .arc.outer {   stroke-width:3px } .gauge-large {   width:320px;   height:240px } .gauge-large .gauge-labels .value {   font-size:180% }  .gauge .arc.outer {   stroke-width:4px;   stroke:#666 }  .gauge .arc.inner {   stroke-width:1px;   stroke:#555 }  .gauge .tick {   stroke-width:1px;   stroke:#555 }  .gauge .needle {   fill:orange }  .gauge .needle-base {   fill:#666 } .category1 {   background-color:#1f77b4;   stroke:#1f77b4;   fill:#1f77b4; }  .category2 {   background-color:#ff7f0e;   stroke:#ff7f0e;   fill:#ff7f0e; }  .category3 {   background-color:#2ca02c;   stroke:#2ca02c;   fill:#2ca02c; }  .category4 {   background-color:#d62728;   stroke:#d62728;   fill:#d62728; }  .category5 {   background-color:#9467bd;   stroke:#9467bd;   fill:#9467bd; }  .category6 {   background-color:#8c564b;   stroke:#8c564b;   fill:#8c564b; }  .category7 {   background-color:#e377c2;   stroke:#e377c2;   fill:#e377c2; }  .category8 {   background-color:#7f7f7f;   stroke:#7f7f7f;   fill:#7f7f7f; }  .category9 {   background-color:#bcbd22;   stroke:#bcbd22;   fill:#bcbd22; }  .category10 {   background-color:#17becf;   stroke:#17becf;   fill:#17becf; }    div#_canvas_css_reference {   width:0;   height:0;   position:absolute;   top:-1000px;   left:-1000px }   div#_canvas_css_reference svg {   position:absolute;   width:0;   height:0;   top:-1000px;   left:-1000px }  .epoch .axis path, .epoch .axis line {   stroke: #fff; }  .epoch text {   stroke: #fff; }  .epoch_bar_ci {   fill: none;   stroke: #FF0077;   stroke-width: 2; }     ]]>   </style>";
		var t = content.indexOf(">");
		content = content.substring(0, t + 1) + css_content + content.substring(t);	
		var link = document.createElement("a");
    link.download = filename;
    link.href = "data:," + content;
    link.click();
	};

	this.update_checkpoint_select = function (checks) {
		var ret = false;
		self.check_count = checks.length;
		self.doms.checkpoint_select.innerHTML = "";
		checks.forEach(function (cp) {
			var opt = document.createElement("option");
			opt.value = cp.cpid;
			opt.innerHTML = cp.cpid + " (" + cp.status + ")";
			if(cp.cpid == self.checkpoint) {
				opt.selected = "selected";
				ret = true;
			}
			self.doms.checkpoint_select.add(opt);
		});
		$(self.doms.checkpoint_select).multiselect("rebuild");
		
		if(ret === false) {
			self.doms.checkpoint_select.selectedIndex = 0;
			self.checkpoint = $(self.doms.checkpoint_select).val();
		}

		return ret;
	};

	/*this.update_menu_conf = function (obj) {
		var conf = JSON.parse(obj.conf);
		if(conf.is_baseline) {
			self.is_baseline = true;
			self.menu_items.baseline.title.nodeValue = "Set as Baseline";
		} else {
			self.is_baseline = false;
			self.menu_items.baseline.title.nodeValue = "Reset Baseline";
		}
	}*/

	//Running livesim 
	this.run_simulation = function () {
		self.socket.emit("run", {project_id: PROJECT_ID, metric: self.metric});
	};

	//Running sweeping
	this.run_sweep = function () {
		self.socket.emit("sweep", {project_id: PROJECT_ID});
	};

	//Stopping livesim 
	this.stop_simulation = function () {
		self.socket.emit("stop", {project_id: PROJECT_ID});
	};

	this.calibrate = function () {
		self.socket.emit("calibrate", {project_id: PROJECT_ID});
	};

	//Setting the baseline
	this.run_delta = function () {
		self.socket.emit("run_delta", {project_id: PROJECT_ID});
	};

	//Setting CSV timer status
	this.set_csv_status = function (st) {
		self.history_csv.src = "img/csv_" + st + ".png";
		self.csv_status = st;
	};

	//Toggling CSV timer status
	this.toggle_csv = function () {
		if(self.csv_status == "active") {
			self.socket.emit("set_csv_timer", {project_id: PROJECT_ID, status: "inactive"});
		} else {
			var d = new Date();
			alertify.prompt("Please choose a name", function(e, str) {
				if(e)
					self.socket.emit("set_csv_timer", {project_id: PROJECT_ID, name: str, status: "active"});
			}, d.toString());
		}
	};

	//Openning settings app
	this.open_settings = function () {
		if(self.settings_window) {
			JSWM.setActiveWindow(self.settings_window);
			JSWindow.setActive();
		} else {
			self.settings_window = new livesim_settings(function () {
				self.settings_window = null;
			});
			self.settings_window.open();
		}
	};

	//Openning conf app
	this.open_conf = function () {
		if(self.conf_window) {
			JSWM.setActiveWindow(self.conf_window);
			JSWindow.setActive();
		} else {
			self.conf_window = new livesim_conf(function () {
				self.conf_window = null;
			});
			self.conf_window.open();
		}
	};

	//On closing the window
	this.on_close = function () {
		self.socket.disconnect();
		self.ea.on_window_close(self.id);
	};

	this.on_resize = function () {
		self.resize_requests ++;
		setTimeout(function () {
			if(self.resize_requests <= 1) {
				self.create_plot();
				self.resize_requests = 0;
			} else {
				self.resize_requests --;
			}
		}, 50);
	};


	///////// Socket Events /////////

	//Getting benchmarks and status
	this.socket.on("receive_conf", function (obj) {
		//Avoid broadcasts when viewing history
		//self.update_menu_conf(obj);
		if(self.history_name != obj.history_name)
			return;
		var conf = JSON.parse(obj.conf);
		self.conf = conf;
		switch (self.plot_type) {
			case "bar": self.set_bar_conf(conf);
			break;
			case "delta": self.set_delta_conf(conf);
			break;
			case "trace": self.update_benchmark_select(conf);
			break;
			case "sweep": self.set_sweep_conf(conf);
			break;
			case "sample": self.set_sample_conf(conf);
			break;
			case "checkpoint": self.update_benchmark_select(conf);
			break;
			case "histogram": self.update_benchmark_select(conf);
			break;
			case "delta_histogram": self.update_benchmark_select(conf);
			break;
		}
		self.plot.update(self.data);
		self.is_simulating = conf.is_simulating;
		self.update_plot();
	});

	//On status update
	this.socket.on("status", function (obj) {
		if(obj.project_id == PROJECT_ID) {
			//Avoid broadcasts when viewing history
			if(self.history_name != obj.history_name)
				return;
			switch(obj.message) {
				case "setting_up":
					self.status_drop_content.innerHTML = "Setting up the simulation nodes and creating checkpoints ..."; 
					self.status_bar.innerHTML = "Setting up ...";
				break;
				case "recompiling":
					self.status_drop_content.innerHTML = "Recompiling changes sources ..."; 
					clearInterval(self.updater);
					self.status_bar.innerHTML = "Recompiling ...";
				break;
				case "simulating":
					self.is_simulating = true;
					clearInterval(self.updater);
					if(self.plot_type != "sweep") {
						self.reset_data();
						self.set_updater();
					}
					self.status_bar.innerHTML = "Simulating ...";
				break;
				case "simulation_done":
					self.is_simulating = false;
					clearInterval(self.updater);
					self.status_bar.innerHTML = "Simulation finished at " + obj.params.mips + " mips (" + obj.params.time + " s)";
					setTimeout(function () {
						self.get_data();
					}, 100);
				break;
				case "simulation_stopped":
					clearInterval(self.updater);
					self.is_simulating = false;
					self.status_bar.innerHTML = "Simulation Stopped!";
				break;
				default:
					self.status_drop_content.innerHTML = obj.message; 
					self.is_simulating = false;
					clearInterval(self.updater);
					self.status_bar.innerHTML = "Simulation Error!";
			}

			if(obj.params && obj.params.csv) {
				self.set_csv_status(obj.csv);
			}
		}
	});

	//On message
	this.socket.on("message", function (obj) {
		if(obj.project_id != PROJECT_ID)
			return;

		switch(obj.message) {
			case "csv_status":
			  self.set_csv_status(obj.params.status);
			break;
		}
	});

	//On receiving stats
	this.socket.on("receive_results", function (obj) {
		if(obj.project_id == PROJECT_ID && obj.stats) {
      switch(self.plot_type) {
				case "bar": self.bar_plot_stats(obj);
				break;
				case "delta": self.delta_plot_stats(obj);
				break;
				case "trace": self.trace_plot_stats(obj);
				break;
				case "mips": self.mips_plot_stats(obj);
				break;
				case "timeline": self.timeline_plot_stats(obj);
				break;
				case "sweep": self.sweep_plot_stats(obj);
				break;
				case "sample": self.sample_plot_stats(obj);
				break;
				case "checkpoint": self.checkpoint_plot_stats(obj);
				break;
				case "histogram": self.histogram_plot_stats(obj);
				break;
				case "delta_histogram": self.delta_histogram_plot_stats(obj);
				break;
			}

			self.update_status_html(obj.status);
		}
	});

	this.socket.on("receive_history_list", function (obj) {
		if(obj.project_id != PROJECT_ID)
			return;
		$(self.doms.run_select).empty();
		$(self.doms.compare_select).empty();
		var opt = document.createElement("option");
		opt.innerHTML = "Current Run";
		opt.value = "";
		self.doms.run_select.add(opt);
		obj.history_list.forEach(function (item) {
			var opt = document.createElement("option");
			opt.innerHTML = item;
			opt.value = item;
			self.doms.run_select.add(opt);

			opt = document.createElement("option");
			opt.innerHTML = item;
			opt.value = item;
			self.doms.compare_select.add(opt);
		});
		$(self.doms.run_select).multiselect("rebuild");
		$(self.doms.compare_select).multiselect("rebuild");
	});


	///////// Creating Window and Content /////////
	this.app_div = document.createElement("div");
	this.app_div.className = "livesim_container";
	this.top_bar = document.createElement("div");
	this.top_bar.className = "livesim_top_bar";
	this.app_div.appendChild(this.top_bar);
	this.plot_el_container = document.createElement("div");
	this.plot_el_container.className = "livesim_plot_el_container";
	this.app_div.appendChild(this.plot_el_container);
	this.legend_container = document.createElement("div");
	this.legend_container.className = "livesim_legend_container";
	this.legend_container.style.display = "none";
	this.app_div.appendChild(this.legend_container);
	this.clear_div = document.createElement("div");
	this.clear_div.className = "livesim_clear";
	this.app_div.appendChild(this.clear_div);
	this.status_bar = document.createElement("div");
	this.status_bar.id = "livesim_status_bar";
	this.status_bar.className = "livesim_status_bar";
	this.app_div.appendChild(this.status_bar);

	//Simulation run dropdown
	this.create_select("run", "Run", false, false, [], function () {
		self.history_name = $(self.doms.run_select).val();
		self.reset_data();
		self.update_plot();
		self.socket.emit("get_conf", {project_id: PROJECT_ID, history_name: self.history_name, comparables: JSON.stringify(self.comparables)});
		self.status_bar.innerHTML = "History: " + self.history_name;
	});

	//Compare dropdown
	this.create_select("compare", "Compare", false, true, [], function () {
		for(var i = 0; i < self.doms.compare_select.length; i++) {
			var val = self.doms.compare_select.options[i].value;
			if(self.doms.compare_select.options[i].selected) {
				if(self.comparables.indexOf(val) == -1) {
					self.comparables[self.comparables_del] = val;
					self.comparables_del ++;
				}
			} else {
				var t = self.comparables.indexOf(val);
				if(t != -1) {
					for(var j = t; j < self.comparables_del -1; j++)
						self.comparables[j] = self.comparables[j + 1];
					self.comparables_del --;
					self.comparables.splice(self.comparables_del, 1);
				}
			}
		}
		if(self.plot_type == "bar" || self.plot_type == "delta") {
			self.create_plot();
		}
	});

	//add/remove to history button
	this.history_container = document.createElement("div");
	this.history_container.className = "livesim_history_button_container";
	this.top_bar.appendChild(this.history_container);
	this.history_save = document.createElement("img");
	this.history_save.className = "livesim_history_button";
	this.history_save.src = "/img/add_circle_outline24.png";
	this.history_save.onclick = this.save_history;
	this.history_container.appendChild(this.history_save);
	this.history_delete = document.createElement("img");
	this.history_delete.className = "livesim_history_button";
	this.history_delete.src = "/img/remove_circle_outline24.png";
	this.history_delete.onclick = this.delete_history;
	this.history_container.appendChild(this.history_delete);
	this.history_csv = document.createElement("img");
	this.history_csv.className = "livesim_history_button";
	this.history_csv.src = "/img/csv_inactive.png";
	this.history_csv.onclick = this.toggle_csv;
	this.history_container.appendChild(this.history_csv);
	this.history_download = document.createElement("img");
	this.history_download.className = "livesim_history_button";
	this.history_download.src = "/img/file_download24.png";
	this.history_download.onclick = this.download_plot;
	this.history_container.appendChild(this.history_download);
	//Creating plot_type select
	this.create_select("plot_type", "Plot", false, false, [
		{"value": "bar", "title": "Absolute Results"}, 
		{"value": "delta", "title": "Delta Results"},
		{"value": "sample", "title": "Sample Trend"},  
		{"value": "trace", "title": "Result History"},
		{"value": "histogram", "title": "Histogram"},
		{"value": "delta_histogram", "title": "Delta Histogram"},
		{"value": "checkpoint", "title": "Checkpoint Results"},
		{"value": "sweep", "title": "Parameter Sweep"}/*,
		{"value": "mips", "title": "Simulation Speed"}, 
		{"value": "timeline", "title": "Timeline"}*/],
		function () {
			self.plot_type = $(self.doms.plot_type_select).val();
			self.create_plot();
	});

	//Creating metric select
	this.create_select("metric", "Metric", false, false, self.metric_options, function () {
		self.metric = $(self.doms.metric_select).val();
		self.update_plot();
	});

	//Creating benchmark select
	this.create_select("benchmark", "Benchmark", true, false, [], function () {
		self.prev_benchmark = $(self.doms.benchmark_select).val();
		self.benchmark = $(self.doms.benchmark_select).val();
		self.update_plot();
	});

	//Creating checkpoint select
	this.create_select("checkpoint", "Checkpoint", true, false, [], function () {
		self.checkpoint = $(self.doms.checkpoint_select).val();
		self.update_plot();
	});

	//Status Drop
	this.status_drop_content = document.createElement("div");
	this.status_drop_content.className = "livesim_drop_content";
	this.status_drop = new Drop({
	  target: self.status_bar,
	  content: self.status_drop_content,
	  position: "top left",
	  openOn: "hover",
	  classes: "drop-theme-arrows-bounce-dark livesim_drop",
	  constrainToScrollParent: false
	});

	this.app_window = wm.openElement(this.app_div, 800, 480, "random", "random", {"title" : "LiveSim"}, {}, self.on_close);
	this.menu_items = {};
	this.menu_items.run = this.app_window.add_menu_item("Simulate", "", "title", this.app_window.menu, this.run_simulation);
	this.menu_items.stop = this.app_window.add_menu_item("Stop", "", "title", this.app_window.menu, this.stop_simulation);
	this.menu_items.delta = this.app_window.add_menu_item("Delta", "", "title", this.app_window.menu, this.run_delta);
	this.menu_items.calibrate = this.app_window.add_menu_item("Calibrate", "", "title", this.app_window.menu, this.calibrate);
	this.menu_items.sweep = this.app_window.add_menu_item("Sweep", "", "title", this.app_window.menu, this.run_sweep);
	this.menu_items.configuration = this.app_window.add_menu_item("Configuration", "", "title", this.app_window.menu, this.open_conf);
	this.menu_items.settings = this.app_window.add_menu_item("Settings", "", "title", this.app_window.menu, this.open_settings);
	this.app_window.activate_menu();
	this.app_window.container.addEventListener("on_resize", self.on_resize);


	///////// Initialization /////////
	self.create_bar_plot();
	self.load_history_list("");

	$(document).ready(function() {
		self.multiselects.forEach( function (key) {
			var nst;
			if(key == "compare_select")
				nst = "Compare";
			else
				nst = "Select";
			$(self.doms[key]).multiselect({
	    	maxHeight: 240,
	    	buttonWidth: 160,
	    	nonSelectedText: nst,
	    	enableFiltering: true,
	    	numberDisplayed: 1
    	});
		});
	});
}
