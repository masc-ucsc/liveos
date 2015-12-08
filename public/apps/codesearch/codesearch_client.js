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

function codesearch_client()
{
	//defining fields
	var self = this;
	this.saved_keys = "";

	this.open = function()
	{
		var app_window = new codesearch_window(self, function () {
			app_window = null;
		});
	};
}

function codesearch_window(cc_parent, on_close)
{
  //class fields
  var self = this;
	this.parent = cc_parent;
	this.split_filenames = [];
	this.split_numbers = [];
	this.alike_counter = 0;
	this.typing_timer = 0;
	this.key_array = [];
	this.div_array = [];
	this.div_array_counter = 0;
	this.arrow_counter = 0;
	this.end_bool = false;
	this.ad_bool = false;
	this.ad_line_num = 0;
  this.help = "";
  this.help_path = "";
	this.file_open_on_enter = [];
	this.number_open_on_enter = [];
	this.source_file = "";
	this.parent_close = on_close;

  //connecting to server
	this.socket = io.connect(":" + PORTS.csearch + "/codesearch", {"force new connection": true, query: $.param({token: TOKEN})});

	//creating html canvas
	this.app_div = document.createElement("div");
	this.app_div.className = "main_csearch_win";

	//top bar
	this.top_bar = document.createElement("div");
	this.top_bar.className = "top_csearch_area";
	this.app_div.appendChild(this.top_bar);

	//source input
	this.source_input = document.createElement("input");
	this.source_input.type = "text"; 
	this.source_input.value = "Enter code search here";
	this.source_input.className = "top_csearch_bar";
	this.top_bar.appendChild(this.source_input);

	//results window
	this.results = document.createElement("div");
	this.results.className = "csearch_results_window";
	this.app_div.appendChild(this.results);

	//re-indexing logo
	this.top_bar_alert = document.createElement("div");
 	this.top_bar_alert.className = "top_bar_alert_css";
	this.top_bar_alert.innerHTML = "re-index";

	this.socket.emit("registering", {project_id: PROJECT_ID}); //send client attributes
	
	this.results.innerHTML += "Example: \"search_string\" + fuzzy fileregex OR \"search with spaces\" OR plain_search_no_spaces OR --help [search terms]";
	this.results.style.color = "grey";

	/*this.app_div.onfocus = function(){
		alert("appdiv focus");
		self.source_input.focus();
		self.results.focus();
		self.file_open_on_enter[self.div_array_counter - 1].focus();

	}*/

	this.re_index = function() { //manually reindex by clicking button
		self.socket.emit("csearch_reindex", {project_id: PROJECT_ID});

	};

	this.source_input.onfocus = function () {
		if(self.source_input.value == "Enter code search here"){
			self.source_input.value = "";
		}

		self.source_input.addEventListener("keyup", keytimeout);

	};

	this.source_input.onblur = function () {

		if(self.source_input.value === "") {
			self.source_input.value = "Enter code search here";
			//self.socket.emit("lost_focus");
		}
		self.source_input.removeEventListener("keyup", keytimeout);
	};


	function keytimeout(e){
		
		switch(e.which) {

			case 27:
				wm.curr_active_window.close();
				app_window = null;
				self.on_close();
			  e.preventDefault();
      	return;

      case 38: // up
      	if(self.div_array.length > 0){
      		self.arrow_counter += 1;
      		if(self.end_bool) {
      			self.div_array_counter += 1;
        		self.end_bool = false;
        	}
        	if(self.div_array_counter == 1) return;
        	else{
						self.div_array_counter -= 1;
        		self.div_array[self.div_array_counter - 1].className = "csearch_filename_results_kbselect";
        		self.div_array[self.div_array_counter].scrollIntoView(false);	
        		self.div_array[self.div_array_counter].className = "csearch_filename_results";
        	}
        }
        e.preventDefault();
      	return;

      case 40: // down
      	if(self.div_array.length > 0){
      		self.arrow_counter += 1;
      		if(self.div_array_counter == self.div_array.length - 1) {
    				self.end_bool = true;
    				self.div_array[self.div_array_counter].className = "csearch_filename_results_kbselect";
    				self.div_array[self.div_array_counter - 1].className = "csearch_filename_results";
    				return;
    			}
      		self.div_array[self.div_array_counter].className = "csearch_filename_results_kbselect";
      		self.div_array[self.div_array_counter + 1].scrollIntoView(false);
      		if(self.div_array_counter >=1) {
      			self.div_array[self.div_array_counter - 1].className = "csearch_filename_results";
      		}
      		self.div_array_counter += 1;
      	}
      	e.preventDefault();
      	return;

      case 13: //enter
      	if(self.arrow_counter === 0 || self.div_array.length === 0) return;	
      	self.div_array[self.div_array_counter].className = "csearch_filename_results"; 
      	self.source_input.blur();
      	if(self.end_bool) {
      		self.div_array_counter += 1;
      		self.end_bool = false;
      	}

      	try{
          if(self.help === true){
            var absolute_file_path = self.help_path.substring(self.help_path.indexOf("/live/ide/") + 10) + "/Help";
            var path_id = "Help";
            if(e.shiftKey) apps.editor.open_file(absolute_file_path, path_id, self.number_open_on_enter[self.div_array_counter - 1], true);
            else{
              wm.curr_active_window.close();
              app_window = null;
              self.on_close();
              apps.editor.open_file(absolute_file_path, path_id, self.number_open_on_enter[self.div_array_counter - 1], true);
            }
          } else {
            var file_id = PROJECT_ID + "/" + self.file_open_on_enter[self.div_array_counter-1];
            if(e.shiftKey) self.open_me(file_id, self.file_open_on_enter[self.div_array_counter - 1], self.number_open_on_enter[self.div_array_counter - 1]);
        		else{
  	      		wm.curr_active_window.close();
  						app_window = null;
  						self.on_close();
  	      		self.open_me(file_id, self.file_open_on_enter[self.div_array_counter - 1], self.number_open_on_enter[self.div_array_counter - 1]);
  	      	}
          }
      	}catch(err){
      		console.log(err);
      	}
      	self.div_array_counter = 0;
      	e.preventDefault();
      	return;

      case 65: //a
      	if (e.ctrlKey){
      		setCaretPosition(self.source_input, 0);
      	}
      	return;

      case 69://e
      break;

      case 37: //left
      	e.preventDefault();
      	return;

      case 39: //right
      	e.preventDefault();
      	return;
    }

		clearTimeout(self.typing_timer);
		self.parent.saved_keys = self.key_array;
		self.key_array = self.source_input.value;
		self.typing_timer = setTimeout(function () {
      keyaction(self.key_array);
    }, 200);
	}


	function setCaretPosition(elem, caretPos) {
    if(elem !== null) {
      if(elem.createTextRange) {
        var range = elem.createTextRange();
        range.move("character", caretPos);
        range.select();
      }
      else {
        if(elem.selectionStart) {
          elem.focus();
          elem.setSelectionRange(caretPos, caretPos);
        }
        else
          elem.focus();
      }
    }
	}
	

	function keyaction(send_key_array){
    if(self.source_input.value == last_sent_keys){
    	return;	
    }else{
			self.socket.emit("csearch_key_array", {key_array: send_key_array});
			var last_sent_keys = send_key_array;
			self.div_array_counter = 0;
			self.arrow_counter = 0;
		}
	}

	self.socket.on("manual_cindex_working", function(){
		self.top_bar_alert.className = "top_bar_alert_busy_css";
		self.top_bar_alert.innerHTML = "busy";
		self.top_bar.appendChild(self.top_bar_alert);
	});

	self.socket.on("manual_cindex_working_done", function(){
		self.top_bar.removeChild(self.top_bar_alert);
	});

	self.socket.on("load_saved_key_array", function() {
		if(self.parent.saved_keys === "") 
      self.source_input.value = "";
		else {
			self.source_input.value = self.parent.saved_keys;
			self.source_input.select();
			self.socket.emit("csearch_key_array", {key_array: self.parent.saved_keys});
			self.div_array_counter = 0;
			self.arrow_counter = 0;
		}
	});

  self.socket.on("stdout_message", function(obj) { //appending stdout returned to the div
    self.results.src = "";
    self.results.innerHTML = "";
    self.help = obj.help;
    self.help_path = obj.help_path;
   	var orig_message = obj.message;
   	var temp = "";

   	obj.message = obj.message.split("\n");	

		for (var i = 0; i < obj.message.length; i++) { //This loop properly captures the filename!!
			
			if(obj.message[i] === "$$BD$$"){
				this.before_delimeter = document.createElement("div");
					
				this.before_delimeter.innerHTML = "Recent files: ";
				this.before_delimeter.style.color = "green";

				self.results.appendChild(this.before_delimeter);

			}else if (obj.message[i] === "$$AD$$"){

				self.ad_bool = true;
				self.ad_line_num = i;

			}

			var colon_index = obj.message[i].indexOf(":"); //verified
			var word_holder = obj.message[i]; //grab a line

			for(var j = colon_index + 1; j <= word_holder.length; j++){ //grab a char of that line
				if(isNaN(word_holder[j]) === false){ //verified
					self.split_numbers += word_holder[j];
					temp += word_holder[j];
				} else if (isNaN(word_holder[j]) === true) {
					var temp_num_substring = obj.message[i].substring(colon_index + 1, colon_index + 1 + temp.length); //now I have the part of the line that is PAST the filename (with potential numbers in it)
					var colored_stdout = temp_num_substring.fontcolor("orange"); //temp_msg_substring.split(temp).join(color_nums);
					var end_chunk_msg_holder = "";

          if(self.help === true){
            beg_chunk_msg_holder = "Help:";
          } else {
            beg_chunk_msg_holder = obj.message[i].substring(0, colon_index + 1);
          }
					
					end_chunk_msg_holder = obj.message[i].substring(colon_index + 1 + temp.length);

					var beg_and_num_chunk = beg_chunk_msg_holder.concat(colored_stdout);

					obj.message[i] = beg_and_num_chunk.concat(end_chunk_msg_holder);
					self.split_numbers += "\n";
					temp = "";
					break;
				}
			}

	    self.split_filenames += obj.message[i].split(":", 1); //This strips the "code" returned by csearch (right of the ":") out of the returned output, so as to store just the filenames
	    self.split_filenames += "\n";

  	}

    self.split_filenames = self.split_filenames.split("\n"); //line num array and file name array now have the same length, do a single for loop to solve the problem
    self.split_numbers = self.split_numbers.split("\n");



    i = 0;
    var encountered_dash = 0;
    self.div_array = [];
    self.file_open_on_enter = [];
    self.number_open_on_enter = [];

    while(i < self.split_filenames.length){
			if(self.ad_bool === true && self.ad_line_num == i){
				this.after_delimeter = document.createElement("div");
			
				this.after_delimeter.innerHTML = "Other files: ";
				this.after_delimeter.style.color = "green";

				self.results.appendChild(this.after_delimeter);

				self.ad_bool = false;
					
			}

  		if(self.split_filenames[i] == self.split_filenames[i+1] && (self.split_numbers[i+1] - self.split_numbers[i] == 1)) {// found like files, lets see how many...
    		self.alike_counter += 1;
    		i += 1;
    	} else { 
    		if(self.alike_counter === 0) { //encountered a dash "--" in ag output, didnt find any alike filenames yet
    			encountered_dash += 1;
    			i += 1;
    			self.alike_counter = 0;
				} else { // found alike filenames and file i+1 is no longer alike
	    		var beg_index = (i - self.alike_counter);
	    		var end_index = beg_index + self.alike_counter + 1;
	    		var color_file = self.split_filenames[i].fontcolor("grey"); //("yellow");//.background("blue");
	   	    var split_html = obj.message.slice(beg_index, end_index); //split the stdout into interesting div size chunks
	    		var return_result = split_html.join("\n");
	    		return_result = return_result.split(self.split_filenames[i]).join(color_file); //this split works for all files because filenames are the same within this else block
	    		this.filename_result = document.createElement("div");
					this.filename_result.className = "csearch_filename_results";
					this.filename_result.innerHTML = return_result; // + "\n";
					self.div_array.push(this.filename_result);

					this.filename_result.ondblclick = (function() {
						var current_alike_counter = self.alike_counter;
						var current_i = i;
						var index_to_open = current_i;// - current_alike_counter;
						var current_split_nums = self.split_numbers;
						var current_split_files = self.split_filenames;
						current_split_files[index_to_open] = current_split_files[index_to_open].replace(/<font color=\"red\">/g, "");
						current_split_files[index_to_open] = current_split_files[index_to_open].replace(/<\/font>/g, "");

						self.file_open_on_enter.push(current_split_files[index_to_open]);
						self.number_open_on_enter.push(current_split_nums[index_to_open]);

						return function() { 
              if(self.help === true){
                var absolute_file_path = self.help_path.substring(self.help_path.indexOf("/live/ide/") + 10) + "/Help";
                var path_id = "Help";
                apps.editor.open_file(absolute_file_path, path_id, current_split_nums[index_to_open], true);
              } else {
  							var file_id = PROJECT_ID + "/" + current_split_files[index_to_open];
                self.open_me(file_id, current_split_files[index_to_open], current_split_nums[index_to_open]);
							}	
			      };
					})();

					self.results.appendChild(this.filename_result);

					i += 1;
					self.alike_counter = 0;
				}
    	}
    }

    self.split_numbers = [];
    self.split_filenames = [];

  });

  self.socket.on("clear_csearch_message", function() { //clearing search results window when no search items are entered
    self.results.src = "";
    self.results.innerHTML = "Example: \"search_string\" + fuzzy fileregex OR \"search with spaces\" OR plain_search_no_spaces OR --help [search terms]";
    self.results.style.color = "grey";

    self.key_array = [];
  });


  self.socket.on("csearch_first_time_indexing", function(){
  	self.results.src = "";
    self.results.innerHTML = "First time only: csearch is indexing your live environment files, please wait...";
    self.results.style.color = "grey";

		//self.top_bar.appendChild(self.top_bar_cover);
  });

	self.socket.on("csearch_first_time_indexing_done", function(){
  	self.results.src = "";
    self.results.innerHTML = "Type your search\n\n";
    self.results.innerHTML += "Example: \"search_string\" + fuzzy fileregex OR \"search with spaces\" OR plain_search_no_spaces OR --help [search terms]";
    self.results.style.color = "grey";
  });

  self.socket.on("disconnect", function() {
  });

  this.open_me = function(file_id, file_name, line_number) {
  	apps.editor.open_file(file_id, file_name, line_number);
  };

	this.on_close = function () {
		self.socket.disconnect();
		self.parent_close();
	};

	this.html_escape = function (str) {
  	return String(str)
    	.replace(/&/g, "&amp;")
    	.replace(/"/g, "&quot;")
    	.replace(/"/g, "&#39;")
    	.replace(/</g, "&lt;")
    	.replace(/>/g, "&gt;");
	};

	this.app_window = wm.openElement(self.app_div, 900, 465, "random", "random", {"title" : "Code Search"}, {}, self.on_close); //715, 465 for chromium 715, 485 FF
	this.menu_items = {};
	this.menu_items.reindex = this.app_window.add_menu_item("Re-index", "", "title", this.app_window.menu, self.re_index);
	this.app_window.activate_menu();
  this.source_input.focus();
	this.app_window.setDF(this.source_input);
}
