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

module.exports = function (id, benchmark, controller, simulation_metric, metrics, settings, ninst, on_result, on_done) {
  var self = this;
  this.id = id;
  this.benchmark = benchmark;
  this.controller = controller;
  this.simulation_metric = simulation_metric;
  this.metrics = metrics;
  this.settings = settings;
  this.ninst = ninst;
  this.on_result = on_result;
  this.on_done = on_done;
  this.client = null;
  this.pid = 0;
  this.force_push = false;
  this.status = "idle";
  this.range_from = 1;
  this.range_to = this.settings.range_to;
  this.sample_count = 0;
  this.sample_results = [];
  this.average_results = {};
  this.nresults = {};
  this.tresults = {};
  this.delta = false;
  this.baseline_range_from = 0;
  this.baseline_range_to = 0;
  this.timer = null;
  this.last_heard = 0;

  //worker process registration and events
  this.register_node = function (client) {
    try {

      //store pointers
      self.client = client;
      self.pid = client.pid;
      self.status = "simulating";

      //Simulation results received
      self.client.on("gstats", function (obj) {
        if(self.status != "simulating")
          return;

        //Check timer
        var d = new Date();
        self.last_heard = d.getTime();
        if(! self.timer)
          self.start_timer();

        //process results and calculate the average if forced to
        self.process_results(obj);
        if(self.force_push)
          self.update_results();

        //if checkpoint has finished all its instructions, it's time to give up
        if(self.sample_count > (self.ninst / self.settings.sample_size)) {
          self.done();
          return;
        }

        //Decide what to do next
        if(self.sample_count >= self.range_to) {
          //if we have reached the current range_to
          if(self.find_range()) {
            //if a good range was found, we are done.
            self.done();
          } else {
            //if not, we need to run more samples. If in delta, we need to declare checkpoint not to be used.
            self.range_to += 1;
            self.run_checkpoint();
          }
        } else {
          //we still have samples to run
          self.run_checkpoint();
        }
      });

      //Simulator thread crashed or finished
      self.client.on("cp_done", function (obj) {
        self.done();
      });

    } catch (err) {
      console.error("checkpoint:register_node:" + err);
    }
  };

  //send simulation command to worker process
  this.run_checkpoint = function () {
    try {
      self.client.send_fast("continue", {kill:0, warmup:0});

    } catch (err) {
      console.error("checkpoint:run_checkpoint:" + err);
    }
  };

  //Finding reliable range discarding warmup
  this.find_range = function () {
    try {

      //if range method is static, we are good to go
      if(self.range_method == "static") {
        self.range_from = 1;
        self.range_to = self.settings.range_to;
        return true;
      }

      //if in delta mode with similar range option
      if(self.delta && self.settings.fixed_range) {
        self.range_from = self.baseline_range_from;
        self.range_to = self.baseline_range_to;
        return true;
      }

      //Creating the absolute sample trend
      var trend = [];
      var sm = self.simulation_metric;
      var rf = 1;
      var rt = self.sample_count;
      for(var i = rf; i <= rt; i++) {
        if(self.sample_results[i]) {
          trend[i] = self.process_metric(self.sample_results[i].n[sm], self.sample_results[i].t[sm], sm);
        }
      }

      //call the selected range detection method
      if(self.settings.range_method == "mann-kendall")
        return self.mann_kendall(trend, rf, rt);
      else
        return self.theil_sen(trend, rf, rt);

    } catch (err) {
      console.error("checkpoint:find_range: " + err);
      return false;
    }
  };

  this.mann_kendall = function (trend, rf, rt) {
    var delta_trend = [];
    var sm = self.simulation_metric;

    //Creating the delta sample trend
    var i = 0, j = 0;
    for(i = 2; i < trend.length; i++) {
      if(trend[i - 1] && trend[i]) {
        delta_trend[j] = {"index": i, "val": (trend[i] - trend[i - 1])};
        j++; 
      }
    }

    //Cutting out the crazy spikes assuming they are phase changes
    delta_trend.sort(function (a, b) {
      return a.val - b.val;
    });

    var el = (delta_trend.length * self.settings.spike_avoidance) / 2;
    for(i = 0; i < el; i++) {
      delta_trend[i].val = 0;
    }
    for(i = delta_trend.length - 1; i > delta_trend.length - el; i--) {
      delta_trend[i].val = 0;
    }

    //Reconstructing the trend around 0
    delta_trend.sort(function (a, b) {
      return a.index - b.index;
    });
    var new_trend = [];
    new_trend[rf] = 0;
    j = 0;
    for(i = rf + 1; i <= rt; i++) {
      if(delta_trend[j].index == i) {
        new_trend[i] = new_trend[i - 1] + delta_trend[j].val;
        j++;
      } else {
        console.log("trend assert error");
      }
    }

    //Pre-procesing slope function
    var mat = [];
    for(i = rf -1; i <= rt; i++) {
      mat[i] = [];
      mat[i][i] = 0;
      mat[i][rf -1] = 0;
      mat[i][rt] = 0;
      mat[rf -1][i] = 0;
    }
    for(i = rf; i <= rt; i++) {
      for(j = i + 1; j <= rt; j++) {
        var x = self.sign(new_trend[j] - new_trend[i]);
        mat[i][j] = mat[i - 1][j] + mat[i][j - 1] - mat[i - 1][j - 1] + x;
      }
    }

    //Pre-procesing range sum
    var sums = [];
    sums[rf - 1] = 0;
    for(i = rf; i <= rt; i++)
      sums[i] = sums[i - 1] + trend[i];

    //Finding the best trend
    //for(var j = rt - self.settings["min_sim_sample_size"]; j >= self.settings["min_sim_sample_size"] + rf - 1; j--) {
    j = rt;
      for(i = rf; i < rt - self.settings.min_sim_sample_size + 2; i++) {
        //var j = i + self.settings["min_sim_sample_size"] - 1;
        var n = j - i + 1;
        var v = (n * (n - 1) * (2 * n + 5)) / 18;
        var z;
        if(mat[i][j] > 0)
          z = (mat[i][j] - 1) / Math.sqrt(v);
        else if(mat[i][j] === 0)
          z = 0;
        else
          z = (mat[i][j] + 1) / Math.sqrt(v); 

        //checking if we have a good slope
        var zs;
        if(self.settings.range_abs)
          zs = Math.abs(z);
        else
          zs = -z;
        if(zs <= self.settings.range_threshold) {
          //var cur = (sums[j] - sums[i] + trend[i]) / (j - i + 1);
          //var future = (sums[rt] - sums[j]) / (rt - j);
          //if((cur / future) < (1 + self.settings["max_ci"]) && (cur / future) > (1 - self.settings["max_ci"])) {
            //A good range is found
            self.range_from = i;
            self.range_to = j;
            return true;
          //}
        }
      }
    //}

    //If no good range found
    return false;
  };

  this.theil_sen = function (trend, rf, rt) {
    //finding mean to bias slope
    var mean = 0;
    for(var i = rf; i < rt; i++) {
      mean += trend[i];
    }
    mean /= rt - rf + 1;
    
    //Pre-procesing range sum
    var sums = [];
    sums[rf - 1] = 0;
    for(i = rf; i <= rt; i++)
      sums[i] = sums[i - 1] + trend[i];
    
    //for(var h = rt - self.settings["min_sim_sample_size"]; h > rf + self.settings["min_sim_sample_size"] - 2; h--) {
    var h = rt;  
      for(i = rf; i < rt - self.settings.min_sim_sample_size + 2; i++) {
        //var h = i + self.settings["min_sim_sample_size"] - 1;
        var slopes = [];
        for(var j = i; j < h; j++) {
          for(var k = j + 1; k <= h; k++) {
            slopes.push((trend[k] - trend[j]) / (k - j));
          }
        }
  
        slopes.sort(function (a, b) {
          return a - b;
        });
        var mid = Math.floor(slopes.length / 2);
        var slope = slopes[mid];
        var zs;
        if(self.settings.range_abs)
          zs = Math.abs(slope);
        else
          zs = -slope;
        
        if(zs <= (self.settings.range_threshold * mean)) {
          //var cur = (sums[h] - sums[i] + trend[i]) / (h - i + 1);
          //var future = (sums[rt] - sums[h]) / (rt - h);
          //if((cur / future) < (1 + self.settings["max_ci"]) && (cur / future) > (1 - self.settings["max_ci"])) {
            self.range_from = i;
            self.range_to = h;
            return true;
          //}
        }       
      }
    //}

    //If no good range was found
    return false;
  };

  //Initialization
  this.initialize = function () {
    try {

      //initializing global variables
      self.average_results.n = {};
      self.average_results.t = {};
      self.nresults = {};
      self.tresults = {};
      self.metrics.forEach(function (metric) {
        self.average_results.n[metric] = 0;
        self.average_results.t[metric] = 0;
        self.nresults[metric] = 0;
        self.tresults[metric] = 0;
      });

      //setting up the watchdog timer
      var d = new Date();
      self.last_heard = d.getTime();
      if(! self.timer)
        self.start_timer();

    } catch (err) {
      console.error("checkpoint:initialize:" + err);
    }
  };

  //parsing gstats data and storing results
  this.process_results = function (obj) {
    try {

      if(!obj)
        return;

      var n = {};
      var t = {};
      var caches = ["IL1", "ITLB", "DL1", "L2", "L3"];

      //Sample Count
      var sample_count = obj.sample_count;
      if(sample_count < self.range_from)
        return;
      if(sample_count > self.sample_count)
        self.sample_count = sample_count;
          
      //cpi
      n["cpi"] = obj["P(0):clockTicks"];
      t["cpi"] = obj["S(0):TimingInst"];
      //t["cpi"] = obj["Reader(0):rawInst"];
      //t["cpi"] = obj["P(0):nCommitted"];
      
      //check for only cpi
      if(self.settings.only_cpi == 1) {
        self.sample_results[sample_count] = {};
        self.sample_results[sample_count].n = n;
        self.sample_results[sample_count].t = t;
        return;
      }

      //ipc
      n["ipc"] = obj["S(0):TimingInst"];
      t["ipc"] = obj["P(0):clockTicks"];

      //uIPC
      n["uipc"] = obj["P(0):nCommitted"];
      t["uipc"] = obj["P(0):clockTicks"];

      //Branch Predictor time
      n["bpredtime"] = obj["P(0)_FetchEngine_avgBranchTime"]["v"] * obj["P(0)_FetchEngine_avgBranchTime"]["n"];
      t["bpredtime"] = obj["P(0)_FetchEngine_avgBranchTime"]["n"];

      //Branch Predictor Hit Rate
      n["bpredrate"] = obj["P(0)_BPred:nBranches"] - obj["P(0)_BPred:nMiss"];
      t["bpredrate"] = obj["P(0)_BPred:nBranches"];

      //Memory Latancies
      var cache = "";
      caches.forEach(function (cache) {
        try {
          n[cache + "_lat"] = obj[cache + "(0)_avgMemLat"]["n"] * obj[cache + "(0)_avgMemLat"]["v"];
          t[cache + "_lat"] = obj[cache + "(0)_avgMemLat"]["n"];
        } catch (err) {
          n[cache + "_lat"] = 0;
          t[cache + "_lat"] = 1;
        }
      });

      //Memory Miss Rate
      caches.forEach(function (cache) {
        var cn = 0;
        var ct = 0;
        if(obj[cache + "(0):readMiss"])
          cn += obj[cache + "(0):readMiss"];
        if(obj[cache + "(0):writeMiss"])
          cn += obj[cache + "(0):writeMiss"];
        if(obj[cache + "(0):busReadMiss"])
          cn += obj[cache + "(0):busReadMiss"];
        if(obj[cache + "(0):readHit"])
          ct += obj[cache + "(0):readHit"];
        if(obj[cache + "(0):readHalfHit"])
          ct += obj[cache + "(0):readHalfHit"];
        if(obj[cache + "(0):readHalfMiss"])
          ct += obj[cache + "(0):readHalfMiss"];
        if(obj[cache + "(0):readMiss"])
          ct += obj[cache + "(0):readMiss"];
        if(obj[cache + "(0):writeHit"])
          ct += obj[cache + "(0):writeHit"];
        if(obj[cache + "(0):writeHalfHit"])
          ct += obj[cache + "(0):writeHalfHit"];
        if(obj[cache + "(0):writeHalfMiss"])
          ct += obj[cache + "(0):writeHalfMiss"];
        if(obj[cache + "(0):writeMiss"])
          ct += obj[cache + "(0):writeMiss"];
        if(obj[cache + "(0):busReadMiss"])
          ct += obj[cache + "(0):busReadMiss"];
        if(obj[cache + "(0):busReadHalfMiss"])
          ct += obj[cache + "(0):busReadHalfMiss"];
        //if(obj[cache + "(0):busReadHit"]);
        //  ct += obj[cache + "(0):busReadHit"];
        ct += 1;
        n[cache + "_missrate"] = cn;
        t[cache + "_missrate"] = ct;
      });

      //saving results
      self.sample_results[sample_count] = {};
      self.sample_results[sample_count].n = n;
      self.sample_results[sample_count].t = t;

    } catch (err) {
      console.error("checkpoint:process_results:" + err);
    }
  };

  //update average results and final results for the checkpoint
  this.update_results = function () {
    try {

      //init
      self.average_results = {};
      self.nresults = {};
      self.tresults = {};

      //loop around all data points
      self.metrics.forEach(function (metric) {
        var n = 0;
        var t = 0;
        for(var i = self.range_from; i <= self.range_to && i <= self.sample_count; i++) {
          if(self.sample_results[i]) {
            n += self.sample_results[i].n[metric];
            t += self.sample_results[i].t[metric];
          }
        }
        self.average_results[metric] = self.process_metric(n, t, metric);
        self.nresults[metric] = n;
        self.tresults[metric] = t;
      });

      //Submitting the results to parent
      self.on_result(self.id);

    } catch (err) {
      console.error("checkpoint:update_results:" + err);
    }
  };

  //parse an individual gstats metric
  this.process_metric = function (n, t, metric) {
    try {

      var rates = ["bpredrate" ,"IL1_missrate", "ITLB_missrate", "DL1_missrate", "L2_missrate", "L3_missrate", "MemBus_missrate"];
      if(rates.indexOf(metric) == -1)
        return  (n / t);
      else
        return ((n / t) * 100);

    } catch (err) {
      console.error("checkpoint:process_metric:" + err);
    }
  };

  //When checkpoint simulation is done
  this.done = function () {
    try {

      clearInterval(self.timer);
      self.timer = null;
      self.status = "done";
      self.update_results();
      self.kill_node();
      self.on_done(self.id);

    } catch (err) {
      console.error("checkpoint:done:" + err);
    }
  };

  //When checkpoint simulation is forced to stop
  this.stop_simulation = function () {
    try {

      clearInterval(self.timer);
      self.timer = null;
      self.status = "stopped";
      self.kill_node();

    } catch (err) {
      console.error("checkpoint:stop_simulation:" + err);
    }
  };

  //kill the worker node
  this.kill_node = function () {
    try {
      //self.client.send_fast("continue", {kill:1, skip:0});
      if(self.client) {
        self.client = null;
        self.controller.socket.emit("kill", {pid: self.pid}); 
      }

    } catch (err) {
      console.error("checkpoint:kill_node:" + err);
    }    
  };

  //set the watchdog timer for worker node
  this.start_timer = function () {
    try {

      var d = new Date();
      self.last_heard = d.getTime();
      self.timer = setInterval(function () {
        var d = new Date();
        var t = d.getTime();
        if(t - self.last_heard > self.settings.sample_size / 100 + self.settings.detailed_warmup * 4000 + 10000) {
          self.crashed(); 
        }
      }, 10000);

    } catch (err) {
      console.error("checkpoint:start_timer:" + err);
    }
  };

  //in case a worker node crashed
  this.crashed = function () {
    try {

      console.log(self.benchmark + self.id + " crashed, PID " + self.pid);
      self.status = "crashed";
      self.kill_node();
      clearInterval(self.timer);
      self.timer = null;
      self.on_done(self.id);

    } catch (err) {
      console.error("checkpoint:crashed:" + err);
    } 
  };
  
  //simple sign function
  this.sign = function (x) {
    if(x > 0)
      return 1;
    if(x < 0)
      return -1;
    if(x === 0)
      return 0;
  };

  //initialize the checkpoint
  self.initialize();
};
