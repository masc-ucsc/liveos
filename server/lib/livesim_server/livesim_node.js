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
 
module.exports = function (id, project_id, es, ts, fserver, on_status, on_message) {
  //Includes and class inputs
  var self = this;
  var compute_node = require("./compute_node.js");
  this.fs = require("fs");
  this.os = require("os");
  this.ss = require("socket.io-stream");
  this.jstat = require("jStat").jStat;
  this.path = "files/" + project_id;
  this.source_path = "files/" + project_id +"/esesc";
  this.build_path = "files/" + project_id +"/build";
  this.run_path = "files/" + project_id +"/build/run";
  this.history_path = "files/" + project_id +"/build/run/live_history";
  this.csv_path = "files/" + project_id +"/build/run/csv";
  this.id = id;
  this.project_id = project_id;
  this.es = es;
  this.ts = ts;
  this.fserver = fserver;
  this.on_status = on_status;
  this.on_message = on_message;

  //Class fields
  this.benchmarks = null;
  this.benchmarks_count = 0;
  this.controllers = null;
  this.selected_benchmarks = {};
  this.compute_nodes = {};
  this.running_nodes = [];
  this.compute_nodes_ready = 0;
  this.compute_nodes_spawned = [];
  this.do_simulation = false;
  this.is_ready = false;
  this.has_nodes = true;
  this.cur_results = {};
  this.avg_results = {};
  this.history_results = {};
  this.is_simulating = false;
  this.server_name = "localhost";
  this.sample_size = 2e4;
  this.last_time = 0;
  this.first_result = true;
  this.settings = {};
  this.sweep_results = {};
  this.first_sweep_results = {};
  this.avg_sweep_results = {};
  this.is_sweeping = false;
  this.sweep_end = 0;
  this.sweep_step = 0;
  this.sweep_type = "*";
  this.is_sweep_baseline = false;
  this.done_avg = false;
  this.status_array = {};
  this.is_baseline = true;
  this.needs_recompile = false;
  this.needs_transfer = [];
  this.wait_and_run_callback = null;
  this.csv_status = "inactive";
  this.csv_name = "";
  this.csv_timer = null;
  this.csv_conf = true;
  this.simulation_metric = "cpi";

  this.metrics = ["cpi", "ipc", "uipc", "bpredtime", "bpredrate", 
    "IL1_lat", "ITLB_lat", "DL1_lat", "L2_lat", "L3_lat",
    "IL1_missrate", "ITLB_missrate", "DL1_missrate", "L2_missrate", "L3_missrate"];

  //Creating new LiveSim node
  this.create = function () {
    //Check and make sure livesim exists 
    if (!self.fs.existsSync(self.source_path)) {
      self.on_status(self.project_id, "livesim source does not exist");
      return;
    }

    console.log("livesim: Creating server " + self.project_id);

    //parameter initialization
    self.settings.range_method = "static";
    self.settings.ci_method = "normal";
    self.settings.naive_ci = 1;
    self.settings.cluster_method = "nspn";
    self.settings.spike_avoidance = 0;
    self.settings.max_ci = 0.1;
    self.settings.ci_certainity = 0.95;
    self.settings.init_checkpoints = 30;
    self.settings.sample_size = 100000;
    self.settings.range_to = 2;
    self.settings.min_sim_sample_size = 2;
    self.settings.range_threshold = 100;
    self.settings.range_abs = 1;
    self.settings.fixed_range = 0;
    self.settings.do_cluster = 1;
    self.settings.detailed_warmup = 2;
    self.settings.general_warmup = 0;
    self.settings.dump_all = 0;
    self.settings.csv_raw_stats = 0;
    self.settings.csv_dump_conf = 1;
    self.settings.csv_dump_summary = 1;
    self.settings.csv_dump_check = 0;
    self.settings.csv_dump_full = 0;
    self.settings.csv_cpi_history = 1;
    self.settings.histogram_interval = 20;
    self.settings.live_cache = 1;
    self.settings.only_cpi = 0;

    //check for only cpi
    if(self.settings.only_cpi == 1)
      self.metrics = ["cpi"];

    //Checking for cmake and run directory
    var cmds = [];
    if (!self.fs.existsSync(self.build_path)) {
      //If this is the first time, do full compilation
      console.log("livesim: First time compiling");
      self.fs.mkdirSync(self.build_path);
      cmds.push("cmake ../esesc");
      var mkc = "make";
      if(self.core_count)
        mkc += " -j" + self.core_count;
      cmds.push(mkc + " live");
      cmds.push(mkc);
    }
    if (!self.fs.existsSync(self.run_path)) {
      console.log("livesim: Creating run directory");
      self.fs.mkdirSync(self.run_path);
      cmds.push("cp -r " + self.source_path + "/conf/* " + self.run_path + "/.");
      cmds.push("cp -r " + self.source_path + "/conf/* " + self.run_path + "/.");
    }
    self.ts.run_inorder(cmds, self.path, function () {
      //Read benchmarks
      var ffc = self.fs.readFileSync(self.run_path + "/live_benchs.json", "utf8");
      var fc = JSON.parse(ffc);
      self.server_name = fc.server;
      self.benchmarks = fc.benchmarks;
      self.benchmarks_count = self.get_benchmarks_count();
      self.create_compute_nodes();
    });

    //watching for touched files
    self.fserver.emit("watch_touch", {path: self.project_id + "/esesc"});
    self.fserver.emit("watch_touch", {path: self.project_id + "/build/run/simu.conf"});
    self.fserver.emit("watch_touch", {path: self.project_id + "/build/run/esesc.conf"});
  };

  //distribute and setup benchmarks
  this.setup = function (controllers) {
    self.on_status(self.project_id, "setting_up");
    self.controllers = controllers;

    var i;
    var total_cores = 0;
    for(i = 0; i < self.controllers.length; i++) {
      total_cores += self.controllers[i].core_count;
    }

    var total_checks = 0;
    var benchs = [];
    for(i in self.benchmarks) {
      benchs.push({"id": i, "n": parseInt(self.benchmarks[i].ncheckpoints)});
      total_checks += parseInt(self.benchmarks[i].ncheckpoints);
    }

    benchs.sort(function (a, b) {
      return b.n - a.n;
    });

    var per = total_checks / total_cores;

    for(i = 0; i < self.controllers.length; i++) {
      var cnt = 0;
      var max = self.controllers[i].core_count * per;
      var cur = 0;
      while(cnt < benchs.length) {
        if(benchs[cnt].n + cur <= max) {
          self.assign_node(i, benchs[cnt].id);
          cur += benchs[cnt].n;
          benchs.splice(cnt, 1);
        } else {
          cnt ++;
        }
      }
    }

    benchs.forEach(function (bench) {
      self.assign_node(0, bench.id);
    });
  };

  //assign new controller (compute machine)
  this.assign_node = function (cc, id) {
    if(! self.controllers[cc].compute_nodes)
      self.controllers[cc].compute_nodes = [];
    self.controllers[cc].compute_nodes.push(self.compute_nodes[id]);
    self.compute_nodes[id].setup(self.controllers[cc]);
    console.log(id + " assigned to " + cc);
  };

  //add a new benchmark to the selected list
  this.add_benchmark = function (id) {
    try {

      if(self.selected_benchmarks[id])
        return;
      self.selected_benchmarks[id] = self.benchmarks[id];
      self.create_compute_node(id);
      self.update_cur_results(id);

    } catch (err) {
      console.error("livesim_node:add_benchmark: " + err);
    }
  };

  //remove a benchmark from the selected list
  this.remove_benchmark = function (id) {
    try {

      if(!self.selected_benchmarks[id])
        return;
      delete self.selected_benchmarks[id];
      var t = self.compute_nodes_spawned.indexOf(id);
      if(t != -1)
        self.compute_nodes_spawned.splice(t, 1);
      if(self.compute_nodes[id])
        self.compute_nodes[id].stop_simulation();

    } catch (err) {
      console.error("livesim_node:remove_benchmark: " + err);
    }
  };

  //update list of selected benchmarks
  this.update_benchmarks = function (benchs) {
    try {

      for(var id in self.benchmarks) {
        if(benchs.indexOf(id) == -1)
          self.remove_benchmark(id);
        else
          self.add_benchmark(id);
      }

    } catch (err) {
      console.error("livesim_node:update_benchmarks: " + err);
    }
  };

  //create one compute node object per benchmark
  this.create_compute_nodes = function () {
    try {

      for(var id in self.benchmarks) {
        if(self.has_nodes)
          self.selected_benchmarks[id] = self.benchmarks[id];
        self.create_compute_node(id);
      }

    } catch (err) {
      console.error("livesim_node:create_compute_nodes: " + err);
    }
  };
  
  //update the currently held average result
  this.update_cur_results = function (id) {
    var cn = self.compute_nodes[id];
    if(!self.cur_results[id]) {
      self.cur_results[id] = {};
    }
    if(!self.cur_results[id].history)
      self.cur_results[id].history = [];
    self.cur_results[id].history.push(cn.results);
    self.cur_results[id].name = cn.id;
    self.cur_results[id].results = cn.results;
    self.cur_results[id].delta = cn.delta_results;
    self.cur_results[id].checkpoint_results = cn.get_checkpoint_results();
    self.cur_results[id].all = cn.get_sample_results();
    self.cur_results[id].conf = cn.get_checkpoint_conf();
    self.update_status_array();
  };

  //create an instance of compute node for a specific benchmark
  this.create_compute_node = function (id) {
    try {

      self.compute_nodes_spawned.push(id);
      if(self.compute_nodes[id]) {
        return;
      }

      var port = self.es.get_port();
      self.compute_nodes[id] = new compute_node(id, self.metrics, self.benchmarks[id], self.server_name, self.settings, port, self.run_path, self.ts, function (id) {
        //on_result
        self.update_cur_results(id);

      }, function (id) {
        //on_setup
        var t = self.compute_nodes_spawned.indexOf(id);
        if(t != -1)
          self.compute_nodes_spawned.splice(t, 1);
        if(self.compute_nodes_spawned.length === 0) {
          self.is_ready = true;
          if(self.do_simulation) {
            self.run_simulation();
          }
        }

      }, function (id) {
        //on_done
        var t = self.running_nodes.indexOf(id);
        if(t != -1)
          self.running_nodes.splice(t, 1);
        if(self.running_nodes.length === 0) {
          self.is_simulating = false;
          var d = new Date();
          var tsim = d.getTime();
          var simtime = ((tsim - self.last_time) / 1000).toFixed(2);
          var insts = 0;
          for(var i in self.selected_benchmarks) {
            insts += Number(self.selected_benchmarks[i].ninst);
          }
          var mips = (insts / ((tsim - self.last_time) * 1000)).toFixed(2);
          self.on_status(self.project_id, "simulation_done", {time: simtime, mips: mips});
          if(self.is_sweeping)
            self.on_sweep_result();
        }
      });

    } catch (err) {
      console.error("livesim_node:create_compute_node: " + err);
    }    
  };

  //start simulation
  this.run_simulation = function (is_sweeping, force_baseline, delta) {
    try {

      self.is_simulating = true;
      if(force_baseline)
        self.randomize();
      if(self.is_ready) {
        self.stop_simulation();
        self.check(function () {
          if(is_sweeping)
            self.is_sweeping = true;
          self.is_simulating = true;
          self.cur_results = {};
          self.status_array = {};
          var d = new Date();
          self.last_time = d.getTime();
          self.first_result = true;
          console.log("livesim: Starting simulation at " + self.last_time.toString());
          self.on_status(self.project_id, "simulating");
          var sbc = Math.ceil((self.core_count / self.selected_benchmarks_count()));
          for(var id in self.selected_benchmarks) {
            self.compute_nodes[id].simulation_metric = self.simulation_metric;
            if(delta)
              self.compute_nodes[id].delta = true;
            else
              self.compute_nodes[id].delta = false;
            self.compute_nodes[id].run_simulation(sbc);
            self.running_nodes.push(id);
          }
          self.do_simulation = false;
        });
      } else {
        self.do_simulation = true;
        if(!self.has_nodes) {
          self.create_compute_nodes();
          self.has_nodes = true;
          self.setup(self.controllers);
        }
      }

    } catch (err) {
      console.error("livesim_node:run_simulation: " + err);
    }
  };

  //parameter sweep
  this.run_sweep = function () {
    try {

      if(! self.fs.existsSync(self.run_path + "/simu.conf")) {
        self.on_status(self.project_id, "Could not find simu.conf");
        return;
      }

      var str = self.fs.readFileSync(self.run_path + "/simu.conf", "utf8");
      var t = str.indexOf("#sweep:");

      if(t == -1) {
        self.on_status(self.project_id, "Did not find #sweep: in conf file");
        return;
      }

      self.sweep_type = str.charAt(t + 7);
      console.log(self.sweep_type);
      var str2 = str.substring(t + 8);
      var t2 = str2.indexOf(",");
      self.sweep_step = parseFloat(str2.substring(0, t2));
      str2 = str2.substring(t2 + 1);
      t2 = str2.indexOf(";");
      self.sweep_end = parseFloat(str2.substring(0, t2));
      if((self.sweep_type != "+" && self.sweep_type != "*" && self.sweep_type != "e") || isNaN(self.sweep_step) || isNaN(self.sweep_end)) {
        self.on_status(self.project_id, "Sweep configurations are not correct");
        return;
      }
      self.is_sweeping = true;
      self.is_sweep_baseline = true;
      self.sweep_results = [];
      self.avg_sweep_results = {};
      self.first_sweep_results = [];
      self.run_simulation(true, true);

    } catch (err) {
      console.error("livesim_node:run_sweep: " + err);
    }
  };

  //callback for when sweep is done for one conf
  this.on_sweep_result = function () {
    try {

      //baseline_change
      if(self.is_sweep_baseline) {
        self.is_sweep_baseline = false;
        self.set_baseline(true);
        return;
      }
      //Reading current value
      var str = self.fs.readFile(self.run_path + "/simu.conf", "utf8", function (err, str) {
        if(err || str === "") {
          console.log("livesim: Sweep reading from simu.conf -> " + err);
          setTimeout(self.on_sweep_result, 10);
          return;
        }

        var t = str.indexOf("#sweep:");
        if(str === "" || t == -1) {
          self.on_status(self.project_id, "Something is wrong with simu.conf");
          self.is_sweeping = false;
          return;
        }
        var m, n;
        for(m = t - 1; m > 0 && str.charAt(m) != " "; m--);
        for(n = m - 1; n > 0 && str.charAt(n) != " " && str.charAt(n) != "="; n--);
        var cur = parseFloat(str.substring(n + 1, m));
        //Pushing the results
        var avgt = {};
        var avgn = {};
        var key, result;
        for(var i in self.selected_benchmarks) {
          if(self.cur_results[i]) {
            if(! self.sweep_results[i]) {
              self.sweep_results[i] = {};
              self.first_sweep_results[i] = {};
            }
            for(key in self.cur_results[i].results) {
              if(! self.sweep_results[i][key])
                self.sweep_results[i][key] = [];
              result = {};
              result.x = cur;
              if(! self.first_sweep_results[i][key]) {
                result.y = self.cur_results[i].results[key];
                self.first_sweep_results[i][key] = result.y;
              } else {
                result.y = (self.cur_results[i].delta[key] * self.first_sweep_results[i][key]);
              }
              self.sweep_results[i][key].push(result);
              if(! self.avg_sweep_results[key])
                self.avg_sweep_results[key] = [];
              if(! avgt[key]) {
                avgt[key] = 0;
                avgn[key] = 0;
              }
              avgn[key] += parseFloat(self.cur_results[i].results[key]);
              avgt[key] ++;
            }
          }
        }
        for(key in self.avg_sweep_results) {
          result = {};
          result.x = cur;
          if(avgt[key] === 0)
            result.y = 0;
          else
            result.y = (avgn[key] / avgt[key]);
          self.avg_sweep_results[key].push(result);
        }

        //If needed, update the conf and run simulation again
        if(self.sweep_end <= cur ) {
          self.is_sweeping = false;
          return;
        }
        var nval = 0;
        switch(self.sweep_type) {
          case "*": nval = cur * self.sweep_step;
          break;
          case "+": nval = cur + self.sweep_step;
          break;
          case "e": nval = Math.pow(cur, self.sweep_step);
          break;
        }
        str = str.substring(0, n + 1) + (nval).toString() + str.substring(m);
        if(str.length == 3)
          return;
        self.fs.writeFile(self.run_path + "/simu.conf", str, function(err) {
          if(err) {
              console.log("ESESC: " + err);
          } else {
              self.run_simulation(true);
          }
        }); 
      });

    } catch (err) {
      console.error(err);
    }
  };

  //force simulation to stop
  this.stop_simulation = function () {
    try {

      self.is_simulating = false;
      self.is_sweeping = false;
      self.csv_conf = true;
      for(var id in self.compute_nodes) {
        self.compute_nodes[id].stop_simulation();
      }
      self.running_nodes = [];
      console.log("livesim: Simulation stopped");

    } catch (err) {
      console.error(err);
    }
  };

  //start calibration run
  this.calibrate = function () {
    try {

      self.check(function () {
        self.on_status(self.project_id, "simulating");
        self.cur_results = {};
        self.status_array = {};
        var d = new Date();
        self.last_time = d.getTime();
        self.first_result = true;
        console.log("livesim: Starting calibration at " + self.last_time.toString());
        for(var id in self.selected_benchmarks) {
          self.compute_nodes[id].calibrate();
          self.running_nodes.push(id);
        }
      });

    } catch (err) {
      console.log(err);
    }
  };

  //reset baseline results
  this.randomize = function () {
    try {

      self.is_baseline = true;
      for(var id in self.compute_nodes) {
        self.compute_nodes[id].randomize();
      }

    } catch (err) {
      console.error(err);
    }
  };

  //set the current run as baseline
  this.set_baseline = function (is_sweeping) {
    try {

      self.is_baseline = false;
      for(var id in self.compute_nodes) {
        self.compute_nodes[id].set_baseline();
      }
      //self.run_simulation(is_sweeping); //baseline_change

    } catch (err) {
      console.error(err);
    }
  };

  //kill all worker nodes to do setup again
  this.kill_all = function () {
    try {

      for(var i = 0; i < self.compute_nodes.length; i++) {
        if(self.compute_nodes[i]) { //fixme: setup should be done whether benchmark is selected or not
          self.compute_nodes[i].kill_all();
          delete self.compute_nodes[i];
        }
      }
      self.compute_nodes = [];
      self.running_nodes = [];
      self.compute_nodes_ready = 0;
      self.compute_nodes_spawned = [];
      self.do_simulation = false;
      self.is_ready = false;
      self.cur_results = [];
      self.is_simulating = false;
      self.has_nodes = false;

    } catch (err) {
      console.error(err);
    }
  };

  //find count of selected benchmarks
  this.selected_benchmarks_count = function () {
    try {

      var sum = 0;
      for(var i = 0; i < self.selected_benchmarks.length; i++)
        if(self.selected_benchmarks[i])
          sum ++;
      return sum;

    } catch (err) {
      console.error(err);
    }
  };

  //gather current status of benchmarks and simulations
  this.get_status = function (history_name) {
    try {

      var node;
      if(history_name) {
        self.load_history(history_name);
        node = self.history_results[history_name];
      } else {
        node = self;
      }

      return node.status_array;

    } catch (err) {
      console.error(err);
    }
  };
  
  //update the status array based on info from compute nodes
  this.update_status_array = function () {
    for(var i in self.benchmarks) {
      if(self.compute_nodes[i]) {
        var cn = self.compute_nodes[i];
        self.status_array[i] = {};
        self.status_array[i].done_checkpoints = cn.done_checkpoints;
        self.status_array[i].running_checkpoints = cn.running_checkpoints;
        self.status_array[i].unreliable_checkpoints = cn.crashed_checkpoints;
        self.status_array[i].status = cn.status;
        self.status_array[i].clusters = cn.clusters.length;
      } else {
        self.status_array[i] = null;
      }
    }
  };

  //report average absolute result to the user
  this.get_metric_average = function (metric, history_name, comparables) {
    try {
      var node, i, j;
      if(history_name) {
        self.load_history(history_name);
        node = self.history_results[history_name];
      } else {
        node = self;
      }

      var res = [];
      res[0] = {};
      for(i in self.selected_benchmarks) {
        try {
          res[0][i] = {};
          res[0][i].value = self.rnd(node.cur_results[i].results[metric]);
          res[0][i].min = self.rnd(node.cur_results[i].results[metric + "_min"]);
          res[0][i].max = self.rnd(node.cur_results[i].results[metric + "_max"]);
        } catch (err) { }
      }

      for(j = 0; j < comparables.length; j++) {
        res[j + 1] = {};
        self.load_history(comparables[j]);
        node = self.history_results[comparables[j]];
        for(i in self.selected_benchmarks) {
          try {
            res[j + 1][i] = {};
            res[j + 1][i].value = self.rnd(node.cur_results[i].results[metric]);
            res[j + 1][i].min = self.rnd(node.cur_results[i].results[metric + "_min"]);
            res[j + 1][i].max = self.rnd(node.cur_results[i].results[metric + "_max"]);
          } catch (err) { }
        }
      }
      return res;

    } catch (err) {
      console.error(err);
    }
  };

  //report delta result to the user
  this.get_metric_delta = function (metric, history_name, comparables) {
    try {

      var node, i, j;
      if(history_name) {
        self.load_history(history_name);
        node = self.history_results[history_name];
      } else {
        node = self;
      }

      var res = [];
      res[0] = {};
      for(i in self.selected_benchmarks) {
        try {
          if(node.cur_results[i].delta[metric]) {
            res[0][i] = {};
            res[0][i].value = self.rnd(node.cur_results[i].delta[metric]);
            res[0][i].min = self.rnd(node.cur_results[i].delta[metric + "_min"]);
            res[0][i].max = self.rnd(node.cur_results[i].delta[metric + "_max"]);
          }
        } catch (err) { }
      }

      for(j = 0; j < comparables.length; j++) {
        res[j + 1] = {};
        self.load_history(comparables[j]);
        node = self.history_results[comparables[j]];
        for(i in self.selected_benchmarks) {
          try {
            if(node.cur_results[i].delta[metric]) {
              res[j + 1][i] = {};
              res[j + 1][i].value = self.rnd(node.cur_results[i].delta[metric]);
              res[j + 1][i].min = self.rnd(node.cur_results[i].delta[metric + "_min"]);
              res[j + 1][i].max = self.rnd(node.cur_results[i].delta[metric + "_max"]);
            }
          } catch (err) { }
        }
      }
      return res;

    } catch (err) {
      console.error(err);
    }
  };

  //return per checkpoint results to the user
  this.get_checkpoint_average = function (benchmark, metric, history_name) {
    try {

      var node;
      if(history_name) {
        self.load_history(history_name);
        node = self.history_results[history_name];
      } else {
        node = self;
      }

      var res = {};
      for(var i in node.cur_results[benchmark].checkpoint_results) {
        try {
          res[i] = {};
          var val = self.rnd(node.cur_results[benchmark].checkpoint_results[i][metric]);
          res[i].value = val;
          res[i].min = val;
          res[i].max = val;
        } catch (err) { }
      }
      return res;

    } catch (err) {
      console.error(err);
    }
  };

  //report checkpoint/sample histogram results
  this.get_histogram = function (benchmark, metric, history_name) {
    try {

      var node, i;
      if(history_name) {
        self.load_history(history_name);
        node = self.history_results[history_name];
      } else {
        node = self;
      }

      var points = [];
      for(i in node.cur_results[benchmark].checkpoint_results) {
        if(node.cur_results[benchmark].checkpoint_results[i] && node.cur_results[benchmark].checkpoint_results[i][metric])
          points.push(node.cur_results[benchmark].checkpoint_results[i][metric]);
      }
      points.sort(function (a, b) {
        return a - b;
      });
      var start = points[0];
      var end = points[points.length - 1];
      var sp = (end - start) / self.settings.histogram_interval;
      var res = [];
      x = start + sp / 2;
      var y = 0;
      for(i = 0; i < points.length; i++) {
        if(points[i] > x + sp / 2) {
          res.push({"x": Math.round(x * 100) / 100, "y": y});
          x += sp;
          y = 0;
          i --;
        } else {
          y ++;
        }
      }

      return res;

    } catch (err) {
      console.error(err);
    }
  };

  //report histogram of checkpoint/sample ratios
  this.get_delta_histogram = function (benchmark, metric, history_name) {
    try {

      var node = self;
      var i;
      var points = [];
      for(i in node.cur_results[benchmark].checkpoint_results) {
        if(node.cur_results[benchmark].checkpoint_results[i] && node.cur_results[benchmark].checkpoint_results[i][metric] && self.compute_nodes[benchmark].baseline_results[i][metric])
          points.push(node.cur_results[benchmark].checkpoint_results[i][metric] / self.compute_nodes[benchmark].baseline_results[i][metric]);
      }
      points.sort(function (a, b) {
        return a - b;
      });
      var start = points[0];
      var end = points[points.length - 1];
      var sp = (end - start) / self.settings.histogram_interval;
      var res = [];
      x = start + sp / 2;
      var y = 0;
      for(i = 0; i < points.length; i++) {
        if(points[i] > x + sp / 2) {
          res.push({"x": Math.round(x * 100) / 100, "y": y});
          x += sp;
          y = 0;
          i --;
        } else {
          y ++;
        }
      }

      return res;

    } catch (err) {
      console.error(err);
    }
  };

  //result history of a benchmark over time
  this.get_benchmark_trace = function (benchmark, metric, start, history_name) {
    try {

      var node;
      if(history_name) {
        self.load_history(history_name);
        node = self.history_results[history_name];
      } else {
        node = self;
      }

      var res = [];
      res[0] = [];
      res[1] = [];
      res[2] = [];
      try {
        node.cur_results[benchmark].history.forEach(function (result) {
          res[0].push({"x": result.time, "y": result[metric]});
          if(result[metric + "_max"] != result[metric] || result[metric + "_min"] != result[metric]) {
            res[1].push({"x": result.time, "y": result[metric + "_min"]});
            res[2].push({"x": result.time, "y": result[metric + "_max"]});
          }
        });
      } catch (err) {}
      return res;

    } catch (err) {
      console.error(err);
    }
  };

  //result history of a single checkpoint
  this.get_checkpoint_trace = function (benchmark, metric, history_name, checkpoint) {
    try {

      var node;
      if(history_name) {
        self.load_history(history_name);
        node = self.history_results[history_name];
      } else {
        node = self;
      }

      var ores = {};
      ores.checks = [];
      var res = [];
      res[0] = [];
      res[1] = [];
      res[2] = [];
      try {
        var allres = node.cur_results[benchmark].all[checkpoint];
        var cnf = node.cur_results[benchmark].conf[checkpoint];
        for(var i = 1; i <= cnf.sample_count; i++) {
          if(allres[i] && allres[i].t && allres[i].t[metric]) {
            var point = {};
            point.x = i * (node.settings.sample_size / 1000000);
            point.y = (self.process_metric(allres[i].n[metric], allres[i].t[metric], metric));
            if(i <= cnf.range_from)
              res[0].push(point);
            if(i >= cnf.range_from && i <= cnf.range_to)
              res[1].push(point);
            if(i >= cnf.range_to)
              res[2].push(point);
          }
        }
      } catch (err) {}

      try {
        for(var cpid in node.cur_results[benchmark].conf) 
          ores.checks.push({"cpid": cpid, "status": node.cur_results[benchmark].conf[cpid].status});
      } catch (err) {}

      ores.results = res;
      return ores;

    } catch (err) {
      console.error(err);
    }
  };

  //report sweep results to user
  this.get_sweep = function (benchmark, metric, history_name) {
    try {

      var node;
      if(history_name) {
        self.load_history(history_name);
        node = self.history_results[history_name];
      } else {
        node = self;
      }

      var res = [];
      try {
        if(benchmark == -1)
          return node.avg_sweep_results[metric];
        else
          return node.sweep_results[benchmark][metric];
      } catch (err) {}
      return res;

    } catch (err) {
      console.error(err);
    }
  };

  //save all results to json and csv file
  this.dump_results = function (name, callback) {
    try {

      if (!self.fs.existsSync(self.history_path)) {
        self.fs.mkdirSync(self.history_path);
      }
      var path = self.history_path + "/" + name;
      var out = {};
      out.is_simulating = false;
      out.benchmarks = self.benchmarks;
      out.selected_benchmarks = self.selected_benchmarks;
      out.sweep_results = self.sweep_results;
      out.avg_sweep_results = self.avg_sweep_results;
      out.status_array = self.status_array;
      out.settings = self.settings;

      if(self.settings.dump_all == 1) {
        out.cur_results = self.cur_results;
      } else {
        out.cur_results = {};
        for(var id in self.selected_benchmarks) {
          out.cur_results[id] = {};
          out.cur_results[id].name = self.cur_results[id].name;
          out.cur_results[id].results = self.cur_results[id].results;
          out.cur_results[id].delta = self.cur_results[id].delta;
          out.cur_results[id].checkpoint_results = self.cur_results[id].checkpoint_results;
          out.cur_results[id].conf = self.cur_results[id].conf;
          out.cur_results[id].all = {};
          out.cur_results[id].history = [];
        }
      }

      self.fs.writeFile(path, JSON.stringify(out), function(err) {
        if(err) {
            console.log("livesim: " + err);
        } else {
            console.log("livesim: history saved to " + path);
            if(callback)
              callback();
        }
      }); 
      if(self.history_results[name])
        self.history_results[name] = out;
      self.dump_csv(name);

    } catch (err) {
      console.error("livesim_node::dump_results", err);
    }
  };

  //set a timer for csv results to be saved periodically
  this.set_csv_timer = function (status, name) {
    try {

      self.csv_status = status;
      if(status == "active") {
        self.csv_name = name;
        self.csv_conf = true;
        self.dump_csv(self.csv_name);
        self.csv_timer = setInterval(function () {
          if(self.is_simulating)
            self.dump_csv(self.csv_name);
        }, 5000);
      } else {
        clearInterval(self.csv_timer);
        self.csv_timer = null;
        self.csv_status = "inactive";
      }
      self.on_message(self.project_id, "csv_status", {status: self.csv_status});

    } catch (err) {
      console.error(err);
    }
  };

  //write csv results to files
  this.dump_csv = function (name) {
    try {

      if (!self.fs.existsSync(self.csv_path)) {
        self.fs.mkdirSync(self.csv_path);
      }

      var name_path = self.csv_path + "/" + name;
      var i, j, res, cnt, cpid, cp;

      if (!self.fs.existsSync(name_path)) {
        self.fs.mkdirSync(name_path);
      }

      //Setup
      if(self.settings.csv_dump_conf && self.csv_conf) {
        var st = "param,value\n";
        for(var key in self.settings) {
          st += key + "," + self.settings[key] + "\n";
        }
        self.fs.createReadStream(self.run_path + "/simu.conf").pipe(self.fs.createWriteStream(name_path + "/simu.conf"));
        self.fs.createReadStream(self.run_path + "/esesc.conf").pipe(self.fs.createWriteStream(name_path + "/esesc.conf"));
        self.fs.writeFile(name_path + "/setup.csv", st, function () {
          console.log("livesim: Setup CSV saved");
        });
        self.csv_conf = false;
      }

      //First rows
      var str = "final,benchmark,checkpoint,sample,in_range,used,discarded,setup,time,cpi,cpi_high,cpi_low,inst,ticks";
      var strc = str;
      var strs = str;
      var strd = str;
      var strh = str;
      self.metrics.forEach(function (metric) {
        if(metric != "cpi") {
          str += "," + metric;
          strc += "," + metric;
          strs += "," + metric;
          strd += "," + metric;
        }
      });

      /*if(self.settings["csv_raw_stats) {
        var f = true;
        for(var i in self.selected_benchmarks) {
          if(self.compute_nodes[i] && self.compute_nodes[i].raw_avg_results) {
            var obj = self.compute_nodes[i].raw_avg_results;
            var s;
            for(var key in obj) {
              if(typeof(obj[key]) == "object") {
                s = "," + key + "_n," + key + "_v";
              } else {
                s = "," + key;
              }
              str += s;
              strc += s;
              strs += s;
              strsc += s;
            }
            f = false;
          }
        }  
      } */

      str += "\n";
      strc += "\n";
      strs += "\n";
      strd += "\n";
      strh += "\n";

      //Summary
      if(self.settings.csv_dump_summary) {
        for(i in self.selected_benchmarks) {
          if(self.cur_results[i]) {
            //Average results
            res = self.cur_results[i].results;
            if(self.compute_nodes[i].status == "done")
              str += "1,";
            else
              str += "0,";
            str += i + ",";
            str += "0,0,1,";
            cnt = 0;
            for(cpid in self.compute_nodes[i].checkpoints) {
              if(self.compute_nodes[i].checkpoints[cpid].status == "done")
                cnt++;
            }
            str += cnt + ",0,";
            str += self.sci(self.compute_nodes[i].setup_time) + ",";
            str += self.sci(res.time) + ",";
            str += self.sci(res.cpi) + "," + self.sci(res.cpi_max) + "," + self.sci(res.cpi_min) + ",";
            str += "0,0";
            self.metrics.forEach(function (metric) {
              if(metric != "cpi") {
                str += "," + self.sci(res[metric]);
              }
            });

            //raw stats
            /*try {
              if(self.settings.csv_raw_stats) {
                var obj = self.compute_nodes[i].raw_avg_results;
                for(var key in obj) {
                  if(typeof(obj[key]) == "object") {
                    str += "," + obj[key].n + "," + obj[key].v;
                  } else {
                    str += "," + obj[key];
                  }
                }
              }
            } catch (err) {
              console.error(err);
            }*/

            str += "\n";
          }
        }
        self.fs.writeFile(name_path + "/summary.csv", str, function () {
          console.log("livesim: Summary CSV saved");
        });
      }

      //Delta
      if(self.settings.csv_dump_summary) {
        for(i in self.selected_benchmarks) {
          if(self.cur_results[i]) {
            //Average results
            res = self.cur_results[i].delta;
            if(self.compute_nodes[i].status == "done")
              strd += "1,";
            else
              strd += "0,";
            strd += i + ",";
            strd += "0,0,1,";
            cnt = 0;
            for(cpid in self.compute_nodes[i].checkpoints) {
              if(self.compute_nodes[i].checkpoints[cpid].status == "done")
                cnt++;
            }
            strd += cnt + ",0,";
            strd += self.sci(self.compute_nodes[i].setup_time) + ",";
            strd += self.sci(self.cur_results[i].results.time) + ",";
            strd += self.sci(res.cpi) + "," + self.sci(res.cpi_max) + "," + self.sci(res.cpi_min) + ",";
            strd += "0,0";
            self.metrics.forEach(function (metric) {
              if(metric != "cpi") {
                strd += "," + self.sci(res[metric]);
              }
            });

            //raw stats
            /*try {
              if(self.settings.csv_raw_stats) {
                var obj = self.compute_nodes[i].raw_avg_results;
                for(var key in obj) {
                  if(typeof(obj[key]) == "object") {
                    strd += "," + obj[key].n + "," + obj[key].v;
                  } else {
                    strd += "," + obj[key];
                  }
                }
              }
            } catch (err) {
              console.error(err);
            }*/

            strd += "\n";
          }
        }
        self.fs.writeFile(name_path + "/delta.csv", strd, function () {
          console.log("livesim: Summary CSV saved");
        });
      }

      //Checkpoint
      if(self.settings.csv_dump_check) {
        for(i in self.selected_benchmarks) {
          var cp_res = self.compute_nodes[i].get_checkpoint_results();
          for(cpid in cp_res) {
            cp = self.compute_nodes[i].checkpoints[cpid];
            if(cp.status == "done")
              strc += "1,";
            else
              strc += "0,";
            strc += i + "," + cpid + ",0,0,";
            strc += self.sci(self.settings.sample_size * (cp.range_to - cp.range_from + 1)) + ",";
            var dis = cp.range_from - 1;
            if(cp.sample_count > cp.range_to)
              dis += cp.sample_count - cp.range_to;
            strc += self.sci(self.settings.sample_size * dis) + ",";
            strc += "0,0,";
            strc += self.sci(cp_res[cpid].cpi) + "," + self.sci(cp_res[cpid].cpi) + "," + self.sci(cp_res[cpid].cpi) + ",";
            strc += "0,0";
            self.metrics.forEach(function (metric) {
              if(metric != "cpi") {
                strc += "," + self.sci(cp_res[cpid][metric]);
              }
            });

            //raw stats
            /*try {
              if(self.settings.csv_raw_stats) {
                var obj = self.compute_nodes[i].raw_checkpoint_results[j];
                for(var key in obj) {
                  if(typeof(obj[key]) == "object") {
                    strc += "," + obj[key].n + "," + obj[key].v;
                  } else {
                    strc += "," + obj[key];
                  }
                }
              }
            } catch (err) {
              console.error(err);
            }*/


            strc += "\n";
          }
        }
        self.fs.writeFile(name_path + "/check.csv", strc, function () {
          console.log("livesim: Checkpoint CSV saved");
        });
      }

      //Full
      if(self.settings.csv_dump_full) {
        for(i in self.selected_benchmarks) {
          var sres = self.compute_nodes[i].get_sample_results();
          for(cpid in sres) {
            cp = self.compute_nodes[i].checkpoints[cpid];
            for(j = 1; j <= cp.sample_count; j++) {
              strs += "1," + i + "," + cpid + "," + j + ",";
              if(j < cp.range_from)
                strs += "0,";
              else if(j >= cp.range_from && j <= cp.range_to)
                strs += "1,";
              else
                strs += "2,";
              strs += ",0,0,";
              strs += "0,0,";
              var cpi = self.sci(sres[cpid][j].n.cpi / sres[cpid][j].t.cpi);
              strs += cpi + "," + cpi + "," + cpi + ",";
              strs += self.sci(sres[cpid][j].t.cpi) + "," + self.sci(sres[cpid][j].n.cpi);
              self.metrics.forEach(function (metric) {
                if(metric != "cpi") {
                  strs += "," + self.sci(self.process_metric(sres[cpid][j].n[metric], sres[cpid][j].t[metric], metric));
                }
              });
              strs += "\n";
            }
          }
        }
        self.fs.writeFile(name_path + "/full.csv", strs, function () {
          console.log("livesim: Full CSV saved");
        });
      }

      //CPI history
      if(self.settings.csv_cpi_history) {
        for(i in self.selected_benchmarks) {
          for(j = 0; j < self.cur_results[i].history.length; j++) {
            res = self.cur_results[i].history[j];
            strh += "1," + i + ",0,0,1,1,0,0," + res.time + "," + res.cpi + "," + res.cpi_max + "," + res.cpi_min + ",0,0\n";
          }
        }
        self.fs.writeFile(name_path + "/cpi_history.csv", strh, function () {
          console.log("livesim: CPI History CSV saved");
        });
      }

    } catch (err) {
      console.error(err);
    }
  };

  //remove saved results
  this.remove_dump = function (name, callback) {
    try {

      if (!self.fs.existsSync(self.history_path))
        return;
      var path = self.history_path + "/" + name;
      self.fs.unlink(path, function (err) {
        if(err) {
            console.log("livesim: " + err);
        } else {
            console.log("livesim: history deleted from " + path);
            if(callback)
              callback();
        }
      });

    } catch (err) {
      console.error(err);
    }
  };

  //get the list of saved results
  this.get_history_list = function (search_key) {
    try {

      if (!self.fs.existsSync(self.history_path)) {
        self.fs.mkdirSync(self.history_path);
      }

      var list = self.fs.readdirSync(self.history_path);
      if(search_key === "")
        return list;

      var out = [];
      list.forEach(function (item) {
        if(item.indexOf(search_key) != -1)
          out.push(item);
      });
      return out;

    } catch (err) {
      console.error(err);
    }
  };

  //load a previously saved result
  this.load_history = function (name) {
    try {

      if(self.history_results[name])
        return;
      if(! name) {
        console.log("livesim: Invalid hostiry name");
        return;
      }

      try {
        var str = self.fs.readFileSync(self.history_path + "/" + name, "utf8");
        self.history_results[name] = JSON.parse(str);
      } catch (err) {
        console.log("livesim: Invalid hostiry name");
      }

    } catch (err) {
      console.error(err);
    }
  };

  //set current status/conf to the user
  this.get_conf = function (history_name) {
    try {

      var node;
      if(history_name) {
        self.load_history(history_name);
        node = self.history_results[history_name];
      } else {
        node = self;
      }

      var out = {};
      out.benchmarks = node.benchmarks;
      out.selected_benchmarks = node.selected_benchmarks;
      out.settings = self.settings;
      out.is_baseline = self.is_baseline;
      return out;

    } catch (err) {
      console.error(err);
    }
  };

  //set settings from the front-end
  this.set_conf = function (name, val, index) {
    try {

      var i;
      switch(name) {
        case "benchmark":
          if(val == "0")
            self.remove_benchmark(index);
          else
            self.add_benchmark(index);
        break;
        case "cluster_method": case "ci_method":
          self.settings[name] = val;
          for(i in self.benchmarks) {
            if(self.compute_nodes[i]) {
              self.compute_nodes[i].settings = self.settings;
            }
          }
        break;
        default:
          self.settings[name] = parseFloat(val);
          for(i in self.benchmarks) {
            if(self.compute_nodes[i]) {
              self.compute_nodes[i].settings = self.settings;
            }
          }
      }

    } catch (err) {
      console.error(err);
    }
  };

  //get livesim configuration markdown
  this.get_conf_md = function () {
    try {
      return self.fs.readFileSync(self.run_path + "/conf.md", "utf8");
    } catch (err) {
      console.log(err);
    }
  };

  //update livesim configuration markdown
  this.update_conf_md = function (source) {
    try {

      self.fs.writeFile(self.run_path + "/conf.md", source, function(err) {
        if(err) {
          console.log("livesim: " + err);
        }
      });
      var simu = (self.fs.readFileSync(self.run_path + "/simu.conf")).toString();
      while(source !== "") {
        var t = source.indexOf("!@[");
        if(t == -1) {
          source = "";
        } else {
          source = source.substring(t + 3);
          t = source.indexOf("]");
          var name = source.substring(0, t);
          source = source.substring(t + 2);
          t = source.indexOf("]");
          var val = source.substring(0, t);
          t = name.indexOf("-");
          var tsimu = simu;
          if(t != -1) {
            var section = name.substring(0, t);
            name = name.substring(t + 1);
            t = tsimu.indexOf("[" + section + "]");
            tsimu = tsimu.substring(t);
          } else {
            t = 0;
          }
          var t2 = tsimu.indexOf(name + " ");
          tsimu = tsimu.substring(t2);
          var t3 = tsimu.indexOf("=");
          tsimu = tsimu.substring(t3);
          var i = 1;
          while(tsimu.charAt(i) == " ")
            i++;
          var t4 = i;
          tsimu = tsimu.substring(i);
          i = 1;
          while(tsimu.charAt(i) != " " && tsimu.charAt(i) != "\n")
            i++;
          t4 += i - 1;
          simu = simu.substring(0, t + t2 + t3 + 1) + " " + val + " " + simu.substring(t + t2 + t3 + t4 + 1);
        }
      }
      self.fs.writeFile(self.run_path + "/simu.conf", simu, function(err) {
        if(err) {
          console.log("livesim: " + err);
        } else {
          self.stop_simulation();
          self.run_simulation();
        }
      });

    } catch (err) {
      console.error(err);
    }
  };

  //check for compilation and runtime errors in livesim
  this.check = function (callback) {
    try {

      var cmds = [];
      if(self.needs_recompile) {
        var mkc = "make";
        if(self.core_count)
          mkc += " -j" + self.core_count;
        cmds.push(mkc);
        console.log("livesim: Recompiling");
        self.on_status(self.project_id, "recompiling");
        self.needs_recompile = false;
      }
      self.ts.run_inorder(cmds, self.build_path, function () {
        self.ts.run("../main/esesc check", self.run_path, function () {
          self.transfer_files();
          self.wait_and_run_callback = callback;
          self.wait_and_run();
        }, function (err) {
           self.on_status(self.project_id, err);
        });
      }, function (err) {
         self.on_status(self.project_id, err);
      });

    } catch (err) {
      console.error(err);
    }
  };

  //parse single metric result
  this.process_metric = function (n, t, metric) {
    try {

      var rates = ["bpredrate" ,"IL1_missrate", "ITLB_missrate", "DL1_missrate", "L2_missrate", "L3_missrate", "MemBus_missrate"];
      if(rates.indexOf(metric) == -1)
        return  n / t;
      else
        return (n / t) * 100;

    } catch (err) {
      console.error(err);
    }
  };

  //transfer files to the compute machines
  this.transfer_files = function () {
    try {

      if(self.needs_transfer.length === 0)
        return;
      self.controllers.forEach(function (controller) {
        controller.is_ready = false;
        var tbts = [];
        for(var i = 0; i < self.needs_transfer.length; i++)
          tbts[i] = self.fs.statSync(self.build_path + "/" + self.needs_transfer[i]).size;
        controller.socket.emit("wait_for_files", {tbt: self.needs_transfer, tbts: tbts});
      });
      self.controllers.forEach(function (controller) {
        if(! controller.is_local) {
          self.needs_transfer.forEach(function (tbtf) {
            var stream = self.ss.createStream();
            self.ss(controller.socket).emit("file", stream, {name: tbtf});
            self.fs.createReadStream(self.build_path + "/" + tbtf).pipe(stream);
          });
        }
      });
      self.needs_transfer = [];

    } catch (err) {
      console.error(err);
    }
  };

  //wait for all controllers to send ack and start simulation
  this.wait_and_run = function () {
    try {

      for(var i = 0; i < self.controllers.length; i++) {
        if(! self.controllers[i].is_ready) {
          self.controllers[i].do_when_ready = self.wait_and_run;
          return;
        } else {
          self.controllers[i].do_when_ready = null;
        }
      }
      self.wait_and_run_callback();

    } catch (err) {
      console.error(err);
    }
  };

  //event: if an livesim source or conf file is touched, queue it for submission to compute machines
  self.fserver.on("file_touched", function(obj) {
    try {

      console.log("File change " + obj.path);
      if(obj.path == self.project_id + "/esesc")
        self.needs_recompile = true;
      if(obj.path == self.project_id + "/esesc" && self.needs_transfer.indexOf("main/libesescso.so") == -1)
        self.needs_transfer.push("main/libesescso.so");
      if(obj.path == self.project_id + "/build/run/simu.conf" && self.needs_transfer.indexOf("run/simu.conf") == -1)
        self.needs_transfer.push("run/simu.conf");
      if(obj.path == self.project_id + "/build/run/esesc.conf" && self.needs_transfer.indexOf("run/esesc.conf") == -1)
        self.needs_transfer.push("run/esesc.conf");

    } catch (err) {
      console.error(err);
    }
  });

  //if and livesim file is touched from liveos
  this.touch_source = function (file) {
    try {

      console.log("Source touched: " + file);
      if(file == "source") {
        self.needs_recompile = true;
        if(self.needs_transfer.indexOf("main/libesescso.so") == -1)
          self.needs_transfer.push("main/libesescso.so");
      } else {
        self.needs_transfer.push("run/" + file);
      }

    } catch (err) {
      console.error(err);
    }
  };

  //count number of benchmarks
  this.get_benchmarks_count = function () {
    var i = 0;
    for(var key in self.benchmarks)
      i++;
    return i;
  };

  //convert to scientific format
  this.sci = function (n) {
    if(n && ! isNaN(n))
      return n.toExponential(4);
    else
      return n;
  };

  //round number
  this.rnd = function (n) {
    if(n && ! isNaN(n))
      return Math.round(n * 100) / 100;
    else
      return n;
  };

  //Main body
  self.create();
};
