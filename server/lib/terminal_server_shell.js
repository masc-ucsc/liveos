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

module.exports = function (main_path, io, pty, ts, user, project, conf) {
  var self = this;
  this.ts = ts;
  this.pty = pty;
  this.main_path = main_path;
  process.title = "term.js";
  this.fs = require("fs");
  this.user = user;
  this.project = project;
  this.conf = conf;
  this.child_process = require("child_process");

  this.terminal_bin_path = main_path + "/misc/terminal_binary";
  this.transporter_server = require("./transporter/transporter_server.js");
  this.port = 8079;
  this.my_uid = process.getuid();
  this.open_terminals = [];
  this.open_terminal_counter = 0;
  this.private_terminal_dockers = [];

  var buffer = [];
  var shared_terminal_dockers = [];
  var ubuntu_dockers = [];
  var received_new_command = false;
  var rw_docker_status = false;
  var open_terminal_counter = 0;
  

  // ---------------------------------- TCP transporter connection ---------------------------------- // 

  //var hostname = this.child_process.execSync("hostname -f");

  // var echo_command = "echo $HOSTNAME > " + this.main_path + "/misc/terminal_binary/terminal_binary.conf";

  // self.ts.run(echo_command, "files/", function (stdout) {
  //   //var hostname = stdout.trim();

  //   console.log("Echo hostname to terminal_binary conf file");

  // }, function (err) {
  //   console.log("Could not get hostname\n");
  //   console.log(err);
  // });
  this.hostname = this.fs.readFileSync("/etc/hostname", "utf8");

  //get hostname here and write it to the terminal_binary.conf file

  self.transporter = new self.transporter_server(self.port, function (client) {
    //Daemon Registration
    client.on("_edit", function (obj) {
      var path_type = "";
      var modified_path = "";

      if(obj.term_type == "priv_docker"){

        if(obj.path.indexOf("repo_mnt") !== -1){ //because the paths within the docker link to different mount point based on whether it is a repo or a project file
          path_type = "repo"; //path should be constructed relative to the /repos folder in the files dir
        } else if (obj.path.indexOf("proj_mnt") !== -1){
          path_type = "proj"; //path should be constructed relative to the /<proj_id> folder in the files dir
        } else { //files only local to docker fall into this category. Since files are copied to project files to open, use the path_type of proj
          path_type = "proj"; //path should be constructed relative to the 
        }

        if(obj.path.indexOf("repo_mnt") !== -1){
          modified_path = obj.path.replace("/repo_mnt/", ""); //strip the docker relative paths before sending 
        } else if (obj.path.indexOf("proj_mnt") !== -1){
          modified_path = obj.path.replace("/proj_mnt/", "");
        } else { //files local to the dockers home dir fall here
          //use these two assignments if we need to send the complete hierarchy to the server files.
          //modified_path = obj.path.replace("/home/", "");
          //modified_path = modified_path.substring(modified_path.indexOf("/") + 1);
          //Use this to just send the individual file, no matter how deep it is in the local docker file hierarchy 
          modified_path = obj.file_passed;
        }

        //console.log("moddi: " + modified_path);
        var main_ide_path = self.main_path.substring(self.main_path.indexOf("/liveos") + 9);

        var holder_socket = self.open_terminals[obj.socket_env_var];

        //console.log(modified_path);
        //console.log(main_ide_path);
        holder_socket.emit("open_url_codemirror_priv", {path: modified_path, filenm: obj.file_passed, main_path_dir: main_ide_path, path_type: path_type, line_num: obj.line_num, user_id: obj.user_id});


      }else if (obj.term_type == "shared_docker"){ 

        if (obj.path.indexOf("proj_mnt") !== -1){
          path_type = "proj"; //path should be constructed relative to the /<proj_id> folder in the files dir
        } else { //files only local to docker fall into this category. Since files are copied to project files to open, use the path_type of proj
          path_type = "proj"; //path should be constructed relative to the 
        }


        if (obj.path.indexOf("proj_mnt") !== -1){ //we should only ever have a "proj_mnt" to open from...that or a local docker file
          modified_path = obj.path.replace("/proj_mnt/", "");
        } else { //files local to the dockers home dir fall here
          //use these two assignments if we need to send the complete hierarchy to the server files.
          //modified_path = obj.path.replace("/home/", "");
          //modified_path = modified_path.substring(modified_path.indexOf("/") + 1);
          //Use this to just send the individual file, no matter how deep it is in the local docker file hierarchy 
          modified_path = obj.file_passed;
        }

        var shared_docker_proj_id = obj.shared_proj_id;

        var main_ide_path = self.main_path.substring(self.main_path.indexOf("/liveos") + 9);

        var holder_socket = self.open_terminals[obj.socket_env_var];
        //need to fix the path here based on knowing the hard coded mounted path into the docker (the path the file is mounted to within the live)

        holder_socket.emit("open_url_codemirror_shared", {path: modified_path, filenm: obj.file_passed, main_path_dir: main_ide_path, path_type: path_type, line_num: obj.line_num, user_id: obj.user_id, shared_proj_id: shared_docker_proj_id});



      } else if (obj.term_type == "nondocker"){

        console.log(obj.path, obj.file_passed, obj.socket_env_var, obj.term_type);
        var modified_path = obj.path.substring(obj.path.indexOf("/liveos") + 9);

        var holder_socket = self.open_terminals[obj.socket_env_var];

        holder_socket.emit("open_url_codemirror_nondocker", {path: modified_path, filenm: obj.file_passed});
      }


    });

    client.on("_git", function (obj) {
      //console.log("git!!!!!");

      var parameters = obj.params.split(" ");

      //console.log("params[0]: " + parameters[0]);

      //console.log("Path: " + obj.path);
      //console.log("User: " + obj.user_id); //this is specific to the user regardless of shared terminal or private terminal
      //console.log("Shared projid: " + obj.shared_proj_id);
      //console.log("Term type: " + obj.term_type);
      //console.log("Socket: " + obj.socket_env_var);
      //console.log("PRIV proj id: " + obj.priv_proj_id);

      if(parameters[0] == "commit"){ //0th position of parameters array is position 1(argv[1]) of the actual _git command given at the commandline

        //add a hardcoded message with the users message and the userID of who initiated the commit
        if(obj.term_type == "shared_docker"){

          var trimmed_path = obj.path.replace("/proj_mnt/repos/", "");
          var exists_authentication_file = self.fs.existsSync(self.main_path + "/files/" + obj.shared_proj_id + "/repos/" + trimmed_path + "/.authentication"); //location of the authentication file for private dockers
          var open_path = self.main_path + "/files/" + obj.shared_proj_id + "/repos/" + trimmed_path + "/.authentication";

        } else if (obj.term_type == "priv_docker"){

          var trimmed_path = obj.path.replace("/repo_mnt/", "");
          var exists_authentication_file = self.fs.existsSync(self.main_path + "/files/private/" + obj.user_id + "_private_files/" + trimmed_path + "/.authentication"); //location of the authentication file for private dockers
          var open_path = self.main_path + "/files/private/" + obj.user_id + "_private_files/" + trimmed_path + "/.authentication";

        }

        if(exists_authentication_file){

          var open_me = open_path;

          var buf = self.fs.readFileSync(open_me, "utf8");

          if(buf.indexOf("noauth") !== -1){

            if(obj.term_type == "priv_docker"){

              console.log("noauth private repo commit");
              var docker_cmd = "\"cd files/private/" + obj.user_id + "_private_files/" + trimmed_path + " ; sudo -u git_worker git config user.name \" " + obj.user_id +" \" ; sudo -u git_worker git config user.email \" " + obj.user_id + "@ucsc.edu \" ; sudo -u git_worker git commit -am \"user_id: " + obj.user_id + ", private, noauth commit\" \"";

            } else if (obj.term_type == "shared_docker"){

              console.log("noauth shared repo commit");
              var docker_cmd = "\"cd files/" + obj.shared_proj_id + "/repos/" + trimmed_path + " ; sudo -u git_worker git config user.name \" " + obj.user_id +" \"; sudo -u git_worker git config user.email \" " + obj.user_id + "@ucsc.edu \" ; sudo -u git_worker git commit -am \"user_id: " + obj.user_id + ", project: " + obj.shared_proj_id +", shared, noauth commit\" \"";

            }

            //execute commit operation
            self.ts.run("docker exec RW_git_docker bin/bash -c " + docker_cmd, "files/" , function (stdout) { //do the actual clone using the RW docker
              
              var success = true;
              client.send_fast("_git_cmd_resp", {"params": success} );

            }, function (err) {

              console.log("Could not commit with noauth\n");
              console.log(err);
              var success = false;
              client.send_fast("_git_cmd_resp", {"params": success} );

            });

          } else if (buf.indexOf("token") !== -1){ //THESE functions are being left for now, not much interest in _git commit command

            if(obj.term_type == "priv_docker"){
              console.log("token private repo commit");
            } else if (obj.term_type == "shared_docker"){
              console.log("token shared repo commit");
            }

          }else if (buf.indexOf("pubpriv") !== -1){

            if(obj.term_type == "priv_docker"){
              console.log("pubpriv private repo commit");
            } else if (obj.term_type == "shared_docker"){
              console.log("pubpriv shared repo commit");
            }

          }else if (buf.indexOf("pass") !== -1){

            if(obj.term_type == "priv_docker"){
              console.log("pass private repo commit");
            } else if (obj.term_type == "shared_docker"){
              console.log("pass shared repo commit");
            }

          } else {
            console.log("Your .authentication file is not formatted correctly (weird, should not happen)");
          }
          //parse file here, spawn docker to do the actual git work


        } else {
          console.log("Failed to find .authentication file, cant commit");
          var holder_socket = self.open_terminals[obj.socket_env_var]; //emit error here
          holder_socket.emit("nonexistent_authentication_file");

        }

        /////////////////////////////////////////////////////////CHECKOUT//////////////////////////////////////////////////////////


      } else if (parameters[0] == "checkout"){ //interested in doing git checkout -b <name>



        if(obj.term_type == "shared_docker"){

          var trimmed_path = obj.path.replace("/proj_mnt/repos/", "");
          var exists_authentication_file = self.fs.existsSync(self.main_path + "/files/" + obj.shared_proj_id + "/repos/" + trimmed_path + "/.authentication"); //location of the authentication file for private dockers
          var open_path = self.main_path + "/files/" + obj.shared_proj_id + "/repos/" + trimmed_path + "/.authentication";

        } else if (obj.term_type == "priv_docker"){

          var trimmed_path = obj.path.replace("/repo_mnt/", "");
          var exists_authentication_file = self.fs.existsSync(self.main_path + "/files/private/" + obj.user_id + "_private_files/" + trimmed_path + "/.authentication"); //location of the authentication file for private dockers
          var open_path = self.main_path + "/files/private/" + obj.user_id + "_private_files/" + trimmed_path + "/.authentication";

        }

        if(exists_authentication_file){

          var param1 = parameters[1];
          var param2 = parameters[2];
          //capture the new branch name
          console.log("para 1: " + parameters[1]); //expect this to be "-b"
          console.log("para 2: " + parameters[2]);

          if(parameters[1] !== "-b"){ // need to be able to switch branches here if the second param is not -b

            if(parameters[1] == "master"){ //user is trying to checkout the branch, dont let it happen!

              var success = false;
              client.send_fast("_git_cmd_resp", {"params": success} );
              var holder_socket = self.open_terminals[obj.socket_env_var]; //emit error here
              holder_socket.emit("git_checkout_master_error");

            } else {
              //var success = false;
              //client.send_fast("_git_cmd_resp", {"params": success} );

              if(obj.term_type == "priv_docker"){

                console.log("private checkout (preexisting branch)");
                var docker_cmd = "\"cd files/private/" + obj.user_id + "_private_files/" + trimmed_path + " ; sudo -u git_worker git checkout " + param1 + "\"";

              } else if (obj.term_type == "shared_docker"){

                console.log("shared checkout (preexisting branch)");
                var docker_cmd = "\"cd files/" + obj.shared_proj_id + "/repos/" + trimmed_path + " ; sudo -u git_worker git checkout " + param1 + "\"";

              }

              //execute commit operation
              self.ts.run("docker exec RW_git_docker bin/bash -c " + docker_cmd, "files/" , function (stdout) { //do the actual clone using the RW docker
                
                var success = true;
                client.send_fast("_git_cmd_resp", {"params": success} );

              }, function (err) {

                console.log("Could not checkout\n");
                console.log(err);

                //alert to the alertify prompt
                var holder_socket = self.open_terminals[obj.socket_env_var]; //emit error here
                holder_socket.emit("git_checkout_error", {_error: err});

                //alert in the terminal
                var success = false;
                client.send_fast("_git_cmd_resp", {"params": success} );

              });
            }

          } else {

            //var open_me = open_path;

            //var buf = self.fs.readFileSync(open_me, "utf8"); //I think we do not care what is inside the authentication file, just that it exists



            if(obj.term_type == "priv_docker"){

              console.log("private checkout -b");
              var docker_cmd = "\"cd files/private/" + obj.user_id + "_private_files/" + trimmed_path + " ; sudo -u git_worker git checkout -b " + param2 + "\"";

            } else if (obj.term_type == "shared_docker"){

              console.log("shared checkout -b");
              var docker_cmd = "\"cd files/" + obj.shared_proj_id + "/repos/" + trimmed_path + " ; sudo -u git_worker git checkout -b " + param2 + "\"";

            }

            //execute commit operation
            self.ts.run("docker exec RW_git_docker bin/bash -c " + docker_cmd, "files/" , function (stdout) { //do the actual clone using the RW docker
              
              var success = true;
              client.send_fast("_git_cmd_resp", {"params": success} );

            }, function (err) {

              console.log("Could not checkout\n");
              console.log(err);

              //alert to the alertify prompt
              var holder_socket = self.open_terminals[obj.socket_env_var]; //emit error here
              holder_socket.emit("git_checkout_error", {_error: err});

              //alert in the terminal
              var success = false;
              client.send_fast("_git_cmd_resp", {"params": success} );

            });
          }

        } else {
          console.log("Failed to find .authentication file, cant commit");
          var holder_socket = self.open_terminals[obj.socket_env_var]; //emit error here
          holder_socket.emit("nonexistent_authentication_file");

        }


        /////////////////////////////////////////////////////////BRANCH//////////////////////////////////////////////////////////
        //make branches remote here

      } else if (parameters[0] == "branch"){
        
        if(obj.term_type == "shared_docker"){

          var trimmed_path = obj.path.replace("/proj_mnt/repos/", "");
          var exists_authentication_file = self.fs.existsSync(self.main_path + "/files/" + obj.shared_proj_id + "/repos/" + trimmed_path + "/.authentication"); //location of the authentication file for private dockers
          var open_path = self.main_path + "/files/" + obj.shared_proj_id + "/repos/" + trimmed_path + "/.authentication";

        } else if (obj.term_type == "priv_docker"){

          var trimmed_path = obj.path.replace("/repo_mnt/", "");
          var exists_authentication_file = self.fs.existsSync(self.main_path + "/files/private/" + obj.user_id + "_private_files/" + trimmed_path + "/.authentication"); //location of the authentication file for private dockers
          var open_path = self.main_path + "/files/private/" + obj.user_id + "_private_files/" + trimmed_path + "/.authentication";

        }

        if(exists_authentication_file){

          var param1 = parameters[1];
          var param2 = parameters[2];
          //capture the new branch name
          //console.log("para 1: " + parameters[1]); //expect this to be "-b"
          //console.log("para 2: " + parameters[2]);

          if(parameters[1] == "-d"){ // we want to remove a branch, [2] is the branch name

            //var success = false;
            //client.send_fast("_git_cmd_resp", {"params": success} );

            if(obj.term_type == "priv_docker"){

              console.log("private delete branch");
              var docker_cmd = "\"cd files/private/" + obj.user_id + "_private_files/" + trimmed_path + " ; sudo -u git_worker git branch -d " + param2 + "\"";

            } else if (obj.term_type == "shared_docker"){

              console.log("shared delete branch");
              var docker_cmd = "\"cd files/" + obj.shared_proj_id + "/repos/" + trimmed_path + " ; sudo -u git_worker git branch -d " + param2 + "\"";

            }

            //execute commit operation
            self.ts.run("docker exec RW_git_docker bin/bash -c " + docker_cmd, "files/" , function (stdout) { //do the actual clone using the RW docker
              
              var success = true;
              client.send_fast("_git_cmd_resp", {"params": success} );

            }, function (err) {

              console.log("Could not delete branch\n");
              console.log(err);

              //alert to the alertify prompt
              var holder_socket = self.open_terminals[obj.socket_env_var]; //emit error here
              holder_socket.emit("git_branch_delete_error", {_error: err});

              //alert in the terminal
              var success = false;
              client.send_fast("_git_cmd_resp", {"params": success} );

            });

          } else if (parameters[1] !== "-d" && parameters[1] !== ""){ //this means we dont want to delete, but there is something in the [1]th position, execute a git branch <name>


            if(obj.term_type == "priv_docker"){

              console.log("private branch");
              var docker_cmd = "\"cd files/private/" + obj.user_id + "_private_files/" + trimmed_path + " ; sudo -u git_worker git branch " + param1 + "\"";

            } else if (obj.term_type == "shared_docker"){

              console.log("shared branch");
              var docker_cmd = "\"cd files/" + obj.shared_proj_id + "/repos/" + trimmed_path + " ; sudo -u git_worker git branch " + param1 + "\"";

            }

            //execute commit operation

            self.ts.run("docker exec RW_git_docker bin/bash -c " + docker_cmd, "files/" , function (stdout) { //do the actual clone using the RW docker
              
              var success = true;
              client.send_fast("_git_cmd_resp", {"params": success} );

            }, function (err) {

              console.log("Could not branch\n");
              console.log(err);

              //alert to the alertify prompt
              var holder_socket = self.open_terminals[obj.socket_env_var]; //emit error here
              holder_socket.emit("git_branch_error", {_error: err});

              //alert in the terminal
              var success = false;
              client.send_fast("_git_cmd_resp", {"params": success} );

            });

          } else if (parameters[1] == ""){ //we want to see the available branches here, we need stdout from here
            
            if(obj.term_type == "priv_docker"){

              console.log("private check branch");
              var docker_cmd = "\"cd files/private/" + obj.user_id + "_private_files/" + trimmed_path + " ; sudo -u git_worker git branch\"";

              //execute branch check option
              self.ts.run("docker exec RW_git_docker bin/bash -c " + docker_cmd, "files/", function (stdout) { 
                
                var available_branches = stdout;
                var branch_names = "";

                available_branches = available_branches.split("\n");

                for(i = 0; i < available_branches.length; i++){
                  if(available_branches[i] == "") continue;

                  branch_names += available_branches[i];
                  branch_names += ",";
                }

                branch_names = branch_names.replace(/ /g, "");

                branch_names = branch_names.split(",");

                //console.log(stdout);
                client.send_fast("avail_branches", {"params": branch_names} );

              }, function (err) {

                console.log("Could not get private branch information\n");
                console.log(err);

              });

            } else if (obj.term_type == "shared_docker"){

              console.log("shared check branch");
              var docker_cmd = "\"cd files/" + obj.shared_proj_id + "/repos/" + trimmed_path + " ; sudo -u git_worker git branch\"";

              //execute branch check operation
              self.ts.run("docker exec RW_git_docker bin/bash -c " + docker_cmd, "files/", function (stdout) {
                
                var available_branches = stdout;
                var branch_names = "";

                available_branches = available_branches.split("\n");

                for(i = 0; i < available_branches.length; i++){
                  if(available_branches[i] == "") continue;

                  branch_names += available_branches[i];
                  branch_names += ",";
                }

                branch_names = branch_names.replace(/ /g, "");

                branch_names = branch_names.split(",");

                ///console.log(stdout);
                client.send_fast("avail_branches", {"params": branch_names} );


              }, function (err) {

                console.log("Could not get shared branch information\n");
                console.log(err);

              });

            }

          }

        } else {
          console.log("Failed to find .authentication file, cant commit");
          var holder_socket = self.open_terminals[obj.socket_env_var]; //emit error here
          holder_socket.emit("nonexistent_authentication_file");

        }

        //////////////////////////////////////////////////////REBASE/////////////////////////////////////////////////

      } else if(parameters[0] == "rebase"){

        if(obj.term_type == "shared_docker"){

          var trimmed_path = obj.path.replace("/proj_mnt/repos/", "");
          var exists_authentication_file = self.fs.existsSync(self.main_path + "/files/" + obj.shared_proj_id + "/repos/" + trimmed_path + "/.authentication"); //location of the authentication file for private dockers
          var open_path = self.main_path + "/files/" + obj.shared_proj_id + "/repos/" + trimmed_path + "/.authentication";

        } else if (obj.term_type == "priv_docker"){

          var trimmed_path = obj.path.replace("/repo_mnt/", "");
          var exists_authentication_file = self.fs.existsSync(self.main_path + "/files/private/" + obj.user_id + "_private_files/" + trimmed_path + "/.authentication"); //location of the authentication file for private dockers
          var open_path = self.main_path + "/files/private/" + obj.user_id + "_private_files/" + trimmed_path + "/.authentication";

        }

        if(exists_authentication_file){

          var param1 = parameters[1];
          var param2 = parameters[2];
          //capture the new branch name
          //console.log("para 1: " + parameters[1]); //expect this to be "-b"
          //console.log("para 2: " + parameters[2]);

          if(parameters[1] == ""){ //nothing to rebase specified

            //var success = false;
            //client.send_fast("_git_cmd_resp", {"params": success} );

            //alert to the alertify prompt
            var holder_socket = self.open_terminals[obj.socket_env_var]; //emit error here
            holder_socket.emit("git_rebase_nospec_error");

            //alert in the terminal
            var success = false;
            client.send_fast("_git_cmd_resp", {"params": success} );

          } else if (parameters[1] == "@{u}"){ //remote rebase


            if(obj.term_type == "priv_docker"){

              console.log("private rebase {u}");
              var docker_cmd = "\"cd files/private/" + obj.user_id + "_private_files/" + trimmed_path + " ; sudo -u git_worker git rebase @{u}\"";

            } else if (obj.term_type == "shared_docker"){

              console.log("shared rebase {u}");
              var docker_cmd = "\"cd files/" + obj.shared_proj_id + "/repos/" + trimmed_path + " ; sudo -u git_worker git rebase @{u}\"";

            }

            //execute commit operation

            self.ts.run("docker exec RW_git_docker bin/bash -c " + docker_cmd, "files/" , function (stdout) { //do the actual clone using the RW docker
              
              var holder_socket = self.open_terminals[obj.socket_env_var]; //emit error here
              holder_socket.emit("git_rebase_@u_suc", {_stdout: stdout});
              console.log(stdout);

              var success = true;
              client.send_fast("_git_cmd_resp", {"params": success} );

            }, function (err) {

              console.log("Could not rebase @{u}\n");
              console.log(err);

              //alert to the alertify prompt
              var holder_socket = self.open_terminals[obj.socket_env_var]; //emit error here
              holder_socket.emit("git_rebase_@u_error", {_error: err});

              //alert in the terminal
              var success = false;
              client.send_fast("_git_cmd_resp", {"params": success} );

            });

          } else if (parameters[1] !== "" && parameters[1] !== "@{u}"){ //rebase against different branch
            
            if(obj.term_type == "priv_docker"){

              console.log("private check branch");
              var docker_cmd = "\"cd files/private/" + obj.user_id + "_private_files/" + trimmed_path + " ; sudo -u git_worker git rebase " + param1 + "\"";

              //execute branch check option
              self.ts.run("docker exec RW_git_docker bin/bash -c " + docker_cmd, "files/", function (stdout) { 
                
                var success = true;
                client.send_fast("_git_cmd_resp", {"params": success} );

              }, function (err) {

                console.log("Could not private rebase " + param1 + "\n");
                console.log(err);

                //alert to the alertify prompt
                var holder_socket = self.open_terminals[obj.socket_env_var]; //emit error here
                holder_socket.emit("git_rebase_branch_error", {_error: err});

                //alert in the terminal
                var success = false;
                client.send_fast("_git_cmd_resp", {"params": success} );

              });

            } else if (obj.term_type == "shared_docker"){

              console.log("shared check branch");
              var docker_cmd = "\"cd files/" + obj.shared_proj_id + "/repos/" + trimmed_path + " ; sudo -u git_worker git rebase " + param1 + "\"";

              //execute branch check operation
              self.ts.run("docker exec RW_git_docker bin/bash -c " + docker_cmd, "files/", function (stdout) {
                
                var success = true;
                client.send_fast("_git_cmd_resp", {"params": success} );


              }, function (err) {

                console.log("Could not shared rebase " + param1 + "\n");
                console.log(err);

                //alert to the alertify prompt
                var holder_socket = self.open_terminals[obj.socket_env_var]; //emit error here
                holder_socket.emit("git_rebase_branch_error", {_error: err});

                //alert in the terminal
                var success = false;
                client.send_fast("_git_cmd_resp", {"params": success} );

              });

            }

          }

        } else {
          console.log("Failed to find .authentication file, cant commit");
          var holder_socket = self.open_terminals[obj.socket_env_var]; //emit error here
          holder_socket.emit("nonexistent_authentication_file");

        }

        /////////////////////////////////////////SYNC////////////////////////////////////////////////

      } else if (parameters[0] == "sync"){
        //git checkout master # just needed if the master was not checkout
        //git pull # just in case remote edits
        //git merge --no-ff FOO
        //git push
        //CHECK if git push: use current branch
        //CHECK if git push <branch>:do same steps as above but FOO will be branch specified, not current branch

        //have to be in a directory with a .git folder to even do this command, so _git sync should be fine


        if(obj.term_type == "shared_docker"){

          var trimmed_path = obj.path.replace("/proj_mnt/repos/", "");
          var exists_authentication_file = self.fs.existsSync(self.main_path + "/files/" + obj.shared_proj_id + "/repos/" + trimmed_path + "/.authentication"); //location of the authentication file for private dockers
          var open_path = self.main_path + "/files/" + obj.shared_proj_id + "/repos/" + trimmed_path + "/.authentication";

        } else if (obj.term_type == "priv_docker"){

          var trimmed_path = obj.path.replace("/repo_mnt/", "");
          var exists_authentication_file = self.fs.existsSync(self.main_path + "/files/private/" + obj.user_id + "_private_files/" + trimmed_path + "/.authentication"); //location of the authentication file for private dockers
          var open_path = self.main_path + "/files/private/" + obj.user_id + "_private_files/" + trimmed_path + "/.authentication";

        }

        if(exists_authentication_file){

          var open_me = open_path;

          var buf = self.fs.readFileSync(open_me, "utf8");



          if(buf.indexOf("noauth") !== -1){

            if(obj.term_type == "priv_docker"){

              console.log("noauth private repo push");
              var docker_cmd = "\"cd files/private/" + obj.user_id + "_private_files/" + trimmed_path + " ; sudo -u git_worker git config user.name \" " + obj.user_id +" \" ; sudo -u git_worker git config user.email \" " + obj.user_id + "@fakeemail.edu \" ; sudo -u git_worker git pull ; sudo -u git_worker git commit -am \"user_id: " + obj.user_id + ", private, noauth sync\" ; sudo -u git_worker git push origin master\"";

            } else if (obj.term_type == "shared_docker"){

              console.log("noauth shared repo push");
              var docker_cmd = "\"cd files/" + obj.shared_proj_id + "/repos/" + trimmed_path + " ; sudo -u git_worker git config user.name \" " + obj.user_id +" \"; sudo -u git_worker git config user.email \" " + obj.user_id + "@fakeemail.edu \" ; sudo -u git_worker git pull ; sudo -u git_worker git commit -am \"user_id: " + obj.user_id + ", project: " + obj.shared_proj_id +", shared, noauth pull\" ; sudo -u git_worker git push origin master\"";

            }

            //execute push operation
            self.ts.run("docker exec RW_git_docker bin/bash -c " + docker_cmd, "files/" , function (stdout) { //do the actual push using the RW docker
              
              var success = true;
              client.send_fast("_git_cmd_resp", {"params": success} );

            }, function (err) {

              console.log("Could not sync with noauth\n");
              console.log(err);
              var success = false;
              client.send_fast("_git_cmd_resp", {"params": success} );

            });



          } else if (buf.indexOf("token") !== -1){ //THESE functions are being left for now

            if(obj.term_type == "priv_docker"){
              console.log("token private repo commit");
            } else if (obj.term_type == "shared_docker"){
              console.log("token shared repo commit");
            }



          }else if (buf.indexOf("pubpriv") !== -1){


            if(obj.term_type == "priv_docker"){
              console.log("pubpriv private repo sync");

              var trimmed_path = obj.path.replace("/repo_mnt/", "");
              var exists_config_file = self.fs.existsSync(self.main_path + "/files/private/" + obj.user_id + "_private_files/" + trimmed_path + "/.git/config"); //location of the authentication file for private dockers
              var open_config_path = self.main_path + "/files/private/" + obj.user_id + "_private_files/" + trimmed_path + "/.git/config";

              var pub = "";
              var priv = "";

              console.log("pubpriv: looking into DB with user ID " + obj.user_id);

              self.user.findOne({_id: obj.user_id}, "git_pub_key", function (err, data) {
                //console.log("Public Key Recorded: " + data.git_pub_key + " OR error: " + err);
                pub = data.git_pub_key;

                if(data.git_pub_key == undefined){
                  
                  console.log("request to use pubpriv and did not find stored pubpriv");
                  var holder_socket = self.open_terminals[obj.socket_env_var]; //emit error here
                  holder_socket.emit("user_pubpriv_not_found");


                } else {


                  self.user.findOne({_id: obj.user_id}, "git_priv_key", function (err, data) {
                    //console.log("Private Key Recorded: \n" + data.git_priv_key + " OR error: " + err);
                    priv = data.git_priv_key;

                    //parse the git config file to find the name of the host machine, in order to populate the known_hosts file of the freshly launched pubpriv docker
                    
                    var config_contents = self.fs.readFileSync(open_config_path, "utf8");
                    
                    //config_contents = config_contents.split("\n");

                    //console.log("CONF CONT: " + config_contents);

                    var host = config_contents.substring(config_contents.indexOf("@") + 1, config_contents.indexOf(":")); //we are making the hostname dynamically everytime we do this cmd

                    //console.log("HOOOOOOST: " + host);

                    self.fs.writeFileSync(self.main_path +"/files/private/" + obj.user_id + "_private_files/.user_pub", pub);

                    self.fs.writeFileSync(self.main_path +"/files/private/" + obj.user_id + "_private_files/.user_priv", priv);

                    var holder_socket = self.open_terminals[obj.socket_env_var]; //emit error here
                    holder_socket.emit("begin_syncing_repo");

                    //var docker_cmd = "\" useradd -m --uid " + self.my_uid + " pub_priv_worker ; mkdir /home/pub_priv_worker/.ssh ; cd /files/private/" + obj.user_id + "_private_files ; cp .user_priv /home/pub_priv_worker/.ssh/id_rsa ; touch /home/pub_priv_worker/.ssh/known_hosts ; ssh-keyscan " + host + " \> /home/pub_priv_worker/.ssh/known_hosts \""//; sudo -u pub_priv_worker git commit -am \"user_id: " + obj.user_id + ", private, pubpriv sync\"; sudo -u pub_priv_worker git pull ; sudo -u pub_priv_worker git push origin master\""; //put pub/priv key in proper place, 
                                      

                    var docker_cmd = "\" useradd -m pub_priv_worker ; chmod 700 ~/.ssh ; sudo -u pub_priv_worker mkdir /home/pub_priv_worker/.ssh ;  cd /files/private/" + obj.user_id + "_private_files/" + trimmed_path  + " ; sudo -u pub_priv_worker git config user.name \" " + obj.user_id +" \" ; sudo -u pub_priv_worker git config user.email \" " + obj.user_id + "@fake.edu \"; cd /files/private/" + obj.user_id + "_private_files ; cp .user_priv /home/pub_priv_worker/.ssh/id_rsa ; sudo -u pub_priv_worker touch /home/pub_priv_worker/.ssh/known_hosts ; sudo -u pub_priv_worker ssh-keyscan " + host + " \> /home/pub_priv_worker/.ssh/known_hosts ; cd /files/private/" + obj.user_id + "_private_files/" + trimmed_path  + " ;  sudo -u pub_priv_worker git add .  ; sudo -u pub_priv_worker git commit -am \"user_id: " + obj.user_id + ", private, pubpriv sync\"; sudo -u pub_priv_worker git pull ; sudo -u pub_priv_worker git push --all \""; //put pub/priv key in proper place, 


                    self.ts.run("docker run --rm --volumes-from RW_git_docker mascucsc/liveos_terminal_ubuntu bin/bash -c " + docker_cmd, "files/" , function (stdout) { //use separate docker to clone using pub/priv key to avoid conflicts, destroy it when finished (don"t use -i persistence)
                      console.log("Finished syncing private repo with pubpriv\n");
                      try{
                        var holder_socket = self.open_terminals[obj.socket_env_var]; //emit error here
                        holder_socket.emit("syncing_git_repo_pubpriv_success");

                        var success = true;
                        client.send_fast("_git_cmd_resp", {"params": success} );

                      } catch (err){
                        console.log("socket was unavailable to send message to ..user logged out or socket connection was lost");
                        var success = false;
                        client.send_fast("_git_cmd_resp", {"params": success} );
                      }


                    }, function (err) {
                      console.log("Could not sync private repo with pubpriv\n");
                      console.log(err);
                      var holder_socket = self.open_terminals[obj.socket_env_var]; //emit error here
                      holder_socket.emit("err_syncing_git_repo_pubpriv", {_error: err});
                    });
                    

                  });

                }

              });


            } else if (obj.term_type == "shared_docker"){

              console.log("pubpriv shared repo commit");

              var trimmed_path = obj.path.replace("/proj_mnt/repos/", "");
              var exists_config_file = self.fs.existsSync(self.main_path + "/files/" + obj.shared_proj_id + "/repos/" + trimmed_path + "/.git/config"); //location of the authentication file for private dockers
              var open_config_path = self.main_path + "/files/" + obj.shared_proj_id + "/repos/" + trimmed_path + "/.git/config";
              

              var exists_owned_by = self.fs.existsSync(self.main_path + "/files/" + obj.shared_proj_id + "/.project_pubpriv_owned_by"); //this looks for and makes the owned_by file
              var owned_by_contents = "";


              if(!exists_owned_by){ //no user has cloned a repo yet using a token, store just the token of the current user

                console.log("ODD ERROR, should\"nt ever get here, this repo lacks an \"owned_by\" file, although it was cloned by someone somehow");

                //MUST do checks on client when trying to do a shared clone, LOOK FOR a .owned_by file first (if exists, don"t need anything else...else need user token and if no token, throw error)
                
              } else if(exists_owned_by){
                //open file to get the goods
                owned_by_contents = self.fs.readFileSync(self.main_path + "/files/" + obj.shared_proj_id + "/.project_pubpriv_owned_by");
              }

              //need to check if new name is needed here too and apply permissions
              var pub = "";
              var priv = "";

              console.log("pubpriv: looking into DB with owned_by ID " + owned_by_contents);

              self.user.findOne({_id: owned_by_contents}, "git_pub_key", function (err, data) {
                //console.log("Public Key Recorded: " + data.git_pub_key + " OR error: " + err);
                pub = data.git_pub_key;

                if(data.git_pub_key == undefined){
                  
                  console.log("request to use pubpriv and did not find stored token");
                  socket.emit("user_pubpriv_not_found");

                } else {


                  self.user.findOne({_id: owned_by_contents}, "git_priv_key", function (err, data) {
                    //console.log("Private Key Recorded: \n" + data.git_priv_key + " OR error: " + err);
                    priv = data.git_priv_key;


                    var config_contents = self.fs.readFileSync(open_config_path, "utf8");
                    
                    var host = config_contents.substring(config_contents.indexOf("@") + 1, config_contents.indexOf(":")); //we are making the hostname dynamically everytime we do this cmd

                    self.fs.writeFileSync(self.main_path + "/files/" + obj.shared_proj_id + "/." + owned_by_contents + ".user_pub", pub); //store the master pub/priv key in hidden file within the project folder

                    self.fs.writeFileSync(self.main_path + "/files/" + obj.shared_proj_id + "/." + owned_by_contents + ".user_priv", priv);


                    var holder_socket = self.open_terminals[obj.socket_env_var]; //emit error here
                    holder_socket.emit("begin_syncing_repo");

                    var docker_cmd = "\" useradd -m  pub_priv_worker ; chmod 700 ~/.ssh ; sudo -u pub_priv_worker mkdir /home/pub_priv_worker/.ssh ;  cd /files/" + obj.shared_proj_id + " ; cp ." + owned_by_contents + ".user_priv /home/pub_priv_worker/.ssh/id_rsa ; cd /files/" + obj.shared_proj_id + "/repos/" + trimmed_path + " ; sudo -u pub_priv_worker git config user.name \" " + obj.shared_proj_id +" \" ; sudo -u pub_priv_worker git config user.email \" " + obj.shared_proj_id + "@fake.edu \"; sudo -u pub_priv_worker touch /home/pub_priv_worker/.ssh/known_hosts ; sudo -u pub_priv_worker ssh-keyscan " + host + " \> /home/pub_priv_worker/.ssh/known_hosts ; sudo -u pub_priv_worker git add .  ; sudo -u pub_priv_worker git commit -am \"personal committer user_id: " + obj.user_id + ", shared, pubpriv sync\"; sudo -u pub_priv_worker git pull ; sudo -u pub_priv_worker git push --all \""; //put pub/priv key in proper place, 


                    self.ts.run("docker run --rm --volumes-from RW_git_docker mascucsc/liveos_terminal_ubuntu bin/bash -c " + docker_cmd, "files/" , function (stdout) { //use separate docker to clone using pub/priv key to avoid conflicts, destroy it when finished (don"t use -i persistence)
                      console.log("Finished syncing shared repo with pubpriv\n");
                      try{
                        
                        var holder_socket = self.open_terminals[obj.socket_env_var]; //emit error here
                        holder_socket.emit("syncing_git_repo_pubpriv_success");

                        var success = true;
                        client.send_fast("_git_cmd_resp", {"params": success} );

                      } catch (err){
                        console.log("socket was unavailable to send message to ..user logged out or socket connection was lost");

                        var success = false;
                        client.send_fast("_git_cmd_resp", {"params": success} );
                      }

                    }, function (err) {
                      console.log("Could not sync shared repo with pubpriv\n");
                      console.log(err);
                      var holder_socket = self.open_terminals[obj.socket_env_var]; //emit error here
                      holder_socket.emit("err_syncing_git_repo_pubpriv", {_error: err});
                    });

                  });

                }

              });

            }

          }else if (buf.indexOf("pass") !== -1){

            if(obj.term_type == "priv_docker"){
              console.log("pass private repo pull");
            } else if (obj.term_type == "shared_docker"){
              console.log("pass shared repo pull");
            }

          } else {
            console.log("Your .authentication file is not formatted correctly (weird, should not happen)");
          }
          //parse file here, spawn docker to do the actual git work


        } else {
          console.log("Failed to find .authentication file, cant commit");
          var holder_socket = self.open_terminals[obj.socket_env_var]; //emit error here
          holder_socket.emit("nonexistent_authentication_file");

        }

      }

    });

/*

#Create a branch (when a new repo is added to the user)
git checkout -b "FOO"
SHOULKD MAKE THIS REMOTE BRANCH WHEN I CHECKOUT -B? Otherwise, next cmd fails

#When the user wants to get edits done in main branch
git rebase @{u}

#Periodically in your non-master branch
git pull # Just in case that someone edited the repo remotely
git commit -a -m"my local tag"
git push # just to backup the local edits remotely

#When the user[s] want to push the edits to the main branch

git checkout master # just needed if the master was not checkout
git pull # just in case remote edits
git merge --no-ff FOO //where FOO is the branch you were previously working in
git push

*/



    client.on("list_kills", function (obj) {
      console.log("Getting available dockers to kill");

      //run check of running dockers, this is not a good way to get the running dockers. We can use docker ps -a -q but that only gives us contained ID output, not contained name output
      self.ts.run("docker ps", "files/", function (stdout) {
        var dockers_open = stdout;
        var docker_name = "";
        var names_index = dockers_open.indexOf("NAMES");
        //console.log("NAMES: ", names_index);
        dockers_open = dockers_open.split("\n");
        //console.log("dockers open array: ", dockers_open.length);

        for(i = 1; i < dockers_open.length; i++){
          if(dockers_open[i] == "") continue;

          docker_name += dockers_open[i].substring(names_index);
          docker_name += ",";
        }

        docker_name = docker_name.replace(/ /g, "");

        docker_name = docker_name.split(",");

        if(obj.term_type == "priv_docker" || obj.term_type == "shared_docker"){ //need to only send available private or shared kills

          if(docker_name.indexOf(obj.term_name) !== -1){

            var index = docker_name.indexOf(obj.term_name);

            //console.log("index: " +  index + " entry: " + docker_name[index]);
            client.send_fast("avail_kills", {"params": docker_name[index]} );

          }
        } else if (obj.term_type == "nondocker"){

          client.send_fast("avail_kills", {"params": docker_name} ); //should send all available kills

        }

        docker_name = "";

      }, function (err) {
        console.log("Could not get docker ps output\n");
        console.log(err);
      });

    });

    client.on("_kill", function (obj) {

      self.ts.run("docker ps", "files/", function (stdout) {
        var dockers_open = stdout;
        var docker_name = "";
        var names_index = dockers_open.indexOf("NAMES");
        //console.log("NAMES: ", names_index);
        dockers_open = dockers_open.split("\n");
        //console.log("dockers open array: ", dockers_open.length);

        for(i = 1; i < dockers_open.length; i++){
          if(dockers_open[i] == "") continue;

          docker_name += dockers_open[i].substring(names_index);
          docker_name += ",";
        }

        docker_name = docker_name.replace(/ /g, "");

        docker_name = docker_name.split(",");

        var parameters = obj.params.split(" "); //params sent from docker

        

        for(var i = 0; i < parameters.length - 1; i++){
          kill_dockers(i);
          

        }
        function kill_dockers(i){
          //console.log("i " + i + "parameters[i] " + parameters[i]);
          //console.log("params: " + parameters);
          //console.log("dockers running: " + docker_name);

          if((docker_name.indexOf(parameters[i]) !== -1) && (docker_name.indexOf(parameters[i]) !== "")){ //name(s) is/are in the running dockers list, kill it/them

            self.ts.run("docker rm -f " + parameters[i], "files/", function (stdout) {

              console.log("Killed this docker: " + parameters[i]);
              client.send_fast("kill_status", {"params": parameters[i]} );

            }, function (err) {

              console.log("Could not kill specified dockers\n");
              console.log(err);
            });

          } else { //one or more of the parameters given by the user weren"t actually running dockers, alert them
            var no_such_docker = "no";
            client.send_fast("kill_status", {"params": no_such_docker});

          }
        }
        docker_name = "";

      }, function (err) {
        console.log("Could not get docker ps output\n");
        console.log(err);
      });

    });


    client.on("not_a_command", function (obj) {
      console.log("alertify not a command");
    });

    client.on("local_file_request", function (obj) {
      //console.log(obj.file_passed, obj.socket_env_var, obj.term_type);
      var holder_socket = self.open_terminals[obj.socket_env_var];

      holder_socket.emit("local_docker_file_edit_request", {filename: obj.file_passed});

      holder_socket.on("docker_local_edit_okay", function(){
        var yes = "yes";
        client.send_fast("local_file_resp", {"answer": yes} );

      });

      holder_socket.on("docker_local_edit_nokay", function(){
        var no = "no";
        client.send_fast("local_file_resp", {"answer": no} );


      });

    });

  });

  // ---------------------------------- RW Docker start ---------------------------------- // 


  this.ts.run("docker run -itd --name RW_git_docker -v "+ this.main_path +"/files:/files:rw mascucsc/liveos_terminal_ubuntu", "files/" , function (stdout) { //set up GIT RW docker for public use (always running)

    console.log("Container ID was not used, this docker is starting for the first time\n");
    rw_docker_status = true;

    var new_docker_exec_cmd = "\"useradd  git_worker; echo " + self.hostname + " > /opt/liveos_terminal/terminal_binary.conf\"";

    self.ts.run("docker exec RW_git_docker bin/bash -c " + new_docker_exec_cmd, "files/", function (stdout) {
      console.log("Added user \"git_worker\" to the RW GIT docker with UID: " + self.my_uid);

    }, function (err) {
      console.log("Could not add user and UID\n");
      console.log(err);
    });


  }, function (err) {
    console.log("Could not start RW docker, will check if it is currently running...\n");
    //console.log(err);
    var error_container_message = err.split(" ");
    var error_container_id = error_container_message[error_container_message.indexOf("container") + 1]; //This grabs the container ID given in error of trying to run the container again

    
    error_container_id = error_container_id.replace(".", "");
    console.log(error_container_id);
    //Now compare the captured conatined ID to docker ps -a -q to see if the container is actually running or was just named with the same name previously
    self.ts.run("docker ps -q", "files/", function (stdout) {
      //console.log("got running containers");
      
      console.log(error_container_id);
      if(stdout.indexOf(error_container_id) !== -1){ //We have found the container ID in the already-running dockers, just need to EXEC!
        
        console.log("RW_git_docker container ID was used and is already running, will continue with EXEC commands only");

        var new_docker_exec_cmd = "\"useradd  git_worker; echo " + self.hostname + " > /opt/liveos_terminal/terminal_binary.conf\"";

        self.ts.run("docker exec RW_git_docker bin/bash -c " + new_docker_exec_cmd, "files/", function (stdout) {
          console.log("Added user \"git_worker\" to the RW GIT docker with UID: " + self.my_uid);

        }, function (err) {
          console.log("Could not add user and UID, or user already existed\n");
          console.log(err);
        });

      } else{ //The container HAS been used (name is taken) but it is not currently running, so start it
        
        console.log("RW_git_docker container ID was used and is no longer running, will start the container and EXEC commands");

        self.ts.run("docker rm -f RW_git_docker ; docker run -itd --name RW_git_docker -v "+ self.main_path +"/files:/files:rw mascucsc/liveos_terminal_ubuntu", "files/" , function (stdout) { //set up GIT RW docker for public use (always running)

          console.log("REStarting RW_git_docker\n");
          rw_docker_status = true;

          var new_docker_exec_cmd = "\"useradd git_worker; echo " + self.hostname + " > /opt/liveos_terminal/terminal_binary.conf\"";

          self.ts.run("docker exec RW_git_docker bin/bash -c " + new_docker_exec_cmd, "files/", function (stdout) {
            console.log("Added user \"git_worker\" to the RW GIT docker with UID: " + self.my_uid);

          }, function (err) {
            console.log("Could not add user and UID\n");
            console.log(err);
          });


        }, function (err) {
          console.log("Could not REstart RW_git_docker\n");
          console.log(err);
        });


      }


    }, function (err) {
      console.log("docker ps -a -q problem in RW_git_docker\n");
      console.log(err);
    });


  });

  // ---------------------------------- Start dockers per project ---------------------------------- //


  //self.project.find({}, function(err, data){ //using db to find human readable list of projects, use this to name dockers
  //  console.log(data[0].name);


  //});

  //get total number of directories
  this.project_list = this.fs.readdirSync(this.main_path + "/files/");
  this.proj_list_count = 0;
  
  //loop through and start a mascucsc/liveos_terminal_ubuntu with a different name for each

  for(var i = 0; i < this.project_list.length; i++){
    start_project_dockers(i);

  }

  function start_project_dockers(i){

    self.project.findOne({_id: self.project_list[i]}, function(err, data) {

      if(err) console.log("Err getting proj names from DB: " + err);
      
      else{
        
        var this_human_readable_name = data.name.toLowerCase();

        if(this_human_readable_name.indexOf(" ") !== -1){
          console.log("This name had a space, removing space: " + this_human_readable_name);
          this_human_readable_name = this_human_readable_name.replace(" ", "");
        }


        self.ts.run("docker run -itd -e \"PROJID=" + data._id + "\" -e \"TERMNAME=" + this_human_readable_name + "\" --name " + this_human_readable_name + " -v " + self.terminal_bin_path + ":/.terminal_binary -v " + self.main_path + "/files/" + self.project_list[i] + "/:/proj_mnt:ro mascucsc/liveos_terminal_ubuntu", "files/" , function (stdout) {
          
          console.log("Started project docker " + this_human_readable_name + " and all is well");

        }, function (err) {

          console.log("Could not start project docker: " + this_human_readable_name + ", will check if it is currently running...");
          //console.log(err);

          var error_container_message = err.split(" ");
          var error_container_id = error_container_message[error_container_message.indexOf("container") + 1]; //This grabs the container ID given in error of trying to run the container again

          
          error_container_id = error_container_id.replace(".", "");
          //console.log(error_container_id);

          //Now compare the captured conatined ID to docker ps -a -q to see if the container is actually running or was just named with the same name previously
          self.ts.run("docker ps -q", "files/", function (stdout) {
            //console.log("got running containers");
           

            if(stdout.indexOf(error_container_id) !== -1){ //We have found the container ID in the already-running dockers, just need to EXEC!
              
              console.log(this_human_readable_name + " container ID was used and is already running, all is well");

            } else{ //The container HAS been used (name is taken) but it is not currently running, so start it
              
              console.log(this_human_readable_name + " container ID was used and is no longer running, will start the container and then all will be well");

              self.ts.run("docker rm -f " + this_human_readable_name + " ; docker run -itd -e \"TERMNAME=" + this_human_readable_name + "\" --name " + this_human_readable_name + " -v " + self.terminal_bin_path + ":/.terminal_binary -v " + self.main_path + "/files/" + self.project_list[i] + "/:/proj_mnt:ro mascucsc/liveos_terminal_ubuntu", "files/" , function (stdout) { //set up GIT RW docker for public use (always running)

                console.log("REStarted project docker " + this_human_readable_name + "\n");

              }, function (err) {
                console.log("Could not REstart RW_git_docker\n");
                console.log(err);
              });


            }

          }, function (err) {
            console.log("docker ps -a -q problem in RW_git_docker\n");
            console.log(err);
          });

        });
      }

    });
  }


  // ---------------------------------- Create folders ---------------------------------- // 
  
  //loop through and make repos folder within each project

  for(var i = 0; i < this.project_list.length; i++){
    var exists_repos_folder = self.fs.existsSync(self.main_path + "/files/" + this.project_list[i] + "/repos"); //this makes the repos folder if it doesn"t exist

    if(!exists_repos_folder){

      self.fs.mkdirSync(self.main_path + "/files/" + this.project_list[i] + "/repos"); //create directory
      console.log("Created /repos folder\n");
    }
  }

  //create private mount point within files folder

  var exists_priv_repo_folder = self.fs.existsSync(self.main_path + "/files/private");

  if (!exists_priv_repo_folder){
    
    self.fs.mkdirSync(self.main_path + "/files/private");
    console.log("Created /private folder\n");
  }
  

  //Creating socket.io server
  io.of("/terminal").on("connection", function (socket) {
    self.open_terminal_counter += 1;
    self.open_terminals[self.open_terminal_counter] = socket;
    

    //var self = this;
    var stored_time = Date.now();
    var overflow_count = 0;
    var print_message = true;
    var buffer = [];
    var waiting_package = "\n\n ***Lots of data, please wait...***\n\n\r";
    var big_data_flag = false;
    var key_hit = false;
    var data_size_count = 0;
    var special_pwd_command = 0;
    var complete_package = "";
    var value_to_check = "";
    var newname_value_to_check = "";
    var shared_term_connected_to = "";


    /*if (self.rw_docker_status == false){

      this.ts.run("docker rm -f RW_git_docker ; docker run -itd --name RW_git_docker -v "+ this.main_path +"/files:/files:rw mascucsc/liveos_terminal_ubuntu", "files/" , function (stdout) {

        console.log("Starting RW docker\n");
        rw_docker_status = true;

        var new_docker_exec_cmd = "\"useradd --uid " + self.my_uid + " git_worker\"";

        self.ts.run("docker exec RW_git_docker bin/bash -c " + new_docker_exec_cmd, "files/", function (stdout) {
          console.log("Added user \"git_worker\" to the RW GIT docker with UID: " + self.my_uid);

        }, function (err) {
          console.log("Could not add user and UID\n");
          console.log(err);
        });


      }, function (err) {
        console.log("Could not start RW docker\n");
        console.log(err);
      });

    }*/
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


    socket.on("registering_shared_arch_docker_terminal", function(obj){ //shared dockers are already running, just find the one we want and connect
      self.shared_term_connected_to = obj.shared_proj_id;
      var proj_id = obj.project_id;
      var full_name = obj.full_name;
      var user_id = obj.user_id;
      obj.proj_name_to_connect = obj.proj_name_to_connect.toLowerCase();


      //self.ts.run("docker run -id --name " + full_name + "_private_arch_docker -v " + self.terminal_bin_path + ":/.terminal_binary -v " + self.main_path + "/files/" + proj_id + ":/proj_mnt mascucsc/liveos_terminal_archlinux", "files/", function (stdout) { //launch the docker for the first time, this will fail if it is already running, which is the point
        
      console.log("Connecting to shared docker: " + obj.proj_name_to_connect);
      console.log(self.my_uid);
      var new_docker_exec_cmd = "\"useradd -m " + obj.proj_name_to_connect + " -G docker ; ln -s /proj_mnt/ /home/" + obj.proj_name_to_connect + "/SharedProjectFiles; echo " + self.hostname + " > /opt/liveos_terminal/terminal_binary.conf\"";

      self.ts.run("docker exec " + obj.proj_name_to_connect + " bin/bash -c " + new_docker_exec_cmd, "files/", function (stdout) {
        //";" + "docker exec private_arch_docker \"echo \"" + full_name + " ALL=(ALL) NOPASSWD:ALL\" >> /etc/sudoers\""
        console.log("Shared docker added user:" + stdout);
        //console.log("socket: " + socket.term +" , pty: " + pty + " , mainpath: " + main_path);

        var cmd = "export SOCKETINFO=" + self.open_terminal_counter + " ; export USERID="+ user_id + " ; export TERMTYPE=shared_docker ; export TERMNAME=" + obj.proj_name_to_connect + "; cd home/" + obj.proj_name_to_connect + "; su " + obj.proj_name_to_connect; //this sets the env var for the TCP connection. Need to do this for each client terminal we are opening

        try{
          socket.term = pty.fork("docker", ["exec", "-it", obj.proj_name_to_connect, "/bin/bash", "-c", cmd], {//, ";su", full_name + "\""], { //this will start "parent" docker in detached mode
            name: require("fs").existsSync("/usr/share/terminfo/x/xterm-256color") ? "xterm-256color" : "xterm",
            cols: 104,
            rows: 24,
            cwd: main_path + "/files/", //THIS is where you set the working directory of the terminal, testing
            env: process.env
          });
        } catch (err) {
          console.log("PTY first time launch failed: " + err);
        }

        try {
          socket.term.on("data", function(data) {
                   
            if(data.length == 4095) data_size_count += 1;
            if(data.length == 4095 && key_hit === false && data_size_count >= 5){ //message is at least one full buffer, likely more
              overflow_count += 1; //prepare to monitor for consistent overflow

              socket.received_new_command = false;

              if(print_message === true){
                socket.emit("data", waiting_package); //to avoid writing this more than once

                print_message = false;
              } 
              
              buffer += data;

              big_data_flag = true;


            }else if(data.length < 10 && overflow_count > 0 && socket.received_new_command === false && data_size_count >= 5){

              big_data_flag = false;
              overflow_count = 0;
              print_message = true;
              key_hit = true;
              //print last part of buffer
              socket.emit("data", buffer.substring(buffer.length-6000, buffer.length)); //This is where we are emitting data OUT of the server to the client
              //socket.emit("data", data); //This is where we are emitting data OUT of the server to the client
              buffer = [];

            }else if (data.length < 4095 && overflow_count > 0 && socket.received_new_command === false && data_size_count >= 5){  //case to handle not all overflows being 4095 size
              
              buffer += data; //Need to add a case here to be able to print when a command which has saturated, has completed...this is where command completion cases end up
              // check time here between packets to tell if a saturated command has finished.

            }else if (data.length < 4095 && overflow_count > 0 && socket.received_new_command === true){ 
              
              big_data_flag = false;
              overflow_count = 0;
              print_message = true;
              key_hit = true;
              //print last part of buffer
              socket.emit("data", buffer.substring(buffer.length-6000, buffer.length)); //This is where we are emitting data OUT of the server to the client
              //socket.emit("data", data); //This is where we are emitting data OUT of the server to the client
              buffer = [];
              data_size_count = 0;

            }

            if(big_data_flag === false){
              print_message = true;
              key_hit = false;
              try {
                socket.emit("data", data); //This is where we are emitting data OUT of the server to the client
                if(data.indexOf("exit\r") !== -1){
                  socket.emit("kill_window");
                } 
              } catch (err) { 
                console.log("Didn\"t emit data properly: " + err);
              }
            }
          
          });

        } catch(err) {
          console.log("Could not properly read data from term" + err);
        }

      }, function (err) {
        console.log("Someone has already joined this shared docker and claimed it as theirs, will continue with just exec commands");

        var cmd = "export SOCKETINFO=" + self.open_terminal_counter + " ; export USERID="+ user_id + " ; export TERMTYPE=shared_docker ; export TERMNAME=" + obj.proj_name_to_connect + "; cd home/" + obj.proj_name_to_connect + "; su " + obj.proj_name_to_connect; //this sets the env var for the TCP connection. Need to do this for each client terminal we are opening

        try{
          socket.term = pty.fork("docker", ["exec", "-it", obj.proj_name_to_connect, "/bin/bash", "-c", cmd], {//, ";su", full_name + "\""], { //this will start "parent" docker in detached mode
            name: require("fs").existsSync("/usr/share/terminfo/x/xterm-256color") ? "xterm-256color" : "xterm",
            cols: 104,
            rows: 24,
            cwd: main_path + "/files/", //THIS is where you set the working directory of the terminal, testing
            env: process.env
          });
        } catch (err) {
          console.log("PTY first time launch failed: " + err);
        }

        try {
          socket.term.on("data", function(data) {
                   
            if(data.length == 4095) data_size_count += 1;
            if(data.length == 4095 && key_hit === false && data_size_count >= 5){ //message is at least one full buffer, likely more
              overflow_count += 1; //prepare to monitor for consistent overflow

              socket.received_new_command = false;

              if(print_message === true){
                socket.emit("data", waiting_package); //to avoid writing this more than once

                print_message = false;
              } 
              
              buffer += data;

              big_data_flag = true;


            }else if(data.length < 10 && overflow_count > 0 && socket.received_new_command === false && data_size_count >= 5){

              big_data_flag = false;
              overflow_count = 0;
              print_message = true;
              key_hit = true;
              //print last part of buffer
              socket.emit("data", buffer.substring(buffer.length-6000, buffer.length)); //This is where we are emitting data OUT of the server to the client
              //socket.emit("data", data); //This is where we are emitting data OUT of the server to the client
              buffer = [];

            }else if (data.length < 4095 && overflow_count > 0 && socket.received_new_command === false && data_size_count >= 5){  //case to handle not all overflows being 4095 size
              
              buffer += data; //Need to add a case here to be able to print when a command which has saturated, has completed...this is where command completion cases end up
              // check time here between packets to tell if a saturated command has finished.

            }else if (data.length < 4095 && overflow_count > 0 && socket.received_new_command === true){ 
              
              big_data_flag = false;
              overflow_count = 0;
              print_message = true;
              key_hit = true;
              //print last part of buffer
              socket.emit("data", buffer.substring(buffer.length-6000, buffer.length)); //This is where we are emitting data OUT of the server to the client
              //socket.emit("data", data); //This is where we are emitting data OUT of the server to the client
              buffer = [];
              data_size_count = 0;

            }

            if(big_data_flag === false){
              print_message = true;
              key_hit = false;
              try {
                socket.emit("data", data); //This is where we are emitting data OUT of the server to the client
                if(data.indexOf("exit\r") !== -1){
                  socket.emit("kill_window");
                } 
              } catch (err) { 
                console.log("Didn\"t emit data properly: " + err);
              }
            }
          
          });

        } catch(err) {
          console.log("Could not properly read data from term" + err);
        }

      });        

    });
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


    socket.on("registering_nondocker_terminal", function(obj){
      self.user.findOne({_id: obj.user}, function (err, data) {
        //check if user is admin or non docker terminals are open to all
        if(conf.terminal != "user") {
          if(!data || err) 
            return;
          if(data.signature != obj.signature || data.admin != true)
            return;
        }
            
        try {
        var proj_id = obj.project_id;

        var exists_repos_folder = self.fs.existsSync(self.main_path + "/files/" + proj_id + "/repos"); //this makes the repos folder if it doesn"t exist
        var exists_priv_repo_folder = self.fs.existsSync(self.main_path + "/files/" + proj_id + "/repos/private");


        if(!exists_repos_folder){
          
          

          self.fs.mkdirSync(self.main_path + "/files/" + proj_id + "/repos"); //create directory
          console.log("Created /repos folder\n");
        }

        if (!exists_priv_repo_folder){
          

          self.fs.mkdirSync(self.main_path + "/files/" + proj_id + "/repos/private");
          console.log("Created /private folder\n");
        }

        if(exists_repos_folder && exists_priv_repo_folder){

          console.log("Repos folder exists.\n");
        }

        process.env.TERMTYPE = "nondocker";
        process.env.SOCKETINFO = self.open_terminal_counter;
        var _env = process.env;

        socket.term = self.pty.fork(process.env.SHELL || "bash", [], {
          name: require("fs").existsSync("/usr/share/terminfo/x/xterm-256color") ? "xterm-256color" : "xterm",
          cols: 104,
          rows: 24,
          cwd: main_path + "/files/" + proj_id, //THIS is where you set the working directory of the terminal, testing
          env: _env
        });

        console.log("Created non-docker shell with pty master/slave pair (master: %d, pid: %d)", socket.term.fd, socket.term.pid);

        //socket.term.write("export SOCKETINFO=" + self.open_terminal_counter + "\r");// + "; export TERMTYPE=nondocker\r"); //we need to inject the ENV var (SOCKETINFO) used to capture TCP information being sent

        //socket.term.write("export TERMTYPE=nondocker\r");

        socket.term.on("data", function(data) {
          try { 

            if(data.length == 4095) data_size_count += 1;
            if(data.length == 4095 && key_hit === false && data_size_count >= 5){ //message is at least one full buffer, likely more
              overflow_count += 1; //prepare to monitor for consistent overflow

              socket.received_new_command = false;

              if(print_message === true){
                socket.emit("data", waiting_package); //to avoid writing this more than once

                print_message = false;
              } 
              
              buffer += data;

              big_data_flag = true;


            }else if(data.length < 10 && overflow_count > 0 && socket.received_new_command === false && data_size_count >= 5){

              big_data_flag = false;
              overflow_count = 0;
              print_message = true;
              key_hit = true;
              //print last part of buffer
              socket.emit("data", buffer.substring(buffer.length-6000, buffer.length)); //This is where we are emitting data OUT of the server to the client
              //socket.emit("data", data); //This is where we are emitting data OUT of the server to the client
              buffer = [];

            }else if (data.length < 4095 && overflow_count > 0 && socket.received_new_command === false && data_size_count >= 5){  //case to handle not all overflows being 4095 size
              
              buffer += data; //Need to add a case here to be able to print when a command which has saturated, has completed...this is where command completion cases end up
              // check time here between packets to tell if a saturated command has finished.

            }else if (data.length < 4095 && overflow_count > 0 && socket.received_new_command === true){ 
              
              big_data_flag = false;
              overflow_count = 0;
              print_message = true;
              key_hit = true;
              //print last part of buffer
              socket.emit("data", buffer.substring(buffer.length-6000, buffer.length)); //This is where we are emitting data OUT of the server to the client
              //socket.emit("data", data); //This is where we are emitting data OUT of the server to the client
              buffer = [];
              data_size_count = 0;

            }

            if(big_data_flag === false){
              print_message = true;
              key_hit = false;
              try {
                if (data.indexOf(" SOCKETINFO=") !== -1) {
                  socket.emit("data", "");
                } else if (data.indexOf(" TERMTYPE=") !== -1 ){
                  socket.emit("data", "");

                } else{
                  
                  socket.emit("data", data); //This is where we are emitting data OUT of the server to the client
                  
                  if(data.indexOf("exit\r") !== -1){
                    socket.emit("kill_window");
                    
                  } 
                }

              } catch (err) { 
                console.log(err);
              }
            }

          //console.log("data Len: " + data.length + " buffer len: " + buffer.length);
          } catch(err) {
            console.log(err);
          }
        });
      } catch (err) {
        console.log(err);
      }
      });
    });

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    socket.on("registering_private_arch_docker_terminal", function(obj){
      try {
        var proj_id = obj.project_id;
        var full_name = obj.full_name;
        var user_id = obj.user_id;
      
        
        full_name = full_name.toLowerCase();
        full_name = full_name.replace( /[^a-z]/g, "");

        
        var exists_specific_priv_repo_folder = self.fs.existsSync(self.main_path + "/files/private/" + user_id + "_private_files"); //create a user specific private files folder to mount

        if (!exists_specific_priv_repo_folder){
          console.log("Creating user specific private folder\n");

          self.fs.mkdirSync(self.main_path + "/files/private/" + user_id + "_private_files");

        }

        self.ts.run("docker run -id --name " + full_name + "_private_arch_docker -v " + self.terminal_bin_path + ":/.terminal_binary -v " + self.main_path + "/files/private/" + user_id + "_private_files:/repo_mnt:ro -v " + self.main_path + "/files/" + proj_id + ":/proj_mnt mascucsc/liveos_terminal_archlinux", "files/", function (stdout) { //launch the docker for the first time, this will fail if it is already running, which is the point
          console.log("Docker first time RUN complete:" + stdout);

          var new_docker_exec_cmd = "\"useradd -m " + full_name + " -G docker ; ln -s /repo_mnt/ /home/" + full_name + "/PrivateRepos ; ln -s /proj_mnt/ /home/" + full_name + "/ProjectFiles; echo " + self.hostname + " > /opt/liveos_terminal/terminal_binary.conf\"";

          self.ts.run("docker exec " + full_name + "_private_arch_docker bin/bash -c " + new_docker_exec_cmd, "files/", function (stdout) {
            //";" + "docker exec private_arch_docker \"echo \"" + full_name + " ALL=(ALL) NOPASSWD:ALL\" >> /etc/sudoers\""
            console.log("Docker first time, not-yet-running EXEC useradd/permissions complete:" + stdout);
            //console.log("socket: " + socket.term +" , pty: " + pty + " , mainpath: " + main_path);

            var cmd = "export SOCKETINFO=" + self.open_terminal_counter + " ; export USERID="+ user_id + " ; export TERMTYPE=priv_docker ; export TERMNAME=" + full_name + "_private_arch_docker ; export PRIVPROJID=" + proj_id + "; cd home/" + full_name + "; su " + full_name; //this sets the env var for the TCP connection. Need to do this for each client terminal we are opening

            try{
              socket.term = pty.fork("docker", ["exec", "-it", full_name + "_private_arch_docker", "/bin/bash", "-c", cmd], {//, ";su", full_name + "\""], { //this will start "parent" docker in detached mode
                name: require("fs").existsSync("/usr/share/terminfo/x/xterm-256color") ? "xterm-256color" : "xterm",
                cols: 104,
                rows: 24,
                cwd: main_path + "/files/", //THIS is where you set the working directory of the terminal, testing
                env: process.env
              });
            } catch (err) {
              console.log("PTY first time launch failed: " + err);
            }

            try {
              socket.term.on("data", function(data) {
                       
                if(data.length == 4095) data_size_count += 1;
                if(data.length == 4095 && key_hit === false && data_size_count >= 5){ //message is at least one full buffer, likely more
                  overflow_count += 1; //prepare to monitor for consistent overflow

                  socket.received_new_command = false;

                  if(print_message === true){
                    socket.emit("data", waiting_package); //to avoid writing this more than once

                    print_message = false;
                  } 
                  
                  buffer += data;

                  big_data_flag = true;


                }else if(data.length < 10 && overflow_count > 0 && socket.received_new_command === false && data_size_count >= 5){

                  big_data_flag = false;
                  overflow_count = 0;
                  print_message = true;
                  key_hit = true;
                  //print last part of buffer
                  socket.emit("data", buffer.substring(buffer.length-6000, buffer.length)); //This is where we are emitting data OUT of the server to the client
                  //socket.emit("data", data); //This is where we are emitting data OUT of the server to the client
                  buffer = [];

                }else if (data.length < 4095 && overflow_count > 0 && socket.received_new_command === false && data_size_count >= 5){  //case to handle not all overflows being 4095 size
                  
                  buffer += data; //Need to add a case here to be able to print when a command which has saturated, has completed...this is where command completion cases end up
                  // check time here between packets to tell if a saturated command has finished.

                }else if (data.length < 4095 && overflow_count > 0 && socket.received_new_command === true){ 
                  
                  big_data_flag = false;
                  overflow_count = 0;
                  print_message = true;
                  key_hit = true;
                  //print last part of buffer
                  socket.emit("data", buffer.substring(buffer.length-6000, buffer.length)); //This is where we are emitting data OUT of the server to the client
                  //socket.emit("data", data); //This is where we are emitting data OUT of the server to the client
                  buffer = [];
                  data_size_count = 0;

                }

                if(big_data_flag === false){
                  print_message = true;
                  key_hit = false;
                  try {
                    socket.emit("data", data); //This is where we are emitting data OUT of the server to the client
                    if(data.indexOf("exit\r") !== -1){
                      socket.emit("kill_window");
                    } 
                  } catch (err) { 
                    console.log("Didn\"t emit data properly: " + err);
                  }
                }
              
              });

            } catch(err) {
              console.log("Could not properly read data from term" + err);
            }

          }, function (err) {
            console.log("DOCKER EXEC ERROR: " + err);
          });        

        }, function (err) {
          //console.log("DOCKER RUN ERROR: " + err);

          console.log("Could not start private docker, will check if it is currently running...\n");
          //console.log(err);
          var error_container_message = err.split(" ");
          var error_container_id = error_container_message[error_container_message.indexOf("container") + 1]; //This grabs the container ID given in error of trying to run the container again

          
          error_container_id = error_container_id.replace(".", "");

          //console.log(error_container_id);

          self.ts.run("docker ps -q", "files/", function (stdout) {
            //console.log("got running containers");
            
            //console.log(error_container_id);
            
            if(stdout.indexOf(error_container_id) !== -1){ //We have found the container ID in the already-running dockers, just need to EXEC!
              
              console.log("RW_git_docker container ID was used and is already running, will continue with EXEC commands only");

              //var new_docker_exec_cmd = "\"useradd -m " + full_name + " -G docker ; ln -s /repo_mnt/ /home/" + full_name + "/Repos ; ln -s /proj_mnt/ /home/" + full_name + "/Project_files\"";

              //self.ts.run("docker exec " + full_name + "_private_arch_docker bin/bash -c " + new_docker_exec_cmd, "files/", function (stdout) {
                //";" + "docker exec private_arch_docker \"echo \"" + full_name + " ALL=(ALL) NOPASSWD:ALL\" >> /etc/sudoers\""
                //console.log("Docker already running EXEC useradd/permissions complete");
                //console.log("socket: " + socket.term +" , pty: " + pty + " , mainpath: " + main_path);

                var cmd = "export SOCKETINFO=" + self.open_terminal_counter + " ; export USERID="+ user_id + " ; export TERMTYPE=priv_docker ; export TERMNAME=" + full_name + "_private_arch_docker ; export PRIVPROJID=" + proj_id + " ; cd home/" + full_name + "; su " + full_name; //this sets the env var for the TCP connection. Need to do this for each client terminal we are opening

                try{
                  socket.term = pty.fork("docker", ["exec", "-it", full_name + "_private_arch_docker", "/bin/bash", "-c", cmd], {//, ";su", full_name + "\""], { //this will start "parent" docker in detached mode
                    name: require("fs").existsSync("/usr/share/terminfo/x/xterm-256color") ? "xterm-256color" : "xterm",
                    cols: 104,
                    rows: 24,
                    cwd: main_path + "/files/", //THIS is where you set the working directory of the terminal, testing
                    env: process.env
                  });
                } catch (err) {
                  console.log("PTY launch failed: " + err);
                }

                try {
                  socket.term.on("data", function(data) {
                           
                    if(data.length == 4095) data_size_count += 1;
                    if(data.length == 4095 && key_hit === false && data_size_count >= 5){ //message is at least one full buffer, likely more
                      overflow_count += 1; //prepare to monitor for consistent overflow

                      socket.received_new_command = false;

                      if(print_message === true){
                        socket.emit("data", waiting_package); //to avoid writing this more than once

                        print_message = false;
                      } 
                      
                      buffer += data;

                      big_data_flag = true;


                    }else if(data.length < 10 && overflow_count > 0 && socket.received_new_command === false && data_size_count >= 5){

                      big_data_flag = false;
                      overflow_count = 0;
                      print_message = true;
                      key_hit = true;
                      //print last part of buffer
                      socket.emit("data", buffer.substring(buffer.length-6000, buffer.length)); //This is where we are emitting data OUT of the server to the client
                      //socket.emit("data", data); //This is where we are emitting data OUT of the server to the client
                      buffer = [];

                    }else if (data.length < 4095 && overflow_count > 0 && socket.received_new_command === false && data_size_count >= 5){  //case to handle not all overflows being 4095 size
                      
                      buffer += data; //Need to add a case here to be able to print when a command which has saturated, has completed...this is where command completion cases end up
                      // check time here between packets to tell if a saturated command has finished.

                    }else if (data.length < 4095 && overflow_count > 0 && socket.received_new_command === true){ 
                      
                      big_data_flag = false;
                      overflow_count = 0;
                      print_message = true;
                      key_hit = true;
                      //print last part of buffer
                      socket.emit("data", buffer.substring(buffer.length-6000, buffer.length)); //This is where we are emitting data OUT of the server to the client
                      //socket.emit("data", data); //This is where we are emitting data OUT of the server to the client
                      buffer = [];
                      data_size_count = 0;

                    }

                    if(big_data_flag === false){
                      print_message = true;
                      key_hit = false;
                      try {
                        socket.emit("data", data); //This is where we are emitting data OUT of the server to the client
                        if(data.indexOf("exit\r") !== -1){
                          socket.emit("kill_window");
                        } 
                      } catch (err) { 
                        console.log("Did not emit data properly: " + err);
                      }
                    }

                  //console.log("data Len: " + data.length + " buffer len: " + buffer.length);
                  
                  });

                } catch(err) {
                  console.log("Did not get data to the term properly: " + err);
                }

              //}, function (err) {
              //  console.log("DOCKER EXEC ERROR: " + err);
              //});

            } else { //The container HAS been used (name is taken) but it is not currently running, so start it
              
              console.log("RW_git_docker container ID was used and is no longer running, will start the container and EXEC commands");

              self.ts.run("docker rm -f " + full_name + "_private_arch_docker ; docker run -id --name " + full_name + "_private_arch_docker -v " + self.terminal_bin_path + ":/.terminal_binary -v " + self.main_path + "/files/private/" + user_id + "_private_files:/repo_mnt:ro -v " + self.main_path + "/files/" + proj_id + ":/proj_mnt mascucsc/liveos_terminal_archlinux", "files/", function (stdout) { //launch the docker for the first time
                console.log("Docker RUN complete:" + stdout);

                var new_docker_exec_cmd = "\"useradd -m " + full_name + " -G docker ; ln -s /repo_mnt/ /home/" + full_name + "/PrivateRepos ; ln -s /proj_mnt/ /home/" + full_name + "/ProjectFiles; echo " + self.hostname + " > /opt/liveos_terminal/terminal_binary.conf\"";

                self.ts.run("docker exec " + full_name + "_private_arch_docker bin/bash -c " + new_docker_exec_cmd, "files/", function (stdout) {
                  //";" + "docker exec private_arch_docker \"echo \"" + full_name + " ALL=(ALL) NOPASSWD:ALL\" >> /etc/sudoers\""
                  console.log("Docker not-yet-running EXEC useradd/permissions complete:" + stdout);
                  //console.log("socket: " + socket.term +" , pty: " + pty + " , mainpath: " + main_path);

                  var cmd = "export SOCKETINFO=" + self.open_terminal_counter + " ; export USERID="+ user_id + " ; export TERMTYPE=priv_docker ; export TERMNAME=" + full_name + "_private_arch_docker ; export PRIVPROJID=" + proj_id + " ; cd home/" + full_name + "; su " + full_name; //this sets the env var for the TCP connection. Need to do this for each client terminal we are opening

                  try{
                    socket.term = pty.fork("docker", ["exec", "-it", full_name + "_private_arch_docker", "/bin/bash", "-c", cmd], {//, ";su", full_name + "\""], { //this will start "parent" docker in detached mode
                      name: require("fs").existsSync("/usr/share/terminfo/x/xterm-256color") ? "xterm-256color" : "xterm",
                      cols: 104,
                      rows: 24,
                      cwd: main_path + "/files/", //THIS is where you set the working directory of the terminal, testing
                      env: process.env
                    });
                  } catch (err) {
                    console.log("PTY launch failed: " + err);
                  }

                  try {
                    socket.term.on("data", function(data) {
                             
                      if(data.length == 4095) data_size_count += 1;
                      if(data.length == 4095 && key_hit === false && data_size_count >= 5){ //message is at least one full buffer, likely more
                        overflow_count += 1; //prepare to monitor for consistent overflow

                        socket.received_new_command = false;

                        if(print_message === true){
                          socket.emit("data", waiting_package); //to avoid writing this more than once

                          print_message = false;
                        } 
                        
                        buffer += data;

                        big_data_flag = true;


                      }else if(data.length < 10 && overflow_count > 0 && socket.received_new_command === false && data_size_count >= 5){

                      big_data_flag = false;
                      overflow_count = 0;
                      print_message = true;
                      key_hit = true;
                      //print last part of buffer
                      socket.emit("data", buffer.substring(buffer.length-6000, buffer.length)); //This is where we are emitting data OUT of the server to the client
                      //socket.emit("data", data); //This is where we are emitting data OUT of the server to the client
                      buffer = [];

                      }else if (data.length < 4095 && overflow_count > 0 && socket.received_new_command === false && data_size_count >= 5){  //case to handle not all overflows being 4095 size
                        
                        buffer += data; //Need to add a case here to be able to print when a command which has saturated, has completed...this is where command completion cases end up
                        // check time here between packets to tell if a saturated command has finished.

                      }else if (data.length < 4095 && overflow_count > 0 && socket.received_new_command === true){ 
                        
                        big_data_flag = false;
                        overflow_count = 0;
                        print_message = true;
                        key_hit = true;
                        //print last part of buffer
                        socket.emit("data", buffer.substring(buffer.length-6000, buffer.length)); //This is where we are emitting data OUT of the server to the client
                        //socket.emit("data", data); //This is where we are emitting data OUT of the server to the client
                        buffer = [];
                        data_size_count = 0;

                      }

                      if(big_data_flag === false){
                        print_message = true;
                        key_hit = false;
                        try {
                          socket.emit("data", data); //This is where we are emitting data OUT of the server to the client
                          if(data.indexOf("exit\r") !== -1){
                            socket.emit("kill_window");
                          } 
                        } catch (err) { 
                          console.log("Did not emit data properly: " + err);
                        }
                      }

                    //console.log("data Len: " + data.length + " buffer len: " + buffer.length);
                    
                    });

                  } catch(err) {
                    console.log("did not get data properly to the term: " + err);
                  }

                }, function (err) {
                  console.log("DOCKER EXEC ERROR: " + err);
                });  



              }, function (err) {
                console.log("DOCKER RUN ERROR: " + err);
              });

            } //end of else block


          }, function (err) {
            console.log("docker ps -a -q problem in RW_git_docker" + err + "\n");
            //console.log(err);
          });

        });

      } catch (err) {
        console.log("Couldn\"t even launch the private docker the first time" + err);
      }

    });

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    socket.on("registering_ubuntu_docker_terminal", function(obj){
      try {
        var proj_id = obj.project_id;

      
        socket.term = pty.fork("docker", ["run", "-i", "-t", "mascucsc/liveos_terminal_ubuntu"], {
          name: require("fs").existsSync("/usr/share/terminfo/x/xterm-256color") ? "xterm-256color" : "xterm",
          cols: 104,
          rows: 24,
          cwd: main_path + "/files/" + proj_id, //THIS is where you set the working directory of the terminal, testing
          env: process.env
        });

        console.log("Created ubuntu docker shell with pty master/slave pair (master: %d, pid: %d)", socket.term.fd, socket.term.pid);

        socket.term.on("data", function(data) {
          try {
            if(data.length == 4095) data_size_count += 1;
            if(data.length == 4095 && key_hit === false && data_size_count >= 5){ //message is at least one full buffer, likely more
              overflow_count += 1; //prepare to monitor for consistent overflow

              socket.received_new_command = false;

              if(print_message === true){
                socket.emit("data", waiting_package); //to avoid writing this more than once

                print_message = false;
              } 
              
              buffer += data;

              big_data_flag = true;


            }else if(data.length < 10 && overflow_count > 0 && socket.received_new_command === false && data_size_count >= 5){

            big_data_flag = false;
            overflow_count = 0;
            print_message = true;
            key_hit = true;
            //print last part of buffer
            socket.emit("data", buffer.substring(buffer.length-6000, buffer.length)); //This is where we are emitting data OUT of the server to the client
            //socket.emit("data", data); //This is where we are emitting data OUT of the server to the client
            buffer = [];

            }else if (data.length < 4095 && overflow_count > 0 && socket.received_new_command === false && data_size_count >= 5){  //case to handle not all overflows being 4095 size
              
              buffer += data; //Need to add a case here to be able to print when a command which has saturated, has completed...this is where command completion cases end up
              // check time here between packets to tell if a saturated command has finished.

            }else if (data.length < 4095 && overflow_count > 0 && socket.received_new_command === true){ 
              
              big_data_flag = false;
              overflow_count = 0;
              print_message = true;
              key_hit = true;
              //print last part of buffer
              socket.emit("data", buffer.substring(buffer.length-6000, buffer.length)); //This is where we are emitting data OUT of the server to the client
              //socket.emit("data", data); //This is where we are emitting data OUT of the server to the client
              buffer = [];
              data_size_count = 0;

            }

            if(big_data_flag === false){
              print_message = true;
              key_hit = false;
              try {
                socket.emit("data", data); //This is where we are emitting data OUT of the server to the client
                if(data.indexOf("exit\r") !== -1){
                  socket.emit("kill_window");
                } 
              } catch (err) { 
                console.log(err);
              }
            }

          //console.log("data Len: " + data.length + " buffer len: " + buffer.length);
          } catch(err) {
            console.log(err);
          }
        });
      } catch (err) {
        console.log(err);
      }
    });

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    

    socket.on("user_added_new_proj", function(obj){ //this event handles creating a new shared docker when the user adds a new project
      //console.log("NEWPRJ: " + obj.proj_id + " " + obj.proj_name);

      var this_human_readable_name = obj.proj_name.toLowerCase();

      if(this_human_readable_name.indexOf(" ") !== -1){
        console.log("This name had a space, removing space: " + this_human_readable_name);
        this_human_readable_name = this_human_readable_name.replace(" ", "");
      }

      self.ts.run("docker run -itd -e \"PROJID=" + obj.proj_id + "\" -e \"TERMNAME=" + this_human_readable_name + "\" --name " + this_human_readable_name + " -v " + self.terminal_bin_path + ":/.terminal_binary -v " + self.main_path + "/files/" + obj.proj_id + "/:/proj_mnt:ro mascucsc/liveos_terminal_ubuntu", "files/" , function (stdout) {
        
        var exists_repos_folder = self.fs.existsSync(self.main_path + "/files/" + obj.proj_id + "/repos"); //this makes the repos folder if it doesn"t exist

        if(!exists_repos_folder){

          self.fs.mkdirSync(self.main_path + "/files/" + obj.proj_id + "/repos"); //create directory
          console.log("Created /repos folder\n");
        }

        console.log("New project added AND started the project docker " + this_human_readable_name);

      }, function (err) {

        console.log("New project added and could not start project docker: " + this_human_readable_name);
        //console.log(err);

      });

    });

    socket.on("data", function(data) { //This is our input data from the client
      try {
        /*if(data == "special_pwd"){
          special_pwd_command = 1;
          socket.term.write("pwd");
          //socket.emit("listen_for_pwd_response");
        }else{*/
          socket.received_new_command = true;
          //if (stream) stream.write("IN: " + data + "\n-\n");
          socket.term.write(data);
          //console.log("SHOULD SEE THIS: " +data);
        //} 
      } catch (err) {
        console.log(err);
      }
    });

    socket.on("resizing", function(obj){
      try {
        socket.term.resize(obj.new_col_num, obj.new_row_num); //x is column size, y is row size
      } catch (err) {
        console.log(err);
      }
    });

    socket.on("attempt_to_kill_term", function(){
      try{
        var index_to_erase = self.open_terminals.indexOf(socket); //this will handle removing the closed socket object from the array holding all of the objects

        console.log("array BEFORE: " + self.open_terminals);
        
        if(index_to_erase > -1) {
          //open_terminals.splice(index_to_erase, 1);
          self.open_terminals[index_to_erase] = "";
          console.log("pulled socket out of term array");
        }

        console.log("array AFTER: " + self.open_terminals);


        socket = null;
        //socket.term.write("exit\r");
      } catch (err) {
        console.log(err);
      }
    });

    /////////////////////////////////////////////////////////BRING THESE FUNCTIONS TO THE NEW FILE MANAGER  

    socket.on("git_quick_url_check", function(obj){
      self.value_to_check = obj.string_value;
      self.value_to_check = self.value_to_check.slice(self.value_to_check.lastIndexOf("/") + 1, self.value_to_check.indexOf(".git"));

      //console.log(self.value_to_check);

      if(obj.type_of_term == "private"){
        var prev_clone = self.fs.existsSync(self.main_path + "/files/private/" + obj.user_id + "_private_files/" + self.value_to_check);
      } else if(obj.type_of_term == "shared") {
        var prev_clone = self.fs.existsSync(self.main_path + "/files/" + self.shared_term_connected_to + "/repos/" + self.value_to_check);
        //console.log("Quick shared projID check: " + self.shared_term_connected_to);
      }


      if(prev_clone && self.value_to_check.length > 3){
        socket.emit("prev_git_clone_exists", {exists: 1});
      } else {

        socket.emit("prev_git_clone_exists", {exists: 0});
      }

    });

    socket.on("git_quick_newname_check", function(obj){
      self.newname_value_to_check = obj.string_value;

      //console.log(self.value_to_check);
      if(obj.type_of_term == "private"){
        var prev_clone = self.fs.existsSync(self.main_path + "/files/private/" + obj.user_id + "_private_files/" + self.newname_value_to_check);
      } else if(obj.type_of_term == "shared"){
        var prev_clone = self.fs.existsSync(self.main_path + "/files/" + self.shared_term_connected_to + "/repos/" + self.newname_value_to_check);
      }


      if(prev_clone){
        socket.emit("prev_newname_clone_exists", {exists: 1});
      } else {

        socket.emit("prev_newname_clone_exists", {exists: 0});
      }

    });

    socket.on("git_token_check", function(obj){
      if(obj.type_of_term == "private"){

        self.user.findOne({_id: obj.user_id}, "git_token", function (err, data) {
          if((data.git_token == undefined) || (data.git_token == "erased")){
            socket.emit("git_token_nonexistent");
          }
        });

      } else if (obj.type_of_term == "shared"){

        var is_owned_by = self.fs.existsSync(self.main_path + "/files/" + self.shared_term_connected_to + "/.project_token_owned_by");
        
        if(!is_owned_by){ //there is no "owned_by" file yet, make sure the user has a token to store into a new owned by file!

          console.log("token clone: owned_by file NONEXISTENT, will potentially use " + obj.user_id +" credentials for project " + obj.shared_proj_id + "...if they exist, otherwise will not clone");

          self.user.findOne({_id: obj.user_id}, "git_token", function (err, data) {
            if((data.git_token == undefined) || (data.git_token == "erased")){
              socket.emit("git_shared_token_nonexistent");
            }
          });

        } else if(is_owned_by) {
          console.log("token clone: owned_by file exists, using those credentials for project " + obj.shared_proj_id);
        }

      }

    });

    socket.on("git_pubpriv_check", function(obj){
      if(obj.type_of_term == "private"){
        
        self.user.findOne({_id: obj.user_id}, "git_priv_key", function (err, data) { //only verifying that the user has a private key stored
          if((data.git_priv_key == undefined) || (data.git_priv_key == "erased")){
            socket.emit("git_pubpriv_nonexistent");
          }
        });

      } else if (obj.type_of_term == "shared"){
        var is_owned_by = self.fs.existsSync(self.main_path + "/files/" + self.shared_term_connected_to + "/.project_pubpriv_owned_by");
        
        if(!is_owned_by){ //there is no "owned_by" file yet, make sure the user has a token to store into a new owned by file!

          console.log("pubpriv clone: owned_by file NONEXISTENT, will potentially use " + obj.user_id +" credentials for project " + obj.shared_proj_id + "...if they exist, otherwise will not clone");

          self.user.findOne({_id: obj.user_id}, "git_priv_key", function (err, data) {
            if((data.git_priv_key == undefined) || (data.git_priv_key == "erased")){
              socket.emit("git_shared_pubpriv_nonexistent");
            }
          });

        } else if(is_owned_by) {
          console.log("pubpriv clone: owned_by file exists, using those credentials for project " + obj.shared_proj_id);
        }

      }

    });

    /*socket.on("terminal_browser_refresh", function(){
      self.open_terminals = [];
      self.open_terminal_counter = 0;

    });*/

    socket.on("clone_git_repo_noauth", function(obj){ // ----------------------NO AUTH-------------------------

      console.log("cloning with no authentication");

      if(obj.new_name !== ""){ //we need to make a new directory to clone into, there is already an active clone with the same name
        try{
          if(obj.type_of_term == "private"){
            self.fs.mkdirSync(self.main_path + "/files/private/" + obj.user_id + "_private_files/" + obj.new_name); //create new name directory
          } else if (obj.type_of_term == "shared"){
            self.fs.mkdirSync(self.main_path + "/files/" + self.shared_term_connected_to + "/repos/" + obj.new_name); //create new name directory
          }


        } catch (err) {
          console.log("mkdirSync err: " + err);
        }

        var new_name_url = obj.url.split(self.value_to_check).join(obj.new_name);

        socket.emit("begin_cloning_repo_new_name", {orig_url: obj.url, url_resp: new_name_url});

        
        if(obj.type_of_term == "private"){

          //this line then cd"s into the new repo name folder, runs command as the git_worker with the same UID as the /files DIR and clones the original URL, moves the contents out of the original clone folder and into the newly named folder, and (as the proper user with UID same as /files), removes the originally named clone folder
          var docker_cmd = "\"cd files/private/" + obj.user_id + "_private_files/" + obj.new_name + " ; sudo -u git_worker git clone " + obj.url + " ; cd " + self.value_to_check + "; sudo -u git_worker mv * .* ../ ; cd .. ; sudo -u git_worker rm -r " + self.value_to_check + "; sudo -u git_worker git checkout -b " + obj.new_branch_name + "\"";
        
        } else if (obj.type_of_term == "shared"){
        
          //this line then cd"s into the new repo name folder, runs command as the git_worker with the same UID as the /files DIR and clones the original URL, moves the contents out of the original clone folder and into the newly named folder, and (as the proper user with UID same as /files), removes the originally named clone folder
          var docker_cmd = "\"cd files/" + self.shared_term_connected_to + "/repos/" + obj.new_name + " ; sudo -u git_worker git clone " + obj.url + " ; cd " + self.value_to_check + "; sudo -u git_worker mv * .* ../ ; cd .. ; sudo -u git_worker rm -r " + self.value_to_check + "; sudo -u git_worker git checkout -b " + obj.new_branch_name + "\"";


        }


      } else { //no need to make new directory, the clone does not yet exist

        socket.emit("begin_cloning_repo", {url_resp: obj.url});

        if(obj.type_of_term == "private"){
          var docker_cmd = "\"cd files/private/" + obj.user_id + "_private_files ; sudo -u git_worker git clone " + obj.url + " ; cd " + self.value_to_check + " ; sudo -u git_worker git checkout -b " + obj.new_branch_name + "\"";
        }  else if (obj.type_of_term == "shared"){
          var docker_cmd = "\"cd files/" + self.shared_term_connected_to + "/repos ; sudo -u git_worker git clone " + obj.url + " ; cd " + self.value_to_check + " ; sudo -u git_worker git checkout -b " + obj.new_branch_name + "\"";
        }

      }

      
      self.ts.run("docker exec RW_git_docker bin/bash -c " + docker_cmd, "files/" , function (stdout) { //do the actual clone using the RW docker
        console.log("Finished cloning repo with no authentication\n");
        
        if(obj.type_of_term == "shared" && obj.new_name !== ""){ //shared clone with a duplicate

          //make the .authentication file in the correct path
          var owned_by_descriptor = self.fs.openSync(self.main_path + "/files/" + self.shared_term_connected_to + "/repos/" + obj.new_name + "/.authentication", "w");
          self.fs.writeSync(owned_by_descriptor, "noauth"); 
          self.fs.closeSync(owned_by_descriptor);

          //make the .gitignore so we dont push the .authentication file
          var gitignore_descriptor = self.fs.openSync(self.main_path + "/files/" + self.shared_term_connected_to + "/repos/" + obj.new_name + "/.gitignore", "w");
          self.fs.writeSync(gitignore_descriptor, ".authentication"); 
          self.fs.closeSync(gitignore_descriptor);

          console.log("Created noauth authentication file for shared duplicate clone");


        } else if (obj.type_of_term == "shared" && obj.new_name == "") { //shared clone with no duplicate

          var owned_by_descriptor = self.fs.openSync(self.main_path + "/files/" + self.shared_term_connected_to + "/repos/" + self.value_to_check + "/.authentication", "w");
          self.fs.writeSync(owned_by_descriptor, "noauth"); 
          self.fs.closeSync(owned_by_descriptor);

          //make the .gitignore so we dont push the .authentication file
          var gitignore_descriptor = self.fs.openSync(self.main_path + "/files/" + self.shared_term_connected_to + "/repos/" + self.value_to_check + "/.gitignore", "w");
          self.fs.writeSync(gitignore_descriptor, ".authentication"); 
          self.fs.closeSync(gitignore_descriptor);


          console.log("Created noauth authentication file for shared nonduplicate clone");

        } else if (obj.type_of_term == "private" && obj.new_name !== ""){

          var owned_by_descriptor = self.fs.openSync(self.main_path + "/files/private/" + obj.user_id + "_private_files/" + obj.new_name + "/.authentication", "w");
          self.fs.writeSync(owned_by_descriptor, "noauth"); 
          self.fs.closeSync(owned_by_descriptor);

          //make the .gitignore so we dont push the .authentication file
          var gitignore_descriptor = self.fs.openSync(self.main_path + "/files/private/" + obj.user_id + "_private_files/" + obj.new_name + "/.gitignore", "w");
          self.fs.writeSync(gitignore_descriptor, ".authentication"); 
          self.fs.closeSync(gitignore_descriptor);

          console.log("Created noauth authentication file for private duplicate clone");

        } else if (obj.type_of_term == "private" && obj.new_name == ""){

          var owned_by_descriptor = self.fs.openSync(self.main_path + "/files/private/" + obj.user_id + "_private_files/" + self.value_to_check + "/.authentication", "w");
          self.fs.writeSync(owned_by_descriptor, "noauth"); 
          self.fs.closeSync(owned_by_descriptor);

          //make the .gitignore so we dont push the .authentication file
          var gitignore_descriptor = self.fs.openSync(self.main_path + "/files/private/" + obj.user_id + "_private_files/" + self.value_to_check + "/.gitignore", "w");
          self.fs.writeSync(gitignore_descriptor, ".authentication"); 
          self.fs.closeSync(gitignore_descriptor);


          console.log("Created noauth authentication file for private nonduplicate clone");

        }

        try{
          if(obj.new_name !== ""){
            socket.emit("finish_cloning_repo", {url_resp: obj.new_name, branch_specifier: obj.new_branch_name});
          } else{
            socket.emit("finish_cloning_repo", {url_resp: self.value_to_check, branch_specifier: obj.new_branch_name});
          }
        } catch (err){
          console.log("socket was unavailable to send message..user logged out or socket connection was lost");
        }


      }, function (err) {
        console.log("Could not clone private repo with noauth\n");
        console.log(err);
        socket.emit("err_cloning_git_repo_none", {_error: err});
      }); 

    });

    socket.on("clone_git_repo_token", function(obj){ // ----------------------TOKEN-------------------------
      //need to check if new name is needed here too and apply permissions

      if(obj.type_of_term == "shared"){

        var exists_owned_by = self.fs.existsSync(self.main_path + "/files/" + self.shared_term_connected_to + "/.project_token_owned_by"); //this looks for and makes the owned_by file
        var owned_by_contents = "";


        if(!exists_owned_by){ //no user has cloned a repo yet using a token, store just the token of the current user

          var owned_by_descriptor = self.fs.openSync(self.main_path + "/files/" + self.shared_term_connected_to + "/.project_token_owned_by", "w");
          self.fs.writeSync(owned_by_descriptor, obj.user_id); //write user_id to the new file (this person now uses their token for all cloning using token auth on this project docker)
          self.fs.closeSync(owned_by_descriptor);

          owned_by_contents = obj.user_id; //we can do this because if the owned by file is non-existent, the current user is creating it. We are setting the contents of whos token to find in the DB
          
          console.log("Created owned_by file\n");

          //MUST do checks on client when trying to do a shared clone, LOOK FOR a .owned_by file first (if exists, don"t need anything else...else need user token and if no token, throw error)
          
        } else if(exists_owned_by){
          //open file to get the goods
          owned_by_contents = self.fs.readFileSync(self.main_path + "/files/" + self.shared_term_connected_to + "/.project_token_owned_by");
          console.log("Using previously stored owned_by file\n");
        }

        //now continue with the normal cloning process, using the .owned_by credentials

        var token = "";
        var modified_url = "";

        console.log("token: looking into DB with owned_by ID " + owned_by_contents);
        


        self.user.findOne({_id: owned_by_contents}, "git_token", function (err, data) {
          if (data.git_token == undefined){ //couldn"t find token for the user

            console.log("request to use token and did not find stored token");
            socket.emit("user_token_not_found");
          

          } else { //getting token succeeded, run terminal command

            console.log("Token Recorded: " + data.git_token + " OR error: " + err);
            token = data.git_token;

            //socket.emit("begin_cloning_repo", {url_resp: obj.url});

            modified_url = obj.url.replace("https://", "");

            if(obj.new_name !== ""){ //we need to make a new directory to clone into, there is already an active clone with the same name

              try{
                self.fs.mkdirSync(self.main_path + "/files/" + self.shared_term_connected_to + "/repos/" + obj.new_name); //create new name directory
              } catch (err) {
                console.log("mkdirSync err: " + err);
              }
              

              var new_name_url = obj.url.split(self.value_to_check).join(obj.new_name);

              socket.emit("begin_cloning_repo_new_name", {orig_url: obj.url, url_resp: new_name_url});

              //this line then cd"s into the new repo name folder, runs command as the git_worker with the same UID as the /files DIR and clones the original URL, moves the contents out of the original clone folder and into the newly named folder, and (as the proper user with UID same as /files), removes the originally named clone folder
              //var docker_cmd = "\"cd files/" + obj.proj_id + "/repos/private/" + obj.new_name + " ; sudo -u git_worker git clone " + obj.url + " ; cd " + self.value_to_check + "; sudo -u git_worker mv * ../ ; cd .. ; sudo -u git_worker rm -r " + self.value_to_check + "\"";
              new_name_url = new_name_url.replace("https://", "");

              var docker_cmd = "\"cd files/" + self.shared_term_connected_to + "/repos/" + obj.new_name + " ; sudo -u git_worker git clone https://" + "\\\<" + token + "\\\>" + "@" + modified_url + " ; cd " + self.value_to_check + " ; sudo -u git_worker mv * .* ../ ; cd .. ; sudo -u git_worker rm -r " + self.value_to_check + " ; sudo -u git_worker git checkout -b " + obj.new_branch_name + "\"";
            
            } else { //no need to make new directory, the clone does not yet exist

              socket.emit("begin_cloning_repo", {url_resp: obj.url});

              var docker_cmd = "\"cd files/" + self.hared_term_connected_to + "/repos/ ; sudo -u git_worker git clone https://" + "\\\<" + token + "\\\>" + "@" + modified_url + " ; cd " + self.value_to_check + " ; sudo -u git_worker git checkout -b " + obj.new_branch_name + "\"";

            }

            self.ts.run("docker exec RW_git_docker bin/bash -c " + docker_cmd, "files/" , function (stdout) {
              console.log("Finished cloning shared repo with token\n");

              try{
                if(obj.new_name !== ""){

                  var owned_by_descriptor = self.fs.openSync(self.main_path + "/files/" + self.shared_term_connected_to + "/repos/" + obj.new_name + "/.authentication", "w");
                  self.fs.writeSync(owned_by_descriptor, "token"); 
                  self.fs.closeSync(owned_by_descriptor);
                  console.log("Created token authentication file for shared duplicate clone");

                  var gitignore_descriptor = self.fs.openSync(self.main_path + "/files/" + self.shared_term_connected_to + "/repos/" + obj.new_name + "/.gitignore", "w");
                  self.fs.writeSync(gitignore_descriptor, ".authentication"); 
                  self.fs.closeSync(gitignore_descriptor);

                  socket.emit("finish_cloning_repo", {url_resp: obj.new_name, branch_specifier: obj.new_branch_name});

                } else{

                  var owned_by_descriptor = self.fs.openSync(self.main_path + "/files/" + self.shared_term_connected_to + "/repos/" + self.value_to_check + "/.authentication", "w");
                  self.fs.writeSync(owned_by_descriptor, "token"); 
                  self.fs.closeSync(owned_by_descriptor);
                  console.log("Created token authentication file for shared nonduplicate clone");

                  var gitignore_descriptor = self.fs.openSync(self.main_path + "/files/" + self.shared_term_connected_to + "/repos/" + self.value_to_check + "/.gitignore", "w");
                  self.fs.writeSync(gitignore_descriptor, ".authentication"); 
                  self.fs.closeSync(gitignore_descriptor);

                  socket.emit("finish_cloning_repo", {url_resp: self.value_to_check, branch_specifier: obj.new_branch_name});

                }
              } catch (err){
                console.log("socket was unavailable to send message to ..user logged out or socket connection was lost");
              }


            }, function (err) {
              console.log("Could not clone private repo with token\n");
              console.log(err);
              socket.emit("err_cloning_git_repo_token", {_error: err});
            }); 
          }
        });



      } else if (obj.type_of_term == "private"){


        var token = "";
        var modified_url = "";

        console.log("token: looking into DB with user ID " + obj.user_id);
        
        self.user.findOne({_id: obj.user_id}, "git_token", function (err, data) {
          if (data.git_token == undefined){ //couldn"t find token for the user

            console.log("request to use token and did not find stored token");
            socket.emit("user_token_not_found");
          

          } else { //getting token succeeded, run terminal command

            console.log("Token Recorded: " + data.git_token + " OR error: " + err);
            token = data.git_token;

            //socket.emit("begin_cloning_repo", {url_resp: obj.url});

            modified_url = obj.url.replace("https://", "");

            //var docker_cmd = "\"cd files/" + obj.proj_id + "/repos/private ; git clone https://" + "\\\<" + token + "\\\>" + "@" + modified_url + "\"";

            if(obj.new_name !== ""){ //we need to make a new directory to clone into, there is already an active clone with the same name

              try{
                self.fs.mkdirSync(self.main_path + "/files/private/" + obj.user_id + "_private_files/" + obj.new_name); //create new name directory
              } catch (err) {
                console.log("mkdirSync err: " + err);
              }
              

              var new_name_url = obj.url.split(self.value_to_check).join(obj.new_name);

              socket.emit("begin_cloning_repo_new_name", {orig_url: obj.url, url_resp: new_name_url});

              //this line then cd"s into the new repo name folder, runs command as the git_worker with the same UID as the /files DIR and clones the original URL, moves the contents out of the original clone folder and into the newly named folder, and (as the proper user with UID same as /files), removes the originally named clone folder
              //var docker_cmd = "\"cd files/" + obj.proj_id + "/repos/private/" + obj.new_name + " ; sudo -u git_worker git clone " + obj.url + " ; cd " + self.value_to_check + "; sudo -u git_worker mv * ../ ; cd .. ; sudo -u git_worker rm -r " + self.value_to_check + "\"";
              new_name_url = new_name_url.replace("https://", "");

              var docker_cmd = "\"cd files/private/" + obj.user_id + "_private_files/" + obj.new_name + " ; sudo -u git_worker git clone https://" + "\\\<" + token + "\\\>" + "@" + modified_url + " ; cd " + self.value_to_check + " ; sudo -u git_worker mv * .* ../ ; cd .. ; sudo -u git_worker rm -r " + self.value_to_check + " ; sudo -u git_worker git checkout -b " + obj.new_branch_name + "\"";
            
            } else { //no need to make new directory, the clone does not yet exist

              socket.emit("begin_cloning_repo", {url_resp: obj.url});

              var docker_cmd = "\"cd files/private/" + obj.user_id + "_private_files ; sudo -u git_worker git clone https://" + "\\\<" + token + "\\\>" + "@" + modified_url + " ; cd " + self.value_to_check + " ; sudo -u git_worker git checkout -b " + obj.new_branch_name + "\"";

            }

            self.ts.run("docker exec RW_git_docker bin/bash -c " + docker_cmd, "files/" , function (stdout) {
              console.log("Finished cloning private repo with token\n");
              try{
                if(obj.new_name !== ""){

                  var owned_by_descriptor = self.fs.openSync(self.main_path + "/files/private/" + obj.user_id + "_private_files/" + obj.new_name + "/.authentication", "w");
                  self.fs.writeSync(owned_by_descriptor, "token"); 
                  self.fs.closeSync(owned_by_descriptor);
                  console.log("Created token authentication file for private duplicate clone");

                  var gitignore_descriptor = self.fs.openSync(self.main_path + "/files/private/" + obj.user_id + "_private_files/" + obj.new_name + "/.gitignore", "w");
                  self.fs.writeSync(gitignore_descriptor, ".authentication"); 
                  self.fs.closeSync(gitignore_descriptor);
                  
                  socket.emit("finish_cloning_repo", {url_resp: obj.new_name, branch_specifier: obj.new_branch_name});
                
                } else{
                  
                  var owned_by_descriptor = self.fs.openSync(self.main_path + "/files/private/" + obj.user_id + "_private_files/" + self.value_to_check + "/.authentication", "w");
                  self.fs.writeSync(owned_by_descriptor, "token"); 
                  self.fs.closeSync(owned_by_descriptor);
                  console.log("Created token authentication file for private nonduplicate clone");

                  var gitignore_descriptor = self.fs.openSync(self.main_path + "/files/private/" + obj.user_id + "_private_files/" + self.value_to_check + "/.gitignore", "w");
                  self.fs.writeSync(gitignore_descriptor, ".authentication"); 
                  self.fs.closeSync(gitignore_descriptor);

                  socket.emit("finish_cloning_repo", {url_resp: self.value_to_check, branch_specifier: obj.new_branch_name});
                
                }
              } catch (err){
                console.log("socket was unavailable to send message to ..user logged out or socket connection was lost");
              }

            }, function (err) {
              console.log("Could not clone private repo with token\n");
              console.log(err);
              socket.emit("err_cloning_git_repo_token", {_error: err});
            }); 
          }
        });
      }

    });

    socket.on("clone_git_repo_pubpriv", function(obj){ // ----------------------PUB PRIV KEY-------------------------

      if(obj.type_of_term == "shared"){

        var exists_owned_by = self.fs.existsSync(self.main_path + "/files/" + self.shared_term_connected_to + "/.project_pubpriv_owned_by"); //this looks for and makes the owned_by file
        var owned_by_contents = "";


        if(!exists_owned_by){ //no user has cloned a repo yet using a token, store just the token of the current user

          var owned_by_descriptor = self.fs.openSync(self.main_path + "/files/" + self.shared_term_connected_to + "/.project_pubpriv_owned_by", "w");
          self.fs.writeSync(owned_by_descriptor, obj.user_id); //write user_id to the new file (this person now uses their token for all cloning using token auth on this project docker)
          self.fs.closeSync(owned_by_descriptor);

          owned_by_contents = obj.user_id; //we can do this because is the owned by file is non-existent, the current user is creating it

          console.log("Created owned_by file\n");

          //MUST do checks on client when trying to do a shared clone, LOOK FOR a .owned_by file first (if exists, don"t need anything else...else need user token and if no token, throw error)
          
        } else if(exists_owned_by){
          //open file to get the goods
          owned_by_contents = self.fs.readFileSync(self.main_path + "/files/" + self.shared_term_connected_to + "/.project_pubpriv_owned_by");
        }

        //need to check if new name is needed here too and apply permissions
        var pub = "";
        var priv = "";

        console.log("pubpriv: looking into DB with owned_by ID " + owned_by_contents);

        self.user.findOne({_id: owned_by_contents}, "git_pub_key", function (err, data) {
          //console.log("Public Key Recorded: " + data.git_pub_key + " OR error: " + err);
          pub = data.git_pub_key;

          if(data.git_pub_key == undefined){
            
            console.log("request to use pubpriv and did not find stored token");
            socket.emit("user_pubpriv_not_found");

          } else {


            self.user.findOne({_id: owned_by_contents}, "git_priv_key", function (err, data) {
              //console.log("Private Key Recorded: \n" + data.git_priv_key + " OR error: " + err);
              priv = data.git_priv_key;

              var host = obj.url.substring(obj.url.indexOf("@") + 1, obj.url.indexOf(":"));

              self.fs.writeFileSync(self.main_path + "/files/" + self.shared_term_connected_to + "/." + owned_by_contents + ".user_pub", pub); //store the master pub/priv key in hidden file within the project folder

              self.fs.writeFileSync(self.main_path + "/files/" + self.shared_term_connected_to + "/." + owned_by_contents + ".user_priv", priv);


              if(obj.new_name !== ""){

                try{
                  self.fs.mkdirSync(self.main_path + "/files/" + self.shared_term_connected_to + "/repos/" + obj.new_name); //create new name directory
                } catch (err) {
                  console.log("mkdirSync err: " + err);
                }

                
                var new_name_url = obj.url.split(self.value_to_check).join(obj.new_name);

                socket.emit("begin_cloning_repo_new_name", {orig_url: obj.url, url_resp: new_name_url});

                var docker_cmd = "\" useradd -m pub_priv_worker ; mkdir /home/pub_priv_worker/.ssh ; cd /files/" + self.shared_term_connected_to + " ; cp ." + owned_by_contents + ".user_priv /home/pub_priv_worker/.ssh/id_rsa ; touch /home/pub_priv_worker/.ssh/known_hosts ; ssh-keyscan " + host + " \> /home/pub_priv_worker/.ssh/known_hosts ; cd /files/" + self.shared_term_connected_to + "/repos/" + obj.new_name + " ; sudo -u pub_priv_worker git clone " + obj.url + "\""; //put pub/priv key in proper place, 



                self.ts.run("docker run --rm --volumes-from RW_git_docker mascucsc/liveos_terminal_ubuntu bin/bash -c " + docker_cmd, "files/" , function (stdout) { //use separate docker to clone using pub/priv key to avoid conflicts, destroy it when finished (don"t use -i persistence)
                      
                  console.log("repo has been cloned, execute housekeeping"); //the housekeeping is done separately here to allow the git clone command to fail with an error to the screen if the pubpriv key are not correct

                  //THIS IS THE PROBLEM CHILD WITH MV FILES CHECK HERE
                  var docker_housekeeping_cmd = "\" useradd -m pub_priv_worker ; cd /files/" + self.shared_term_connected_to + "/repos/" + obj.new_name + "/" + self.value_to_check + " ; sudo -u pub_priv_worker mv * .* ../ ; cd .. ; sudo -u pub_priv_worker rm -r " + self.value_to_check + " ; sudo -u pub_priv_worker git checkout -b " + obj.new_branch_name + "\"";

                  self.ts.run("docker run --rm --volumes-from RW_git_docker mascucsc/liveos_terminal_ubuntu bin/bash -c " + docker_housekeeping_cmd, "files/" , function (stdout) { //use separate docker to clone using pub/priv key to avoid conflicts, destroy it when finished (don"t use -i persistence)
                    console.log("Finished cloning private repo with pubpriv\n");
                    try{
                      if(obj.new_name !== ""){

                        var owned_by_descriptor = self.fs.openSync(self.main_path + "/files/" + self.shared_term_connected_to + "/repos/" + obj.new_name + "/.authentication", "w");
                        self.fs.writeSync(owned_by_descriptor, "pubpriv"); 
                        self.fs.closeSync(owned_by_descriptor);
                        console.log("Created pubpriv authentication file for shared duplicate clone");

                        var gitignore_descriptor = self.fs.openSync(self.main_path + "/files/" + self.shared_term_connected_to + "/repos/" + obj.new_name + "/.gitignore", "w");
                        self.fs.writeSync(gitignore_descriptor, ".authentication"); 
                        self.fs.closeSync(gitignore_descriptor);
                        
                        socket.emit("finish_cloning_repo", {url_resp: obj.new_name, branch_specifier: obj.new_branch_name});
                      
                      } else{
                        
                        var owned_by_descriptor = self.fs.openSync(self.main_path + "/files/" + self.shared_term_connected_to + "/repos/" + self.value_to_check + "/.authentication", "w");
                        self.fs.writeSync(owned_by_descriptor, "pubpriv"); 
                        self.fs.closeSync(owned_by_descriptor);
                        console.log("Created pubpriv authentication file for shared nonduplicate clone");

                        var gitignore_descriptor = self.fs.openSync(self.main_path + "/files/" + self.shared_term_connected_to + "/repos/" + self.value_to_check + "/.gitignore", "w");
                        self.fs.writeSync(gitignore_descriptor, ".authentication"); 
                        self.fs.closeSync(gitignore_descriptor);

                        socket.emit("finish_cloning_repo", {url_resp: self.value_to_check, branch_specifier: obj.new_branch_name});
                      
                      } 
                    } catch (err){
                      console.log("socket was unavailable to send message to ..user logged out or socket connection was lost");
                    }

                  }, function (err) {
                    console.log("Could not clone private repo with pubpriv\n");
                    console.log(err);
                    socket.emit("err_cloning_git_repo_pubpriv", {_error: err});
                  });


                }, function (err) {
                  console.log("Could not clone private repo with pubpriv\n");
                  console.log(err);
                  socket.emit("err_cloning_git_repo_pubpriv", {_error: err});
                });

              } else {

                socket.emit("begin_cloning_repo", {url_resp: obj.url});

                var docker_cmd = "\" useradd -m pub_priv_worker ; mkdir /home/pub_priv_worker/.ssh ; cd /files/" + self.shared_term_connected_to + " ; cp ." + owned_by_contents + ".user_priv /home/pub_priv_worker/.ssh/id_rsa ; touch /home/pub_priv_worker/.ssh/known_hosts ; ssh-keyscan " + host + " \> /home/pub_priv_worker/.ssh/known_hosts ; cd /files/" + self.shared_term_connected_to + "/repos/ ; sudo -u pub_priv_worker git clone " + obj.url + " ; cd " + self.value_to_check + " ; sudo -u pub_priv_worker git checkout -b " + obj.new_branch_name + "\""; //put pub/priv key in proper place, 
              

                self.ts.run("docker run --rm --volumes-from RW_git_docker mascucsc/liveos_terminal_ubuntu bin/bash -c " + docker_cmd, "files/" , function (stdout) { //use separate docker to clone using pub/priv key to avoid conflicts, destroy it when finished (don"t use -i persistence)
                  console.log("Finished cloning shared repo with pubpriv\n");
                  try{
                    if(obj.new_name !== ""){

                      var owned_by_descriptor = self.fs.openSync(self.main_path + "/files/" + self.shared_term_connected_to + "/repos/" + obj.new_name + "/.authentication", "w");
                      self.fs.writeSync(owned_by_descriptor, "pubpriv"); 
                      self.fs.closeSync(owned_by_descriptor);
                      console.log("Created pubpriv authentication file for shared duplicate clone");

                      var gitignore_descriptor = self.fs.openSync(self.main_path + "/files/" + self.shared_term_connected_to + "/repos/" + obj.new_name + "/.gitignore", "w");
                      self.fs.writeSync(gitignore_descriptor, ".authentication"); 
                      self.fs.closeSync(gitignore_descriptor);
                      
                      socket.emit("finish_cloning_repo", {url_resp: obj.new_name, branch_specifier: obj.new_branch_name});
                    
                    } else{
                      
                      var owned_by_descriptor = self.fs.openSync(self.main_path + "/files/" + self.shared_term_connected_to + "/repos/" + self.value_to_check + "/.authentication", "w");
                      self.fs.writeSync(owned_by_descriptor, "pubpriv"); 
                      self.fs.closeSync(owned_by_descriptor);
                      console.log("Created pubpriv authentication file for shared nonduplicate clone");

                      var gitignore_descriptor = self.fs.openSync(self.main_path + "/files/" + self.shared_term_connected_to + "/repos/" + self.value_to_check + "/.gitignore", "w");
                      self.fs.writeSync(gitignore_descriptor, ".authentication"); 
                      self.fs.closeSync(gitignore_descriptor);

                      socket.emit("finish_cloning_repo", {url_resp: self.value_to_check, branch_specifier: obj.new_branch_name});
                    
                    } 

                  } catch (err){
                    console.log("socket was unavailable to send message to ..user logged out or socket connection was lost");
                  }

                }, function (err) {
                  console.log("Could not clone shared repo with pubpriv\n");
                  console.log(err);
                  socket.emit("err_cloning_git_repo_pubpriv", {_error: err});
                });

              }

            });

          }

        });

      } else if (obj.type_of_term == "private"){

        //need to check if new name is needed here too and apply permissions
        var pub = "";
        var priv = "";

        console.log("pubpriv: looking into DB with user ID " + obj.user_id);

        self.user.findOne({_id: obj.user_id}, "git_pub_key", function (err, data) {
          //console.log("Public Key Recorded: " + data.git_pub_key + " OR error: " + err);
          pub = data.git_pub_key;

          if(data.git_pub_key == undefined){
            
            console.log("request to use pubpriv and did not find stored token");
            socket.emit("user_pubpriv_not_found");

          } else {


            self.user.findOne({_id: obj.user_id}, "git_priv_key", function (err, data) {
              //console.log("Private Key Recorded: \n" + data.git_priv_key + " OR error: " + err);
              priv = data.git_priv_key;

              var host = obj.url.substring(obj.url.indexOf("@") + 1, obj.url.indexOf(":"));

              self.fs.writeFileSync(self.main_path +"/files/private/" + obj.user_id + "_private_files/.user_pub", pub);

              self.fs.writeFileSync(self.main_path +"/files/private/" + obj.user_id + "_private_files/.user_priv", priv);


              if(obj.new_name !== ""){

                try{
                  self.fs.mkdirSync(self.main_path + "/files/private/" + obj.user_id + "_private_files/" + obj.new_name); //create new name directory
                } catch (err) {
                  console.log("mkdirSync err: " + err);
                }

                
                var new_name_url = obj.url.split(self.value_to_check).join(obj.new_name);

                socket.emit("begin_cloning_repo_new_name", {orig_url: obj.url, url_resp: new_name_url});

                var docker_cmd = "\" useradd -m pub_priv_worker ; mkdir /home/pub_priv_worker/.ssh ; cd /files/private/" + obj.user_id + "_private_files ; cp .user_priv /home/pub_priv_worker/.ssh/id_rsa ; touch /home/pub_priv_worker/.ssh/known_hosts ; ssh-keyscan " + host + " \> /home/pub_priv_worker/.ssh/known_hosts ; cd /files/private/" + obj.user_id + "_private_files/" + obj.new_name + " ; sudo -u pub_priv_worker git clone " + obj.url + "\""; //put pub/priv key in proper place, 



                self.ts.run("docker run --rm --volumes-from RW_git_docker mascucsc/liveos_terminal_ubuntu bin/bash -c " + docker_cmd, "files/" , function (stdout) { //use separate docker to clone using pub/priv key to avoid conflicts, destroy it when finished (don"t use -i persistence)
                      
                  console.log("repo has been cloned, execute housekeeping"); //the housekeeping is done separately here to allow the git clone command to fail with an error to the screen if the pubpriv key are not correct


                  var docker_housekeeping_cmd = "\" useradd -m  pub_priv_worker ; cd /files/private/" + obj.user_id + "_private_files/" + obj.new_name + "/" + self.value_to_check + " ; sudo -u pub_priv_worker mv * .* ../ ; cd .. ; sudo -u pub_priv_worker rm -r " + self.value_to_check + " ; sudo -u pub_priv_worker git checkout -b " + obj.new_branch_name + "\"";

                  self.ts.run("docker run --rm --volumes-from RW_git_docker mascucsc/liveos_terminal_ubuntu bin/bash -c " + docker_housekeeping_cmd, "files/" , function (stdout) { //use separate docker to clone using pub/priv key to avoid conflicts, destroy it when finished (don"t use -i persistence)
                    console.log("Finished cloning private repo with pubpriv\n");
                    try{
                      if(obj.new_name !== ""){

                        var owned_by_descriptor = self.fs.openSync(self.main_path + "/files/private/" + obj.user_id + "_private_files/" + obj.new_name + "/.authentication", "w");
                        self.fs.writeSync(owned_by_descriptor, "pubpriv"); 
                        self.fs.closeSync(owned_by_descriptor);
                        console.log("Created pubpriv authentication file for private duplicate clone");

                        var gitignore_descriptor = self.fs.openSync(self.main_path + "/files/private/" + obj.user_id + "_private_files/" + obj.new_name + "/.gitignore", "w");
                        self.fs.writeSync(gitignore_descriptor, ".authentication"); 
                        self.fs.closeSync(gitignore_descriptor);


                        socket.emit("finish_cloning_repo", {url_resp: obj.new_name, branch_specifier: obj.new_branch_name});
                      
                      } else{
                        
                        var owned_by_descriptor = self.fs.openSync(self.main_path + "/files/private/" + obj.user_id + "_private_files/" + self.value_to_check + "/.authentication", "w");
                        self.fs.writeSync(owned_by_descriptor, "pubpriv"); 
                        self.fs.closeSync(owned_by_descriptor);
                        console.log("Created pubpriv authentication file for private nonduplicate clone");

                        var gitignore_descriptor = self.fs.openSync(self.main_path + "/files/private/" + obj.user_id + "_private_files/" + self.value_to_check + "/.gitignore", "w");
                        self.fs.writeSync(gitignore_descriptor, ".authentication"); 
                        self.fs.closeSync(gitignore_descriptor);

                        socket.emit("finish_cloning_repo", {url_resp: self.value_to_check, branch_specifier: obj.new_branch_name});
                      
                      } 
                    } catch (err){
                      console.log("socket was unavailable to send message to ..user logged out or socket connection was lost");
                    }

                  }, function (err) {
                    console.log("Could not clone private repo with pubpriv\n");
                    console.log(err);
                    socket.emit("err_cloning_git_repo_pubpriv", {_error: err});
                  });


                }, function (err) {
                  console.log("Could not clone private repo with pubpriv\n");
                  console.log(err);
                  socket.emit("err_cloning_git_repo_pubpriv", {_error: err});
                });

              } else {

                socket.emit("begin_cloning_repo", {url_resp: obj.url});

                var docker_cmd = "\" useradd -m pub_priv_worker ; mkdir /home/pub_priv_worker/.ssh ; cd /files/private/" + obj.user_id + "_private_files ; cp .user_priv /home/pub_priv_worker/.ssh/id_rsa ; touch /home/pub_priv_worker/.ssh/known_hosts ; ssh-keyscan " + host + " \> /home/pub_priv_worker/.ssh/known_hosts ; sudo -u pub_priv_worker git clone " + obj.url + " ; cd " + self.value_to_check + " ; sudo -u pub_priv_worker git checkout -b " + obj.new_branch_name + "\""; //put pub/priv key in proper place, 
              

                self.ts.run("docker run --rm --volumes-from RW_git_docker mascucsc/liveos_terminal_ubuntu bin/bash -c " + docker_cmd, "files/" , function (stdout) { //use separate docker to clone using pub/priv key to avoid conflicts, destroy it when finished (don"t use -i persistence)
                  console.log("Finished cloning private repo with pubpriv\n");
                  try{
                    if(obj.new_name !== ""){

                      var owned_by_descriptor = self.fs.openSync(self.main_path + "/files/private/" + obj.user_id + "_private_files/" + obj.new_name + "/.authentication", "w");
                      self.fs.writeSync(owned_by_descriptor, "pubpriv"); 
                      self.fs.closeSync(owned_by_descriptor);
                      console.log("Created pubpriv authentication file for private duplicate clone");

                      var gitignore_descriptor = self.fs.openSync(self.main_path + "/files/private/" + obj.user_id + "_private_files/" + obj.new_name + "/.gitignore", "w");
                      self.fs.writeSync(gitignore_descriptor, ".authentication"); 
                      self.fs.closeSync(gitignore_descriptor);

                      socket.emit("finish_cloning_repo", {url_resp: obj.new_name, branch_specifier: obj.new_branch_name});                    

                    } else{

                      var owned_by_descriptor = self.fs.openSync(self.main_path + "/files/private/" + obj.user_id + "_private_files/" + self.value_to_check + "/.authentication", "w");
                      self.fs.writeSync(owned_by_descriptor, "pubpriv"); 
                      self.fs.closeSync(owned_by_descriptor);
                      console.log("Created pubpriv authentication file for private nonduplicate clone");

                      var gitignore_descriptor = self.fs.openSync(self.main_path + "/files/private/" + obj.user_id + "_private_files/" + self.value_to_check + "/.gitignore", "w");
                      self.fs.writeSync(gitignore_descriptor, ".authentication"); 
                      self.fs.closeSync(gitignore_descriptor);

                      socket.emit("finish_cloning_repo", {url_resp: self.value_to_check, branch_specifier: obj.new_branch_name});
                    
                    }
                  } catch (err){
                    console.log("socket was unavailable to send message to ..user logged out or socket connection was lost");
                  }


                }, function (err) {
                  console.log("Could not clone private repo with pubpriv\n");
                  console.log(err);
                  socket.emit("err_cloning_git_repo_pubpriv", {_error: err});
                });

              }

            });

          }

        });
      }

    });

    socket.on("clone_git_repo_pass", function(obj){ // ----------------------USR PASS COMBO-------------------------
      //need to check if new name is needed here too and apply permissions

      console.log("spawning term to authenticate with username and pass");
      //socket.emit("begin_cloning_repo", {url_resp: obj.url});

      if(obj.new_name !== ""){ //we need to make a new directory to clone into, there is already an active clone with the same name

        try{

          if(obj.type_of_term == "private"){
            self.fs.mkdirSync(self.main_path + "/files/private/" + obj.user_id + "_private_files/" + obj.new_name); //create new name directory
          } else if (obj.type_of_term == "shared"){
            self.fs.mkdirSync(self.main_path + "/files/" + self.shared_term_connected_to + "/repos/" + obj.new_name); //create new name directory
          }

        } catch (err) {
          console.log("mkdirSync err: " + err);
        }
        
        modified_url = obj.url.replace("https://", "");

        var new_name_url = obj.url.split(self.value_to_check).join(obj.new_name);

        socket.emit("begin_cloning_repo_new_name", {orig_url: obj.url, url_resp: new_name_url});
     
        if(obj.type_of_term == "private"){
          var docker_cmd = "\"cd files/private/" + obj.user_id + "_private_files/" + obj.new_name + " ; sudo -u git_worker git clone https://" + obj.username + ":" + obj.password + "@" + modified_url + " ; cd " + self.value_to_check + " ; sudo -u git_worker mv * .* ../ ; cd .. ; sudo -u git_worker rm -r " + self.value_to_check + "; sudo -u git_worker git checkout -b " + obj.new_branch_name + "\"";
        } else if (obj.type_of_term == "shared"){
          var docker_cmd = "\"cd files/" + self.shared_term_connected_to + "/repos/" + obj.new_name + " ; sudo -u git_worker git clone https://" + obj.username + ":" + obj.password + "@" + modified_url + " ; cd " + self.value_to_check + " ; sudo -u git_worker mv * .* ../ ; cd .. ; sudo -u git_worker rm -r " + self.value_to_check + "; sudo -u git_worker git checkout -b " + obj.new_branch_name + "\"";

        }

      } else { //no need to make new directory, the clone does not yet exist

        socket.emit("begin_cloning_repo", {url_resp: obj.url});

        modified_url = obj.url.replace("https://", "");

        if(obj.type_of_term == "private"){
          var docker_cmd = "\"cd files/private/" + obj.user_id + "_private_files ; sudo -u git_worker git clone https://" + obj.username + ":" + obj.password + "@" + modified_url + "; cd " + self.value_to_check + " ; sudo -u git_worker git checkout -b " + obj.new_branch_name + "\"";
        } else if(obj.type_of_term == "shared"){
          var docker_cmd = "\"cd files/" + self.shared_term_connected_to + "/repos ; sudo -u git_worker git clone https://" + obj.username + ":" + obj.password + "@" + modified_url + "; cd " + self.value_to_check + " ; sudo -u git_worker git checkout -b " + obj.new_branch_name + "\"";
        }

      }

      self.ts.run("docker exec RW_git_docker bin/bash -c " + docker_cmd, "files/" , function (stdout) {
        console.log("Finished cloning private repo usr/pass\n");
        
        if(obj.type_of_term == "shared" && obj.new_name !== ""){ //shared clone with a duplicate

          //make the .authentication file in the correct path
          var owned_by_descriptor = self.fs.openSync(self.main_path + "/files/" + self.shared_term_connected_to + "/repos/" + obj.new_name + "/.authentication", "w");
          self.fs.writeSync(owned_by_descriptor, "pass"); 
          self.fs.closeSync(owned_by_descriptor);
          console.log("Created pass authentication file for shared duplicate clone");

          var gitignore_descriptor = self.fs.openSync(self.main_path + "/files/" + self.shared_term_connected_to + "/repos/" + obj.new_name + "/.gitignore", "w");
          self.fs.writeSync(gitignore_descriptor, ".authentication"); 
          self.fs.closeSync(gitignore_descriptor);


        } else if (obj.type_of_term == "shared" && obj.new_name == "") { //shared clone with no duplicate

          var owned_by_descriptor = self.fs.openSync(self.main_path + "/files/" + self.shared_term_connected_to + "/repos/" + self.value_to_check + "/.authentication", "w");
          self.fs.writeSync(owned_by_descriptor, "pass"); 
          self.fs.closeSync(owned_by_descriptor);
          console.log("Created pass authentication file for shared nonduplicate clone");

          var gitignore_descriptor = self.fs.openSync(self.main_path + "/files/" + self.shared_term_connected_to + "/repos/" + self.value_to_check + "/.gitignore", "w");
          self.fs.writeSync(gitignore_descriptor, ".authentication"); 
          self.fs.closeSync(gitignore_descriptor);

        } else if (obj.type_of_term == "private" && obj.new_name !== ""){

          var owned_by_descriptor = self.fs.openSync(self.main_path + "/files/private/" + obj.user_id + "_private_files/" + obj.new_name + "/.authentication", "w");
          self.fs.writeSync(owned_by_descriptor, "pass"); 
          self.fs.closeSync(owned_by_descriptor);
          console.log("Created pass authentication file for private duplicate clone");

          var gitignore_descriptor = self.fs.openSync(self.main_path + "/files/private/" + obj.user_id + "_private_files/" + obj.new_name + "/.gitignore", "w");
          self.fs.writeSync(gitignore_descriptor, ".authentication"); 
          self.fs.closeSync(gitignore_descriptor);

        } else if (obj.type_of_term == "private" && obj.new_name == ""){

          var owned_by_descriptor = self.fs.openSync(self.main_path + "/files/private/" + obj.user_id + "_private_files/" + self.value_to_check + "/.authentication", "w");
          self.fs.writeSync(owned_by_descriptor, "pass"); 
          self.fs.closeSync(owned_by_descriptor);
          console.log("Created pass authentication file for private nonduplicate clone");

          var gitignore_descriptor = self.fs.openSync(self.main_path + "/files/private/" + obj.user_id + "_private_files/" + self.value_to_check + "/.gitignore", "w");
          self.fs.writeSync(gitignore_descriptor, ".authentication"); 
          self.fs.closeSync(gitignore_descriptor);


        }

        try{
          if(obj.new_name !== ""){
            socket.emit("finish_cloning_repo", {url_resp: obj.new_name, branch_specifier: obj.new_branch_name});
          } else{
            socket.emit("finish_cloning_repo", {url_resp: self.value_to_check, branch_specifier: obj.new_branch_name});
          }
        } catch (err){
          console.log("socket was unavailable to send message to ..user logged out or socket connection was lost");
        }


      }, function (err) {
        console.log("Could not clone private repo with usr/pass\n");
        console.log(err);
        socket.emit("err_cloning_git_repo_pass", {_error: err});
      }); 

    });

    socket.on("disconnect", function() {

      try{
        if(! socket.term.pid) return;
      }catch (err) {
        console.log("no socket.term.pid to disconnect from " + err);
      }
        
      try {
        /*private_terminal_dockers = [];
        shared_terminal_dockers = [];
        self.ts.run("docker kill $(docker ps -a -q); docker rm $(docker ps -a -q)", "files/" , function (stdout) {
          console.log("Server disconnect. Killing running docker containers" + "\n");

        }, function (err) {
          console.log(err);
        });*/

        var index_to_erase = self.open_terminals.indexOf(socket); //this will handle removing the closed socket object from the array holding all of the objects

        console.log("array BEFORE: " + self.open_terminals);
        
        if(index_to_erase > -1) {
          //open_terminals.splice(index_to_erase, 1);
          self.open_terminals[index_to_erase] = "";
          console.log("pulled socket out of term array");
        }

        console.log("array AFTER: " + self.open_terminals);

        socket.term.destroy();
        socket.term._close();
        socket.term.kill();
        

      } catch (err) {
        console.log("Terminal shell: Error -> " + err);
    };
      socket = null;
    });

  });

};
