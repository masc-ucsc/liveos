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

function ot_settings (theme, file_name, cm_content_snapshot, file_mode, file_id, on_close) {
  //defining fields
  var self = this;
  this.mode = file_mode;
  this.file_id = file_id;
  this.parent_on_close = on_close;
  this.app_window = null;
  this.menu_items = null;
  this.global_socket = io.connect(":" + PORTS.main + "/file_server", {"force new connection": true, query: $.param({token: TOKEN})});
  this.ot_rev_type = "personal"; //default to refreshing personal OT rev...will change with other checkbox selections
  this.gathered_results = "";
  this.subset_users_group = [];
  this.subset_user_id = [];
  this.checkbox_array = [];
  this.checked_array = [];
  this.log_flag = true; //want to default to viewing OT log. This flag specifies whether to print DB log info into the results window, or to populate the results window with the CM diff viewer
  this.cm_content_snapshot = cm_content_snapshot;
  this.all_diff_view_array = [];
  this.file_name = file_name;
  this.personal_first_slide_date = true;
  this.all_first_slide_date = true;
  this.subset_first_slide_date = true;
  this.theme = theme;
  this.diff_view_collapse = false;
  this.diff_view_highlight = true;
  var dub_view;
  self.collapse_view_content = "";

  //Defining HTML elements
  this.app_div = document.createElement("div");
  this.app_div.className = "main_window_OT";

  this.ot_settings = document.createElement("div");
  this.ot_slider = document.createElement("div");
  this.ot_slider_val = document.createElement("div");
  this.ot_upper = document.createElement("div");
  this.ot_results = document.createElement("div");
  this.subset_users_panel = document.createElement("div");
  this.diff_view_options = document.createElement("div");
  

  this.ot_settings.className = "ot_settings";
  this.ot_slider.className = "ot_slider_div";
  this.ot_slider_val.className = "ot_slider_val";
  this.ot_upper.className = "ot_upper";
  this.ot_results.className = "ot_results";
  this.subset_users_panel.className = "subset_panel_class_hidden";
  this.diff_view_options.className = "diff_view_options_hidden";
  //this.main_container.className = "esesc_settings_container";

  //this.example = document.createElement("label");
  //this.example.innerHTML = USER_ID + "," + file_id;
  //this.main_container.appendChild(this.example);
  //this.tab_holder = new live_tab_holder("esesc_tab");
  //this.main_container.appendChild(this.tab_holder.container);
 
  this.open = function ()
  {
    //creating a new window
    var title = "OT Revision Settings";
    self.app_window = wm.openElement(self.app_div, 700, 700, "random", "random", {}, {}, self.on_close);
    self.menu_items = {};
    self.menu_items.refresh = self.app_window.add_menu_item("Refresh", "", "title", self.app_window.menu, self.refresh_ot_win);
    self.app_window.activate_menu();
    self.is_open = true;
    self.global_socket.emit("request_personal_ot_revs", {user_id: USER_ID, file_id: self.file_id, slider_val: self.magical_slider.value, log_flag: self.log_flag}); //this makes "personal OT information" for the open file the "default" diff comparison
  };

  this.on_close = function () {
    self.parent_on_close();
  };

  this.refresh_ot_win = function () {
    var refresh_socket_msg;

    if(self.ot_rev_type == "personal"){

      refresh_socket_msg = "request_personal_ot_revs";
      self.global_socket.emit(refresh_socket_msg, {user_id: USER_ID, file_id: self.file_id, slider_val: self.magical_slider.value, log_flag: self.log_flag, refresh_req: true});
    
    } else if (self.ot_rev_type == "all"){
      
      refresh_socket_msg = "request_all_ot_revs";
      self.global_socket.emit(refresh_socket_msg, {user_id: USER_ID, file_id: self.file_id, slider_val: self.magical_slider.value, log_flag: self.log_flag, refresh_req: true});
    
    } else if (self.ot_rev_type == "subset"){
      
      //refresh_socket_msg = "checked_array_contents";
      self.global_socket.emit("checked_array_contents", {users_ids: self.checked_array, file_id: self.file_id, slider_val: self.magical_slider.value, log_flag: self.log_flag, refresh_req: true});
    
    }

    

  };

  this.global_socket.on("no_ot_info", function(){
    self.ot_results.innerHTML = "No previously existing OT revisions for this file OR you are viewing the beginning of LiveOS OT recording for this file."; //need to check if mongodb returns null for a field properly
  });

  ////////////////////////////////////////////////PERSONAL OT INFO//////////////////////////////////////////////////////////

  this.global_socket.on("personal_timestamp_hover", function(obj){
    //atach contents of message to drop
    var string_date = obj.hover_val.substring(0, obj.hover_val.indexOf("GMT"));

    self.hover_date_div.innerHTML = string_date;

  });


  this.global_socket.on("personal_old_date", function(obj){
    var d1 = new Date(obj.old_date);
    d1 = d1.toString().substring(0, d1.toString().indexOf("GMT"));
    self.old_date.innerHTML = d1;

    var d2 = new Date(obj.new_date);
    d2 = d2.toString().substring(0, d2.toString().indexOf("GMT"));
    self.new_date.innerHTML = d2;

    if(self.personal_first_slide_date == true && self.magical_slider.value == 100){

      self.hover_date_div.innerHTML =  self.new_date.innerHTML;
      self.personal_first_slide_date = false;

    }

  });


  this.global_socket.on("personal_ot_revs_suc", function(obj){ //these are already sorted because it is a one message with the object that is sent
    //self.example.innerHTML = obj.ot_history.operation;
    if(self.log_flag == true){
      self.ot_results.innerHTML = "";
    } else if (self.log_flag == false){
      var temp_string = [];
      var temp_string_operation_position = [];
      var adjust_me = [];
    }

    var loop_counter = 0;


    obj.ot_history.forEach(function(record) {
      //record.operation and record.timestamp
      if(self.log_flag == true){
        
        var d = new Date(record.timestamp);
        var color_d = d.toString().fontcolor("blue");
        var color_op = record.operation.fontcolor("red");

        self.ot_results.innerHTML += "-PERS- TIME: " + color_d + " CHAR: " + color_op + "<br />"; 

        self.ot_results.scrollIntoView();
        self.ot_results.scrollTop = self.ot_results.scrollHeight; 
      
      } else if (self.log_flag == false){ //these should only ever both be true

        //just populate array here of the DB info to feed into CM char operations, dont want to populate the results window with log info
        temp_string.push(/*"-PERS- TIME: " + record.timestamp + " CHAR: " + */record.operation); //I think we only want the operation here
        
        var operation_position = record.operation.split(",");
        //var old_operation_position = []; //preload array with junk

        if(operation_position[2] !== undefined && operation_position[1] !== "-1"){ //could either push record.operation or just the position of the in-the-middle-of-the-text character
          //if(old_operation_position[2] !== undefined || adjust_me.length == 0){
            adjust_me.push(loop_counter); //I have only pushed the location of the out-of-place char, NOT THIS NEED TO PUSH THE INDEX IN THE ARRAY, operation_position[0]
          //} 
         
        }else if(operation_position[2] == undefined){ //if the previous iteration had no third element, we must have been editing at the end of the file AND THEN moved inward to edit
          adjust_me = [];
        }

        //old_operation_position = record.operation.split(",");

        if(!(!isNaN(parseFloat(operation_position[0])) && isFinite(operation_position[0]))) {
          //Must be at the beginning of the array here, where OT stupidly only lists the char, not the operation position with it
          temp_string_operation_position.push("0");

        }else{

            temp_string_operation_position.push(operation_position[0]); //this isolates just the operation so we can use "lastIndexOf" function below, only load ops with no op[2], it messes with the lastIndexOf

        }
      }

      loop_counter++;

    });

    //console.log("tmp str: " + temp_string + " op pos: " + temp_string_operation_position);

    if (self.log_flag == false && obj.cm_content !== null){ //external to loop, only set this when reset flag is high, we have issued a refresh request here!
      //this updates the RHS of the merge diff view to have the most up-to-date CM version, NOT to be confused with the version we are manipulating on the LHS with the slider
      self.dub_view.rightOriginal().setValue(obj.cm_content);
      self.cm_content_snapshot = obj.cm_content; //this updates the global variable holding the initial content when the OT_settings window is opened


    } else if (self.log_flag == false && obj.cm_content == null){ //external to loop, we are in the CM diff view and have not hit the reset button, so just update the editable LHS pane
      //here I need to "subtract" the current DB results from the previous query results. This is so I can get the subset of DB entries to REMOVE from the LHS CM diff view.
      //E.g. the slider starts at 100% showing all up-tp-date OT changes. When I slide it left to 90%, I get less and less entries, always going from the most recent to the least recent, in this case showing UP TO 90%.
      //To only remove up to where the slider is (90%) from the LHS diff view, I need to take the 100% results, subtract out the 90% results and REMOVE the 10% retrieved from the CM view.

      var curr_str = self.dub_view.rightOriginal().getValue();// USE rightOriginal() here so that each time the slider is moved, the DB operations happen on the initial view (to save a headache about how the editor has changed with the slider)
      var index = 0;
      for(index = temp_string.length - 1; index >= 0; index--){

        //delay(500);
        //console.log("\nNEW LOOP: " + curr_str);

        self.dub_view.editor().setValue(curr_str);
        var operation = temp_string[index].split(","); //operation array for each iteration of the loop will have 0,1 or 2 elements. operation[0] is the position, [1] is the operation, [2] is amt of chars to the right of current position of operation
        //console.log(operation);
        if((operation[1] !== undefined) && (operation[1].indexOf("-1") == -1)){ //there was no "-1" in the operation, meaning we DIDNT backspace, so just remove the character that was there. careful here, pasting a "-1" into the code fools this into looking identical to a backspace
          //console.log("want to remove: " + operation[1] + " at " + operation[0]);
          //console.log("looking to be equal: " + curr_str[operation[0]] + " and " + operation[1]);
          
          if(!(!isNaN(parseFloat(operation[0])) && isFinite(operation[0]))) { // here we have iterated down to position 0, but OT doesnt include an index for a char at pos 0, so add one
            var save_me = operation[0];
            var save_me2 = operation[1];
            operation[0] = 0;
            operation[1] = save_me;  
            operation[2] = save_me2;  
          }

          //console.log("op: " + operation);
          //console.log("\n1currstr[op[0]]: " + curr_str[operation[0]]);
          //console.log("1op0: " + operation[0] + " op1: " + operation[1]);
          //console.log("1tempstr[index]: " + temp_string[index] + "index: " + index);

          //if(curr_str[operation[0]] == operation[1]){ //if the character at the position matches what is currently in the string, remove it

            var tmp_left_side = curr_str.substring(0, parseInt(operation[0]));

            var tmp_right_side = curr_str.substring(parseInt(operation[0]) + 1);

            curr_str = tmp_left_side.concat(tmp_right_side);

        } else if (operation[1] !== undefined && operation[1].indexOf("-1") !== -1){ //uh oh, the operation indicates we hit backspace
          //we are moving backwards through the array one by one in lock step, so seeing a -1 here means we can resolve finding what was "-1"d 

          //check adjust_me array
          if(adjust_me.length > 0){
            //console.log("ADJ: " + adjust_me);
            var i;
            var num_entries_before = 0;
            for(i = 0; i < adjust_me.length ; i++){
              //need to use physical position in the array here, not char position (because we havent yet adjusted the char positions so )
              //adjust_me[i] is the position where three elements are
              if (index > adjust_me[i]) { //if the index that is -1 in the results list is > the stored value (which is an index), then adjust char position offset, else the screwed up char is later in the list, dont worry about it
                num_entries_before++;
                var might_be_negative = temp_string[adjust_me[i]].split(",");
                //console.log("neg?: " + might_be_negative)
                if(might_be_negative[1] !== undefined && might_be_negative[1] == "-1"){
                  num_entries_before--;
                }
              }
            }

            if((parseInt(operation[0]) - 1) - (num_entries_before ) >= 1){
              var to_look_for = (parseInt(operation[0]) - 1) - (num_entries_before ); //doing this to get the CHAR at position "to look for" bc we need to use it, bur out edits still need to happen at pos. 
              //console.log("1to look for: " + to_look_for + " = " + parseInt(operation[0]) + " - " + (num_entries_before));

            } else if((parseInt(operation[0]) - 1) - (num_entries_before ) < 1){
              var to_look_for = parseInt(operation[0]); //doing this to get the CHAR at position "to look for" bc we need to use it, bur out edits still need to happen at pos.
              //console.log("2to look for: " + to_look_for + " = " + parseInt(operation[0]) + "indx: " + index);
            }


            var reverse_index = temp_string_operation_position.lastIndexOf(to_look_for.toString(), parseInt(index) - 1);
            //console.log("ind: " + reverse_index);
            //console.log("str: " + temp_string[reverse_index]);
            var reverse_operation = temp_string[reverse_index].split(","); //reverse_operation[0] is the position, [1] is the operation, [2] is amt of chars to the right of current position of operation

            var tmp_left_side = curr_str.substring(0, parseInt(operation[0])); //notice using the actual index to position the cuts

            var tmp_right_side = curr_str.substring(parseInt(operation[0]));
            
            var final_right = reverse_operation[1].concat(tmp_right_side); //notice using the adjusted index to get the char to add

            curr_str = tmp_left_side.concat(final_right);
            //console.log(reverse_index);

          } else { //no chars were typed before the delete happened

            var reverse_index = temp_string_operation_position.lastIndexOf(operation[0], index - 1); //do reverse search through the rest of the array to find the most recently ADDED char at the same char position as where we found the -1
            var reverse_operation = temp_string[reverse_index].split(","); //reverse_operation[0] is the position, [1] is the operation, [2] is amt of chars to the right of current position of operation

            var tmp_left_side = curr_str.substring(0, parseInt(operation[0]));

            var tmp_right_side = curr_str.substring(parseInt(operation[0]));
            
            var final_right = reverse_operation[1].concat(tmp_right_side);

            curr_str = tmp_left_side.concat(final_right);
          }

        } else if (operation[1] == undefined && operation[2] == undefined && operation[0].indexOf("-1") == -1){ //THIS is the last standing char to be erased

          //here we are trying to undo the very first char typed/last char in the doc. op[0] is the CHAR (not a position) and op[1] is undefined so we fall into this else
          if(curr_str.length == 1){
            //console.log("removing last char/beginning char");
            curr_str = "";
          } else{
            console.log("Thought it was the last char, something weird is up with OT revisions");
          }

        }
      }


      //changed_str = curr_str.substr(0, index) + "test" + curr_str.substr(index + 1);

      self.dub_view.editor().setValue(curr_str);

    }

  });

  function delay(time) {
    var d1 = new Date();
    var d2 = new Date();
    while (d2.valueOf() < d1.valueOf() + time) {
      d2 = new Date();
    }
  }

  //////////////////////////////////////////////ALL OT INFO///////////////////////////////////////////////////////////////

  this.global_socket.on("all_timestamp_hover", function(obj){
    //atach contents of message to drop
    var string_date = obj.hover_val.substring(0, obj.hover_val.indexOf("GMT"))

    self.hover_date_div.innerHTML = string_date;


  });


  this.global_socket.on("all_old_date", function(obj){
    var d1 = new Date(obj.old_date);
    d1 = d1.toString().substring(0, d1.toString().indexOf("GMT"));
    self.old_date.innerHTML = d1;

    var d2 = new Date(obj.new_date);
    d2 = d2.toString().substring(0, d2.toString().indexOf("GMT"));
    self.new_date.innerHTML = d2;

    if(self.all_first_slide_date == true && self.magical_slider.value == 100){

      self.hover_date_div.innerHTML =  self.new_date.innerHTML;
      self.all_first_slide_date = false;

    }

  });


  this.global_socket.on("all_ot_revs_suc", function(obj){ //I am loading the milliseconds time here so I can sort on it

    var color_op = obj.users_op.fontcolor("red"); //change the color
    var color_name = obj.users_name.fontcolor("green"); //change the color

    //self.all_diff_view_array.push(obj.users_op);

    self.gathered_results += "-ALL- TIME: " + obj.users_timestamp + " CHAR: " + color_op + " BY: " + color_name + "<br />";
    //self.gathered_results.split
    //console.log(self.gathered_results);
  });

  this.global_socket.on("all_ot_revs_end", function(obj){

    if(self.log_flag == true){
      self.ot_results.innerHTML = "";
    } else if (self.log_flag == false){
      var temp_string = [];
      var temp_string_operation_position = [];
      var adjust_me = [];
    }

    var gathered_results_array = [];
    gathered_results_array = self.gathered_results.split("<br />"); //split the results so we can sort based on the timestamp
    //gathered_results_array.sort(function(a.substring(a.indexOf(" AT "), a.indexOf(" BY ")),b.substring(b.indexOf(" AT "), b.indexOf(" BY ")){return a-b}));
    gathered_results_array.sort();

    var i_loop = 0;
    var loop_counter = 0;
    for(i_loop = 0; i_loop < gathered_results_array.length; i_loop++){ //to loop the array to change milliseconds to human readable
      var milli_date = gathered_results_array[i_loop].substring(gathered_results_array[i_loop].indexOf("TIME: ") + 6, gathered_results_array[i_loop].indexOf(" CHAR: ")); //get the milliseconds
      var milli_date_int = parseInt(milli_date);
      var d = new Date(milli_date_int);

      var color_d = d.toString().fontcolor("blue"); //change the color

      gathered_results_array[i_loop].replace(",", ""); //remove extraneous commas

      var just_the_op = gathered_results_array[i_loop].substring(gathered_results_array[i_loop].indexOf("CHAR: ") + 6, gathered_results_array[i_loop].indexOf(" BY: "));
      just_the_op = just_the_op.replace("<font color=\"red\">", "");
      just_the_op = just_the_op.replace("</font>", "");


      self.all_diff_view_array.push(just_the_op);

      //gathered_results_array[index].replace(gathered_results_array[index].indexOf(milli_date) + 13, d);
      gathered_results_array[i_loop] = gathered_results_array[i_loop].split(milli_date).join(color_d);
      gathered_results_array[i_loop] += "<br />";

      if(self.log_flag == true){

        if(gathered_results_array[i_loop] !== "<br />"){
          self.ot_results.innerHTML += gathered_results_array[i_loop];
        }

      } else if (self.log_flag == false){

        var operation_position = just_the_op.split(",");
        //var old_operation_position = []; //preload array with junk

        if(operation_position[2] !== undefined && operation_position[1] !== "-1"){ //could either push record.operation or just the position of the in-the-middle-of-the-text character
          //if(old_operation_position[2] !== undefined || adjust_me.length == 0){
            adjust_me.push(index); //I have only pushed the location of the out-of-place char, NOT THIS NEED TO PUSH THE INDEX IN THE ARRAY, operation_position[0]
          //} 
         
        }else if(operation_position[2] == undefined){ //if the previous iteration had no third element, we must have been editing at the end of the file AND THEN moved inward to edit
          adjust_me = [];
        }

        //old_operation_position = record.operation.split(",");

        if(!(!isNaN(parseFloat(operation_position[0])) && isFinite(operation_position[0]))) {
          //Must be at the beginning of the array here, where OT stupidly only lists the char, not the operation position with it
          temp_string_operation_position.push("0");

        }else{

            temp_string_operation_position.push(operation_position[0]); //this isolates just the operation so we can use "lastIndexOf" function below, only load ops with no op[2], it messes with the lastIndexOf

        }
      }

      loop_counter++;

    }

    //self.all_diff_view_array.reverse(); //oops, the content got loaded in backwards..

    if (self.log_flag == false && obj.cm_content !== null){ //external to loop, only set this when reset flag is high
      //self.dub_view.value = obj.cm_content; //this updates the LHS of the merge diff view to have the most up-to-date CM version, NOT to be confused with the versino we are manupulating on the RHS with the slider
      self.dub_view.rightOriginal().setValue(obj.cm_content);
      self.cm_content_snapshot = obj.cm_content;
      //mergeView.editor().on("change", function(cm, change) { ... });
      //self.dub_view.editor().value;
      //do RHS things here with the cm_content (string manipulation)

    }else if (self.log_flag == false && obj.cm_content == null){ //external to loop, we are in the CM diff view and have not hit the reset button, so just update the editable LHS pane
      //here I need to "subtract" the current DB results from the previous query results. This is so I can get the subset of DB entries to REMOVE from the LHS CM diff view.
      //E.g. the slider starts at 100% showing all up-tp-date OT changes. When I slide it left to 90%, I get less and less entries, always going from the most recent to the least recent, in this case showing UP TO 90%.
      //To only remove up to where the slider is (90%) from the LHS diff view, I need to take the 100% results, subtract out the 90% results and REMOVE the 10% retrieved from the CM view.

      var curr_str = self.dub_view.rightOriginal().getValue();// USE rightOriginal() here so that each time the slider is moved, the DB operations happen on the initial view (to save a headache about how the editor has changed with the slider)
      var index = 0;
      for(index = self.all_diff_view_array.length - 1; index >= 0; index--){

        //delay(500);
        //console.log("\nNEW LOOP: " + curr_str);

        self.dub_view.editor().setValue(curr_str);
        var operation = self.all_diff_view_array[index].split(","); //operation array for each iteration of the loop will have 0,1 or 2 elements. operation[0] is the position, [1] is the operation, [2] is amt of chars to the right of current position of operation
        //console.log(operation);
        if((operation[1] !== undefined) && (operation[1].indexOf("-1") == -1)){ //there was no "-1" in the operation, meaning we DIDNT backspace, so just remove the character that was there. careful here, pasting a "-1" into the code fools this into looking identical to a backspace
          //console.log("want to remove: " + operation[1] + " at " + operation[0]);
          //console.log("looking to be equal: " + curr_str[operation[0]] + " and " + operation[1]);
          
          if(!(!isNaN(parseFloat(operation[0])) && isFinite(operation[0]))) { // here we have iterated down to position 0, but OT doesnt include an index for a char at pos 0, so add one
            var save_me = operation[0];
            var save_me2 = operation[1];
            operation[0] = 0;
            operation[1] = save_me;  
            operation[2] = save_me2;  
          }

          //console.log("op: " + operation);
          //console.log("\n1currstr[op[0]]: " + curr_str[operation[0]]);
          //console.log("1op0: " + operation[0] + " op1: " + operation[1]);
          //console.log("1tempstr[index]: " + self.all_diff_view_array[index] + "index: " + index);

          //if(curr_str[operation[0]] == operation[1]){ //if the character at the position matches what is currently in the string, remove it

            var tmp_left_side = curr_str.substring(0, parseInt(operation[0]));

            var tmp_right_side = curr_str.substring(parseInt(operation[0]) + 1);

            curr_str = tmp_left_side.concat(tmp_right_side);

        } else if (operation[1] !== undefined && operation[1].indexOf("-1") !== -1){ //uh oh, the operation indicates we hit backspace
          //we are moving backwards through the array one by one in lock step, so seeing a -1 here means we can resolve finding what was "-1"d 

          //check adjust_me array
          if(adjust_me.length > 0){
            //console.log("ADJ: " + adjust_me);
            var i;
            var num_entries_before = 0;
            for(i = 0; i < adjust_me.length ; i++){
              //need to use physical position in the array here, not char position (because we havent yet adjusted the char positions so )
              //adjust_me[i] is the position where three elements are
              if (index > adjust_me[i]) { //if the index that is -1 in the results list is > the stored value (which is an index), then adjust char position offset, else the screwed up char is later in the list, dont worry about it
                num_entries_before++;
                var might_be_negative = self.all_diff_view_array[adjust_me[i]].split(",");
                //console.log("neg?: " + might_be_negative)
                if(might_be_negative[1] !== undefined && might_be_negative[1] == "-1"){
                  num_entries_before--;
                }
              }
            }

            if((parseInt(operation[0]) - 1) - (num_entries_before ) >= 1){
              var to_look_for = (parseInt(operation[0]) - 1) - (num_entries_before ); //doing this to get the CHAR at position "to look for" bc we need to use it, bur out edits still need to happen at pos. 
              //console.log("1to look for: " + to_look_for + " = " + parseInt(operation[0]) + " - " + (num_entries_before));

            } else if((parseInt(operation[0]) - 1) - (num_entries_before ) < 1){
              var to_look_for = parseInt(operation[0]); //doing this to get the CHAR at position "to look for" bc we need to use it, bur out edits still need to happen at pos.
              //console.log("2to look for: " + to_look_for + " = " + parseInt(operation[0]) + "indx: " + index);
            }


            var reverse_index = temp_string_operation_position.lastIndexOf(to_look_for.toString(), parseInt(index) - 1);
            //console.log("ind: " + reverse_index);
            //console.log("str: " + temp_string[reverse_index]);
            var reverse_operation = self.all_diff_view_array[reverse_index].split(","); //reverse_operation[0] is the position, [1] is the operation, [2] is amt of chars to the right of current position of operation

            var tmp_left_side = curr_str.substring(0, parseInt(operation[0])); //notice using the actual index to position the cuts

            var tmp_right_side = curr_str.substring(parseInt(operation[0]));
            
            var final_right = reverse_operation[1].concat(tmp_right_side); //notice using the adjusted index to get the char to add

            curr_str = tmp_left_side.concat(final_right);
            //console.log(reverse_index);

          } else { //no chars were typed before the delete happened

            var reverse_index = temp_string_operation_position.lastIndexOf(operation[0], index - 1); //do reverse search through the rest of the array to find the most recently ADDED char at the same char position as where we found the -1
            var reverse_operation = self.all_diff_view_array[reverse_index].split(","); //reverse_operation[0] is the position, [1] is the operation, [2] is amt of chars to the right of current position of operation

            var tmp_left_side = curr_str.substring(0, parseInt(operation[0]));

            var tmp_right_side = curr_str.substring(parseInt(operation[0]));
            
            var final_right = reverse_operation[1].concat(tmp_right_side);

            curr_str = tmp_left_side.concat(final_right);
          }

        } else if (operation[1] == undefined && operation[2] == undefined && operation[0].indexOf("-1") == -1){ //THIS is the last standing char to be erased

          //here we are trying to undo the very first char typed/last char in the doc. op[0] is the CHAR (not a position) and op[1] is undefined so we fall into this else
          if(curr_str.length == 1){
            //console.log("removing last char/beginning char");
            curr_str = "";
          } else{
            console.log("Thought it was the last char, something weird is up with OT revisions");
          }

        }
      }


      //changed_str = curr_str.substr(0, index) + "test" + curr_str.substr(index + 1);

      self.dub_view.editor().setValue(curr_str);

    }

    if(self.log_flag == true){

      self.ot_results.scrollIntoView();
      self.ot_results.scrollTop = self.ot_results.scrollHeight; 
      //self.ot_results.innerHTML = gathered_results_array;
    }
    
    self.all_diff_view_array = [];
    self.gathered_results = "";
    


  });

  /////////////////////////////////////////////////SUBSET OT INFO/////////////////////////////////////////////////////////

  //////////////// subset initialization

  this.global_socket.on("selected_subset_suc", function(obj){

    var subset_user = obj.subset_users.concat("<br />");
    self.subset_users_group.push(subset_user); //this array holds the name of the user

    self.subset_user_id.push(obj.subset_user_id); //this array holds the user_id of the user (need both below)


  });


  this.global_socket.on("selected_subset_end", function(){

    self.subset_users_panel.innerHTML = "";

    //console.log("grp " + self.subset_users_group);
    //console.log("id " + self.subset_user_id);

    //var gathered_results_array = [];
    //gathered_results_array = self.subset_users_group.split("<br />"); //split the results so we can sort based on the timestamp

    //gathered_results_array.sort();

    var index = 0;

    for(index = 0; index < self.subset_users_group.length; index++){ //to loop the array to change milliseconds to human readable


      self.subset_users_group[index].replace(",", ""); //remove extraneous commas

      if(self.subset_users_group[index] !== "<br />"){

        var checkbox_id = self.subset_user_id[index]; //store the users ID along with the created checkboxes
        //need to make new checkboxes with events ETC here 
        this.subset_user_checkbox = document.createElement("input"); //checkbox div
        this.subset_user_checkbox.id = checkbox_id;
        this.subset_user_checkbox.setAttribute("type", "checkbox");
        this.subset_user_checkbox.className = "subset_user_checkbox";

        this.subset_user_checkbox_label = document.createElement("label"); //checkbox label
        this.subset_user_checkbox_label.className = "subset_user_checkbox_label";
        this.subset_user_checkbox_label.setAttribute("for", checkbox_id);
        this.subset_user_checkbox_label.innerHTML = self.subset_users_group[index];

        self.checkbox_array.push(this.subset_user_checkbox); //store the instance of the checkbox created here
        
        this.subset_user_checkbox.onchange = function() {
          //console.log(self.magical_slider.value);

          //self.global_socket.emit("request_subset_ot_revs", {user_id: USER_ID, file_id: self.file_id, slider_val: self.magical_slider.value});
          self.check_checked();

        };

        self.subset_users_panel.appendChild(this.subset_user_checkbox);
        self.subset_users_panel.appendChild(this.subset_user_checkbox_label);
        //self.subset_users_panel.innerHTML += gathered_results_array[index];
      } else {

        self.subset_users_group.splice(self.subset_users_group[index], 1);
        self.subset_user_id.splice(self.subset_user_id[index], 1);
      
      }
    }

    self.subset_users_panel.scrollIntoView();
    self.subset_users_panel.scrollTop = self.subset_users_panel.scrollHeight; 
    //self.ot_results.innerHTML = gathered_results_array;
    self.subset_users_group = [];
    self.subset_user_id = [];


  });

  //////////////// subset initialization END

  //////////////// subset ACTUAL RESULT

  this.global_socket.on("subset_old_date", function(obj){
    var d1 = new Date(obj.old_date);
    d1 = d1.toString().substring(0, d1.toString().indexOf("GMT"));
    self.old_date.innerHTML = d1;
    
    var d2 = new Date(obj.new_date);
    d2 = d2.toString().substring(0, d2.toString().indexOf("GMT"));
    self.new_date.innerHTML = d2;

    if(self.subset_first_slide_date == true && self.magical_slider.value == 100){

      self.hover_date_div.innerHTML =  self.new_date.innerHTML;
      self.subset_first_slide_date = false;

    }

  });

  this.global_socket.on("subset_checked_users_suc", function(obj){ //I am loading the milliseconds time here so I can sort on it

    var color_op = obj.users_op.fontcolor("red"); //change the color
    var color_name = obj.users_name.fontcolor("green"); //change the color

    self.gathered_results += "-ALL- TIME: " + obj.users_timestamp + " CHAR: " + color_op + " BY: " + color_name + "<br />";
    //self.gathered_results.split
    //console.log(self.gathered_results);
  });

  this.global_socket.on("subset_timestamp_hover", function(obj){
    //atach contents of message to drop
    var string_date = obj.hover_val.substring(0, obj.hover_val.indexOf("GMT"))

    self.hover_date_div.innerHTML = string_date;


  });


  this.global_socket.on("subset_checked_users_end", function(obj){

    if(self.log_flag == true){
      self.ot_results.innerHTML = "";
    }

    var gathered_results_array = [];
    gathered_results_array = self.gathered_results.split("<br />"); //split the results so we can sort based on the timestamp
    //gathered_results_array.sort(function(a.substring(a.indexOf(" AT "), a.indexOf(" BY ")),b.substring(b.indexOf(" AT "), b.indexOf(" BY ")){return a-b}));
    gathered_results_array.sort();

    var index = 0;
    for(index = 0; index < gathered_results_array.length; index++){ //to loop the array to change milliseconds to human readable
      var milli_date = gathered_results_array[index].substring(gathered_results_array[index].indexOf("TIME: ") + 6, gathered_results_array[index].indexOf(" CHAR: ")); //get the milliseconds
      var milli_date_int = parseInt(milli_date);
      var d = new Date(milli_date_int);

      var color_d = d.toString().fontcolor("blue"); //change the color

      gathered_results_array[index].replace(",", ""); //remove extraneous commas



      //gathered_results_array[index].replace(gathered_results_array[index].indexOf(milli_date) + 13, d);
      gathered_results_array[index] = gathered_results_array[index].split(milli_date).join(color_d);
      gathered_results_array[index] += "<br />";

      if(self.log_flag == true){

        if(gathered_results_array[index] !== "<br />"){
          self.ot_results.innerHTML += gathered_results_array[index];
        }

      } else if (self.log_flag == false){

        //use the self.gathered_results array to feed into CM, probably not inside this loop...

      }

    }

    if (self.log_flag == false && obj.cm_content !== null){ //external to loop, only set this when reset flag is high
      //this updates the LHS of the merge diff view to have the most up-to-date CM version, NOT to be confused with the versino we are manupulating on the RHS with the slider
      self.dub_view.rightOriginal().setValue(obj.cm_content);
      self.cm_content_snapshot = obj.cm_content;
      //self.dub_view.editor().setValue(obj.cm_content);

      //do RHS things here with the cm_content (string manipulation)

    }

    self.ot_results.scrollIntoView();
    self.ot_results.scrollTop = self.ot_results.scrollHeight; 
    //self.ot_results.innerHTML = gathered_results_array;
    self.gathered_results = "";


  });


  //////////////// subset ACTUAL RESULT END


  this.check_checked = function () {
    //need to get every checkbox that is checked and send the user_ids back to find their DB info
    var index;
    //var checked_array = [];

    //console.log(self.checkbox_array.length + " " + self.checkbox_array);
    for(index = 0; index < self.checkbox_array.length; index++){
      if((self.checkbox_array[index].checked == true) && (self.checked_array.indexOf(self.checkbox_array[index].id) == -1)) { //only add the new ID if it does not yet exist in the array

        self.checked_array.push(self.checkbox_array[index].id);
        

      } else if ((self.checkbox_array[index].checked == false) && (self.checked_array.indexOf(self.checkbox_array[index].id) !== -1)){ //this means the checkbox is not checked but it WAS in the checked array before

        self.checked_array.splice(self.checked_array.indexOf(self.checkbox_array[index].id),1);

      }

    }

    //console.log("yaya " + self.checked_array);

    if(self.checked_array.length == 0){

      self.ot_results.innerHTML = "Select some users...I insist";

    } else {

      self.global_socket.emit("checked_array_contents", {users_ids: self.checked_array, file_id: self.file_id, slider_val: self.magical_slider.value, log_flag: self.log_flag});

    }

    //self.checked_array = [];

  };


  //this.ot_settings.innerHTML = "TEST";


  this.check_box_ot_mine = document.createElement("input"); //checkbox div
  this.check_box_ot_mine.id = "check_box_ot_mine";
  this.check_box_ot_mine.setAttribute("type", "radio");
  this.check_box_ot_mine.className = "check_box_div";
  this.check_box_ot_mine.checked = true;

  this.check_box_ot_label_mine = document.createElement("label"); //checkbox label
  this.check_box_ot_label_mine.className = "check_box_label";
  //this.check_box_ot_label_mine.setAttribute("for", "check_box_ot_mine");
  this.check_box_ot_label_mine.innerHTML = "View my own revisions";

  this.or_div = document.createElement("div"); //or_message div
  this.or_div.className = "or_div2";
  this.or_div.innerHTML = "-- or --";

  this.check_box_ot_all = document.createElement("input"); //checkbox div
  this.check_box_ot_all.id = "check_box_ot_all";
  this.check_box_ot_all.setAttribute("type", "radio");
  this.check_box_ot_all.className = "check_box_div";

  this.check_box_ot_label_all = document.createElement("label"); //checkbox label
  this.check_box_ot_label_all.className = "check_box_label";
  //this.check_box_ot_label_all.setAttribute("for", "check_box_ot_all");
  this.check_box_ot_label_all.innerHTML = "View all users\" revisions";

  this.or_div2 = document.createElement("div"); //or_message div
  this.or_div2.className = "or_div2";
  this.or_div2.innerHTML = "-- or --";

  this.or_div3 = document.createElement("div"); //or_message div
  this.or_div3.className = "or_div2";
  this.or_div3.innerHTML = "-- or --";

  this.check_box_ot_subset = document.createElement("input"); //checkbox div
  this.check_box_ot_subset.id = "check_box_ot_subset";
  this.check_box_ot_subset.setAttribute("type", "radio");
  this.check_box_ot_subset.className = "check_box_div";

  this.check_box_ot_label_subset = document.createElement("label"); //checkbox label
  this.check_box_ot_label_subset.className = "check_box_label";
  //this.check_box_ot_label_subset.setAttribute("for", "check_box_ot_subset");
  this.check_box_ot_label_subset.innerHTML = "View a user subset of revisions";

  this.slider_log_check = document.createElement("input"); //checkbox div
  this.slider_log_check.id = "check_box_log";
  this.slider_log_check.setAttribute("type", "radio");
  this.slider_log_check.className = "check_box_div_slider";
  this.slider_log_check.checked = true;

  this.slider_log_check_label = document.createElement("label"); //checkbox label
  this.slider_log_check_label.className = "check_box_div_slider_label";
  //this.slider_log_check_label.setAttribute("for", "check_box_log");
  this.slider_log_check_label.innerHTML = "View OT revisions log";

  this.slider_diff_check = document.createElement("input"); //checkbox div
  this.slider_diff_check.id = "check_box_diff";
  this.slider_diff_check.setAttribute("type", "radio");
  this.slider_diff_check.className = "check_box_div_slider";

  this.slider_diff_check_label = document.createElement("label"); //checkbox label
  this.slider_diff_check_label.className = "check_box_div_slider_label_special";
  //this.slider_diff_check_label.setAttribute("for", "check_box_diff");
  this.slider_diff_check_label.innerHTML = "View OT file diffs";

  this.magical_slider = document.createElement("input");
  this.magical_slider.setAttribute("type", "range"); // min=10 max=30 value=10 step=1
  this.magical_slider.className = "ot_slider_class";
  this.magical_slider.defaultValue = 100;

  this.old_date = document.createElement("div");
  this.old_date.className = "old_date_class";

  this.new_date = document.createElement("div");
  this.new_date.className = "new_date_class";
  //this.new_date.innerHTML = "Now";

  this.slide_to_revise = document.createElement("div");
  this.slide_to_revise.className = "slide_to_revise";
  this.slide_to_revise.innerHTML = "<p style=\"font-size:20px\">Slide to revise</p>";

  this.create_new_ot_rev_file = document.createElement("div");

  this.diff_view_collapse_chk = document.createElement("input"); //checkbox div
  this.diff_view_collapse_chk.id = "diff_view_collapse_chk";
  this.diff_view_collapse_chk.setAttribute("type", "checkbox");
  this.diff_view_collapse_chk.className = "check_box_div_diff_options";

  this.diff_view_collapse_chk_label = document.createElement("label"); //checkbox label
  this.diff_view_collapse_chk_label.className = "check_box_div_diff_label_collapse";
  this.diff_view_collapse_chk_label.setAttribute("for", "diff_view_collapse_chk");
  this.diff_view_collapse_chk_label.innerHTML = "<p style=\"font-size:12px\">Collapse</p>";

  this.diff_view_highlight_chk = document.createElement("input"); //checkbox div
  this.diff_view_highlight_chk.id = "diff_view_highlight_chk";
  this.diff_view_highlight_chk.setAttribute("type", "checkbox");
  this.diff_view_highlight_chk.className = "check_box_div_diff_options";
  this.diff_view_highlight_chk.checked = true;

  this.diff_view_highlight_chk_label = document.createElement("label"); //checkbox label
  this.diff_view_highlight_chk_label.className = "check_box_div_diff_label";
  this.diff_view_highlight_chk_label.setAttribute("for", "diff_view_highlight_chk");
  this.diff_view_highlight_chk_label.innerHTML = "<p style=\"font-size:12px\">Highlight</p>";


  this.hover_date_div = document.createElement("div");
  this.hover_date = new Drop({
    target: self.magical_slider,//menu,
    content: self.hover_date_div,
    position: "right top",
    openOn: "hover",
    classes: "drop-theme-arrows-bounce-dark",
    constrainToWindow: true,
    constrainToScrollParent: false
  });


  this.magical_slider.oninput = function() {
    //console.log(self.magical_slider.value);
    //self.ot_slider_val.innerHTML = self.magical_slider.value;

    if(self.ot_rev_type == "personal"){

      self.global_socket.emit("request_personal_timestamp_hover", {slider_val: self.magical_slider.value});

    }else if(self.ot_rev_type == "all"){

      self.global_socket.emit("request_all_timestamp_hover", {slider_val: self.magical_slider.value});

    }else if(self.ot_rev_type == "subset"){

      //self.global_socket.emit("request_subset_ot_revs", {user_id: USER_ID, file_id: self.file_id, slider_val: self.magical_slider.value});
      self.global_socket.emit("request_subset_timestamp_hover", {slider_val: self.magical_slider.value});
    }

  };  


  this.magical_slider.onchange = function() {
    //console.log(self.magical_slider.value);
    self.ot_slider_val.innerHTML = self.magical_slider.value;
    if(self.magical_slider.value == 100){
      self.dub_view.editor().setValue(self.dub_view.rightOriginal().getValue());
      //self.dub_view.rightOriginal().setValue(self.dub_view.editor().getValue());
    }else if(self.ot_rev_type == "personal"){

      self.global_socket.emit("request_personal_ot_revs", {user_id: USER_ID, file_id: self.file_id, slider_val: self.magical_slider.value, log_flag: self.log_flag});

    }else if(self.ot_rev_type == "all"){

      self.global_socket.emit("request_all_ot_revs", {user_id: USER_ID, file_id: self.file_id, slider_val: self.magical_slider.value, log_flag: self.log_flag});

    }else if(self.ot_rev_type == "subset"){

      //self.global_socket.emit("request_subset_ot_revs", {user_id: USER_ID, file_id: self.file_id, slider_val: self.magical_slider.value});
      self.global_socket.emit("checked_array_contents", {users_ids: self.checked_array, file_id: self.file_id, slider_val: self.magical_slider.value, log_flag: self.log_flag});
    }

  };

  this.check_box_ot_mine.onchange = function() { //selecting personal OT information

    //send message here to get only personal OT info for current file
    self.check_box_ot_mine.checked = true;

    self.global_socket.emit("request_personal_ot_revs", {user_id: USER_ID, file_id: self.file_id, slider_val: self.magical_slider.value, log_flag: self.log_flag});
    self.ot_rev_type = "personal";

    self.check_box_ot_all.checked = false; //keep the other boxes unchecked for sanity
    self.check_box_ot_subset.checked = false;

    self.subset_users_panel.className = "subset_panel_class_hidden";
    self.subset_users_panel.innerHTML = "";

    self.checkbox_array = []; //this is to clear the contents of the array of checked checkboxes for the subset setting
    self.checked_array = [];
  
  };

  this.check_box_ot_all.onchange = function() { //selecting all OT information for the open file

    //send message here to get only ALL OT info for current file
    self.check_box_ot_all.checked = true;

    self.global_socket.emit("request_all_ot_revs", {user_id: USER_ID, file_id: self.file_id, slider_val: self.magical_slider.value, log_flag: self.log_flag}); //just need the file_id in this case
    self.ot_rev_type = "all";

    self.check_box_ot_mine.checked = false; //keep the other boxes unchecked for sanity
    self.check_box_ot_subset.checked = false;

    self.subset_users_panel.className = "subset_panel_class_hidden";
    self.subset_users_panel.innerHTML = "";

    self.checkbox_array = []; //this is to clear the contents of the array of checked checkboxes for the subset setting
    self.checked_array = [];
  
  };

  this.check_box_ot_subset.onchange = function() { //selecting a subset of users OT revision information for the open file

    //send message here to get only SUBSET OT info for current file
    self.check_box_ot_subset.checked = true; // keep box checked

    self.global_socket.emit("selected_subset", {user_id: USER_ID, file_id: self.file_id, slider_val: self.magical_slider.value, log_flag: self.log_flag}); //need users selected and file_id"
    self.ot_rev_type = "subset";

    self.check_box_ot_all.checked = false; //keep the other boxes unchecked for sanity
    self.check_box_ot_mine.checked = false;

    self.subset_users_panel.className = "subset_panel_class_visible";

    self.ot_results.innerHTML = "Select some users...I insist";
  
  };//request_subset_ot_revs

  this.slider_log_check.onchange = function() { //selecting a subset of users OT revision information for the open file

    //hiding and disabling the button for creating a new file
    self.create_new_ot_rev_file.removeAttribute("class");
    self.create_new_ot_rev_file.innerHTML = "";
    self.create_new_ot_rev_file.disabled = true;

    self.diff_view_options.className = "diff_view_options_hidden";
    self.diff_view_options.innerHTML = "";

    //send message here to get only SUBSET OT info for current file
    self.slider_log_check.checked = true; // keep box checked

    self.log_flag = true;

    self.slider_diff_check.checked = false;

    //repopulate the results area with log entries when this is checked
    if(self.ot_rev_type == "personal"){

      self.global_socket.emit("request_personal_ot_revs", {user_id: USER_ID, file_id: self.file_id, slider_val: self.magical_slider.value, log_flag: self.log_flag});

    }else if (self.ot_rev_type == "all"){

      self.global_socket.emit("request_all_ot_revs", {user_id: USER_ID, file_id: self.file_id, slider_val: self.magical_slider.value, log_flag: self.log_flag}); //just need the file_id in this case

    }else if (self.ot_rev_type == "subset"){

      self.global_socket.emit("checked_array_contents", {users_ids: self.checked_array, file_id: self.file_id, slider_val: self.magical_slider.value, log_flag: self.log_flag});

    }
  
  };//request_subset_ot_revs

  this.slider_diff_check.onchange = function() { //selecting a subset of users OT revision information for the open file

    //showing and enabling the button for creating a new file
    self.create_new_ot_rev_file.className = "new_ot_file_button livos_button";
    self.create_new_ot_rev_file.innerHTML = "<p style=\"font-size:15px\">Create new file from current revision</p>";
    self.create_new_ot_rev_file.disabled = false;

    self.diff_view_options.className = "diff_view_options_visible";
    self.diff_view_options.appendChild(self.diff_view_highlight_chk);
    self.diff_view_options.appendChild(self.diff_view_highlight_chk_label);
    self.diff_view_options.appendChild(self.diff_view_collapse_chk);
    self.diff_view_options.appendChild(self.diff_view_collapse_chk_label);
    

    //send message here to get only SUBSET OT info for current file
    self.slider_diff_check.checked = true; // keep box checked

    self.log_flag = false;

    self.slider_log_check.checked = false;

    //load the results area with the codemirror diffs when this checkbox is checked
    var target = self.ot_results;
    self.ot_results.innerHTML = "";
    //target.innerHTML = "";
    load_css("libs/codemirror/theme/" + self.theme + ".css");

    self.dub_view = new CodeMirror.MergeView(target, {
      value: self.cm_content_snapshot, //want the left pane and right pane to be the same initially
      orig: self.cm_content_snapshot,
      //origLeft: null,
      theme: self.theme,
      lineNumbers: true,
      mode: self.mode,
      connect: null,
      highlightDifferences: self.diff_view_highlight,
      collapseIdentical: self.diff_view_collapse
    });

    if(self.ot_rev_type == "personal"){

      self.global_socket.emit("request_personal_ot_revs", {user_id: USER_ID, file_id: self.file_id, slider_val: self.magical_slider.value, log_flag: self.log_flag});

    }else if (self.ot_rev_type == "all"){

      self.global_socket.emit("request_all_ot_revs", {user_id: USER_ID, file_id: self.file_id, slider_val: self.magical_slider.value, log_flag: self.log_flag}); //just need the file_id in this case

    }else if (self.ot_rev_type == "subset"){

      self.global_socket.emit("checked_array_contents", {users_ids: self.checked_array, file_id: self.file_id, slider_val: self.magical_slider.value, log_flag: self.log_flag});

    }

  };//request_subset_ot_revs

  this.redraw_diff_view = function() {
    self.diff_view_collapse = !self.diff_view_collapse;

    var target = self.ot_results;
    self.ot_results.innerHTML = "";
    //target.innerHTML = "";
    //load_css("libs/codemirror/theme/" + self.theme + ".css");

    self.dub_view = new CodeMirror.MergeView(target, {
      value: self.collapse_view_content,
      orig: self.cm_content_snapshot,
      theme: self.theme,
      lineNumbers: true,
      mode: self.mode,
      connect: null,
      highlightDifferences: self.diff_view_highlight,
      collapseIdentical: self.diff_view_collapse
    });

  }

  this.create_new_ot_rev_file.onclick = function() {
    //this.editor_socket = editor_socket;
    //this.admin_mode
    //console.log(self.file_id);
    if(self.log_flag == false){
      var milli_secs = Date.now();
      var date_concat = new Date(milli_secs);
      var date_str_concat = date_concat.toString();
      var pattern = /[^A-Za-z0-9]/g;

      var shortened_str = date_str_concat.substring(0, date_str_concat.indexOf("GMT"));
      shortened_str = shortened_str.replace(pattern, "");

      
      if(self.file_name.indexOf("_OTrev") == -1){ //this means we didnt find "_OTrev" in the name yet, so append it

        var modified_file_name = self.file_name.slice(0, self.file_name.lastIndexOf(".")) + "_OTrev" + shortened_str + self.file_name.slice(self.file_name.lastIndexOf(".")); //watch out not to replace AFTER the file extension
        var to_concat = "_OTrev" + shortened_str;

      } else { //"OTrev" was already in the name so we should just overwrite the time of the previous  filename for the new file
        var modified_file_name = self.file_name.substring(0, self.file_name.indexOf("_OTrev") + 6);
        modified_file_name = modified_file_name.concat(shortened_str);
        var to_concat = shortened_str;

      }


      var modified_file_id = self.file_id.concat(to_concat);//date_concat.toString());
      var file_cont = self.dub_view.editor().getValue(); //this is the editable/changeable view of the diff screen 

      self.global_socket.emit("create_file", {parent: PROJECT_ID, file_type: self.file_mode, file_name: modified_file_name, project_id: PROJECT_ID, file_id: modified_file_id, new_ot_rev_content: file_cont});
      //self.global_socket.emit("get_file_list", {path: modified_file_id});
    }

  }

  this.diff_view_collapse_chk.onchange = function() { //selecting a subset of users OT revision information for the open file
    if(self.dub_view.editor().getValue() == self.dub_view.rightOriginal().getValue()){
      alertify.error("File content is identical, nothing to collapse!");
      self.diff_view_collapse_chk.checked = false;
    }else{

      self.collapse_view_content = self.dub_view.editor().getValue();
      self.redraw_diff_view();
    }
  };

  this.diff_view_highlight_chk.onchange = function() { //selecting a subset of users OT revision information for the open file

    self.dub_view.setShowDifferences(self.diff_view_highlight = !self.diff_view_highlight);
  
  };


  this.global_socket.on("create_file_error", function(obj){

    alertify.error("File already exists.");

  });

  this.global_socket.on("file_created", function(obj){
    var shortened_file_id = obj.file_id.replace(PROJECT_ID, "");
    alertify.success("File created: " + shortened_file_id);

  });




  this.ot_settings.appendChild(this.check_box_ot_mine);
  this.ot_settings.appendChild(this.check_box_ot_label_mine);

  this.ot_settings.appendChild(this.or_div);

  this.ot_settings.appendChild(this.check_box_ot_all);
  this.ot_settings.appendChild(this.check_box_ot_label_all);

  this.ot_settings.appendChild(this.or_div2);

  this.ot_settings.appendChild(this.check_box_ot_subset);
  this.ot_settings.appendChild(this.check_box_ot_label_subset);
  this.ot_settings.appendChild(this.subset_users_panel); //add in subset users panel box

  this.ot_slider.appendChild(this.slider_log_check);
  this.ot_slider.appendChild(this.slider_log_check_label);
  this.ot_slider.appendChild(this.or_div3);
  this.ot_slider.appendChild(this.slider_diff_check);
  this.ot_slider.appendChild(this.slider_diff_check_label);
  this.ot_slider.appendChild(this.diff_view_options);


  this.ot_slider.appendChild(this.slide_to_revise);
  this.ot_slider.appendChild(this.magical_slider);
  
  this.ot_slider.appendChild(this.old_date);
  this.ot_slider.appendChild(this.new_date);
  this.ot_slider.appendChild(this.create_new_ot_rev_file);
  //this.ot_slider.appendChild(this.ot_slider_val);


  this.ot_upper.appendChild(this.ot_settings); //append main elements first
  this.ot_upper.appendChild(this.ot_slider);
  this.app_div.appendChild(this.ot_upper);
  this.app_div.appendChild(this.ot_results);

  /*this.socket.on("receive_conf", function (obj) {
    var conf = JSON.parse(obj.conf);
    self.tab_holder.tabs["benchmarks"].innerHTML = "";
    for(var i in conf.benchmarks) {
      var optc = document.createElement("div");
      optc.className = "esesc_benchmark_option_container";
      self.tab_holder.tabs["benchmarks"].appendChild(optc);
      var chk = document.createElement("input");
      chk.type = "checkbox";
      chk.className = "esesc_benchmark_option";
      chk.value = i;
      chk.checked = conf.selected_benchmarks[i];
      chk.onchange = function () {
        var conf_val = "0";
        if(this.checked)
          conf_val = 1;
        self.socket.emit("set_conf", {project_id: PROJECT_ID, conf_name: "benchmark", index: this.value, conf_val: conf_val, history_name: ""});
      };
      optc.appendChild(chk);
      var optl = document.createElement("label");
      optl.innerHTML = i;
      optl.className = "esesc_benchmark_option_label";
      optc.appendChild(optl);
    };

    self.doms["ncheckpoints"].value = conf.ncheckpoints;
    self.doms["nskip"].value = conf.nskip;
    for(var param in conf.settings) {
      if(self.dom_types[param] == "check") {
        self.doms[param].checked = conf.settings[param];
      } else {
        self.doms[param].value = conf.settings[param];
      } 
    }
  }); */

};