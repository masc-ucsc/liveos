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
 
module.exports = function () {  
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
}