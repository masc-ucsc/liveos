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

module.exports = function (ts, io, fserver) {
  //Includes and class inputs
  var self = this;
  this.transporter_server = require("../transporter/transporter_server.js");
  var livesim_node = require("./livesim_node.js");
  this.ts = ts;
  this.io = io;
  this.fserver = fserver;
  this.metric = "cpi";
  
  //Class fields
  this.livesim_nodes = {};
  this.livesim_status = {};
  this.livesim_status_params = {};
  this.tcp_ports = [];
  this.node_ids = [];
  this.controllers = [];
  this.wait_list = {};

  //Creating socket.io server
  this.io.of("/livesim").on("connection", function (socket) {

    //Running/restarting simulation
    socket.on("run", function (obj) {
      if(obj.metric)
        self.metric = obj.metric;
      console.log("Simulation based on " + self.metric);
      self.run(obj.project_id);
    });

    //Running/restarting simulation in delta mode
    socket.on("run_delta", function (obj) {
      if(obj.metric)
        self.metric = obj.metric;
      console.log("Simulation based on " + self.metric);
      self.run_delta(obj.project_id);
    });

    //Running sweep
    socket.on("sweep", function (obj) {
      self.sweep(obj.project_id);
    });

    //Stopping simulation
    socket.on("stop", function (obj) {
      if (self.livesim_nodes[obj.project_id] !== null) {
        self.livesim_nodes[obj.project_id].stop_simulation();
        self.push_status(obj.project_id, "simulation_stopped");
      }
    });

    socket.on("calibrate", function (obj) {
      if (self.livesim_nodes[obj.project_id] !== null) {
        if(obj.metric)
          self.metric = obj.metric;
        self.livesim_nodes[obj.project_id].simulation_metric = self.metric;
        self.livesim_nodes[obj.project_id].calibrate();
      }
    });

    //Reseting sequence
    socket.on("randomize", function (obj) {
      if (self.livesim_nodes[obj.project_id] !== null) {
        var en = self.livesim_nodes[obj.project_id];
        en.randomize();
        io.of("/livesim").emit("receive_conf", {project_id: obj.project_id, conf: JSON.stringify(en.get_conf("")), history_name: ""});
      }
    });

    //Setting sequence beginning
    socket.on("set_baseline", function (obj) {
      if (self.livesim_nodes[obj.project_id] !== null) {
        var en = self.livesim_nodes[obj.project_id];
        en.set_baseline();
        io.of("/livesim").emit("receive_conf", {project_id: obj.project_id, conf: JSON.stringify(en.get_conf("")), history_name: ""});
      }
    });

    //Getting results
    socket.on("get_results", function (obj) {
      if (! self.livesim_nodes[obj.project_id]) {
        self.run(obj.project_id);
        socket.emit("receive_results", {stats: ""});
      } else {
        self.send_results(obj, socket);
      }
    });

    //Getting configuration
    socket.on("get_conf", function (obj) {
      if (! self.livesim_nodes[obj.project_id]) {
        self.run(obj.project_id);
      }
      var conf = self.livesim_nodes[obj.project_id].get_conf(obj.history_name);
      socket.emit("receive_conf", {project_id: obj.project_id, conf: JSON.stringify(conf), history_name: obj.history_name});
      if(obj.history_name === "") {
        socket.emit("status", {project_id: obj.project_id, message: self.livesim_status[obj.project_id], params: self.livesim_status_params[obj.project_id], history_name: ""});
      }
    });

    //Getting md configuration
    socket.on("get_conf_md", function (obj) {
      if (! self.livesim_nodes[obj.project_id])
        return;
      socket.emit("receive_conf_md", {source: self.livesim_nodes[obj.project_id].get_conf_md()});
    });

    //Updating md configuration
    socket.on("update_conf_md", function (obj) {
      if (! self.livesim_nodes[obj.project_id])
        return;
      self.livesim_nodes[obj.project_id].update_conf_md(obj.source);
    });

    //Setting configuration
    socket.on("set_conf", function (obj) {
      if(self.livesim_nodes[obj.project_id]) {
        var en = self.livesim_nodes[obj.project_id];
        en.set_conf(obj.conf_name, obj.conf_val, obj.index);
        if(obj.conf_name == "benchmark")
          io.of("/livesim").emit("receive_conf", {project_id: obj.project_id, conf: JSON.stringify(en.get_conf(obj.history_name)), history_name: obj.history_name});
      }
    });

    //Get history list
    socket.on("get_history_list", function(obj) {
      if(!self.livesim_nodes[obj.project_id])
        return;
      var en = self.livesim_nodes[obj.project_id];
      socket.emit("receive_history_list", {project_id: obj.project_id, history_list: en.get_history_list(obj.search_key)});
    });

    //Save history
    socket.on("dump_results", function(obj) {
      if(!self.livesim_nodes[obj.project_id])
        return;
      self.livesim_nodes[obj.project_id].dump_results(obj.name, function() {
        self.io.of("/livesim").emit("receive_history_list", {project_id: obj.project_id, history_list: self.livesim_nodes[obj.project_id].get_history_list("")});
      });
    });

    //Save results in CSV format
    socket.on("set_csv_timer", function(obj) {
      if(!self.livesim_nodes[obj.project_id])
        return;
      self.livesim_nodes[obj.project_id].set_csv_timer(obj.status, obj.name);
    });

    //Remove history
    socket.on("remove_dump", function(obj) {
      if(!self.livesim_nodes[obj.project_id])
        return;
      self.livesim_nodes[obj.project_id].remove_dump(obj.name, function() {
        self.io.of("/livesim").emit("receive_history_list", {project_id: obj.project_id, history_list: self.livesim_nodes[obj.project_id].get_history_list("")});
      });
    });

    //Register livesim Controller
    socket.on("reg_controller", function (obj) {
      var id = self.controllers.length;
      self.controllers[id] = {};
      self.controllers[id].host = obj.host;
      self.controllers[id].core_count = obj.core_count;
      self.controllers[id].socket = socket;
      self.controllers[id].is_ready = true;
      self.controllers[id].do_when_ready = null;
      self.controllers[id].is_local = obj.is_local;
      socket.controller = self.controllers[id];
      socket.emit("reg_success", {id: id});
      console.log("Controller registered: " + obj.host + " " + obj.core_count);
    });

    //When controller is ready
    socket.on("controller_ready", function (obj) {
      socket.controller.is_ready = true;
      if(socket.controller.do_when_ready)
        socket.controller.do_when_ready();
      socket.controller.do_when_ready = null;
    });
  });

  self.transporter = new self.transporter_server("8078", function (client) {
    //running simulation from terminal shell command
    client.on("livesim_start", function (obj) {
      console.log(obj);
      if(obj.project_id == "admin")
        obj.project_id = self.get_project_id();
      if(obj.metric == "calibrate") {
        self.metric = "cpi";
        if(! self.livesim_nodes[obj.project_id]) {
          self.run(obj.project_id);
        } else {
          self.livesim_nodes[obj.project_id].simulation_metric = self.metric;
          self.livesim_nodes[obj.project_id].calibrate();
        }
      } else {
        if(obj.metric)
          self.metric = obj.metric;
        else
          self.metric = "cpi";
        //console.log(obj.project_id);
        self.run(obj.project_id);
      }
    });

    //stopping simulation from terminal shell command
    client.on("livesim_stop", function (obj) {
      if(obj.project_id == "admin")
        obj.project_id = self.get_project_id();
      if(self.livesim_nodes[obj.project_id] !== null) {
        self.livesim_nodes[obj.project_id].stop_simulation();
        self.push_status(obj.project_id, "simulation_stopped");
      }
    });

    //waiting for simulation to finish
    client.on("livesim_wait", function (obj) {
      if(obj.project_id == "admin")
        obj.project_id = self.get_project_id();
      if(! self.wait_list[obj.project_id])
        self.wait_list[obj.project_id] = [];
      self.wait_list[obj.project_id].push(client);
    });

    //Saving the simulation results
    client.on("livesim_save", function (obj) {
      if(obj.project_id == "admin")
        obj.project_id = self.get_project_id();
      if(!self.livesim_nodes[obj.project_id])
        return;
      self.livesim_nodes[obj.project_id].dump_results(obj.name, function() {
        self.io.of("/livesim").emit("receive_history_list", {project_id: obj.project_id, history_list: self.livesim_nodes[obj.project_id].get_history_list("")});
      });
    });

    //Touching files so they be transferred to nodes
    client.on("livesim_touch", function (obj) {
      if(obj.project_id == "admin")
        obj.project_id = self.get_project_id();
      if(!self.livesim_nodes[obj.project_id])
        return;
      self.livesim_nodes[obj.project_id].touch_source(obj.name);
    });
    
    //Other livesim commands
    client.on("livesim_cmd", function (obj) {
      if(obj.project_id == "admin")
        obj.project_id = self.get_project_id();
      if(!self.livesim_nodes[obj.project_id])
        return;
      switch(obj.cmd) {
        case "config":
          console.log(obj.params);
          conf_arr = obj.params.split("=");
          self.livesim_nodes[obj.project_id].set_conf(conf_arr[0], conf_arr[1]);
          console.log("livesim conf set", conf_arr[0], conf_arr[1]);
          break;
        default:
          console.log("livesim script command not resolved");
      }
    });
  });

  //Sending results to client
  this.send_results = function (obj, socket) {
    var en = self.livesim_nodes[obj.project_id];
    switch(obj.plot_type) {
      case "bar": socket.emit("receive_results", {project_id: obj.project_id, stats: en.get_metric_average(obj.metric, obj.history_name, JSON.parse(obj.comparables)), status: en.get_status(obj.history_name)});
      break;
      case "delta": socket.emit("receive_results", {project_id: obj.project_id, stats: en.get_metric_delta(obj.metric, obj.history_name, JSON.parse(obj.comparables)), status: en.get_status(obj.history_name)});
      break;
      case "trace": socket.emit("receive_results", {project_id: obj.project_id, stats: en.get_benchmark_trace(obj.benchmark, obj.metric, obj.start, obj.history_name), status: en.get_status(obj.history_name)});
      break;
      case "sweep": socket.emit("receive_results", {project_id: obj.project_id, stats: en.get_sweep(obj.benchmark, obj.metric, obj.history_name), status: en.get_status(obj.history_name)});
      break;
      case "sample": socket.emit("receive_results", {project_id: obj.project_id, stats: en.get_checkpoint_trace(obj.benchmark, obj.metric, obj.history_name, obj.checkpoint), status: en.get_status(obj.history_name)});
      break;
      case "checkpoint": socket.emit("receive_results", {project_id: obj.project_id, stats: en.get_checkpoint_average(obj.benchmark, obj.metric, obj.history_name), status: en.get_status(obj.history_name)});
      break;
      case "histogram": socket.emit("receive_results", {project_id: obj.project_id, stats: en.get_histogram(obj.benchmark, obj.metric, obj.history_name), status: en.get_status(obj.history_name)});
      break;
      case "delta_histogram": socket.emit("receive_results", {project_id: obj.project_id, stats: en.get_delta_histogram(obj.benchmark, obj.metric, obj.history_name), status: en.get_status(obj.history_name)});
      break;
    }
  };

  //Run simulation
  this.run = function (project_id) {
    if (! self.livesim_nodes[project_id]) {
      //self.push_status(project_id, "setting_up");
      var id = self.get_id();
      self.livesim_nodes[project_id] = new livesim_node(id, project_id, self, self.ts, self.fserver, self.push_status, self.push_message);
      self.livesim_nodes[project_id].setup(self.controllers);
    }
    if(! self.livesim_nodes[project_id].is_sweeping) {
      self.livesim_nodes[project_id].stop_simulation();
      self.livesim_nodes[project_id].simulation_metric = self.metric;
      self.livesim_nodes[project_id].run_simulation();
    }
  };

  //Running simulation in delta mode
  this.run_delta = function (project_id) {
    if(! self.livesim_nodes[project_id].is_sweeping) {
      self.livesim_nodes[project_id].stop_simulation();
      self.livesim_nodes[project_id].simulation_metric = self.metric;
      self.livesim_nodes[project_id].run_simulation(false, false, true);
    }
  };

  //Parameter sweep simulation
  this.sweep = function (project_id) {
    self.livesim_nodes[project_id].stop_simulation();
    self.livesim_nodes[project_id].run_sweep();
  };  

  //Send status to client
  this.push_status = function (id, message, params) {
    self.livesim_status[id] = message;
    self.livesim_status_params[id] = params;
    self.io.of("/livesim").emit("status", {project_id: id, message: message, history_name: "", params: params});

    if(message == "simulation_done" && self.wait_list[id]) {
      self.wait_list[id].forEach(function (client) {
        client.send_fast("livesim_done");
      });
      self.wait_list[id] = [];
    }
  };

  //Send message to clients
  this.push_message = function (id, message, params) {
    self.io.of("/livesim").emit("message", {project_id: id, message: message, params: params});
  };

  //Generate unique ID
  this.get_id = function () {
    var i = 0;
    var f = true;
    while (f && i < 1200) {
      if (self.node_ids.indexOf(i) == -1) {
        self.node_ids.push(i);
        f = false;
      } else {
        i++;
      }
    }
    return i;
  };

  //Release ID
  this.release_id = function (i) {
    var t = self.node_ids.indexOf(i);
    if(t != -1)
      self.node_ids.splice(t,1);
  };

  //Generate unique port number
  this.get_port = function () {
    var i = 8090;
    var f = true;
    while (f && i < 9000) {
      if (self.tcp_ports.indexOf(i) == -1) {
        self.tcp_ports.push(i);
        f = false;
      } else {
        i += 1;
      }
    }
    return i;
  };

  //Release port number
  this.release_port = function (i) {
    var t = self.tcp_ports.indexOf(i);
    if(t != -1)
      self.tcp_ports.splice(t,1);
  };

  this.get_project_id = function () {
    return "54dab98615784b0c1ffb2e44";
    for(var k in self.livesim_nodes)
      return k;
    return 0;
  };
};
