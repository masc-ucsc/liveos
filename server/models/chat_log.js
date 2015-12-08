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

var mongoose = require("mongoose");

// define the schema for our user model
var chat_logSchema = mongoose.Schema({
	sender       : mongoose.Schema.Types.ObjectId,
    recipient    : mongoose.Schema.Types.ObjectId,
    message      : String,
    timestamp    : Number
});

// create the model for users and expose it to our app
module.exports = mongoose.model("chat_log", chat_logSchema);
