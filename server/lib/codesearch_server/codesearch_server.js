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

module.exports = function (main_path, io, ts, fsio) {
  var self = this;
  this.watch = require("node-watch");
  this.fs = require("fs");
  this.ot  = require("ot");
  this.ts = ts;
  this.fsio = fsio;
  this.source_folder = main_path + "/files/";
  this.help_file_path = main_path + "/misc/assistance_folder";
  this.trick_path = main_path + "/server/lib/codesearch_server/trickyfile"; 
  this.index_path = main_path + "/indexes/";
  this.ide_path = main_path;


  this.fse = require("fs-extra");
  this.home_folder = main_path + "/files";
  this.cm_servers = [];
  this.io = io;
  this.touch_flags = {};
  this.self_touch = {};

  var proj_id;
  var csearch_stdout = [];
  var csearch_lines = [];
  var csearch_filename = []; 
  var csearch_return_buffer = [];
  var first_colored_stdout = "";
  var return_count = 1;
  
  var test_path = "";
  var emit_flag = false;
  var enter_counter = 0;
  var request = [];
  var cmd_status = false;
  var csearch_cmd_arr = [];
  var saved_key_array = "";
  var sever_restart_reindexing = false;
  var touched_files = [];
  var touched_files_timestamp = [];
  var ahh_help_flag = false;


  //every 4 hours, reindex each project
  //watch all open files, reindex that file per one minute intervals, reindex when closed for that file as well
  //if files are added, should index them immediately

  var exists_folder = this.fs.existsSync(this.index_path); //this makes the indexes folder if it doesn"t exist

  if(!exists_folder){
    
    console.log("Creating /indexes folder\n");

    //var create_index_folder_cmd = "mkdir indexes";

    this.fs.mkdirSync(self.index_path);

  }else if (exists_folder){
    console.log("Index folder exists.\n");
  }


  var proj_dirs = self.fs.readdirSync(self.source_folder); // This regens all indexes on server restart

  console.log("SERVER RESTART REGEN for all index files: " + proj_dirs);
  sever_restart_reindexing = true;

  var regen_index_cron = "";

  regen_index_cron += "export CSEARCHINDEX=" + self.index_path + ".indexfor_helpfile ; cindex -reset " + self.help_file_path + " ; ";

  for(var i = 0; i < proj_dirs.length; i++){

    regen_index_cron += "export CSEARCHINDEX=" + self.index_path + ".indexfor_" + proj_dirs[i] + ";" + "cindex -reset " + self.source_folder + proj_dirs[i] + " ; ";

  } 

  

  this.ts.run(regen_index_cron, "files/" , function (stdout) {
    console.log("SERVER RESTART REGEN finished" + "\n");
    sever_restart_reindexing = false;

  }, function (err) {
    console.log("SERVER RESTART REGEN REGEN finished" + "\n");
    sever_restart_reindexing = false;
    console.log(err);
  });

  
  this.fsio.on("connect", function(){ //this broadcasts that we want to know of files that are being changed
    self.fsio.emit("watch_touch", {path: "/"});
  });


  this.fsio.on("file_touched", function(obj) { //this happens when a file is changed, this is sent from OT
    var file_last_modified;
    if(touched_files.indexOf(obj.file_id) == -1){ //file doesnt exist
      
      try{

        file_last_modified = self.fs.statSync(self.source_folder + obj.file_id).mtime.getTime();

      } catch (err){
        console.log("regeneration err, looking for a file OUTSIDE of /liveos/files dir: " + err);

      }


      touched_files_timestamp.push(obj.file_id + "$$$" + file_last_modified);
      touched_files.push(obj.file_id);

      console.log("FILE wasnt being watched: " + obj.file_id + ", and now it is: " + touched_files_timestamp);


    }else{ //file exists in array, check last time we have stored that it was modified
      var index = touched_files.indexOf(obj.file_id);
      var substr_prev_modified_time = touched_files_timestamp[index].substring(touched_files_timestamp[index].indexOf("$$$") + 3);
      
      try{

        file_just_modified = self.fs.statSync(self.source_folder + obj.file_id).mtime.getTime();

      } catch (err){
        console.log("regeneration err, looking for a file OUTSIDE of /liveos/files dir: " + err);

      }
      console.log("FILE was being watched, OLD TS: " + touched_files_timestamp[index] + " NEW TS: " + file_just_modified);

      if(file_just_modified - substr_prev_modified_time >= 300000){ //file is over 5 minutes old

        console.log("FILE was 5 minutes old w/o changes, reindex: " + obj.file_id);

        var chopped_return_file = obj.file_id.substring(0, obj.file_id.indexOf("/"));
        
        var regen_file_index = "export CSEARCHINDEX=" + self.index_path + ".indexfor_" + chopped_return_file + ";" + "cindex " + self.source_folder + obj.file_id;
      
        self.ts.run(regen_file_index, "files/" , function (stdout) {
          console.log("REGEN FILE INDEX bc of old file age: complete\n");
        }, function (err) {
          console.log(err);
        });

        touched_files.splice(index, 1); //regen"d index for file, remove from list
        touched_files_timestamp.splice(index, 1);

      }

    }

  });


  this.interval_cron = setInterval(function () { // this will run every 5 minutes to check the list of recent changed filed

    var curr_time = Date.now();
    console.log("CRON regen checking potentially stale files: " + touched_files);
    console.log("CURRENT time is: " + curr_time);

    for (var i = 0; i < touched_files.length; i++){
      var file_last_modified = self.fs.statSync(self.source_folder + touched_files[i]).mtime.getTime();

      console.log(touched_files[i] + " LAST MODIFIED AT: " + file_last_modified);

      if(curr_time - file_last_modified >= 240000){ //4 minutes old changes

        console.log("CRON found stale files, regen index for: " + touched_files[i] + "AND remove it from the queue");

        var chopped_return_file = touched_files[i].substring(0, touched_files[i].indexOf("/"));
        
        var regen_file_index = "export CSEARCHINDEX=" + self.index_path + ".indexfor_" + chopped_return_file + ";" + "cindex " + self.source_folder + touched_files[i];
      
        self.ts.run(regen_file_index, "files/" , function (stdout) {
          console.log("CRON REGEN FILE complete\n");
        }, function (err) {
          console.log(err);
        });

        touched_files.splice(i, 1); //remove element which has not been modified for more than 5 minutes
        touched_files_timestamp.splice(i, 1);

      }

      console.log(touched_files[i] + " not ready to be regen\"d yet\n");

    }



  }, 300000);

  /*this.interval_cron = setInterval(function(){ //this runs indexing of every project dir every hour
    
    var proj_dirs = self.fs.readdirSync(self.source_folder);
    console.log("CRON REGEN for index files: " + proj_dirs);
    var regen_index_cron = "";

    for(var i = 0; i < proj_dirs.length; i++){

      regen_index_cron += "export CSEARCHINDEX=" + self.index_path + ".indexfor_" + proj_dirs[i] + ";" + "cindex " + self.source_folder + proj_dirs[i] + " ; ";

    } 

    self.ts.run(regen_index_cron, "files/" , function (stdout) {
      console.log("CRON REGEN finished" + "\n");

    }, function (err) {
      console.log("CRON REGEN finished" + "\n");
      console.log(err);
    });

  }, 3600000);*/


  /*var proj_dirs = self.fs.readdirSync(self.source_folder); //this section watches files

  var file_watch_filter = function(pattern, fn) {
    return function(filename) {
      if (pattern.test(filename)) {
        fn(filename);
      }
    }
  }



  for(var i = 0; i < proj_dirs.length; i++){
    console.log("SETTING A WATCH FOR: " + proj_dirs[i]);

    
    this.watch(self.source_folder + proj_dirs[i], file_watch_filter(/\.conf$/, function(file_name){
      //console.log("REGEN FILE: " + file_name);
      var chopped_return_file = file_name.substring(file_name.indexOf("files/") + 6, file_name.indexOf("files/") + 6 + 24);
      

      var regen_file_index = "export CSEARCHINDEX=" + self.index_path + ".indexfor_" + chopped_return_file + ";" + "cindex " + file_name;
      
      self.ts.run(regen_file_index, "files/" , function (stdout) {
        console.log("REGEN FILE complete\n");

      }, function (err) {
        console.log(err);
      });

    }));

  }*/


  //Creating socket.io server
  io.of("/codesearch").on("connection", function (socket) {
    //console.log("initializing");
    socket.on("registering", function(obj) { //This block is to generate the index file if it does not exist, for some reason it regenerates index file after every server launch?? Works like it should if server is not relaunched
      proj_id = obj.project_id;
      
      /*var export_cmd = "export CSEARCHINDEX=" + self.source_folder + proj_id + "/" + ".indexfor_" + proj_id;

      self.ts.run(export_cmd, "files/" + proj_id + "/", function (stdout) { //run export cmd per project directory
        console.log("Exporting proj_id path: " + export_cmd);
      }, function (err) {
        console.log(err);
      });*/

      //need to index files every 12 hours
      //need to index files when closed
      //need to need to index files when open at some interval
      //implement indexing per path because cannot reindex a whole directory just for one file change
      //something with fzf

      var exists_folder = self.fs.existsSync(self.index_path);//, function (exists) { 

      if(!exists_folder){
        
        console.log("Creating /indexes folder\n");

        //var create_index_folder_cmd = "mkdir indexes";

        self.fs.mkdirSync(self.index_path);

      }else if (exists_folder){
        console.log("Index folder exists.");
      }

      self.fs.exists(self.index_path + "/" + ".indexfor_" + proj_id, function (exists) { 
        
        if(!exists && sever_restart_reindexing === false){ //dont want to reindex csearch window session if the file does not exist && the server is first time indexing already
          
          socket.emit("csearch_first_time_indexing");
          console.log("Indexing NEW: " + " " + "files/" + proj_id + "/" + "\n");

          var gen_cindex_and_export = "export CSEARCHINDEX=" + self.index_path + ".indexfor_" + proj_id + ";" + "cindex -reset " + self.source_folder + proj_id;

          self.ts.run(gen_cindex_and_export, "files/" + proj_id + "/", function (stdout) {
            if(socket !== null){
              socket.emit("csearch_first_time_indexing_done");
              console.log("Index file generated and stored at: " + self.source_folder + proj_id + "/" + ".indexfor_" + proj_id + "\n");
            }
          }, function (err) {
            console.log(err);
          });
        }else{ 
          if (exists && sever_restart_reindexing === false){

            //var find_timestamp_cmd = "find " + ".indexfor_" + proj_id + " -maxdepth 0 -printf "%TY/%Tm/%Td %TH:%TM:%.2TS"";

            var index_last_modified = self.fs.statSync(self.index_path + "/" + ".indexfor_" + proj_id).mtime.getTime();

            //var curr_time = Date.now();

            console.log("INDEX" + self.source_folder + proj_id + "/" + ".indexfor_" + proj_id + " ALREADY EXISTED, timestamp: " + self.fs.statSync(self.index_path + "/" + ".indexfor_" + proj_id).mtime.getTime());
            console.log("CURRENT TIME: " + Date.now());

            /*if(Date.now() - index_last_modified >= 1200000){ // check if time has been more than 20 mins and reindex if so

              socket.emit("csearch_reindexing");
              console.log("Re-generating Index file, its old");
              var gen_cindex_and_export = "export CSEARCHINDEX=" + self.index_path + ".indexfor_" + proj_id + ";" + "cindex " + self.source_folder + proj_id;

              self.ts.run(gen_cindex_and_export, "files/" + proj_id + "/", function (stdout) {
                if(socket !== null){
                  console.log("Index file REGENERATED because of old age and stored at: " + self.source_folder + proj_id + "/" + ".indexfor_" + proj_id + "\n");
                  socket.emit("csearch_reindexing_done");
                }
              }, function (err) {
                console.log(err);
              });


            }else{
              console.log("No Need to regenerate index file because of old age");

            }*/
          }
        }
      });

      socket.emit("load_saved_key_array");
    });

    socket.on("csearch_reindex", function(obj) { //clicking the reindex button manually
      socket.emit("manual_cindex_working");

      var regen_cindex = "export CSEARCHINDEX=" + self.index_path + ".indexfor_" + obj.project_id + ";" + "cindex -reset " + self.source_folder + obj.project_id;

      self.ts.run(regen_cindex, "files/" + obj.project_id + "/", function (stdout) {
        if(socket !== null){
          socket.emit("manual_cindex_working_done");
          console.log("Manual reindex Index file generated and stored at: " + self.source_folder + obj.project_id + "/" + ".indexfor_" + obj.project_id + "\n");
        }
      }, function (err) {
        console.log(err);
      });


    });

    socket.on("csearch_key_array", function(obj) { // pass array here
      //console.log("key array: " + obj.key_array);

      //request.push(obj.key_array);  
      //while(request.length > 0){

        //var i = request.shift(); 

        if(cmd_status === false){

          //setTimeout(self.run_search, 1, i, proj_id, socket); //helps with the speed at which you type the search
          self.run_search(obj.key_array, proj_id, socket);
        }//else return;
      //}

    });

    socket.on("csearch_open_file", function(obj){

      if(self.cm_servers[obj.file_id] === null)
      {
        self.create_ot(obj.file_id, function () {
          socket.emit("file_request_granted", {file_id: obj.file_id});
        }, function () {

        });
      } else {
        socket.emit("file_request_granted", {file_id: obj.file_id});
      }


    });

    socket.on("disconnect", function() {
      socket = null;
    });

  });

  //Need to run cindex at some constant interval
  //Need to make sure cindex is in the right path on the server or it wont work
  //Need to check which files are open and only run grep on them
  //Need to trigger re-index after files closed


  this.run_search = function (key_array, proj_id, socket) {

    //console.log("KEY: " + key_array);
    //console.log("MAIN PATH: " + self.main_path);
    var csearch_cmd;
    var reg_ex;
    if(key_array === ""){ //check for empty key array
      socket.emit("clear_csearch_message");
    }else{
      //console.log("key_array is: " + key_array);
      try{
        var help_array = key_array.split(" ");
      
        cmd_status = true; //alert we are running the command

        if(help_array[0] == "--help"){ //found just space to specify regex

          ahh_help_flag = true;

          csearch_cmd = "export CSEARCHINDEX=" + self.index_path + ".indexfor_helpfile ;" + "csearch " + "-i " + "-l " + help_array[1];    

        } else if (key_array[0] == "\""){ //found quotes in input string, searching with spaces
          if(key_array.indexOf("\"", 1) !== -1){

            var last_tick_index = key_array.indexOf("\"", 1);

            if(key_array.indexOf(" ", last_tick_index) !== -1){ //searching with spaces in string match AND searching using regex

              reg_ex = key_array.slice(key_array.indexOf(" ", last_tick_index) + 1, key_array.length);

              key_array = key_array.slice(0, key_array.indexOf("\"", 1));
              key_array = key_array.replace("\"", "");

              if(reg_ex !== ""){      
                csearch_cmd = "export CSEARCHINDEX=" + self.index_path + ".indexfor_" + proj_id + ";" + "csearch " + "-i " + "-l " + "\"" + key_array + "\"" + " | fzf -i -x -f " + reg_ex;
              }else{
                csearch_cmd = "export CSEARCHINDEX=" + self.index_path + ".indexfor_" + proj_id + ";" + "csearch " + "-i " + "-l " + "\"" + key_array + "\"";
              }

              /*csearch_cmd_arr = [];
              csearch_cmd_arr.push("-i");
              csearch_cmd_arr.push("-f");
              csearch_cmd_arr.push(reg_ex);
              csearch_cmd_arr.push(key_array);*/

            }else{ //searching with just spaces in string match

              key_array = key_array.slice(0, key_array.indexOf("\"", 1));
              key_array = key_array.replace("\"", "");

              csearch_cmd = "export CSEARCHINDEX=" + self.index_path + ".indexfor_" + proj_id + ";" + "csearch " + "-i " + "\"" + key_array + "\"";
              /*csearch_cmd_arr = [];
              csearch_cmd_arr.push("-i");
              csearch_cmd_arr.push(key_array);*/
            }
          }else{ //search with this cmd until user types the last " " "
            key_array = key_array.replace("\"", "");

            csearch_cmd = "export CSEARCHINDEX=" + self.index_path + ".indexfor_" + proj_id + ";" + "csearch " + "-i " + "\"" + key_array + "\"";
            /*csearch_cmd_arr = [];
            csearch_cmd_arr.push("-i");
            csearch_cmd_arr.push(key_array);*/

          }

        }else if(key_array.indexOf(" ", 1) !== -1){ //found just space to specify regex

          reg_ex = key_array.slice(key_array.indexOf(" ") + 1, key_array.length);

          key_array = key_array.slice(0, key_array.indexOf(" "));
          console.log("REGEX: " + reg_ex);
          console.log("KEY: " + key_array);

          if(reg_ex !== ""){
            csearch_cmd = "export CSEARCHINDEX=" + self.index_path + ".indexfor_" + proj_id + ";" + "csearch " + "-i " + "-l " + key_array + " | fzf -i -x -f " + reg_ex;
          }else{
            csearch_cmd = "export CSEARCHINDEX=" + self.index_path + ".indexfor_" + proj_id + ";" + "csearch " + "-i " + "-l " + key_array;        

          }
          /*csearch_cmd_arr = [];
          csearch_cmd_arr.push("-i");
          csearch_cmd_arr.push("-f");
          csearch_cmd_arr.push(reg_ex);
          csearch_cmd_arr.push(key_array);*/


        } else{ //normal search with no spaces or " " "

          csearch_cmd = "export CSEARCHINDEX=" + self.index_path + ".indexfor_" + proj_id + ";" + "csearch " + "-i " + key_array;
          /*csearch_cmd_arr = [];
          csearch_cmd_arr.push("-i");
          csearch_cmd_arr.push(key_array);*/

        }
      } catch (err){
        console.log(err);
      }

        /////////////////////////////////////////////////////// Entrance to main search functions ///////////////////////////////////////////////////////////////


        self.ts.run(csearch_cmd, "files/" + proj_id + "/", function (stdout) { //csearch index must be run for the directory you want csearch to look at, currently files/54...(my project)
      
          //console.log("STDOUT: " + stdout); //This is a good way to monitor if csearch is getting the correct files

          if(stdout === "") { //check for empty file return from csearch
            socket.emit("clear_csearch_message");
          }else{

            //running "ag" on recent file list
            if(touched_files.length > 0 && ahh_help_flag === false){ //we have recently edited files, we want their results to show only if we are not using the custom --help option

              var recent_file_grep = [];
              recent_file_grep.push("-i");
              recent_file_grep.push("-C");
              recent_file_grep.push("1");
              recent_file_grep.push(key_array);
              recent_file_grep.push(self.trick_path);


              for (var i in touched_files){ 
                var shortened_touchedfile = touched_files[i].indexOf(proj_id);
                var shortened_touchedfile_path = touched_files[i].substring(shortened_touchedfile + proj_id.length + 1); //to strip out the unnecessary file path
                
                //grep_cmd += " " + shortened_file_path;
                if(shortened_touchedfile_path.length >= 2) recent_file_grep.push(shortened_touchedfile_path);
              } 

              console.log("RECENT TOUCHED FILES SPECIAL GREP: " + recent_file_grep);

              self.ts.run_file("ag", recent_file_grep, "files/" + proj_id + "/", function (stdout) { //csearch index must be run for the directory you want csearch to look at, currently files/54...(my project)

                try{

                  var regex = new RegExp(help_array[0], "ig");
               
                  var color_key = help_array[0].fontcolor("red");
                  
                  first_colored_stdout = stdout.split(regex).join(color_key); 

                }catch (err){
                  console.log("2: " + err);
                }

         
              }, function (err, stdout) {
                //console.log("GREP ERR: " + err);
                if(key_array !== ""){
                  try{
                    var regex = new RegExp(key_array, "ig");
                  
                    var color_key = key_array.fontcolor("red");

                    first_colored_stdout = stdout.split(regex).join(color_key); //setting red result and replacing it in the stdout
                
                  } catch(err) {
                    console.log("3: " + err);
                  }
                }
              
              });
            }

            /////////////////// End recent edited files search, begin normal file search ///////////////////////

            csearch_lines = stdout.split("\n");
            //console.log("SHOULD BE FILENM1: " + stdout);

            if (ahh_help_flag === true){ //in the help screen, we just want one file to be looked through (help file)
              uniq_filename = csearch_lines;
              //ahh_help_flag = false;
            } else if(csearch_lines[0].indexOf(":") !== -1){ //this means csearch was used without FZF and need to split code from filenames
              
              //csearch_lines = stdout.split("\n"); //csearch_lines contains each line of the stdout, in the form filename: code_segment_found, need to split on "\n" to populate array with elements of each line, instead of each char

              for (var i = 0; i < csearch_lines.length; i++) { //This loop properly captures the filename
                csearch_filename += csearch_lines[i].split(":", 1); //This strips the "code" returned by csearch (right of the ":") out of the returned output, so as to store just the filenames
                csearch_filename += "\n";
              }

              csearch_filename = csearch_filename.split("\n"); //populating array with elements that are names of files, opposed to each element being an individual letter
  
              var uniq_filename = csearch_filename.reduce(function(a,b){ //remove duplicates
                if (a.indexOf(b) < 0 ) a.push(b);
                return a;
              },[]);

              uniq_filename = uniq_filename.splice(0,30); //find results in only the first 30 files

            }else { //this means csearch was used with FZF, 
              //csearch_lines = stdout.split("\n");
              uniq_filename = csearch_lines.splice(0,30); //find results in only the first 30 files

            }


            //console.log("FILENAMES: " + uniq_filename);

            //var grep_cmd = "ag -i -C 1 " + key_array + " " + self.trick_path; //compose command to run with ag
            var grep_cmd = [];
            grep_cmd.push("-i");
            grep_cmd.push("-C");
            grep_cmd.push("1");
            if(ahh_help_flag === true){
              grep_cmd.push(help_array[1]);
              //ahh_help_flag = false;
            }else{
              grep_cmd.push(key_array);
            }

            grep_cmd.push(self.trick_path);

            if(ahh_help_flag === true){ //just have one filename (help file) we want to search through. Since uniq_filename is an array, we want the 0th slot (because there is only one file in the array)

              grep_cmd.push(uniq_filename[0]); //grep cmd now contains the one file we want to search through

            } else{

              for (var i in uniq_filename){ 
                var shortened_index = uniq_filename[i].indexOf(proj_id);
                var shortened_file_path = uniq_filename[i].substring(shortened_index + proj_id.length + 1); //to strip out the unnecessary file path
                
                //grep_cmd += " " + shortened_file_path;
                if(shortened_file_path.length >= 2) grep_cmd.push(shortened_file_path);
                
              }

            }

            //console.log(grep_cmd);

            var old_grep_cmd = grep_cmd;

            self.ts.run_file("ag", grep_cmd, "files/" + proj_id + "/", function (stdout) { //csearch index must be run for the directory you want csearch to look at, currently files/54...(my project)
              //if(stdout.length < 5000){
                try{
                  if(ahh_help_flag === true){

                    var regex = new RegExp(help_array[0], "ig");

                    var color_key = help_array[0].fontcolor("red");

                  } else {

                    var regex = new RegExp(key_array, "ig");

                    var color_key = key_array.fontcolor("red");

                  }
                }catch (err){
                  console.log("1: " + err);
                }

                //var regex_match = stdout.match(regex); //THIS is the right way to do it, VERY SLOW

                

                /*for(var i = 0; i < regex_match.length; i++){
                  var color_key = regex_match[i].fontcolor("red");
                  var colored_stdout = stdout.split(regex_match[i]).join(color_key); //THIS is the right way to do it, VERY SLOW
                  //csearch_return_buffer += colored_stdout;
                }*/

                var colored_stdout = stdout.split(regex).join(color_key); 

                //console.log(case_insensitive);

                csearch_return_buffer = colored_stdout;
              //}else{
                //csearch_return_buffer = stdout;
                socket.emit("stdout_message", {message: csearch_return_buffer, help: ahh_help_flag, help_path: self.help_file_path});//.split("\n")}); //emit the buffered response, this is getting called again after dont typing, and its getting old key array data
                csearch_return_buffer = [];
                colored_stdout = [];
                key_array = [];
                cmd_status = false;
                ahh_help_flag = false;
              //}
              //socket.emit("csearch_file_path", {path: csearch_return_buffer.split("\n")}); //Instead of parsing stdout, send files and            

            }, function (err, stdout) {
              console.log("AG ERROR: " + err);
            });

          }
          
          csearch_filename = [];
          
          //csearch_return_buffer = [];

          ///////////////////////////////////////////////////////////////// This is one full search above, below is if the search errs ////////////////////////////////////////////////////////

        }, function (err, stdout) {
          //console.log("CSEARCH ERR: " +  err);
          //csearch_lines = stdout.split("\n"); //csearch_lines contains each line of the stdout, in the form filename: code_segment_found, need to split on "\n" to populate array with elements of each line, instead of each char

          if(stdout === "") { //check for empty file return from csearch
            socket.emit("clear_csearch_message");
          }else{


            //running "ag" on recent file list
            if(touched_files.length > 0 && ahh_help_flag === false){

              var recent_file_grep = [];
              recent_file_grep.push("-i");
              recent_file_grep.push("-C");
              recent_file_grep.push("1");
              recent_file_grep.push(key_array);
              recent_file_grep.push(self.trick_path);

              for (var i in touched_files){ 
                var shortened_touchedfile = touched_files[i].indexOf(proj_id);
                var shortened_touchedfile_path = touched_files[i].substring(shortened_touchedfile + proj_id.length + 1); //to strip out the unnecessary file path
                
                //grep_cmd += " " + shortened_file_path;
                if(shortened_touchedfile_path.length >= 2) recent_file_grep.push(shortened_touchedfile_path);
              }
              
              console.log("RECENT TOUCHED FILES SPECIAL GREP: " + recent_file_grep);

              self.ts.run_file("ag", recent_file_grep, "files/" + proj_id + "/", function (stdout) { //csearch index must be run for the directory you want csearch to look at, currently files/54...(my project)

                try{

                  var regex = new RegExp(key_array, "ig");
               
                  var color_key = key_array.fontcolor("red");
 
                  first_colored_stdout = stdout.split(regex).join(color_key); 

                }catch (err){
                  console.log("2: " + err);
                }

         
              }, function (err, stdout) {
                //console.log("GREP ERR: " + err);
                if(key_array !== ""){
                  try{

                    var regex = new RegExp(key_array, "ig");
                 
                    var color_key = key_array.fontcolor("red");

                    first_colored_stdout = stdout.split(regex).join(color_key); //setting red result and replacing it in the stdout
                
                  }catch(err){
                    console.log("3: " + err);
                  }
                }
              
              });
            }


            /////////////////// End recent edited files search, begin normal file search ///////////////////////


            csearch_lines = stdout.split("\n");

            if (ahh_help_flag === true){
              uniq_filename = csearch_lines;
              //ahh_help_flag = false;
            } else if(csearch_lines[0].indexOf(":") !== -1){ //this means csearch was used without FZF and need to split code from filenames
              
              //csearch_lines = stdout.split("\n"); //csearch_lines contains each line of the stdout, in the form filename: code_segment_found, need to split on "\n" to populate array with elements of each line, instead of each char

              for (var i = 0; i < csearch_lines.length; i++) { //This loop properly captures the filename!!
                csearch_filename += csearch_lines[i].split(":", 1); //This strips the "code" returned by csearch (right of the ":") out of the returned output, so as to store just the filenames
                csearch_filename += "\n";
              }

              csearch_filename = csearch_filename.split("\n"); //populating array with elements that are names of files, opposed to each element being an individual letter
  
              var uniq_filename = csearch_filename.reduce(function(a,b){ //remove duplicates
                if (a.indexOf(b) < 0 ) a.push(b);
                return a;
              },[]);

              uniq_filename = uniq_filename.splice(0,30); //find results in only the first 30 files

            } else { //this means csearch was used with FZF, 
              //csearch_lines = stdout.split("\n");
              uniq_filename = csearch_lines.splice(0,30); //find results in only the first 30 files

            }

            //console.log("ERRFILENAMES: " + uniq_filename);

            //var grep_cmd = "ag -i -C 1 " + key_array + " " + self.trick_path; //compose command to run with ag
            var grep_cmd = [];
            grep_cmd.push("-i");
            grep_cmd.push("-C");
            grep_cmd.push("1");
            if(ahh_help_flag === true){
              grep_cmd.push(help_array[1]);
              //ahh_help_flag = false;
            }else{
              grep_cmd.push(key_array);
            }
            grep_cmd.push(self.trick_path);

            if(ahh_help_flag === true){

              grep_cmd.push(uniq_filename[0]);

            }else{

              for (var i in uniq_filename){ 
                var shortened_index = uniq_filename[i].indexOf(proj_id);
                var shortened_file_path = uniq_filename[i].substring(shortened_index + proj_id.length + 1); //to strip out the unnecessary file path
                
                //grep_cmd += " " + shortened_file_path;
                if(shortened_file_path.length >= 2) grep_cmd.push(shortened_file_path);
              }

            }

            var old_grep_cmd = grep_cmd;


            self.ts.run_file("ag", grep_cmd, "files/" + proj_id + "/", function (stdout) { //csearch index must be run for the directory you want csearch to look at, currently files/54...(my project)
              //if(stdout.length < 5000){

                try{

                  if(ahh_help_flag === true){

                    var regex = new RegExp(help_array[0], "ig");
                  

                    //var regex_match = stdout.match(regex); //THIS is the right way to do it, VERY SLOW

                    var color_key = help_array[0].fontcolor("red");

                  } else {

                    var regex = new RegExp(key_array, "ig");
                  

                    //var regex_match = stdout.match(regex); //THIS is the right way to do it, VERY SLOW

                    var color_key = key_array.fontcolor("red");

                  }
                  /*for(var i = 0; i < regex_match.length; i++){
                    var color_key = regex_match[i].fontcolor("red");
                    var colored_stdout = stdout.split(regex_match[i]).join(color_key); //THIS is the right way to do it, VERY SLOW
                    //csearch_return_buffer += colored_stdout;
                  }*/

                  var colored_stdout = stdout.split(regex).join(color_key); 

                  if(first_colored_stdout !== ""){
                    csearch_return_buffer = "$$BD$$\n" + first_colored_stdout + "$$AD$$\n" + colored_stdout;;
                  }else{
                    csearch_return_buffer = colored_stdout;

                  }

                }catch (err){
                  console.log("2: " + err);
                }
              //}else{
                //csearch_return_buffer = stdout;
                socket.emit("stdout_message", {message: csearch_return_buffer, help: ahh_help_flag, help_path: self.help_file_path});//.split("\n")}); //emit the buffered response, this is getting called again after dont typing, and its getting old key array data
                csearch_return_buffer = [];
                first_colored_stdout = "";
                colored_stdout = [];
                key_array = [];
                cmd_status = false;
              //}
              //socket.emit("csearch_file_path", {path: csearch_return_buffer.split("\n")}); //Instead of parsing stdout, send files and            

            }, function (err, stdout) {
              //console.log("GREP ERR: " + err);
              if(key_array !== ""){
                try{

                  if(ahh_help_flag === true){

                    var regex = new RegExp(help_array[0], "ig");

                    //var regex_match = stdout.match(regex); //THIS is the right way to do it, VERY SLOW

                    var color_key = help_array[0].fontcolor("red");
                    

                  } else {

                    var regex = new RegExp(key_array, "ig");

                    //var regex_match = stdout.match(regex); //THIS is the right way to do it, VERY SLOW

                    var color_key = key_array.fontcolor("red");
   
                  }
                  /*for(var i = 0; i < regex_match.length; i++){
                    var color_key = regex_match[i].fontcolor("red");
                    var colored_stdout = stdout.split(regex_match[i]).join(color_key); //THIS is the right way to do it, VERY SLOW
                    //csearch_return_buffer += colored_stdout;
                  }*/

                  var colored_stdout = stdout.split(regex).join(color_key); //setting red result and replacing it in the stdout
                  if(first_colored_stdout !== ""){
                    csearch_return_buffer = "$$BD$$\n" + first_colored_stdout + "$$AD$$\n" + colored_stdout;
                  }else{
                    csearch_return_buffer = colored_stdout;

                  }

                }catch(err){
                  console.log("3: " + err);
                }
                socket.emit("stdout_message", {message: csearch_return_buffer, help: ahh_help_flag, help_path: self.help_file_path});//.split("\n")}); //emit the buffered response, this is getting called again after dont typing, and its getting old key array data
                csearch_return_buffer = [];
                first_colored_stdout = "";
                colored_stdout = [];
                key_array = [];
                ahh_help_flag = false;
                

              }
              //}
              //socket.emit("csearch_file_path", {path: csearch_return_buffer.split("\n")}); //Instead of parsing stdout, send files and  
            
            });
          }
                
          csearch_filename = [];
          
          //csearch_return_buffer = [];       
        });
        cmd_status = false;
        enter_counter = 0;
        //}
    }
  };
};