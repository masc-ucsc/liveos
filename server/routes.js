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

module.exports = function(app, passport, projects, tokens, generate_token, remove_token, settings, conf) {
	app.get("/", function(req, res) {
		res.render("index.ejs");
	});

	//login
	app.get("/login", function(req, res) {
		res.render("login.ejs", { message: req.flash("loginMessage") });
	});
	app.post("/login", passport.authenticate("local-login", {
		successRedirect : "/project",
		failureRedirect : "/login",
		failureFlash : true
	}));

	//signup
	app.get("/signup", function(req, res) {
		res.render("signup.ejs", { 
			message: req.flash("signupMessage"),
			conf: conf
		});
	});

	app.post("/signup", passport.authenticate("local-signup", {
		successRedirect : "/project",
		failureRedirect : "/signup",
		failureFlash : true
	}));

	//project page
	app.get("/project", isLoggedIn, function(req, res) {
		res.render("project.ejs", {
			user : req.user,
			conf : conf,
			assigned_token : generate_token(tokens, req.user._id)
		});
	});

	//main page
	app.post("/main", isLoggedIn, function(req, res) {
		res.render("main.ejs", {
			user : req.user,
			apps : settings.apps,
			conf : conf,
			project : req.body.project_id
		});
	});

	//main page
	app.get("/main", isLoggedIn, function(req, res) {
		projects.findOne({_id: req.param("project_id")}, function (err, project) {
			if(err || project.users.indexOf(req.user._id) == -1)
			{
				res.render("project.ejs", {
					user : req.user,
					conf : conf,
					apps : settings.apps,
					assigned_token : generate_token(tokens, req.user._id)
				});
			}
			else
			{
				res.render("main.ejs", {
					user : req.user,
					project : project,
					apps : settings.apps,
					conf : conf,
					assigned_token : generate_token(tokens, req.user._id)
				});
			}
		});
	});

	//logout
	app.get("/logout", function(req, res) {
		remove_token(tokens, req.user._id);
		req.logout();
		res.redirect("/");
	});
};

//check login for routing
function isLoggedIn(req, res, next) {
	if (req.isAuthenticated())
		return next();
	res.redirect("/");
}
