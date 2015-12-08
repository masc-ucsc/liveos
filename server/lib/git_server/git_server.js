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
 *     Ethan Papp
 */

module.exports = function (main_path, io, pty, ts) {
  var self = this;
  this.ts = ts;
  this.pty = pty;
  this.main_path = main_path;
  this.fs = require("fs");
  //this.git = require("github-api");

  //store user keys in here with login name as key


  //Creating socket.io server
  io.of("/terminal").on("connection", function (socket) {

    //var self = this;
   

    socket.on("resizing", function(obj){

    });



    socket.on("disconnect", function() {

    });

  });

};
