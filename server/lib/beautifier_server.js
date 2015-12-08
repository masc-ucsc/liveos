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
 */
 
module.exports = function (io, fsio) {
  //class fields
  var self = this;
  this.fs = require("fs");
  this.fsio = fsio;
  this.io = io;

  //Registering watch
  this.fsio.emit("watch_touch", {path: "/"});

  //listening to file server
  this.fsio.on("file_touched", function (obj) {
    console.log("file touched", obj.file_id);
  });

  //Creating socket.io server
  this.io.of("/beautifier").on("connection", function (socket) {
    //example event
    socket.on("poke", function (obj) {
      socket.emit("poke_back", {message: obj.message});
    });
  });
};