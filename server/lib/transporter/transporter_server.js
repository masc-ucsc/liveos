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

module.exports = function (portno, on_socket) {
  var self = this;
  this.Net = require("net");
  this.Socket = require("./socket.js");
  this.portno = portno;
  this.on_socket = on_socket;

  //setting up the TCP server
  this.tcp_server = self.Net.createServer(function (client) {
    var socket = new self.Socket(client);
    self.on_socket(socket);
  });

  this.tcp_server.listen(this.portno);
}; 