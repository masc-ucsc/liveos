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

function settings_client () {
	//defining fields
	var self = this;
	this.app_open = false;
	this.doms = {};
	this.settings = {};
	this.happ_div = null;
	this.socket = io.connect(":" + PORTS.main + "/settings", {"force new connection": true, query: $.param({token: TOKEN})});

	//HTML Select Creator
	this.create_select = function (name, title, parent, hidden, options) {
		var container = name + "_container";
		var label = name + "_label";
		var select = name;
		self.doms[container] = document.createElement("div");
		if(hidden)
			self.doms[container].style.display = "none";
		self.doms[container].className = "settings_field_container";
		parent.appendChild(self.doms[container]);
		self.doms[label] = document.createElement("label");
		self.doms[label].innerHTML = title + ":";
		self.doms[label].className = "settings_field_label";
		self.doms[container].appendChild(self.doms[label]);
		self.doms[select] = document.createElement("select");
		self.doms[select].className = "settings_field livos_dropdown";
		for(var i = 0; i < options.length; i++) {
			var opt = document.createElement("option");
			opt.value = options[i].value;
			opt.innerHTML = options[i].title;
			self.doms[select].add(opt);
		}
		self.doms[select].onchange = function () {
			self.update_setting(name, $(self.doms[select]).val());
		};
		self.doms[container].appendChild(self.doms[select]);
	};

	//HTML Select Creator
	this.create_shortcut = function (name, obj, glob) {
		var container = name + "_container";
		var label = name + "_label";
		var text = name;
		self.doms[container] = document.createElement("div");
		self.doms[container].className = "settings_field_container";
		self.shortcuts_div.appendChild(self.doms[container]);
		self.doms[label] = document.createElement("label");
		self.doms[label].innerHTML = glob.title;
		self.doms[label].className = "settings_field_label";
		self.doms[container].appendChild(self.doms[label]);
		self.doms[text] = document.createElement("input");
		self.doms[text].type = text;
		self.doms[text].className = "settings_field livos_textbox";
		self.doms[text].value = obj;
		self.doms[text].onchange = function () {
			for(var key in all_settings.user_scuts) {
				if(key != name && all_settings.user_scuts[key] == this.value) {
					this.value = all_settings.user_scuts[name];
					alertify.error("Shortcut is already assigned");
					return;
				}
			}
			all_settings.user_scuts[name] = $(self.doms[text]).val();
			self.update_setting("user_scuts", all_settings.user_scuts);
		};
		self.doms[container].appendChild(self.doms[text]);
	};

	//Creating the app HTML
	this.app_div = document.createElement("div");
	this.app_div.setAttribute("class", "settings_container");
	this.tab_holder = new live_tab_holder();
	this.app_div.appendChild(this.tab_holder.container);
	this.reset_btn = new livos_button("Restore Defaults", this.app_div, "reset_button", function () {
		alertify.confirm("All settings will be restored to default values. Do you wish to continue?", function (e) {
		  if (e) {
		  	self.socket.emit("reset_settings", {user_id: USER_ID});
		  }
		});
	});

	//Editor Mode
	this.tab_holder.add_tab("general", "General");
	this.create_select("user_editor_mode", "Editor Mode", this.tab_holder.tabs.general, false, [{"value": "vim", "title": "VIM"}, {"value": "sublime", "title": "Sublime"}, {"value": "emacs", "title": "Emacs"}]);
	this.create_select("user_editor_theme", "Editor Theme", this.tab_holder.tabs.general, false, [
    {"value": "3024-day", "title": "3024 Day"},
    {"value": "3024-night", "title": "3024 Night"},
    {"value": "ambiance", "title": "Ambiance"},
    {"value": "base16-dark", "title": "Base16 Dark"},
    {"value": "base16-light", "title": "Base16 Light"},
    {"value": "blackboard", "title": "Blackboard"},
    {"value": "cobalt", "title": "Cobalt"},
    {"value": "colorforth", "title": "Color Forth"},
    {"value": "eclipse", "title": "Eclipse"},
    {"value": "elegant", "title": "Elegant"},
    {"value": "erlang-dark", "title": "Erlang Dark"},
    {"value": "lesser-dark", "title": "Lesser Dark"},
    {"value": "liveos-dark", "title": "LiveOS Dark"}, 
		{"value": "liveos-light", "title": "LiveOS Light"},
    {"value": "mbo", "title": "MBO"},
    {"value": "mdn-like", "title": "MDN Like"},
    {"value": "midnight", "title": "Midnight"},
    {"value": "monokai", "title": "Monokai"},
    {"value": "neat", "title": "Neat"},
    {"value": "neo", "title": "Neo"},
    {"value": "night", "title": "Night"},
    {"value": "paraiso-dark", "title": "Paraiso Dark"},
    {"value": "paraiso-light", "title": "Paraiso Light"},
    {"value": "pastel-on-dark", "title": "Pastel on Dark"},
    {"value": "default", "title": "Plain White"},
    {"value": "rubyblue", "title": "Ruby Blue"},
    {"value": "solarized dark", "title": "Solarized Dark"},
    {"value": "solarized light", "title": "Solarized Light"},
    {"value": "the-matrix", "title": "The Matrix"},
    {"value": "tomorrow-night-bright", "title": "Tomorrow Night Bright"},
    {"value": "tomorrow-night-eighties", "title": "Tomorrow Night Eighties"},
    {"value": "twilight", "title": "Twilight"},
    {"value": "vibrant-ink", "title": "Vibrant Link"},
    {"value": "xq-dark", "title": "XQ Dark"},
    {"value": "xq-light", "title": "XQ Light"},
    {"value": "zenburn", "title": "Zenburn"}
	]);

	this.tab_holder.add_tab("shortcuts", "Shortcuts");
	this.shortcuts_div = document.createElement("div");
	this.shortcuts_div.className = "settings_shortcuts_div";
	this.tab_holder.tabs.shortcuts.appendChild(this.shortcuts_div);
	this.desc = document.createElement("div");
	this.desc.className = "settings_desc";
	this.desc.innerHTML = "* You can enter meta mode by pressing left shift + space and exit it with the same combination or Esc";
	this.tab_holder.tabs.shortcuts.appendChild(this.desc);

	//Token/priv-public key input fields
	this.tab_holder.add_tab("git", "GIT");
	this.key_text_div = document.createElement("div"); //Token text label field
	this.key_text_div.className = "key_text_div";
	this.key_text_div.innerHTML = "GIT Repository Key / Token Input";
	this.tab_holder.tabs.git.appendChild(this.key_text_div);

	this.git_token_input = document.createElement("textarea"); // GIT token input field
	this.git_token_input.id = "git_token";
	this.git_token_input.className = "pubpriv_key_input livos_textarea_textbox";

	this.git_pub_input = document.createElement("textarea"); // GIT public input field
	this.git_pub_input.id = "git_pub";
	this.git_pub_input.className = "pubpriv_key_input livos_textarea_textbox";

	this.git_priv_input = document.createElement("textarea"); // GIT private input field
	this.git_priv_input.id = "git_priv";
	this.git_priv_input.className = "pubpriv_key_input livos_textarea_textbox";

	this.git_token_label = document.createElement("Label"); //Token label field
	this.git_token_label.className = "label_class";
	this.git_token_label.setAttribute("for", "git_token");
	this.git_token_label.innerHTML = "GIT Token:";

	this.git_pub_label = document.createElement("Label"); //git public key label field
	this.git_pub_label.className = "label_class";
	this.git_pub_label.setAttribute("for", "git_pub");
	this.git_pub_label.innerHTML = "GIT Public Key:";

	this.git_priv_label = document.createElement("Label"); //git private key label field
	this.git_priv_label.className = "label_class";
	this.git_priv_label.setAttribute("for", "git_priv");
	this.git_priv_label.innerHTML = "GIT Private Key:";



	this.token_btn = document.createElement("div"); //button to add git token
	this.token_btn.id = "token_button";
	this.token_btn.className = "add_key_button";
	this.token_btn_icon = document.createElement("img");
	this.token_btn_icon.src = "img/add.png";
	this.token_btn.appendChild(this.token_btn_icon);
	this.token_btn.onclick = function() { 
		//console.log(self.git_token_input.value.length);
		if(self.git_token_input.value === "" || self.git_token_input.value.length != 40){
			alertify.error("Please enter a GIT issued token");
		} else{
			var token = self.git_token_input.value;
			//console.log("sending token: " + self.git_token_input.value);
			self.socket.emit("log_new_git_token", {user_id: USER_ID, project_id: PROJECT_ID, token: token});
		}
	};

	//this.upload_token_btn_mask = document.createElement("INPUT"); //mask so that I can mimic the live style of buttons
	//this.upload_token_btn_mask.setAttribute("type", "button");
	//this.upload_token_btn_mask.className = "livos_button upload_token_button";
	//this.upload_token_btn_mask.innerHTML = "Upload file";

	this.upload_token_btn = document.createElement("INPUT"); //button to upload token file
	this.upload_token_btn.id = "upload_token_button";
	this.upload_token_btn.setAttribute("type", "file");
	this.upload_token_btn.className = "upload_token_button";
	//this.token_btn.className = "add_key_button";
	//this.token_btn_icon = document.createElement("img");
	//this.token_btn_icon.src = "img/add.png";
	//this.token_btn.appendChild(this.token_btn_icon);
	//this.upload_token_btn_mask.onclick = function() { 
		//console.log(self.git_token_input.value.length);
	//	self.upload_token_btn.click();
	//};

	this.upload_token_btn_label = document.createElement("Label"); //label for upload token button
	this.upload_token_btn_label.setAttribute("for", "upload_token_button");
	this.upload_token_btn_label.className = "label_class_upload";
	this.upload_token_btn_label.innerHTML = "Upload file or copy/paste contents into text fields below:";


	this.select_token_btn = document.createElement("SELECT"); //selector to choose type of file upload
	this.select_token_btn.id = "select_token_button";
	this.select_token_btn.className = "select_token_button";

	//--------------option 1-----------------//

	this.select_option_one = document.createElement("option"); //adding token option value
	this.select_option_one.setAttribute("value", "git_token");

	this.select_option_one_text = document.createTextNode("GIT OAuth Token"); //adding token menu text
	this.select_option_one.appendChild(this.select_option_one_text);

	//--------------option 2-----------------//

	this.select_option_two = document.createElement("option"); //adding token option value
	this.select_option_two.setAttribute("value", "git_pub");

	this.select_option_two_text = document.createTextNode("Public Key"); //adding token menu text
	this.select_option_two.appendChild(this.select_option_two_text);

	//--------------option 3-----------------//

	this.select_option_three = document.createElement("option"); //adding token option value
	this.select_option_three.setAttribute("value", "git_priv");

	this.select_option_three_text = document.createTextNode("Private Key"); //adding token menu text
	this.select_option_three.appendChild(this.select_option_three_text);



	this.select_token_btn.appendChild(this.select_option_one); //adding option one to selection list
	this.select_token_btn.appendChild(this.select_option_two); //adding option one to selection list
	this.select_token_btn.appendChild(this.select_option_three); //adding option one to selection list

	this.upload_token_btn_submit = document.createElement("div");
	//this.upload_token_btn_submit.setAttribute("type", "button");
	this.upload_token_btn_submit.id = "token_btn_submit";
	this.upload_token_btn_submit.className = "livos_button upload_token_button_submit";

	this.upload_token_btn_submit_label = document.createTextNode("upload");
	this.upload_token_btn_submit_label.className = "token_btn_submit_label";
  this.upload_token_btn_submit.appendChild(this.upload_token_btn_submit_label);

  this.upload_token_btn_submit.onclick = function() {

  	//open file, read contents, format properly and emit "log new pubpriv pair or log new git token based on selector"

  	var file = self.upload_token_btn.files[0];

  	if(file === undefined){
  		alertify.error("No file selected.");
  		return;
  	}

		var reader = new FileReader();

		reader.onload = function(e) {
			//fileDisplayArea.innerText = reader.result;
			var file_cont = reader.result;

			if(self.select_token_btn.value == "git_token"){
	  		var token = reader.result;
	  		token = token.replace(/(?:\r\n|\n|\r)/g, "");
	  		//self.git_token_input.innerText = token;
	  		self.socket.emit("log_new_git_token", {user_id: USER_ID, project_id: PROJECT_ID, token: token});

	  	} else if (self.select_token_btn.value == "git_pub"){
	  		var pub = reader.result;
	  		pub = pub.replace(/(?:\r\n|\n|\r)/g, "\n");
	  		//self.git_pub_input.innerText = pub;
	  		self.socket.emit("log_new_pub", {user_id: USER_ID, project_id: PROJECT_ID, pub: pub});
	  	
	  	} else if (self.select_token_btn.value == "git_priv"){
	  		var priv = reader.result;
	  		priv = priv.replace(/(?:\r\n|\n|\r)/g, "\n");
	  		//self.git_priv_input.innerText = priv;
	  		self.socket.emit("log_new_priv", {user_id: USER_ID, project_id: PROJECT_ID, priv: priv});
	  	}

		};

		reader.readAsText(file);	

  };


	this.pub_btn = document.createElement("div"); //button to add pub priv pair
	this.pub_btn.id = "pub_button";
	this.pub_btn.className = "add_pubkey_button";
	this.pub_btn_icon = document.createElement("img");
	this.pub_btn_icon.src = "img/add.png";
	this.pub_btn.appendChild(this.pub_btn_icon);
	this.pub_btn.onclick = function() { 

		if(self.git_pub_input.value === "" && self.git_priv_input.value === ""){
			alertify.error("Please enter a public/private key pair");
		} else if(self.git_pub_input.value !== "" && self.git_priv_input.value === ""){
			alertify.error("Don\"t forget your private key!");
		} else if (self.git_pub_input.value === "" && self.git_priv_input.value !== ""){
			alertify.error("Don\"t forget your public key!");
		}	else{
			var pub = self.git_pub_input.value;
			var priv = self.git_priv_input.value;

			pub = pub.replace(/(?:\r\n|\n|\r)/g, "\n");
			priv = priv.replace(/(?:\r\n|\n|\r)/g, "\n");
			//console.log("sending pub: " + self.git_pub_input.value + " \nAND PRIV: " + self.git_priv_input.value);
			self.socket.emit("log_new_pubpriv_pair", {user_id: USER_ID, project_id: PROJECT_ID, pub: pub, priv: priv});
		}

	};

	///////////////////

	this.erase_token_button = document.createElement("div"); //button to add pub priv pair
	this.erase_token_button.id = "erase_token_button";
	this.erase_token_button.className = "erase_pubkey_button";

	this.erase_token_icon = document.createElement("img");
	this.erase_token_icon.src = "img/delete30.png";
	this.erase_token_button.appendChild(this.erase_token_icon);

	this.erase_token_button.onclick = function() { 

		self.socket.emit("erase_user_token", {user_id: USER_ID, project_id: PROJECT_ID});
		alertify.success("Stored token has been erased.");

	};

	///////////////////

	this.erase_pubpriv_button = document.createElement("div"); //button to add pub priv pair
	this.erase_pubpriv_button.id = "erase_pubpriv_button";
	this.erase_pubpriv_button.className = "erase_pubkey_button";

	this.erase_pubpriv_icon = document.createElement("img");
	this.erase_pubpriv_icon.src = "img/delete30.png";
	this.erase_pubpriv_button.appendChild(this.erase_pubpriv_icon);

	this.erase_pubpriv_button.onclick = function() { 

		self.socket.emit("erase_user_pubpriv", {user_id: USER_ID, project_id: PROJECT_ID});
		alertify.success("Stored public/private key pair erased.");

	};

	///////////////////

	this.tab_holder.tabs.git.appendChild(this.upload_token_btn_label);
	//this.tab_holder.tabs.git.appendChild(this.upload_token_btn_mask);
  this.tab_holder.tabs.git.appendChild(this.upload_token_btn);
  this.tab_holder.tabs.git.appendChild(this.select_token_btn);
  this.tab_holder.tabs.git.appendChild(this.upload_token_btn_submit);
	
  this.tab_holder.tabs.git.appendChild(this.git_token_label); //Add divs to view
  this.tab_holder.tabs.git.appendChild(this.git_token_input);
  this.tab_holder.tabs.git.appendChild(this.token_btn);
  this.tab_holder.tabs.git.appendChild(this.erase_token_button);
  //append token clear button

  this.tab_holder.tabs.git.appendChild(this.git_pub_label);
  this.tab_holder.tabs.git.appendChild(this.git_pub_input);
  this.tab_holder.tabs.git.appendChild(this.pub_btn);
  this.tab_holder.tabs.git.appendChild(this.erase_pubpriv_button);
  //append pubpriv clear button


  this.tab_holder.tabs.git.appendChild(this.git_priv_label);
  this.tab_holder.tabs.git.appendChild(this.git_priv_input);

  

  this.socket.on("log_new_git_token_suceed", function(){
  	alertify.success("GIT token stored");
  	self.git_token_input.value = "";
  	self.upload_token_btn.value = "";
  	//console.log("User " + USER_ID + " stored a new GIT token");

  });

  this.socket.on("log_new_pubpriv_suceed", function(){
		alertify.success("Public/private key pair stored");
  	self.git_pub_input.value = "";
  	self.git_priv_input.value = "";
  	//console.log("User " + USER_ID + " stored a pub/priv key pair");
  });

  this.socket.on("log_new_pub_suceed", function(){
		alertify.success("Public key uploaded.");
  	self.upload_token_btn.value = "";
  	//console.log("User " + USER_ID + " stored a pub/priv key pair");
  });

  this.socket.on("log_new_priv_suceed", function(){
		alertify.success("Private key uploaded.");
  	self.upload_token_btn.value = "";
  	//console.log("User " + USER_ID + " stored a pub/priv key pair");
  });


	this.update_setting = function (name, value) {
		var t = name.indexOf("_");
		var type = name.substring(0, t);
		switch(type) {
			case "user": self.socket.emit("update_setting", {user_id: USER_ID, name: name, value: value});
			break;
			case "project": self.socket.emit("update_setting", {project_id: PROJECT_ID, name: name, value: value});
			break;
		}
	};

	this.get_settings = function () {
		self.socket.emit("get_settings", {project_id: PROJECT_ID, user_id: USER_ID});
	};

	this.socket.on("receive_settings", function (obj) {
		if(obj.project_id != PROJECT_ID && obj.user_id != USER_ID)
			return;
		Object.keys(obj.settings).forEach(function (key) {
			all_settings[key] = obj.settings[key];
			if(key == "user_scuts") {
				all_settings.global_shortcuts = obj.global_settings.shortcuts;
				self.shortcuts_div.innerHTML = "";
				for(var sn in all_settings.global_shortcuts) {
					self.create_shortcut(sn, all_settings.user_scuts[sn], all_settings.global_shortcuts[sn]);
				}
				update_shortcuts();
			} else {
				$(self.doms[key]).val(obj.settings[key]);
			}
		});
	});

	this.open = function (e, tab_name) {
		if(!self.app_open) {
			//Creating window manager and menu manager
			self.happ_div = document.createElement("div");
			self.happ_div.appendChild(self.app_div);
			self.app_window = wm.openElement(self.happ_div, 1000, 540, "random", "random", {"title" : "Settings"}, {}, self.on_close);
			self.app_window.activate_menu();
			self.app_open = true;

			if(tab_name) {
				self.tab_holder.activate(tab_name);
			}
		}
	};

	this.on_close = function () {
		self.happ_div.removeChild(self.app_div);
		self.app_open = false;
	};
}
