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

function terminal_client()
{
	//defining fields
	var self = this;

	this.open = function(secret, security, image, proj_name, shared_proj_id)
	{
		var app_window = new terminal_window(secret, security, image, proj_name, shared_proj_id, function () {
			app_window = null;
		});
  };
}

function terminal_window(secret, security, image, proj_name, shared_proj_id, on_close)
{
	var self = this;
  this.proj_name = proj_name;
  this.shared_proj_id = shared_proj_id;
	this.source_file = "";
	this.parent_close = on_close;
  this.edit_string = "";
  this.edit_flag = 0;
  this.file_string = "";
  this.no_write_flag = 0;
  this.grab_file_path_flag = 0;
  this.grab_file_path = "";
  this.return_data_counter = 0;
  this.current_file_path = "";
  this.uname_bkp = "";
  this.pwd_bkp = "";
  this.alt_clone_name = false;
  this.alt_newname_clone = false;
  this.type_of_term = "";

	this.socket = io.connect(":" + PORTS.terminal + "/terminal", {"force new connection": true, query: $.param({token: TOKEN})});


	//creating html canvas
	this.app_div = document.createElement("div");
	this.app_div.className = "liveos_terminal";

	this.socket.on("connect", function () {

		if(secret == "docker" && security == "private" && image == "arch"){ //private arch docker
      self.socket.emit("registering_private_arch_docker_terminal", {project_id: PROJECT_ID, full_name: USER_NAME, user_id: USER_ID});
      self.type_of_term = "private";
      self.shared_private_div.innerHTML = "Private Clone";
      self.check_box_pubpriv_label.innerHTML = "Use stored pub/priv key";
      self.check_box_token_label.innerHTML = "Use stored GIT token";

    }else if(secret == "docker" && security == "shared" && image == "arch"){ //shared arch docker
      self.socket.emit("registering_shared_arch_docker_terminal", {project_id: PROJECT_ID, full_name: USER_NAME, user_id: USER_ID, proj_name_to_connect: self.proj_name, shared_proj_id: self.shared_proj_id});
      self.type_of_term = "shared";
      self.shared_private_div.innerHTML = "Shared Clone";
      self.check_box_pubpriv_label.innerHTML = "Use SHARED pub/priv key";
      self.check_box_token_label.innerHTML = "Use SHARED GIT token";

    }else if(secret == "docker" && security == "private" && image == "ubuntu"){ //private ubuntu docker
      self.socket.emit("registering_ubuntu_docker_terminal", {project_id: PROJECT_ID, full_name: USER_NAME, user_id: USER_ID});
      self.type_of_term = "private";

    } else if(secret == "docker" && security == "shared" && image == "ubuntu"){ //private ubuntu docker
      self.socket.emit("registering_shared_ubuntu_docker_terminal", {project_id: PROJECT_ID});
      self.type_of_term = "shared";
    } else if (secret == "nondocker"){
      self.socket.emit("registering_nondocker_terminal", {project_id: PROJECT_ID, user: USER_ID, signature: SIGNATURE});
    }
  });


	this.term = new Terminal({
    cols: 104,
  	rows: 24,
    useStyle: true,
    screenKeys: true,
    cursorBlink: true
 	});
        
  this.term.on("data", function(data) {
    //console.log(data+ "\n");
    /*
    if(data.indexOf("e") !== -1 || data.indexOf("d") !== -1 || data.indexOf("i") !== -1 || data.indexOf("t") !== -1){
      self.edit_string += data;
      //console.log(self.edit_string);
      if(data.indexOf("t") !== -1){
        if(self.edit_string == "edit"){
          self.edit_flag = 1;
        }
      }
    }else{
      self.edit_string = "";
    }

    if (self.edit_flag == 1){
      if (data.indexOf("\n") !== -1 || data.indexOf("\r") !== -1){ //we have hit enter, ready to open file specified
        
        self.socket.emit("data", "\003");//clear out the cmd line ("^C" wont show, see server), and grab the current path from the returned text from the TTY
        //self.socket.emit("data", "\003");
        self.grab_file_path_flag = 1;
        var pwd_package = "pwd";
        self.socket.emit("data", pwd_package); //send request for pwd cmd

        //once grab file path flag is set, incoming data function (which uses grab_file_path_flag) handles calling the ec.openfile. I have to do it this way for timing of the returned CMD prompt current working directory
        
      }else{ // we have seen edit, but not yet seen enter, capture the filename
        if(data == "\003"){
          self.edit_flag = 0;
          return;
        }else{
          self.file_string += data;
          //console.log("file: " + self.file_string);
        }
      }
    }

    if(self.no_write_flag == 0){*/
      self.socket.emit("data", data);
    /*}else if(self.no_write_flag == 1){
      self.no_write_flag = 0;
    }*/

  });

  this.term.on("title", function(title) {
    document.title = title;
  });

  this.term.open(self.app_div);

  //this.term.resize(100, 30);

  /*self.socket.on("listen_for_pwd_response", function(data) {
    self.grab_file_path_flag = 1;
    self.current_file_path = data;
  });*/

  self.socket.on("kill_window", function(){
    wm.curr_active_window.close();
    self.term.destroy();
    self.parent_close();
    //self.socket.emit("disconnect");
    
  });


  self.socket.on("data", function(data) { //getting fresh data from server
    

    if(self.grab_file_path_flag == 1){ //this is only set once I have typed "edit" and hit enter
      //console.log("THIS IS DATA, should be pwd result: "+ data);
      if(self.return_data_counter == 1){
        self.current_file_path = data.split("\r");
        if(self.current_file_path[0] === ""){
          //self.current_file_path[1] = self.current_file_path[1].substring(0, self.current_file_path.indexOf("\n") - 1);
          console.log("Case0: " + self.current_file_path[1]);
          self.open_me(self.current_file_path[1]); //we dont want to use the 0th spot in the array, it was filled with emptiness!!
        } else {
          console.log("Case1: " + self.current_file_path[0]);
          self.open_me(self.current_file_path[0]);
        }
        self.grab_file_path_flag = 0;
      }

      if((data.indexOf("pwd\r") !== -1 || data.indexOf("wd\r") !== -1 || data.indexOf("d\r") !== -1) && data.indexOf("/") !== -1){
        data = data.split("\r");
        //data[1] = data[1].substring(0, data[1].indexOf("\r"));
        console.log("Case2: " + data[1]);
        self.open_me(data[1]);
        self.grab_file_path_flag = 0;
      } else if(data.indexOf("pwd") !== -1 || data.indexOf("p\rwd") !== -1 || data.indexOf("pw\rd") !== -1){
        
        self.return_data_counter = 1;
        
      }

    }else{
      try{
      //console.log("STDOUT: " +data);
        self.term.write(data);
      } catch (err){
        console.log(err);
      }
    }
  
  });

  self.socket.on("user_token_not_found", function() {
    alertify.error("You must store a GIT token before trying to use it.");

  });

  self.socket.on("user_pubpriv_not_found", function() {
    alertify.error("You must store a GIT public/private pair before trying to use it.");

  });

  self.socket.on("begin_cloning_repo", function(obj) {
    alertify.log("Cloning repo: \n" + obj.url_resp);
  });

  self.socket.on("begin_cloning_repo_new_name", function(obj) {
    alertify.log("Cloning repo: \n" + obj.orig_url + "\n to new name: " + obj.url_resp);
  });

  self.socket.on("finish_cloning_repo", function(obj) {
    alertify.success("Repo cloned to /home/user/private/" + obj.url_resp + " with new branch name: " + obj.branch_specifier);
  });

  self.socket.on("prev_git_clone_exists", function(obj){
    if(obj.exists == 1){
      self.alt_clone_name = true;
      self.duplicate_repo.open();
      //self.url_label.appendChild(self.new_name_label);
      //self.url_label.appendChild(self.loginForm_new_name);
      
    } else if(obj.exists === 0){
      if(self.alt_clone_name === true){
        self.alt_clone_name = false;
        self.duplicate_repo.close();
        //self.loginForm.removeChild(self.new_name_label);
        //self.loginForm.removeChild(self.loginForm_new_name);
      }
    }
  });

  self.socket.on("prev_newname_clone_exists", function(obj){
    if(obj.exists == 1){
      self.alt_newname_clone = true;
      
      
    } else if(obj.exists === 0){
      if(self.alt_newname_clone === true){
        self.alt_newname_clone = false;

      }
    }
  });

  self.socket.on("err_cloning_git_repo_none", function(obj) {
    alertify.error("Error cloning repository.\n" + obj._error);
  });

  self.socket.on("err_cloning_git_repo_token", function(obj) {
    alertify.error("Error cloning repository with GIT token.\n" + obj._error);
  });

  self.socket.on("err_cloning_git_repo_pass", function(obj) {
    alertify.error("Error cloning repository with username and password.\n" + obj._error);
  });

  self.socket.on("err_cloning_git_repo_pubpriv", function(obj) {
    alertify.error("Error cloning repository with private key.\n" + obj._error);
  });

  self.socket.on("git_token_nonexistent", function(){
    alertify.error("GIT token not stored. Please store a token first.");
    self.check_box_div_token.checked = false;

  });

  self.socket.on("git_shared_token_nonexistent", function(){
    alertify.error("No SHARED token is stored, and you do not have a personal token stored. Please store a token first.");
    self.check_box_div_token.checked = false;

  });

  self.socket.on("git_pubpriv_nonexistent", function(){
    alertify.error("Public and/or private key not stored. Please store them first.");
    self.check_box_div_pubpriv.checked = false;

  });

  self.socket.on("git_shared_pubpriv_nonexistent", function(){
    alertify.error("No SHARED pub/priv pair stored, and you do not have a pub/priv pair stored. Please store them first.");
    self.check_box_div_pubpriv.checked = false;

  });
  

  self.socket.on("local_docker_file_edit_request", function(obj){
    alertify.confirm("You requested to edit a file local to your private terminal Docker.Copy \"" + obj.filename + "\" to your workspace and edit?", function (e) {
      if (e) {
          self.socket.emit("docker_local_edit_okay");
      } else {
          self.socket.emit("docker_local_edit_nokay");
      }
    });
  });



  self.socket.on("git_checkout_error", function(obj){
    alertify.error("Git checkout error: " + obj._error);
    
  });

  self.socket.on("git_branch_delete_error", function(obj){
    alertify.error("Git branch delete error: " + obj._error);
    
  });

  self.socket.on("git_branch_error", function(obj){
    alertify.error("Git branch error: " + obj._error);
    
  });
  
  self.socket.on("git_checkout_master_error", function(obj){
    alertify.error("Please do not checkout the master branch, it will make me sad (and cause synchronization errors).");
    
  });
  
  self.socket.on("git_rebase_nospec_error", function(obj){
    alertify.error("Please specify a branch to rebase.");
    
  });
  
  self.socket.on("git_rebase_@u_error", function(obj){
    alertify.error("Git rebase @{u} error: " + obj._error);
    
  });
  
  self.socket.on("git_rebase_branch_error", function(obj){
    alertify.error("Git rebase branch error: " + obj._error);
    
  });

  self.socket.on("git_rebase_@u_suc", function(obj){
    alertify.error("Git rebase @{u}: " + obj._stdout);
    
  });

  self.socket.on("nonexistent_authentication_file", function(){
    alertify.error("Git authentication file not found. Is this a Git directory?");
    
  });

  self.socket.on("syncing_git_repo_pubpriv_success", function(){
    alertify.success("Git repo successfully sync\"d");
    
  });

  self.socket.on("err_syncing_git_repo_pubpriv", function(obj){
    alertify.error("Error syncing repo: " + obj._error);
    
  });

self.socket.on("begin_syncing_repo", function(){
    alertify.log("Begin syncing repo");
    
  });
  



  
  

  self.socket.on("open_url_codemirror_priv", function(obj){

    //TEST THIS WHEN OBJ WORKS
    var absolute_modified_path;
    if(obj.path_type == "repo"){
      absolute_modified_path = obj.main_path_dir + "/files/private/" + obj.user_id + "_private_files/" + obj.path;

      console.log("Priv repo-file docker opening this: " + absolute_modified_path);

      if(obj.line_num !== "(null)"){

        apps.editor.open_file(absolute_modified_path, obj.filenm, obj.line_num, true);

      } else {

        apps.editor.open_file(absolute_modified_path, obj.filenm, 0, true);
      }

    } else if (obj.path_type == "proj"){
      absolute_modified_path = PROJECT_ID + "/" + obj.path;

      console.log("Priv proj-file docker opening this: " + absolute_modified_path);

      if(obj.line_num !== "(null)"){

        apps.editor.open_file(absolute_modified_path, obj.filenm, obj.line_num);
        
      } else {

        apps.editor.open_file(absolute_modified_path, obj.filenm, 0);
      }

    } else if (obj.path_type == "/"){
      //console.log("what is this nonsense");
      //alertify.error("Local Docker file " + obj.filenm + " cannot be opened for collaborative editing.")
    }


  });

  self.socket.on("open_url_codemirror_shared", function(obj){
    //something is awry in here with the shared local docker file path, it is not opening properly
    var absolute_modified_path = obj.shared_proj_id + "/" + obj.path; //passing the path that the terminal binary returned as the project, NOT using the project the user is logged in to.

    console.log("Shared docker opening this: " + absolute_modified_path);

    if(obj.line_num !== "(null)") {

      apps.editor.open_file(absolute_modified_path, obj.filenm, obj.line_num);
      
    } else {

      apps.editor.open_file(absolute_modified_path, obj.filenm, 0);

    }

  });

  self.socket.on("open_url_codemirror_nondocker", function(obj){

    console.log("Admin/nondocker opening this: " + obj.path);

    apps.editor.open_file(obj.path, obj.filenm, 0, true);

  });

  
  

  self.socket.on("disconnect", function() {
    self.term.destroy();

  });


  this.open_me = function (data, file_name) {
     //console.log(self.return_data_counter);
    

    self.grab_file_path_flag = 0;
    self.return_data_counter = 0;
    
    self.grab_file_path = data; //captures the third printed line (0,1,2) from doing a "^C" in the terminal. This might change on different OSs
    
    self.grab_file_path = self.grab_file_path.slice(self.grab_file_path.indexOf("/live/ide") + 9); //get the path relative to /files/ --- we dont want CM to open files outside of /live/ide

    self.file_string = self.file_string.split(" "); //self.file_string[0] is garbage (" t"), [1] is the filename, [2] is the line number

    var file_id = self.grab_file_path + "/" + self.file_string[1]; //code mirror doesnt understand absolute paths??

    file_id = file_id.replace("\n", "");
    file_id = file_id.replace("\r", "");
    self.file_string[1] = self.file_string[1].replace("\n", "");
    self.file_string[1] = self.file_string[1].replace("\r", "");
    var line_number;
    if(self.file_string.length == 2){
      line_number = 0;
    }else if(self.file_string.length == 3){
      line_number = self.file_string[2];
    }

    console.log("OPENING: " + file_id + " at line: " + line_number + "!!"); //use this for debug file opening problems
    var file_id_holder = file_id;
    var line_number_holder = line_number;
    var file_string_holder = self.file_string[1];


    apps.editor.open_file(file_id_holder, file_string_holder, line_number_holder, true);

    //self.socket.emit("data", "\r");

    //console.log("2OPENING: " + file_id + " at line: " + line_number + "!!!!!... ya but: " + self.file_string[1]); //use this for debug file opening problems
    

    self.edit_flag = 0;
    self.edit_string = "";
    self.file_string = "";
    self.no_write_flag = 1;
    self.grab_file_path = "";

    try{
      self.term.write(data);
    } catch(err) {
      console.log(err);
    }
  
    //self.term.write(data);

  };


  this.branch_repo_request = function () {
    self.branch_drop.open();

    setTimeout(function(){


      var check_string = self.loginForm_url.value;
      self.socket.emit("git_quick_url_check", {string_value: check_string, proj_id: PROJECT_ID, user_id: USER_ID});
    }, 500);
  };


  this.on_resize = function () {
    var a = $(self.app_div).width();
    var b = $(self.app_div).height();
    var new_col_num = Math.floor(a/7); //7 pixels to the width of one terminal char
    var new_row_num = Math.floor(b/10.5); //11 pixels to the height of one terminal char

    self.term.resize(new_col_num, new_row_num); //call resize function
    self.socket.emit("resizing", {new_col_num: new_col_num, new_row_num: new_row_num}); //emit to server so that buffer can be changed
    self.branch_drop.position();

  };

	this.on_close = function () {
    
    self.socket.emit("attempt_to_kill_term");
    //console.log("attempt to kill");

	};

	this.html_escape = function (str) {
  	return String(str)
    	.replace(/&/g, "&amp;")
    	.replace(/"/g, "&quot;")
    	.replace(/"/g, "&#39;")
    	.replace(/</g, "&lt;")
    	.replace(/>/g, "&gt;");
	};

	this.app_window = wm.openElement(self.app_div, 735, 465, "random", "random", {"title" : "Terminal"}, {}, self.on_close); //715, 465 for chromium 715, 485 FF
	this.menu_items = {};
	this.menu_items.branch = this.app_window.add_menu_item("Clone GIT Repo", "", "title", this.app_window.menu, self.branch_repo_request);
	this.app_window.activate_menu();
  this.app_window.container.addEventListener("on_resize", self.on_resize);
  this.app_window.setDF(self.app_div);


  this.loginForm = document.createElement("div"); //main form element
  this.loginForm.id = "login_form_git";
  this.loginForm.className = "login_form_git_window";

  this.loginForm_uname = document.createElement("input"); //input fields
  this.loginForm_uname.id = "uname_input";
  this.loginForm_uname.className = "git_input_style livos_textbox";
  
  this.loginForm_pwd = document.createElement("input"); //input fields
  this.loginForm_pwd.id = "pwd_input";
  this.loginForm_pwd.className = "git_input_style livos_textbox";
  this.loginForm_pwd.setAttribute("type", "password");

  this.loginForm_url = document.createElement("input"); //input fields
  this.loginForm_url.id = "url_input";
  this.loginForm_url.className = "git_input_style livos_textbox";

  this.loginForm_new_name = document.createElement("input"); //input fields
  this.loginForm_new_name.id = "repo_new_name";
  this.loginForm_new_name.className = "git_input_style livos_textbox";

  this.loginForm_new_name_div = document.createElement("div"); //for the drop
  //this.loginForm_new_branch_div = document.createElement("div"); //for the drop
  //this.loginForm_new_branch_div.innerHTML = "When you clone a repo in the live environment, it is required to begin work in a new branch of that repo so as to minimize disruptions to the master.";

  this.loginForm_branch_name = document.createElement("input"); //input fields
  this.loginForm_branch_name.id = "repo_branch_name";
  this.loginForm_branch_name.className = "git_input_style livos_textbox";


  this.uname_label = document.createElement("Label"); //label field
  this.uname_label.setAttribute("for", "uname_input");
  this.uname_label.innerHTML = "Username";

  this.pwd_label = document.createElement("Label"); //label field
  this.pwd_label.setAttribute("for", "pwd_input");
  this.pwd_label.innerHTML = "Password";

  this.url_label = document.createElement("Label"); //label field
  this.url_label.setAttribute("for", "url_input");
  this.url_label.innerHTML = "URL";
  this.url_label.innerHTML += "<font color=red><i> *</i></font>";

  this.new_name_label = document.createElement("Label"); //label field
  this.new_name_label.setAttribute("for", "repo_new_name");
  //this.new_name_label.className = "new_repo_name_label";
  this.new_name_label.innerHTML = "Alternate Clone Name";
  this.new_name_label.innerHTML += "<font color=red><i> *</i></font>";

  this.corner_drop_div = document.createElement("div"); //div to attach the drop to
  this.corner_drop_div.className = "corner_drop_div";
  this.app_div.appendChild(this.corner_drop_div);

  this.or_div = document.createElement("div"); //or_message div
  this.or_div.className = "or_div";
  this.or_div.innerHTML = "-- or --";

  this.or_div2 = document.createElement("div"); //or_message div
  this.or_div2.className = "or_div2";
  this.or_div2.innerHTML = "-- or --";

  this.loginForm_branch_name_label = document.createElement("Label"); //label field
  this.loginForm_branch_name_label.setAttribute("for", "repo_branch_name");
  this.loginForm_branch_name_label.innerHTML = "Branch name";
  this.loginForm_branch_name_label.innerHTML += "<font color=red><i> *</i></font>";

  this.check_box_div_token = document.createElement("input"); //checkbox div
  this.check_box_div_token.id = "check_box_token";
  this.check_box_div_token.setAttribute("type", "checkbox");
  this.check_box_div_token.className = "check_box_div";

  this.check_box_token_label = document.createElement("label"); //checkbox label
  this.check_box_token_label.className = "check_box_label";
  //this.check_box_token_label.setAttribute("for", "check_box_token");
  this.check_box_token_label.innerHTML = "";


  this.check_box_div_pubpriv = document.createElement("input"); //checkbox div
  this.check_box_div_pubpriv.id = "check_box_pubpriv";
  this.check_box_div_pubpriv.setAttribute("type", "checkbox");
  this.check_box_div_pubpriv.className = "check_box_div";

  this.check_box_pubpriv_label = document.createElement("label"); //checkbox label
  this.check_box_pubpriv_label.className = "check_box_label";
  //this.check_box_pubpriv_label.setAttribute("for", "check_box_pubpriv");
  this.check_box_pubpriv_label.innerHTML = ""; //this is initialized by the menu click events
  

  this.new_token_help = document.createElement("div"); //help text div
  //this.new_token_help.setAttribute("for", "check_box");
  this.new_token_help.className = "new_token_text";
  this.new_token_help.innerHTML = "(New tokens can be added through the settings app)";

  this.okay_button = document.createElement("div"); //button
  this.okay_button.className = "okay_button_input";
  this.okay_button_icon = document.createElement("img");
  this.okay_button_icon.src = "img/done30.png";
  this.okay_button.appendChild(this.okay_button_icon);
  
  this.okay_button.onclick = function() { //Main events that happen to clone repo

    if((self.loginForm_url.value === "") || (self.loginForm_branch_name.value === "")){
      alertify.error("Enter a URL and new branch name to clone");
      return;
    }else if (self.alt_clone_name === true && self.loginForm_new_name.value === ""){
      alertify.error("Clone name already exists, please enter an alternate name for your duplicate clone.");
      return;

    }else if((self.loginForm_uname.value !== "" && self.loginForm_pwd.value === "") || (self.loginForm_uname.value === "" && self.loginForm_pwd.value !== "")){
      alertify.error("Enter a Username and Password");
      return;
    } else if (self.alt_newname_clone === true){
      alertify.error("The alternate name provided already exists, please choose another.");
      return;
    }

    //console.log(self.check_box_div.checked);
    //check if box checked, send msg, if not checked, send pwd and uname fields
    var new_requested_name, url_to_open, new_branch_name;
    if(self.check_box_div_token.checked){ //-------------------------------Using tokens
      
      if(self.duplicate_repo.isOpened()) self.duplicate_repo.close(); //close alt name text box
      if(self.alt_clone_name === true){
        new_requested_name = self.loginForm_new_name.value;
      } else {
        new_requested_name = "";
      }

      url_to_open = self.loginForm_url.value;
      new_branch_name = self.loginForm_branch_name.value;

      //self.proj_name
      //self.type_of_term

      self.socket.emit("clone_git_repo_token", {proj_name: self.proj_name, type_of_term: self.type_of_term, user_id: USER_ID, proj_id: PROJECT_ID, url: url_to_open, new_name: new_requested_name, new_branch_name: new_branch_name});

      console.log("clone using token");

      self.branch_drop.close(); 
      self.loginForm_url.value = ""; //reset field
      self.loginForm_branch_name.value = "";
      self.check_box_div_token.checked = false;
      self.loginForm_new_name.value = "";


    } else if (self.check_box_div_pubpriv.checked){ //-------------------------------Using pub priv pair

      if(self.duplicate_repo.isOpened()) self.duplicate_repo.close();

      if(self.alt_clone_name === true){
        new_requested_name = self.loginForm_new_name.value;
      } else {
        new_requested_name = "";
      }

      url_to_open = self.loginForm_url.value;
      new_branch_name = self.loginForm_branch_name.value;

      self.socket.emit("clone_git_repo_pubpriv", {proj_name: self.proj_name, type_of_term: self.type_of_term, user_id: USER_ID, proj_id: PROJECT_ID, url: url_to_open, new_name: new_requested_name, new_branch_name: new_branch_name});

      console.log("clone using pubpriv");

      self.branch_drop.close();
      self.loginForm_url.value = ""; //reset field
      self.loginForm_branch_name.value = "";
      self.check_box_div_pubpriv.checked = false;
      self.loginForm_new_name.value = "";


    } else if (self.loginForm_uname.value !== "" && self.loginForm_pwd.value !== ""){ //-------------------------------Using username pass

      if(self.duplicate_repo.isOpened()) self.duplicate_repo.close();

      if(self.alt_clone_name === true){
        new_requested_name = self.loginForm_new_name.value;
      } else {
        new_requested_name = "";
      }


      var git_username = self.loginForm_uname.value;
      var git_pass = self.loginForm_pwd.value;
      url_to_open = self.loginForm_url.value;
      new_branch_name = self.loginForm_branch_name.value;

      self.socket.emit("clone_git_repo_pass", {proj_name: self.proj_name, type_of_term: self.type_of_term, username: git_username, password: git_pass, url: url_to_open, user_id: USER_ID, proj_id: PROJECT_ID, new_name: new_requested_name, new_branch_name: new_branch_name});

      console.log("clone using uname/pass");

      self.branch_drop.close();
      self.loginForm_url.value = ""; //reset field
      self.loginForm_branch_name.value = "";
      self.loginForm_uname.value = "";
      self.loginForm_pwd.value = "";
      self.loginForm_new_name.value = "";

    } else { //-------------------------------Using no auth

      if(self.duplicate_repo.isOpened()) self.duplicate_repo.close();

      if(self.alt_clone_name === true){
        new_requested_name = self.loginForm_new_name.value;
      } else {
        new_requested_name = "";
      }

      url_to_open = self.loginForm_url.value;
      new_branch_name = self.loginForm_branch_name.value;

      self.socket.emit("clone_git_repo_noauth", {proj_name: self.proj_name, type_of_term: self.type_of_term, url: url_to_open, user_id: USER_ID, proj_id: PROJECT_ID, new_name: new_requested_name, new_branch_name: new_branch_name});

      console.log("clone with no auth");

      self.branch_drop.close();
      self.loginForm_url.value = ""; //reset field
      self.loginForm_branch_name.value = "";
      self.loginForm_new_name.value = "";
    }

  };

  this.close_button = document.createElement("div"); //button
  this.close_button.className = "close_button_input";
  this.close_button_icon = document.createElement("img");
  this.close_button_icon.src = "img/clear30.png";
  this.close_button.appendChild(this.close_button_icon);

  this.close_button.onclick = function() {  //Main event to close dialog box

    if(self.branch_drop.isOpened()) self.branch_drop.close();
    if(self.duplicate_repo.isOpened()) self.duplicate_repo.close();
  
  };  

  this.check_box_div_token.onchange = function() { //Disable text fields if using GIT token
    
    var check_string = self.loginForm_url.value; //do some checks for the URL field
    self.socket.emit("git_quick_url_check", {string_value: check_string, proj_id: PROJECT_ID, user_id: USER_ID, type_of_term: self.type_of_term});


    self.socket.emit("git_token_check", {user_id: USER_ID, type_of_term: self.type_of_term, shared_proj_id: self.shared_proj_id}); //check if there even is a token stored

    if(self.check_box_div_token.checked){
      self.loginForm_uname.disabled = true;
      self.loginForm_pwd.disabled = true; 
      self.uname_bkp = self.loginForm_uname.value;
      self.pwd_bkp = self.loginForm_pwd.value;

      self.check_box_div_pubpriv.checked = false;

      self.loginForm_uname.value = "";
      self.loginForm_pwd.value = "";

    }else{
      self.loginForm_uname.disabled = false;
      self.loginForm_pwd.disabled = false;
      self.loginForm_uname.value = self.uname_bkp;
      self.loginForm_pwd.value = self.pwd_bkp;
    }
  
  }; 

  this.check_box_div_pubpriv.onchange = function() { //Disable text fields if using GIT token

    var check_string = self.loginForm_url.value; //do some checks for URL name already being taken
    self.socket.emit("git_quick_url_check", {string_value: check_string, proj_id: PROJECT_ID, user_id: USER_ID, type_of_term: self.type_of_term});


    self.socket.emit("git_pubpriv_check", {user_id: USER_ID, type_of_term: self.type_of_term, shared_proj_id: self.shared_proj_id}); //check if the keys already exist in DB

    if(self.check_box_div_pubpriv.checked){
      self.loginForm_uname.disabled = true;
      self.loginForm_pwd.disabled = true; 
      self.uname_bkp = self.loginForm_uname.value;
      self.pwd_bkp = self.loginForm_pwd.value;

      self.check_box_div_token.checked = false;

      self.loginForm_uname.value = "";
      self.loginForm_pwd.value = "";

    }else{
      self.loginForm_uname.disabled = false;
      self.loginForm_pwd.disabled = false;
      self.loginForm_uname.value = self.uname_bkp;
      self.loginForm_pwd.value = self.pwd_bkp;
    }
  
  }; 

  this.loginForm_url.onkeydown = function () { //to check the URL the user is trying to clone
    setTimeout(function(){


      var check_string = self.loginForm_url.value;
      self.socket.emit("git_quick_url_check", {string_value: check_string, proj_id: PROJECT_ID, user_id: USER_ID, type_of_term: self.type_of_term});
    }, 1);

  };  

  this.loginForm_url.onpaste = function () { //to check the URL the user is trying to clone, if they copy-paste it into the field
    setTimeout(function(){ 
      var check_string = self.loginForm_url.value;
      self.socket.emit("git_quick_url_check", {string_value: check_string, proj_id: PROJECT_ID, user_id: USER_ID, type_of_term: self.type_of_term});

    }, 10);
  };

  this.loginForm_new_name.onkeydown = function () { //to check the new name give to make sure it is indeed NEW and different from the other dir names
    setTimeout(function(){

      var check_string = self.loginForm_new_name.value;
      self.socket.emit("git_quick_newname_check", {string_value: check_string, proj_id: PROJECT_ID, type_of_term: self.type_of_term});
    }, 1);

  };

  //window.onbeforeunload = function(e) {
  //  self.socket.emit("terminal_browser_refresh");
  //};

  //this.or_div2 = this.or_div.cloneNode(true);
  //this.new_token_help2 = this.new_token_help.cloneNode(true);


  //divs to append once we know what kind of terminal was opened

  this.shared_private_div = document.createElement("div"); //or_message div
  this.shared_private_div.className = "clone_type_div";
  this.shared_private_div.innerHTML = "";
  
  this.loginForm.appendChild(this.shared_private_div);

  this.loginForm.appendChild(this.uname_label);
  this.loginForm.appendChild(this.loginForm_uname);


  this.loginForm.appendChild(this.pwd_label);
  this.loginForm.appendChild(this.loginForm_pwd);

  this.loginForm.appendChild(this.or_div);
  this.loginForm.appendChild(this.check_box_div_token);
  this.loginForm.appendChild(this.check_box_token_label);
  //this.loginForm.appendChild(this.new_token_help);

  this.loginForm.appendChild(this.or_div2);
  this.loginForm.appendChild(this.check_box_div_pubpriv);
  this.loginForm.appendChild(this.check_box_pubpriv_label);
  this.loginForm.appendChild(this.new_token_help);

  this.loginForm.appendChild(this.url_label);
  this.loginForm.appendChild(this.loginForm_url);

  this.loginForm.appendChild(this.loginForm_branch_name_label);
  this.loginForm.appendChild(this.loginForm_branch_name);

  
  this.loginForm.appendChild(this.close_button);
  this.loginForm.appendChild(this.okay_button);

  this.place_holder_div = document.createElement("div");
  this.place_holder_div.className = "git_place_holder_div";
  this.loginForm.appendChild(this.place_holder_div);

  this.loginForm_new_name_div.appendChild(this.new_name_label);
  this.loginForm_new_name_div.appendChild(this.loginForm_new_name);
  
  
  this.branch_drop = new Drop({
    target: self.corner_drop_div,//menu,
    content: self.loginForm,
    position: "right top",
    openOn: null,
    classes: "drop-theme-arrows-bounce-dark",
    constrainToWindow: true,
    constrainToScrollParent: false
  });

  this.duplicate_repo = new Drop({
    target: self.loginForm_url,//menu,
    content: self.loginForm_new_name_div,
    position: "right top",
    openOn: null,
    classes: "drop-theme-arrows-bounce-dark",
    constrainToWindow: true,
    constrainToScrollParent: false
  });

  this.branch_repo = new Drop({
    target: self.loginForm_branch_name_label,//menu,
    content: "When you clone a repo in the live environment, it is required to begin work in a new branch of that repo so as to minimize disruptions to the master.",
    position: "right top",
    openOn: "hover",
    classes: "drop-theme-arrows-bounce-dark new_branch_div_drop",
    constrainToWindow: true,
    constrainToScrollParent: false
  });

  $("document").click(function () {
    //console.log("whoops");
    self.app_div.removeChild(self.corner_drop_div);
    if(self.branch_drop.isOpened())
      self.branch_drop.close();
  });
 
}
