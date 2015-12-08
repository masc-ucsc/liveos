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
 * Based on pasport.js templates: https://github.com/jaredhanson/passport
 *
 * Contributors:
 *     Sina Hassani
 */

// load all the things we need
var LocalStrategy   = require("passport-local").Strategy;

// load up the user model
var User       		= require("./models/user");

// expose this function to our app using module.exports
module.exports = function(passport, conf) {

	// =========================================================================
    // passport session setup ==================================================
    // =========================================================================
    // required for persistent login sessions
    // passport needs ability to serialize and unserialize users out of session

    // used to serialize the user for the session
    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    // used to deserialize the user
    passport.deserializeUser(function(id, done) {
        User.findById(id, function(err, user) {
            done(err, user);
        });
    });

 	// =========================================================================
    // LOCAL SIGNUP ============================================================
    // =========================================================================
    // we are using named strategies since we have one for login and one for signup
	// by default, if there was no name, it would just be called "local"

    passport.use("local-signup", new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField : "email",
        passwordField : "password",
        passReqToCallback : true // allows us to pass back the entire request to the callback
    },
    function(req, email, password, done) {

		// find a user whose email is the same as the forms email
		// we are checking to see if the user trying to login already exists
        User.findOne({ "email" :  email }, function(err, user) {
            // if there are any errors, return the error
            if (err)
                return done(err);

            //check for registration passkey
            if(conf.registration_passkey && req.body.passkey != conf.registration_passkey)
                return done(null, false, req.flash("signupMessage", "Wrong registration passkey. Please inquire that from the admin."));

            // check to see if theres already a user with that email
            if (user) {
                return done(null, false, req.flash("signupMessage", "That email is already taken."));
            } else {

				// if there is no user with that email
                // create the user
                var newUser            = new User();

                // set the user"s local credentials
                newUser.email     = email;
                newUser.password  = newUser.generateHash(password); // use the generateHash function in our user model
                newUser.full_name = req.body.full_name;
                newUser.signature = create_random_signature();
                newUser.admin = false;

				// save the user
                newUser.save(function(err) {
                    if (err)
                        throw err;
                    return done(null, newUser);
                });
            }

        });

    }));

    // =========================================================================
    // LOCAL LOGIN =============================================================
    // =========================================================================
    // we are using named strategies since we have one for login and one for signup
    // by default, if there was no name, it would just be called "local"

    passport.use("local-login", new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField : "email",
        passwordField : "password",
        passReqToCallback : true // allows us to pass back the entire request to the callback
    },
    function(req, email, password, done) { // callback with email and password from our form

        // find a user whose email is the same as the forms email
        // we are checking to see if the user trying to login already exists
        User.findOne({ "email" :  email }, function(err, user) {
            // if there are any errors, return the error before anything else
            if (err)
                return done(err);

            // if no user is found, return the message
            if (!user)
                return done(null, false, req.flash("loginMessage", "No user found.")); // req.flash is the way to set flashdata using connect-flash

            // if the user is found but the password is wrong
            if (!user.validPassword(password))
                return done(null, false, req.flash("loginMessage", "Oops! Wrong password.")); // create the loginMessage and save it to session as flashdata

            // all is well, return successful user
            return done(null, user);
        });

    }));

};

function create_random_signature()
{
    var length = 30;
    var chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    var result = "";
    for (var i = length; i > 0; --i) 
        result += chars[Math.round(Math.random() * (chars.length - 1))];
    return result;
}
