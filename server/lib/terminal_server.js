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
 *     Ethan Papp
 */

module.exports = function (main_path) {
	var self = this;
  this.exec = require("child_process").exec;
  this.execFile = require("child_process").execFile;
  this.main_path = main_path;
  
  this.run = function (command, path, callback, on_error) { //use this fn to run a terminal command by launching a shell
  	var cwd = main_path + "/" + path;
  	console.log("Terminal: " + command);
    self.exec(command, {cwd: cwd}, function (error, stdout, stderr) {
      if (error !== null) {
    		if(on_error) {
    		  on_error(stderr.replace("\n", "<br />"), stdout);
    		} else {
    		  console.log("Exec error: " + error);	
    		}
    	} else if (callback !== null) {
        callback(stdout);
      }
    });
  };

  this.run_file = function (file, args, path, callback, on_error) { //use this fn to run an executable without launching a shell. Pass string arguments WITHOUT quotes 
    var cwd = main_path + "/" + path;

    console.log("File Exec: " + file + ", Args: " + args);
    
    self.execFile(file, args, {cwd: cwd}, function (error, stdout, stderr) {
      console.log(stderr);
      if (error !== null) {
        if(on_error) {
          on_error(stderr, stdout);
        } else {
          console.log("File Exec error: " + error);  
        }
      } else if (callback !== null) { 
        callback(stdout);
      }
    });
  };

  this.run_inorder = function (q, cwd, callback, on_error) {
    if(q.length === 0 && callback !== null) {
      callback();
    } else {
      var cmd = q.shift();
      self.run(cmd, cwd, function () {
        self.run_inorder(q, cwd, callback, on_error);
      }, on_error);
    }
  };
};
