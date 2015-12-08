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

var mongoose        = require("mongoose");
var configDB        = require("../server/database.js");
var user            = require("../server/models/user.js");

if(! process.argv[2])
  return;

mongoose.connect(configDB.url);
user.update({"email": process.argv[2]}, {$set: {"admin": true}}, function (err) {
  if(err)
    console.log(err);
  else
    console.log("Success");
  process.exit();
});