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

module.exports = function (id, metrics, benchmark, server_name, settings, port, path, ts, on_result, on_setup, parent_on_done) {
  var self = this;
  var jstat = require("jStat").jStat;
  var transporter_server = require("../transporter/transporter_server.js");
  var checkpoint = require("./checkpoint.js");
  
  //Set input params
  this.id = id;
  this.benchmark = benchmark;
  this.server_name = server_name;
  this.ncheckpoints = parseInt(Number(benchmark.ncheckpoints));
  this.ninst = parseInt(Number(this.benchmark.ninst) / this.ncheckpoints);
  this.settings = settings;
  this.port = port;
  this.path = path;
  this.ts = ts;
  this.on_result = on_result;
  this.on_setup = on_setup;
  this.parent_on_done = parent_on_done;
  this.metrics = metrics;

  //Set local variables
  this.transporter = null;
  this.controller = null;
  this.cp_threads_ready = 0;
  this.cp_threads = [];
  this.helper_processes = [];
  this.daemon = null;
  this.configuration_daemon = null;
  this.is_connected = false;
  this.is_ready = false;
  this.do_config = false;
  this.do_simulation = false;
  this.status = "disconnected";
  this.checkpoints = {};
  this.idle_checkpoints = this.ncheckpoints;
  this.running_checkpoints = 0;
  this.done_checkpoints = 0;
  this.baseline_cp_order = [];
  this.cp_order = [];
  this.first_round = true;
  this.results = {};
  this.baseline_results = {};
  this.baseline_sample_results = {};
  this.baseline_conf = {};
  this.delta_results = {};
  self.simulation_metric = "cpi";
  this.delta = false;
  this.start_time = 0;
  this.crashed_checkpoints = 0;
  this.clusters = [];
  this.checkpoint_clusters = [];
  this.setup_time = 0;
  this.mode = "calibration";
  this.max_spike = 10;

  //Setting up livesim Daemon
  this.setup = function (controller) {
    try {

      self.controller = controller;
      var run_str = "export LD_LIBRARY_PATH=../main:$LD_LIBRARY_PATH; ";
      run_str += "export ESESC_BenchName=\"" + self.benchmark.env_var + "\"; ";
      run_str += "../main/live " + self.id + " " + self.server_name + " " + self.port + " " + self.benchmark.env_var;
      if(self.benchmark.stdin)
        run_str += " < " + self.benchmark.stdin;
      controller.socket.emit("setup", {run_str: run_str, name: self.id});
      console.log(self.id + " : Waiting for daemon to register");
      this.config_daemon();

    } catch (err) {
      console.error("compute_node:setup: " + err);
    }
  };

  //Creating the communication link between simulator nodes and us
  this.create_transporter_server = function () {
    try {

      self.transporter = new transporter_server(self.port, function (client) {
        //Daemon Registration
        client.on("reg_daemon", function (obj) {
          self.helper_processes.push(obj.pid);
          self.daemon = client;
          self.is_connected = true;
          client.send_fast("reg_ack");
          console.log(self.id + " : Daemon registered on port " + self.port.toString());

          //Initializing
          self.cp_threads = [];
          self.cp_threads_ready = 0;

          if(self.do_config) {
            setTimeout(function () {
              self.config_daemon();
            }, 50);
          }
        });

        //New configuration daemon registeration
        client.on("reg_conf", function (obj) {
          self.helper_processes.push(obj.pid);
          self.configuration_daemon = client;
          client.send_fast("reg_ack");
          console.log(self.id + " : New configuration daemon set");
        });

        //Checkpoint setup done
        client.on("reg_cp", function (obj) {
          client.pid = obj.pid;
          client.cpid = obj.cpid;
          self.helper_processes.push(obj.pid);
          process.stdout.write(self.id + "x" + obj.cpid + " ");
          self.cp_threads_ready += 1;
          self.cp_threads[obj.cpid] = client;
          if(self.cp_threads_ready == self.ncheckpoints) {
            self.is_ready = true;
            console.log(" ");
            console.log(self.id + " : Daemon setup done");
            var d = new Date();
            self.setup_time = (d.getTime() - self.setup_time) / 1000;
            //self.status = "idle";
            if(self.on_setup)
              self.on_setup(self.id);
            if(self.do_simulation)
              self.run_simulation();
          }
        });

        //Simulator thread start
        client.on("cp_start", function (obj) {
          client.cpid = obj.cpid;
          client.pid = obj.pid;
          self.checkpoints[obj.cpid].register_node(client);
        });
      });

    } catch (err) {
      console.error("compute_node:create_transporter_server: " + err);
    }
  };

  //Configure the daemon
  this.config_daemon = function () {
    try {

      if(self.is_connected) {
        console.log(self.id + " : Setting up the daemon");
        self.cp_threads_ready = 0;
        self.is_ready = false;
        self.daemon.send_fast("config", {"ncheckpoints": self.ncheckpoints, "ninst": self.ninst, "nskip": 0});
        self.do_config = false;
        self.status = "setting_up";
        var d = new Date();
        self.setup_time = d.getTime();
      } else {
        self.do_config = true;
      }

    } catch (err) {
      console.error("compute_node:config_daemon: " + err);
    }
  };

  //Get the number of free CPU cores
  this.get_core_count = function () {
    try {

      //check if we are in LiveSample or calibration
      var fr = self.check_first_round();

      //if we just started calibrating, we need to simulate the set init number of checkpoints
      if(self.idle_checkpoints == self.ncheckpoints && self.status == "calibrating") {
        return self.settings.init_checkpoints;
      }

      //if we are in LiveSmaple, we need at least 1 checkpoint per cluster or init num of checkpoints
      if(fr && self.status == "simulating") {
        return Math.max(self.settings.init_checkpoints, self.clusters.length);
      }

      //If in LiveCI, we should see how many cores are available to run 2 per core
      var n = 0;
      self.controller.compute_nodes.forEach(function (cn) {
        if(cn.status == "simulating" || cn.status == "calibrating")
          n ++;
      });
      var out = Math.ceil((self.controller.core_count * 2) / n);
      return out;

    } catch (err) {
      console.error("compute_node:get_core_count: " + err);
    }
  };

  //Running simulation
  this.run_simulation = function () {
    try {

      if(self.is_ready === false) {
        self.status = "setting_up";
        self.do_simulation = true;
        return;
      }

      if(! self.calibrated) {
        self.calibrate();
        return;
      }

      self.cleanup();
      self.status = "simulating";
      self.mode = "simulation";
      self.create_cp_order();
      self.pick_and_run();

    } catch (err) {
      console.error("compute_node:run_simulation: " + err);
    }
  };

  //Pick new checkpoints are run them
  this.pick_and_run = function () {
    try {

      if(self.status == "done")
        return;

      if(self.idle_checkpoints === 0) {
        if(self.running_checkpoints === 0) {
          self.done("all checkpoints done");
        }
        return;
      }

      var to_run = self.get_core_count() - self.running_checkpoints;
      while(to_run > 0) {
        var no_more = true;
        for(var i = 0; i < self.cp_order.length; i++) {
          if(self.cp_order[i].length > 0) {
            no_more = false;
            self.run_checkpoint(self.cp_order[i][0]);
            self.cp_order[i].splice(0, 1);
            to_run --;
          }
        }

        if(no_more)
          to_run = 0;
      }

    } catch (err) {
      console.error("compute_node:pick_and_run: " + err);
    }
  };

  //run a single checkpoint
  this.run_checkpoint = function (cid) {
    try {

      self.running_checkpoints ++;
      self.idle_checkpoints --;

      self.checkpoints[cid] = new checkpoint(cid, self.id, self.controller, self.simulation_metric, self.metrics, self.settings, self.ninst, function (cpid) {
        //on checkpoint result
        self.update_results();

      }, function (cpid) {
        //on checkpoint done
        
        //update baseline checkpoint order for delta
        if(! self.delta)
          self.baseline_cp_order.push(cpid);

        //we have one less running checkpoint
        if(self.status != "done")
          self.running_checkpoints --;

        //update checkpoint counts
        if(self.checkpoints[cpid].status == "crashed")
          self.crashed_checkpoints ++;
        else
          self.done_checkpoints ++;
        
        //if we were doing full run, we are done
        if(self.ncheckpoints == 1)
          self.done("full run");

        //if in calibration, wither continue or do clustering
        if(self.status == "calibrating") {
          if(self.ncheckpoints == self.done_checkpoints + self.crashed_checkpoints)
            self.after_calibration();
          else
            self.pick_and_run();
          return;
        }

        //if already done, nothing else to do
        if(self.status == "done")
          return;

        //if in LiveCI, check confidence interval
        if(! self.check_first_round()) {
          self.check_confidence();
        }

        //run more samples if we are not done
        self.pick_and_run();
      });

      //Allow first order result to be pushed
      self.checkpoints[cid].force_push = self.first_round;

      //If in delta mode, set the range
      if(self.delta) {
        self.checkpoints[cid].delta = true;
        self.checkpoints[cid].baseline_range_from = self.baseline_conf[cid].range_from;
        self.checkpoints[cid].baseline_range_to = self.baseline_conf[cid].range_to;
        if(self.settings.fixed_range)
          self.checkpoints[cid].range_to = self.baseline_conf[cid].range_to;
      }

      var obj = {};
      obj.kill = 0;
      obj.warmup = self.settings.general_warmup;
      obj.skip = self.settings.detailed_warmup;
      obj.dlc = self.settings.live_cache;
      var sn = self.cp_threads[cid];
      sn.send_fast("simulate", obj, function () {
        //success
      }, function () {
        //error      
      });

    } catch (err) {
      console.error("compute_node:run_checkpoint: " + err);
    }
  };

  //create the order of checkpoints to run
  this.create_cp_order = function () {
    try {

      /*if(self.delta) {
        self.cp_order = [];
        for(var i = 0; i < self.baseline_cp_order.length; i++)
          self.cp_order[i] = self.baseline_cp_order[i];
        return;
      }*/
      var k = 0;
      self.baseline_cp_order = [];
      self.cp_order = [];
      for(var i = 0; i < self.clusters.length; i++) {
        k += self.clusters[i].length;
        self.cp_order[i] = [];
        var tmp = [];
        self.clusters[i].forEach(function (cpid) {
          tmp.push(cpid);
        });
        while(tmp.length > 0) {
          var r = Math.floor(Math.random() * tmp.length);
          self.cp_order[i].push(tmp[r]);
          tmp.splice(r, 1);
        }
      }
      
      self.idle_checkpoints = k;

    } catch (err) {
      console.error("compute_node:create_cp_order: " + err);
    }
  };

  //update average results
  this.update_results = function () {
    if(self.mode == "calibration")
      self.update_calibration_results();
    else
      self.update_live_results();
  };

  //update results when in calibration mode
  this.update_calibration_results = function () {
    try {

      self.results = {};
      self.metrics.forEach(function (metric) {
        var sum = 0;
        var ns = 0;
        var ts = 0;
        var n = 0;
        for(var cpid in self.checkpoints) {
          var cp = self.checkpoints[cpid];
          if(cp.average_results[metric]) {
            sum += cp.average_results[metric];
            ns += cp.nresults[metric];
            ts += cp.tresults[metric];
            n ++;
          }
        }
        //self.results[metric] = (sum / n);
        self.results[metric] = self.process_metric(ns, ts, metric);
        self.results[metric + "_min"] = self.results[metric];
        self.results[metric + "_max"] = self.results[metric];
      });
      
      //result time
      var d = new Date();
      self.results.time = (d.getTime() - self.start_time) / 1000;
      self.results.time_max = self.results.time;
      self.results.time_min = self.results.time;

      self.on_result(self.id);

    } catch (err) {
      console.error("compute_node:update_calibration_results: " + err);
    }
  };

  //update results when in live mode
  this.update_live_results = function () {
    try {

      self.results = {};
      var fr = self.check_first_round();
      self.metrics.forEach(function (metric) {
        //For each metric, create the clustered distribution
        var cl = [];
        for(var i = 0; i < self.clusters.length; i++) {
          cl[i] = [];
          self.clusters[i].forEach(function (cpid) {
            if(self.checkpoints[cpid]) {
              var cp = self.checkpoints[cpid];
              if((cp.status == "done" || (cp.status == "simulating" && fr)) && cp.average_results[metric]) {
                cl[i].push(cp.average_results[metric]);
              }
            }
          });
        }

        //Analyze the dist and find results
        var a = self.analyze_cluster(cl);
        self.results[metric] = a.val;
        if(fr) {
          self.results[metric + "_max"] = a.val;
          self.results[metric + "_min"] = a.val;
        } else {
          self.results[metric + "_max"] = a.max;
          self.results[metric + "_min"] = a.min;
        }
      });

      //result time
      var d = new Date();
      self.results.time = (d.getTime() - self.start_time) / 1000;
      self.results.time_max = self.results.time;
      self.results.time_min = self.results.time;

      //if in delta mode, update delta results too
      if(self.delta)
        self.update_delta_results();

      self.on_result(self.id);

    } catch (err) {
      console.error("compute_node:update_live_results: " + err);
    }
  };

  //Check if we are in LiveCI or LiveSample
  this.check_first_round = function () {
    try {

      if(self.mode == "calibration")
        return true;
        
      if(! self.first_round)
        return false;
        
      var total = 0;
      var cpid;

      for(var i = 0; i < self.clusters.length; i++) {
        var ready = 0;
        for(var j = 0; j < self.clusters[i].length; j++) {
          cpid = self.clusters[i][j];
          if(self.checkpoints[cpid] && (self.checkpoints[cpid].status == "done"))
            ready ++;
        }
        total += ready;
        if(ready < 2)
          return true;
      }
      
      if(total < self.settings.init_checkpoints)
        return true;

      for(cpid in self.checkpoints)
        self.checkpoints[cpid].force_push = false;
      self.first_round = false;

      return false;

    } catch (err) {
      console.error("compute_node:check_first_round: " + err);
    }
  };

  //Update ratio results (delta)
  this.update_delta_results = function () {
    try {

      self.delta_results = {};
      var fr = self.check_first_round();
      self.metrics.forEach(function (metric) {
        //hack
        var n = 0;
        var t = 0;
        
        //For each metric, create the clustered distribution
        var cl = [];
        for(var i = 0; i < self.clusters.length; i++) {
          cl[i] = [];
          for(var cpid in self.clusters[i]) {
            if(self.checkpoints[cpid]) {
              var cp = self.checkpoints[cpid];
              if((cp.status == "done" || (cp.status == "simulating" && fr)) && cp.average_results[metric] && self.baseline_results[cpid][metric]) {
                cl[i].push(cp.average_results[metric] / self.baseline_results[cpid][metric]);
                n += cp.average_results[metric];
                t += self.baseline_results[cpid][metric];
              }
            }
          }
        }

        //Analyze the dist and find results
        var a = self.analyze_cluster(cl);
        
        //hack
        var val = n / t;
        var ci = (a.max - a.min) / 2;
        self.delta_results[metric] = val;
        if(fr) {
          self.delta_results[metric + "_max"] = val;
          self.delta_results[metric + "_min"] = val;
        } else {
          self.delta_results[metric + "_max"] = val + ci;
          self.delta_results[metric + "_min"] = val - ci;
        }
        
        /*self.delta_results[metric] = a.val;
        if(self.first_round) {
          self.delta_results[metric + "_max"] = a.val;
          self.delta_results[metric + "_min"] = a.val;
        } else {
          self.delta_results[metric + "_max"] = a.max;
          self.delta_results[metric + "_min"] = a.min;
        }*/
      });

    } catch (err) {
      console.error("compute_node:update_delta_results: " + err);
    }
  };

  //check confidence interval to see if we are done
  this.check_confidence = function () {
    try {

      if(self.mode == "calibration")
        return;
      self.update_results();
      if(self.delta) {
        var val = self.delta_results[self.simulation_metric];
        var min = self.delta_results[self.simulation_metric + "_min"];
        var max = self.delta_results[self.simulation_metric + "_max"];
      } else {
        var val = self.results[self.simulation_metric];
        var min = self.results[self.simulation_metric + "_min"];
        var max = self.results[self.simulation_metric + "_max"];
      }
      
      if(max - min == 0 && self.ncheckpoints != 1)
        return false;
      if(min / val >= 1 - self.settings["max_ci"] && max / val <= 1 + self.settings["max_ci"]) {
        //We are done here
        self.done("good ci");
      }

    } catch (err) {
      console.error("compute_node:check_confidence: " + err);
    }
  };

  //Clean up the memory for new simulation
  this.cleanup = function () {
    try {

      self.status = "disconnected";
      self.checkpoints = {};
      self.idle_checkpoints = self.ncheckpoints;
      self.running_checkpoints = 0;
      self.done_checkpoints = 0;
      self.cp_order = [];
      self.first_round = true;
      self.results = {};
      self.crashed_checkpoints = 0;
      var d = new Date();
      self.start_time = d.getTime();

    } catch (err) {
      console.error("compute_node:cleanup: " + err);
    }
  };

  //Called to stop simulation
  this.stop_simulation = function () {
    try {

      for(var cpid in self.checkpoints)
        self.checkpoints[cpid].stop_simulation();
      self.status = "idle";

    } catch (err) {
      console.error("compute_node:stop_simulation: " + err);
    }
  };

  //Get average results per checkpoint
  this.get_checkpoint_results = function () {
    try {

      var ret = {};
      for(var cpid in self.checkpoints) {
        ret[cpid] = self.checkpoints[cpid].average_results;
      }
      return ret;

    } catch (err) {
      console.error("compute_node:get_checkpoint_results: " + err);
    }
  };

  //Get individual sample results in each checkpoint
  this.get_sample_results = function () {
    try {

      var ret = [];
      for(var cpid in self.checkpoints) {
        ret[cpid] = self.checkpoints[cpid].sample_results;
      }
      return ret;

    } catch (err) {
      console.error("compute_node:get_checkpoint_results: " + err);
    }
  };

  //Get each checkpoint configuration (range, sample count, etc.)
  this.get_checkpoint_conf = function () {
    try {

      var ret = {};
      for(var cpid in self.checkpoints) {
        var cp = self.checkpoints[cpid];
        ret[cpid] = {"range_from": cp.range_from, "range_to": cp.range_to, "sample_count": cp.sample_count, "status": cp.status};
      }
      return ret;

    } catch (err) {
      console.error("compute_node:get_checkpoint_conf: " + err);
    }
  };

  //Called when simulation is finished
  this.done = function (msg) {
    try {

      self.status = "done";
      self.running_checkpoints = 0;
      for(var cpid in self.checkpoints) {
        if(self.checkpoints[cpid].status == "simulating")
          self.checkpoints[cpid].stop_simulation();
      }
      console.log(self.id + " done: " + msg);
      self.update_results();
      self.parent_on_done(self.id);

    } catch (err) {
      console.error("compute_node:done: " + err);
    }
  };

  //Setting the currently finished run as baseline
  this.set_baseline = function () {
    self.baseline_results = self.get_checkpoint_results();
    self.baseline_conf = self.get_checkpoint_conf();
    self.delta = true;
  };

  //Resetting baseline
  this.randomize = function () {
    self.baseline_results = {};
    self.baseline_conf = {};
    self.delta = false;
  };

  //Calibrating and clustering the checkpoints
  this.calibrate = function () {
    try {

      self.do_simulation = false;
      self.cleanup();
      self.status = "calibrating";
      self.mode = "calibration";
      self.delta = false;
      self.clusters = [];
      self.calibrated = false;
      self.cp_order = [];
      self.cp_order[0] = [];
      for(var i = 0; i < self.ncheckpoints; i++)
        self.cp_order[0].push(i);
      self.pick_and_run();

    } catch (err) {
      console.error("compute_node:calibrate: " + err);
    }
  };

  //after calibration is done, do clustering and other needed actions
  this.after_calibration = function () {
    try {

      if(self.settings.do_cluster)
        self.cluster();
      else
        self.single_cluster();
      self.calibrated = true;
      self.baseline_results = self.get_checkpoint_results();
      self.baseline_sample_results = self.get_sample_results();
      self.baseline_conf = self.get_checkpoint_conf();
      //if(self.settings.naive_ci)
        //self.update_max_spike();
      self.done("calibration");
      self.parent_on_done(self.id);

    } catch (err) {
      console.error("compute_node:after_calibration: " + err);
    }
  };

  //find out the maximum possible outlier for naive CI
  this.update_max_spike = function () {
    var cp_res = self.get_checkpoint_results();
    var max = 0;
    var mean = 0;
    var cnt = 0;
    for(var cpid in cp_res) {
      if(cp_res[cpid][self.simulation_metric]) {
        mean += cp_res[cpid][self.simulation_metric];
        cnt++;
        if(max < cp_res[cpid][self.simulation_metric])
          max = cp_res[cpid][self.simulation_metric];
      }
    }
    mean /= cnt;
    self.max_spike = max / mean;
  };

  //if clustering is disabled, we have 1 global cluster
  this.single_cluster = function () {
    try {

      self.clusters = [];
      self.clusters[0] = [];
      self.checkpoint_clusters = {};
      var cp_res = self.get_checkpoint_results();
      var cp_conf = self.get_checkpoint_conf();
      for(var cpid in cp_res) {
        if(cp_conf[cpid].status == "done" && cp_res[cpid][self.simulation_metric]) {
          self.clusters[0].push(cpid);
          self.checkpoint_clusters[cpid] = 0;
        }
      }
      I(self.clusters[0].length == self.done_checkpoints, "crashing checkpoints in cluster");

    } catch (err) {
      console.error("compute_node:single_cluster: " + err);
    }
  };

  //figure out the clustering on checkpoints
  this.cluster = function () {
    try {

      var k = 1;
      var c_nodes = [];
      var best_cnodes = [];
      var min_space = 0;
      var c, i, j, min, min_index;
      var cp_res = self.get_checkpoint_results();
      var cp_conf = self.get_checkpoint_conf();
      var cps = [];
      var sum = 0;
      var cnt = 0;
      var nspn = 0;
      var kill_down = 10;
      var best_nspn;
      var insane;
      for(var cpid in cp_res) {
        if(cp_conf[cpid].status == "done" && cp_res[cpid][self.simulation_metric]) {
          cps.push({"cpid": cpid, "val": cp_res[cpid][self.simulation_metric]});
          sum += cp_res[cpid][self.simulation_metric];
          cnt ++;
        } else {
          console.log("faulty checkpoint " + cpid);
        }
      }
      I(cps.length == self.done_checkpoints, "crashing checkpoints in cluster");
      cps.sort(function (a, b) {
        return a.val - b.val;
      });
      var cpi = sum / cnt;
      if(self.settings.cluster_method == "nspn") {
        best_nspn = self.get_nspn(cps);
      } else {
        var fcl = [];
        fcl[0] = cps;
        best_nspn = self.get_candidate_ci(fcl);
      }

      best_cnodes[0] = [];
      for(i = 0; i < cps.length; i++) {
        best_cnodes[0].push(cps[i]);
      }

      do {
        //find kmean clusters
        k ++;
        c = [];
        c_nodes = [];
        for(i = 0; i < k; i++) {
          var r = Math.floor((i + 0.5) * (cnt / k));
          c[i] = cps[r].val;
        }
        for(i = 0; i < cps.length; i++) {
          min = Math.abs(c[0] - cps[i].val);
          min_index = 0;
          for(j = 1; j < k; j++) {
            if(Math.abs(c[j] - cps[i].val) < min) {
              min = Math.abs(c[j] - cps[i].val);
              min_index = j;
            }
          }
          cps[i].cluster = min_index;
          if(! c_nodes[min_index])
            c_nodes[min_index] = [];
          c_nodes[min_index].push(cps[i]);
        }
        var changed;
        do {
          changed = false;
          for(j = 0; j < k; j++) {
            var mean = 0;
            c_nodes[j].forEach(function (item) {
              mean += item.val;
            });
            mean = mean / c_nodes[j].length;
            c[j] = mean;
          }
          for(i = 0; i < cps.length; i++) {
            min = Math.abs(c[0] - cps[i].val);
            min_index = 0;
            for(j = 1; j < k; j++) {
              if(Math.abs(c[j] - cps[i].val) < min) {
                min = Math.abs(c[j] - cps[i].val);
                min_index = j;
              }
            }
            if(cps[i].cluster != min_index) {
              changed = true;
              var t = c_nodes[cps[i].cluster].indexOf(cps[i]);
              c_nodes[cps[i].cluster].splice(t, 1);
              cps[i].cluster = min_index;
              c_nodes[cps[i].cluster].splice();
              c_nodes[min_index].push(cps[i]);
            }
          }
        } while(changed);

        //Getting rid of empty cnodes
        for(i = 0; i < c_nodes.length; i++) {
          if(c_nodes[i].length === 0) {
            c_nodes.splice(i, 1);
            c.splice(i, 1);
            i--;
          }
        }

        //Getting rid of single node clusters
        for(i = 0; i < c_nodes.length; i++) {
          if(c_nodes[i].length == 1) {
            var x = c_nodes[i][0].val;
            var best_c, best_dis;
            if(i !== 0) {
              best_c = 0;
              best_dis = Math.abs(c[0] - x);
            } else {
              best_dis = Math.abs(c[1] - x);
              best_c = 1;
            }
            for(j = 0; j < c.length; j++) {
              if(j != i && Math.abs(c[j] - x) < best_dis) {
                best_dis = Math.abs(c[j] - x);
                best_c = j;
              }
            }
            c_nodes[best_c].push(c_nodes[i][0]);
            c_nodes.splice(i, 1);
            c.splice(i, 1);
            i--;
          }
        }

        //Get min cluster space
        min_space = 1000;
        c.sort(function (a, b) {
          return a - b;
        });
        for(i = 0; i < c.length -1; i++) {
          if(c[i + 1] - c[i] < min_space)
            min_space = c[i + 1] - c[i];
        }
        //Calculate NSPN (number of samples probably needed)
        if(self.settings.cluster_method == "nspn") {
          nspn = 0;
          for(i = 0; i < c_nodes.length; i++) 
            nspn += self.get_nspn(c_nodes[i]);
        } else {
          nspn = self.get_candidate_ci(c_nodes);
        }
        
        kill_down --;
        if(nspn < best_nspn) {
          kill_down = 10;
          best_nspn = nspn;
          best_cnodes = c_nodes;
        }
        

      } while(k < cnt / 2 && kill_down > 0);

      self.clusters = [];
      self.checkpoint_clusters = {};
      for(i = 0; i < best_cnodes.length; i++) {
        self.clusters[i] = [];
        best_cnodes[i].forEach(function (cpid) {
          self.clusters[i].push(cpid.cpid);
          self.checkpoint_clusters[cpid.cpid] = i;
        });
      }
    
    } catch (err) {
      console.error("compute_node:cluster: " + err);
    }
  };

  //calculate the CI of a candidate cluster combination
  this.get_candidate_ci = function (c_nodes) {
    try {

      var cl = [];
      self.clusters = [];
      for(var i = 0; i < c_nodes.length; i++) {
        cl[i] = [];
        self.clusters[i] = [];
        for(var j = 0; j < c_nodes[i].length; j++) {
          cl[i].push(c_nodes[i][j].val);
          self.clusters[i].push(c_nodes[i][j].cpid);
        }
      }

      var a = self.analyze_cluster(cl);
      return (a.max - a.min);

    } catch (err) {
      console.error("compute_node:get_candidate_ci: " + err);
    }
  };

  //Estimate NSPN of a clustering combination
  this.get_nspn = function (cnode) {
    try {

      //Finding population mean and variance
      var n = 0;
      var mean = 0;
      var m2 = 0;
      var variance = 0;
      var sum = 0;
      cnode.forEach(function (node) {
        var x = node.val;
        sum += x;
        var delta = x - mean;
        n ++;
        mean = mean + delta / n;
        m2 = m2 + delta * (x - mean);
      });
      variance = m2 / (n - 1);
      mean = sum / n;
      
      //Trying to find an imaginary population with same mean and variance with acceptable CI and min number of samples
      var cert = 1 - self.settings.ci_certainity;
      for(var i = 2; i < n; i++) {
        var ci = jstat.tci(mean, cert, Math.sqrt(variance), i);
        //console.log(ci);
        if(ci[1] - ci[0] < self.settings.max_ci * mean) {
          return i;
        }
      }

    //Worst case
    var cio = jstat.tci(mean, cert, Math.sqrt(variance), n);
    return n;

    } catch (err) {
      console.error("compute_node:get_nspn: " + err);
    }
  };

  //Find point estimates of a sample distribution
  this.analyze_dist = function (dist) {
    try {
      
      //I(dist.length > 1 || self.first_round, self.id + " single node cluster");
      var n = 0;
      var mean = 0;
      var m2 = 0;
      var variance = 0;
      var sum = 0;
      dist.forEach(function (node) {
        var x = node;
        sum += x;
        var delta = x - mean;
        n ++;
        mean = mean + delta / n;
        m2 = m2 + delta * (x - mean);
      });

      variance = (self.get_t(n) * m2) / (n - 1);
      mean = sum / n;

    return {"n": n, "v": variance, "m": mean};

    } catch (err) {
      console.error("compute_node:analyze_dist: " + err);
    }
  };

  //Find point estimates of a clustered sampling distribution
  this.analyze_cluster = function (cdist) {
    if(self.settings.ci_method == "cluster") {
      return self.analyze_cluster_2(cdist);
    } else {
      return self.analyze_cluster_1(cdist);
    }
  };

  //Find point estimates of a clustered sampling distribution
  this.analyze_cluster_2 = function (cdist) {
    try {

      var i;
      var variance = 0;
      var weight = 0;
      var sum = 0;
      var n = 0;
      var not_confident = false;
      var gci = 0;
      var cert = 1 - self.settings.ci_certainity;
      
      for(i = 0; i < cdist.length; i++) {
        if(cdist[i].length > 0)
          weight += self.clusters[i].length;
      }
      
      for(i = 0; i < cdist.length; i++) {
        if(cdist[i].length > 0) {
          if(cdist[i].length < 2)
            not_confident = true;
          var a = self.analyze_dist(cdist[i]);
          var w = self.clusters[i].length / weight;
          sum += a.m * w;
          variance += (a.v * Math.pow(w, 2)) / a.n;
          //variance += a.v;
          
          n += a.n;       
        }
      }
      
      var ci = jstat.tci(sum, cert, Math.sqrt(variance), n);
      //var cic = 1.96 * Math.sqrt(variance);

      if(not_confident) {
        ci[0] = sum;
        ci[1] = sum;
      }

      return {"val": sum, "min": ci[0], "max": ci[1], "n": n};

    } catch (err) {
      console.error("compute_node:analyze_cluster: " + err);
    }
  };

  //Find point estimates of a clustered sampling distribution
  this.analyze_cluster_1 = function (cdist) {
    try {
    
      var x, delta;
      var n = 0;
      var mean = 0;
      var sum = 0;
      var m2 = 0;
      var w = 0;
      var cert = 1 - self.settings.ci_certainity;
      for(var i = 0; i < cdist.length; i++) {
        for(var j = 0; j < cdist[i].length; j++) {
          x = cdist[i][j];
          sum += x * (self.clusters[i].length / cdist[i].length);
          w += (self.clusters[i].length / cdist[i].length);
          delta = x - mean;
          n ++;
          mean = mean + delta / n;
          m2 = m2 + delta * (x - mean);
        }
      }

      //fake point
      if(self.settings.naive_ci && self.max_spike) {
        x = self.max_spike * mean;
        delta = x - mean;
        n++;
        mean = mean + delta / n;
        m2 = m2 + delta * (x - mean);
        n--;
      }
      
      var variance = m2 / (n - 1);
      mean = sum / w;
      var ci;
      if(self.settings.ci_method == "student") {
        ci = jstat.tci(mean, cert, Math.sqrt(variance), n);
      } else {
        var civ = 1.96 * Math.sqrt(variance / n);
        ci = [mean - civ, mean + civ];
      }

      return {"val": mean, "min": ci[0], "max": ci[1], "n": n};

    } catch (err) {
      console.error("compute_node:analyze_cluster: " + err);
    }
  };

  //get t coefficient in student t-test
  this.get_t = function (n) {
    var cert = 1 - self.settings.ci_certainity;
    return Math.pow(jstat.tci(0, cert, Math.sqrt(n), n)[1], 2);
  };

  //update baseline selected sample ranges for delta
  this.update_baseline_range = function (cpid) {
    try {

      var cp = self.checkpoints[cpid];
      if(cp.status != "done")
        return;
      var bcp = self.baseline_sample_results[cpid];
      self.metrics.forEach(function (metric) {
        var n = 0;
        var t = 0;
        for(var i = cp.range_from; i <= cp.range_to; i++) {
          if(bcp[i]) {
            n += bcp[i].n[metric];
            t += bcp[i].t[metric];
          }
        }
        self.baseline_results[cpid][metric] = self.process_metric(n, t, metric);
      });

    } catch (err) {
      console.error("compute_node:update_baseline_range: " + err);
    }
  };

  //parse a single metric result
  this.process_metric = function (n, t, metric) {
    try {

      var rates = ["bpredrate" ,"IL1_missrate", "ITLB_missrate", "DL1_missrate", "L2_missrate", "L3_missrate", "MemBus_missrate"];
      if(rates.indexOf(metric) == -1)
        return  (n / t);
      else
        return ((n / t) * 100);

    } catch (err) {
      console.error("compute_node:process_metric: " + err);
    }
  };

  //standard rounding function
  this.rnd = function (n) {
    if(n && ! isNaN(n))
      return Math.round(n * 100) / 100;
    else
      return n;
  };

  //Main body
  this.create_transporter_server();
};

//Assertion
function I (test, msg) {
  if(!test)
    console.error("Assertion error: " + msg);
}
