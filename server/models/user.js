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
var bcrypt   = require("bcrypt-nodejs");

// define the schema for our user model
var userSchema = mongoose.Schema({
    email        : String,
    password     : String,
    full_name    : String,
    signature    : String,
    admin        : Boolean,
    git_token    : String,
    git_pub_key  : String,
    git_priv_key : String,
    settings     : mongoose.Schema.Types.Mixed,
    sessions     : mongoose.Schema.Types.Mixed
});

// generating a hash
userSchema.methods.generateHash = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

// checking if password is valid
userSchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.password);
};

// create the model for users and expose it to our app
module.exports = mongoose.model("User", userSchema);
