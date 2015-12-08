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

var mongoose = require("mongoose");

// define the schema for our user model
var fileSchema = mongoose.Schema({
	project      : mongoose.Schema.Types.ObjectId,
    parent       : mongoose.Schema.Types.ObjectId,
    name         : String,
    type         : String,
    content      : String
});

// methods ======================

// create the model for users and expose it to our app
module.exports = mongoose.model("File", fileSchema);
