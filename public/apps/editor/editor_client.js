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

function editor_client ()
{
	var self = this;
	this.editors = {};

	this.open_file = function (file_id, file_name, line_number, admin_mode)
	{
    if(!self.editors[file_id])
      self.editors[file_id] = [];
    var t = self.editors[file_id].length;
		self.editors[file_id][t] = new editor(file_id, t, file_name, self, line_number, admin_mode);
	};

	this.on_file_close = function(file_id, index)
	{
		self.editors[file_id][index] = null;
	};
}


function editor (file_id, index, file_name, ec, line_number, admin_mode) {
	var self = this;
	this.ec = ec;
	this.file_id = file_id;
  this.index = index;
	this.file_name = file_name;
	this.breakpoints_array = [];
	this.SocketIOAdapter = ot.SocketIOAdapter;
	this.EditorClient = ot.EditorClient;
  this.CodeMirrorAdapter = ot.CodeMirrorAdapter;
	this.disabledRegex = /(^|\s+)disabled($|\s+)/;
  this.has_changed = false;
  this.is_editing = true;
  this.do_watch = false;
  this.do_latex_watch = false;
  this.do_beautifier_watch = false;
  this.watch_io = {};
  this.error_drop_open = false;
  this.md_window = null;
  this.incl_path = (file_id == "admin");
  this.admin_mode = (admin_mode === true);
  this.ot_window = null;
  this.scroller_top = 0;

  if(line_number) 
    this.line_number = line_number;

	this.global_socket = io.connect(":" + PORTS.main + "/file_server", {"force new connection": true, query: $.param({token: TOKEN})});

  //Getting the right mode based on the extension
  this.set_mode = function (update) {
    self.extension = get_extension(self.file_name);

    var other_extensions = ["css"];
    switch(self.extension)
    {
      case "js": self.mode = "javascript";
      break;
      case "cpp": case "cc": case "c": case "h": self.mode = "clike";
      break;
      case "hs" : self.mode = "haskell";
      break;
      //case "html": case "htm": case "ejs": self.mode = "htmlembedded";
      //break;
      case "rb" : self.mode = "ruby";
      break;
      case "py" : self.mode = "python";
      break;
      case "v": case "rv": self.mode = "verilog";
      break;
      case "tex": self.mode = "stex";
      break;
      case "prp": self.mode = "pyrope";
      break;
      default : if(other_extensions.indexOf(self.extension) == -1)
                  self.mode = "";
                else
                  self.mode = self.extension;
    }

    //loading the needed libs for the mode
    if(self.mode !== "") {
      if(self.mode == "pyrope")
        load_lib("apps/editor/mode/" + self.mode + ".js");
      else
        load_lib("libs/codemirror/mode/"+self.mode+"/"+self.mode+".js");
    }

    //loading lint if available
    if(self.mode == "javascript" || self.mode == "css")
    {
      if(self.mode == "javascript")
        load_lib("libs/misc/jshint.js");
      else
        load_lib("libs/codemirror/addon/lint/lint.js");
      load_lib("libs/codemirror/addon/lint/"+self.mode+"-lint.js");
      self.do_lint = true;
    } else if(self.mode == "pyrope") {
      load_lib("libs/codemirror/addon/lint/lint.js");
      load_lib("apps/editor/lint/"+self.mode+"-lint.js");
      load_lib("apps/editor/lint/"+self.mode+"-parser.js");
      self.do_lint = true;
    } else {
      self.do_lint = false;
    }

    if(update) {
      self.cm.setOption("mode", self.mode);
      self.cm.setOption("lint", self.do_lint);
    }

  };

  this.set_mode();

  //Loaing the theme CSS
  if(all_settings.user_editor_theme.indexOf("liveos") == 0)
    load_css("apps/editor/theme/" + all_settings.user_editor_theme + ".css");
  else
    load_css("libs/codemirror/theme/" + all_settings.user_editor_theme + ".css");
  this.theme_cm = all_settings.user_editor_theme;
  
  //Editor settings
  this.editor_settings = {
    //theme: "twilight",
    theme: all_settings.user_editor_theme,
    gutters: ["CodeMirror-lint-markers", "CodeMirror-linenumbers", "breakpoints", "CodeMirror-foldgutter"],
    lineNumbers: true,
    lineWrapping: true,
    styleActiveLine: true,
    mode: self.mode,
    lint: self.do_lint,
    foldGutter: {
      rangeFinder: new CodeMirror.fold.combine(CodeMirror.fold.brace, CodeMirror.fold.comment)
    },
    scrollbarStyle: "overlay"
  };

  
  switch(all_settings.user_editor_mode) {
    case "vim":
      load_lib("libs/codemirror/keymap/vim.js");
      self.editor_settings.vimMode = true;
      self.editor_settings.matchBrackets = true;
      self.editor_settings.showCursorWhenSelecting = true;
    break;
    case "sublime":
      load_lib("libs/codemirror/addon/edit/closebrackets.js");
      load_lib("libs/codemirror/addon/comment/comment.js");
      load_lib("libs/codemirror/addon/wrap/hardwrap.js");
      load_lib("libs/codemirror/keymap/sublime.js");
      self.editor_settings.keyMap = "sublime";
      self.editor_settings.autoCloseBrackets = true;
      self.editor_settings.matchBrackets = true;
      self.editor_settings.showCursorWhenSelecting = true;
    break;
    case "emacs":
      load_lib("libs/codemirror/addon/comment/comment.js");
      load_lib("libs/codemirror/keymap/emacs.js");
      self.editor_settings.keyMap =  "emacs";
    break;
  }

  this.on_close = function () {
    if(self.socket) {
      self.socket.emit("save", {admin_mode: self.admin_mode});
      self.socket.disconnect();
    }
    self.global_socket.disconnect();
    if(self.incl_path)
      self.file_id = "admin";
    self.error_content.parentNode.removeChild(self.error_content);
    self.ec.on_file_close(self.file_id, self.index);
  };

	//creating a new window
	this.app_div = document.createElement("div");
	this.app_div.className = "editor_container";

  //if admin mode
  if(this.file_id == "admin") {
    this.top_bar = document.createElement("div");
    this.top_bar.className = "editor_top_bar";
    this.app_div.appendChild(this.top_bar);
    this.source_input = document.createElement("input");
    this.source_input.type = "text";
    this.source_input.value = "Enter full file path here";
    this.source_input.className = "editor_source_input";
    this.top_bar.appendChild(this.source_input);
    this.source_input.onfocus = function () {
      if(self.source_input.value == "Enter full file path here")
        self.source_input.value = "";
    };

    this.source_input.onblur = function () {
      if(self.source_input.value === "")
        self.source_input.value = "Enter full file path here";
    };

    this.source_input.onchange = function () {
      if(self.socket) {
        self.socket.emit("save", {admin_mode: true});
        self.socket.disconnect();
      }
      self.file_id = self.source_input.value;
      self.file_name = self.file_id;
      self.global_socket.emit("file_request", {user_id: USER_ID, signature: SIGNATURE, file_id: self.file_id, admin_mode: true});
      self.set_mode(true);
    };
  }

	var editor_title = this.file_name;
	this.app_window = wm.openElement(this.app_div, 766, 500, "random", "random", {"title" : editor_title}, {}, self.on_close);
  this.app_window.adjust_menu_position(-5,0);

	//creating codemirror element
	this.editor_wrapper = document.createElement("div");
	this.editor_wrapper.className="editor_wrapper";
  if(this.incl_path)
    this.editor_wrapper.className="editor_wrapper_admin";
	this.cm = window.cm = CodeMirror(this.editor_wrapper, this.editor_settings);

  //this.cm.setCursor(pos: {this.line_number, 0});
  
  //this.cm.setSelection({line: this.line_number, ch:0}, {line: this.line_number});
  //this.cm.scrollIntoView({line: this.line_number, ch:0});

	this.cm.on("gutterClick", function(cm, n, gutter) {
		if(gutter!="CodeMirror-linenumbers")
	    	return;
	  	var info = cm.lineInfo(n);
	  	if(self.breakpoints_array[n])
	    	self.breakpoints_array[n]=false;
	  	else
	    	self.breakpoints_array[n]=true;
	  	cm.setGutterMarker(n, "breakpoints", self.breakpoints_array[n] ? self.makeMarker() : null);
	});

	this.makeMarker = function() {
		var marker = document.createElement("div");
	  	marker.style.color = "#822";
	  	marker.innerHTML = "●";
	  	return marker;
	};

	this.overlay = document.createElement("div");
	this.overlay.id = "overlay_"+this.file_id;
	this.overlay.onclick = self.stopPropagation;
	this.overlay.onmousedown = self.stopPropagation;
	this.overlay.onmouseup = self.stopPropagation;
	this.cmWrapper = this.cm.getWrapperElement();
	this.cmWrapper.appendChild(this.overlay);

  //requesting the file in OT mode
  if(! self.incl_path) {
	  this.global_socket.emit("file_request", {user_id: USER_ID, signature: SIGNATURE, file_id: self.file_id, admin_mode: self.admin_mode});
  }
  this.global_socket.on("file_request_denied", function (obj) {
    alertify.error(obj.msg);
  });
	this.global_socket.on("file_request_granted", function(obj) {
		if(obj.file_id == self.file_id)
		{
			self.socket = io.connect(":" + PORTS.main + "/ot/"+self.file_id+"/", {"force new connection": true, query: $.param({token: TOKEN})});

      self.socket.on("doc", function (obj) {
        //obj.str is CURRENT OT file content?
        //self.cm_content_snapshot = obj.str;

  			self.cm.setValue(obj.str);
  			self.cmClient = window.cmClient = new self.EditorClient(
    				obj.revision,
    				obj.clients,
    				new self.SocketIOAdapter(self.socket),
    				new self.CodeMirrorAdapter(self.cm)
  			);
        //console.log("ln " + self.line_number);
        if(self.scroller_top)
          self.cm.display.scroller.scrollTop = self.scroller_top;

        if(self.line_number){
          //console.log("GOTO: " + self.line_number);      
          self.cm.scrollIntoView({line: self.line_number, ch:0});
          self.cm.setCursor(parseInt(self.line_number - 1), 0);
          self.cm.focus();

        }
        ////////

  			self.cm.on("change", function () {
  				if (!self.cmClient) { return; }
          self.is_editing = true;
          self.has_changed = true;
  				(self.cmClient.undoManager.canUndo() ? self.enable : self.disable)(self.menu_items.undo);
  				(self.cmClient.undoManager.canRedo() ? self.enable : self.disable)(self.menu_items.redo);
          if(self.md_window)
            self.md_window.update(self.cm.getValue());
            //self.cm_content_snapshot = obj.str;
  			});

        self.cm.on("keydown", function () {
          self.is_editing = true;
        });
  		});
      self.socket.on("rewrite", function (obj) {
        //self.line_number = self.cm.getCursor().line;
        self.scroller_top = self.cm.display.scroller.scrollTop;
        self.socket.disconnect();
        self.global_socket.emit("file_request", {user_id: USER_ID, signature: SIGNATURE, file_id: self.file_id, admin_mode: self.admin_mode});
      });
			
      self.socket.emit("access_request", {user_id: USER_ID, signature: SIGNATURE, name: USER_NAME, admin_mode: self.admin_mode});
			
      self.socket.on("access_granted", function(obj) {
				//self.user_list_wrapper.appendChild(self.cmClient.clientListEl);
			});
			self.socket.on("kill", function(obj) {
				self.app_window.close();
				//kill
			});

      //On saved
      self.socket.on("saved", function(obj) {
        if(self.do_watch)
          self.trigger_watch();
        if(self.do_latex_watch)
          self.trigger_latex_watch();
        if(self.do_beautifier_watch)
          self.trigger_beautifier_watch();
      }); 
		}
	});


	//save
	this.save_func = function()
	{
		self.socket.emit("save", {admin_mode: self.admin_mode});
	};

  //Watch for ESESC
  this.toggle_watch = function () {
    if(self.do_watch) {
      self.do_watch = false;
      self.watch_io.esesc.disconnect();
      self.watch_io.esesc = null;
			self.menu_items.watch_esesc.title.nodeValue = "Watch for LiveSim";
    } else {
      self.do_watch = true;
			self.menu_items.watch_esesc.title.nodeValue = "Unwatch LiveSim";
      self.watch_io.esesc = io.connect(":" + PORTS.esesc + "/esesc", {"force new connection": true, query: $.param({token: TOKEN})});
      self.watch_io.esesc.on("status", function (obj) {
        if(obj.project_id != PROJECT_ID)
          return;
        if(obj.message == "recompiling" || obj.message == "simulating" || obj.message == "simulation_stopped" || obj.message == "simulation_done") {
          self.error_drop.close();
          self.error_drop_open = false;
        } else {
          self.error_content.innerHTML = obj.message;
          self.error_drop.open();
          setTimeout(function () {
            self.error_drop_open = true;
          }, 10);
          setTimeout(function () {
            self.error_drop.close();
            self.error_drop_open = false;
          }, 5000);
        }
      });
    }
  };

  this.trigger_watch = function () {
    //running live ESESC
    self.watch_io.esesc.emit("run", {project_id: PROJECT_ID});
  };

  //Watch for LaTeX
  this.toggle_latex_watch = function () {
    if(self.do_latex_watch) {
      self.do_latex_watch = false;
      self.watch_io.latex.disconnect();
      self.watch_io.latex = null;
			self.menu_items.watch_latex.title.nodeValue = "Watch for LaTex";
    } else {
      self.do_latex_watch = true;
			self.menu_items.watch_latex.title.nodeValue = "Unwatch LaTex";
      self.watch_io.latex = io.connect(":" + PORTS.latex + "/latex", {"force new connection": true, query: $.param({token: TOKEN})});
      self.watch_io.latex.on("latex_error", function (obj) {
        
      });
    }
  };

  this.trigger_latex_watch = function () {
    var t = self.file_id.indexOf("/");
    var source_file = self.file_id.substring(t + 1);
    self.watch_io.latex.emit("recompile", {project_id: PROJECT_ID, source_file: source_file});
  };

  //Watch for beautifier
  this.toggle_beautifier_watch = function () {
    if(self.do_beautifier_watch)
      self.do_beautifier_watch = false;
    else
      self.do_beautifier_watch = true;
  };

  this.trigger_beautifier_watch = function () {
    cm_beautify(self.cm);
    //self.has_changed = false;
  };

  this.open_markdown = function () {
    self.md_window = mdc.open(self.cm.getValue());
  };

  this.open_revision_settings = function () {
    if(self.ot_window) {
      JSWM.setActiveWindow(self.ot_window);
      JSWindow.setActive();
    } else {
      //NEED TO SENT SELF.MODE AND THE CM FILE HERE
      self.ot_window = new ot_settings(self.theme_cm, self.file_name, self.cm.getValue(), self.mode, self.file_id, function () {
        self.ot_window = null;
      });

      self.ot_window.open();
    }

  };

	//undo
	this.undo_func = function (e) 
	{
		self.cm.undo(); 
		self.cm.focus(); 
		self.stopEvent(e); 
	};

	//redo
	this.redo_func = function (e) 
	{ 
		self.cm.redo(); 
		self.cm.focus(); 
		self.stopEvent(e); 
	};

		//add menu items
		self.menu_items = {};
		self.menu_items.undo =	this.app_window.add_menu_item("Undo", "img/undo.png", "icon", this.app_window.menu, this.undo_func);
		self.menu_items.redo =	this.app_window.add_menu_item("Redo", "img/redo.png", "icon", this.app_window.menu, this.redo_func);
		self.menu_items.save =	this.app_window.add_menu_item("Save", "img/save.png", "icon", this.app_window.menu, this.save_func);
		self.menu_items.people =	this.app_window.add_menu_item("People", "img/people.png", "icon", this.app_window.menu, null);
    self.menu_items.revisions = this.app_window.add_menu_item("View Revisions", "", "title", this.app_window.menu, this.open_revision_settings);
		if(PORTS.esesc)
      self.menu_items.watch_esesc =	this.app_window.add_menu_item("Watch for LiveSim", "", "title", this.app_window.menu, this.toggle_watch);
		self.menu_items.watch_latex =  this.app_window.add_menu_item("Watch for LaTeX", "", "title", this.app_window.menu, this.toggle_latex_watch);
    if(PORTS.beautifier)
      self.menu_items.watch_beautifier =  this.app_window.add_menu_item("Watch for Beautifier", "", "title", this.app_window.menu, this.toggle_beautifier_watch);
    self.menu_items.markdown =  this.app_window.add_menu_item("Markdown", "", "title", this.app_window.menu, this.open_markdown);
    this.app_window.activate_menu();

    this.error_content = document.createElement("div");
    this.error_content.className = "editor_error_drop_content";
    this.error_drop = new Drop({
      target: self.app_window.menu,
      content: self.error_content,
      position: "bottom left",
      openOn: null,
      classes: "drop-theme-arrows-bounce-dark editor_error_drop",
      constrainToScrollParent: false
    });

		$(self.menu_items.people).powerTip({
			placement: "se"
		});

		self.menu_items.people[0].onmouseover = function(e){
  		if(self.cmClient.clientListEl.childNodes.length === 0){
  			$(self.menu_items.people).data("powertip", "You are the only one editing this file");
  		}else{
  			$(self.menu_items.people).data("powertip", self.cmClient.clientListEl);	
			}
		};


  	this.enable = function(el) 
  	{
    	el.className = el.className.replace(self.disabledRegex, " ");
  	};

  	this.disable = function(el) 
  	{
    	if (!self.disabledRegex.test(el.className)) {
      	el.className += " disabled";
    	}
  	};

  	this.preventDefault = function(e) 
  	{
    	if (e.preventDefault) { e.preventDefault(); }
  	};

  	this.stopPropagation = function(e) 
  	{
    	if (e.stopPropagation) { e.stopPropagation(); }
  	};

  	this.stopEvent = function(e) 
  	{
    	self.preventDefault(e);
    	self.stopPropagation(e);
  	};

  	this.removeElement = function(el) 
  	{
    	el.parentNode.removeChild(el);
  	};

  	this.beginsWith = function(a, b) 
  	{ 
  		return a.slice(0, b.length) == b; 
  	};
  	
  	this.endsWith = function(a, b) 
  	{ 
  		return a.slice(a.length - b.length, a.length) == b; 
  	};

  	this.wrap = function(chars) 
  	{
    	self.cm.operation(function () {
      		if (self.cm.somethingSelected()) {
        		var selection = self.cm.getSelection();
        		if (beginsWith(selection, chars) && endsWith(selection, chars)) {
          			self.cm.replaceSelection(selection.slice(chars.length, selection.length - chars.length));
        		} else {
          			self.cm.replaceSelection(chars + selection + chars);
        		}
      		} else {
        		var index = self.cm.indexFromPos(self.cm.getCursor());
        		self.cm.replaceSelection(chars + chars);
        		self.cm.setCursor(self.cm.posFromIndex(index + 2));
      		}
    	});
    	self.cm.focus();
  	};


  	//adding codemirror to the window
  	this.app_div.appendChild(this.editor_wrapper);    

    //Setting the autosave interval
    this.auto_save = setInterval(function () {
      if(self.has_changed && (! self.is_editing)) {
        self.save_func();
        self.has_changed = false;
      }
      self.is_editing = false;
    }, 500);

  $("html").click(function () {
    if(self.error_drop_open)
      self.error_drop.close();
  });

  $("html").keydown(function () {
    if(self.error_drop_open)
      self.error_drop.close();
  });

  //gutter width issue bugfix
  self.cm.refresh();
}
