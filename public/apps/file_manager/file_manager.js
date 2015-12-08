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
 */

function file_client () {
	//defining fields
	var self = this;
	this.app_open = false;
	this.app = null;

	//open window
	this.open = function()
	{
		if(!self.app_open)
		{
			self.app = new file_manager(self);
			self.app_open = true;
		}
	};

	this.on_close = function () {
		self.app = null;
		self.app_open = false;
	};
}

function file_manager(parent)
{
	//defining fields
	var self = this;
	this.parent = parent;
	this.app_window = null;
	this.file_tree = null;
	this.file_tree_load_callback = [];
	this.file_tree_click_flag = false;
	this.file_tree_clipboard = null;
	this.file_tree_clipboard_action = "";
	this.drops = {};
	this.to_disappear = [];
	this.delivery = null;
	this.to_be_uploaded = 0;	
	this.socket = io.connect(":" + PORTS.main + "/file_server", {"force new connection": true, query: $.param({token: TOKEN})});

	this.add_popup = function (name, el, message) {
		self.drops[name] = new Drop({
		  target: el,
		  content: message,
		  position: "right middle",
		  openOn: null,
		  classes: "drop-theme-arrows-bounce-dark file_manager_drop",
		  constrainToScrollParent: false
		});

		self.drops[name].on("open", function () {
			setTimeout(function () {
				self.to_disappear.push(self.drops[name]);
			}, 10);
		});
	};

	//Creating elements
	this.app_div = document.createElement("div");
	this.app_div.setAttribute("class", "file_manager_container");

	//Toolbar
	this.toolbar = document.createElement("div");
	this.toolbar.className = "file_browser_toolbar";
	this.app_div.appendChild(this.toolbar);

	//new folder
	this.btn_folder = document.createElement("div");
	this.btn_folder.id = "new_folder_button";
	this.btn_folder.className = "file_browser_toolbar_button";
	this.btn_folder_icon = document.createElement("img");
	this.btn_folder_icon.src = "img/folder_open24.png";
	this.btn_folder.appendChild(this.btn_folder_icon);
	this.btn_folder.onclick = function() { self.create_file("folder"); };
	this.toolbar.appendChild(this.btn_folder);

	//new file
	this.btn_file = document.createElement("div");
	this.btn_file.id = "new_file_button";
	this.btn_file.className = "file_browser_toolbar_button";
	this.btn_file_icon = document.createElement("img");
	this.btn_file_icon.src = "img/note_add24.png";
	this.btn_file.appendChild(this.btn_file_icon);
	this.btn_file.onclick = function() { self.create_file("file"); };
	this.toolbar.appendChild(this.btn_file);
	this.add_popup("new_file", self.btn_file, "Please select a parent folder or deselect for root.");

	//delete file
	this.btn_delete = document.createElement("div");
	this.btn_delete.id = "delete_file_button";
	this.btn_delete.className = "file_browser_toolbar_button";
	this.btn_delete_icon = document.createElement("img");
	this.btn_delete_icon.src = "img/delete24.png";
	this.btn_delete.appendChild(this.btn_delete_icon);
	this.toolbar.appendChild(this.btn_delete);

	this.delete_popup = document.createElement("div");
	this.delete_message = document.createElement("div");
	this.delete_message.className = "file_manager_delete_message";
	this.delete_popup.appendChild(this.delete_message);
	this.delete_buttons = document.createElement("div");
	this.delete_buttons.className = "file_manager_delete_buttons";
	this.delete_popup.appendChild(this.delete_buttons);
	this.delete_button_yes = document.createElement("div");
	this.delete_button_yes.className = "file_manager_delete_button_left";
	this.delete_button_yes.innerHTML = "Yes";
	this.delete_button_yes.onclick = function() { self.file_tree_remove(null, null); self.delete_drop.close(); };
	this.delete_buttons.appendChild(this.delete_button_yes);
	this.delete_button_no = document.createElement("div");
	this.delete_button_no.className = "file_manager_delete_button_right";
	this.delete_button_no.innerHTML = "No";
	this.delete_button_no.onclick = function() { self.delete_drop.close(); };
	this.delete_buttons.appendChild(this.delete_button_no);

	this.delete_drop = new Drop({
	  target: self.btn_delete,
	  content: this.delete_popup,
	  position: "right middle",
	  openOn: "click",
	  classes: "drop-theme-arrows-bounce-dark file_manager_drop",
	  constrainToScrollParent: false
	});

	this.delete_drop.on("open", function () {
		selected_nodes = self.file_tree.getSelectedNodes();
			node = selected_nodes[0];
			if(!node) {
				self.delete_message.innerHTML = "Please select a file/folder to delete.";
				self.delete_buttons.style.display = "none";
			} else {
				self.delete_message.innerHTML = "Are you sure?";
				self.delete_buttons.style.display = "";
			}
	});


	//cut file
	this.btn_cut = document.createElement("div");
	this.btn_cut.id = "cut_file_button";
	this.btn_cut.className = "file_browser_toolbar_button";
	this.btn_cut_icon = document.createElement("img");
	this.btn_cut_icon.src = "img/content_cut24.png";
	this.btn_cut.appendChild(this.btn_cut_icon);
	this.btn_cut.onclick = function() { self.file_tree_cut(); };
	this.toolbar.appendChild(this.btn_cut);
	this.add_popup("cut", this.btn_cut, "Please select a file/folder to cut.");

	//copy file
	this.btn_copy = document.createElement("div");
	this.btn_copy.id = "copy_file_button";
	this.btn_copy.className = "file_browser_toolbar_button";
	this.btn_copy_icon = document.createElement("img");
	this.btn_copy_icon.src = "img/content_copy24.png";
	this.btn_copy.appendChild(this.btn_copy_icon);
	this.btn_copy.onclick = function() { self.file_tree_copy(); };
	this.toolbar.appendChild(this.btn_copy);
	this.add_popup("copy", this.btn_copy, "Please select a file/folder to copy.");

	//paste file
	this.btn_paste = document.createElement("div");
	this.btn_paste.id = "paste_file_button";
	this.btn_paste.className = "file_browser_toolbar_button";
	this.btn_paste_icon = document.createElement("img");
	this.btn_paste_icon.src = "img/content_paste24.png";
	this.btn_paste.appendChild(this.btn_paste_icon);
	this.btn_paste.onclick = function() { self.file_tree_paste(); };
	this.toolbar.appendChild(this.btn_paste);
	this.add_popup("paste", this.btn_paste, "Please cut/copy a file to be pasted.");

	//upload file
	this.btn_upload = document.createElement("div");
	this.btn_upload.id = "upload_file_button";
	this.btn_upload.className = "file_browser_toolbar_button";
	this.btn_upload_icon = document.createElement("img");
	this.btn_upload_icon.src = "img/file_upload24.png";
	this.btn_upload.appendChild(this.btn_upload_icon);
	this.toolbar.appendChild(this.btn_upload);
	this.upload_popup = document.createElement("div");
	this.upload_popup.className = "upload_file_popup";
	this.upload_action = document.createElement("div");
	this.upload_action.className = "file_manager_upload_action";
	this.upload_popup.appendChild(this.upload_action);
	this.upload_input = document.createElement("input");
	this.upload_input.type = "file";
	this.upload_input.multiple = true;
	this.upload_input.className = "livos_textbox file_manager_upload_input";
	this.upload_action.appendChild(this.upload_input);
	this.upload_button = document.createElement("input");
	this.upload_input.type = "file";
	this.upload_input.className = "livos_textbox file_manager_upload_input";
	this.upload_action.appendChild(this.upload_input);
	this.upload_button = new livos_button("upload", this.upload_action, "file_manager_upload_button", function () {
		self.to_be_uploaded = self.upload_input.files.length;
		if(self.to_be_uploaded === 0) {
			alertify.error("No files were selected to upload.");
			return;
		}
		var selected_nodes = self.file_tree.getSelectedNodes();
		var parent = selected_nodes[0];
		if(parent)
			parent_id = parent.id;
		else
			parent_id = PROJECT_ID;
		self.socket.emit("wait_for_upload", {path: parent_id});
		self.upload_wait.style.display = "";
	});

	this.upload_wait = document.createElement("img");
	this.upload_wait.src = "img/loading16.gif";
	this.upload_wait.style.display = "none";
	this.upload_wait.className = "file_manager_upload_wait";
	this.upload_action.appendChild(this.upload_wait);

	this.upload_drop = new Drop({
	  target: self.btn_upload,
	  content: this.upload_popup,
	  position: "right middle",
	  openOn: "click",
	  classes: "drop-theme-arrows-bounce-dark file_manager_drop",
	  constrainToScrollParent: false
	});

	//download file
	this.btn_download = document.createElement("div");
	this.btn_download.id = "download_file_button";
	this.btn_download.className = "file_browser_toolbar_button";
	this.btn_download_icon = document.createElement("img");
	this.btn_download_icon.src = "img/file_download24.png";
	this.btn_download.appendChild(this.btn_download_icon);
	this.btn_download.onclick = function() { self.file_tree_download(); };
	this.toolbar.appendChild(this.btn_download);
	this.add_popup("download", this.btn_download, "Please select a file/folder to download.");

	//file_tree container
	this.file_tree_container = document.createElement("ul");
	this.file_tree_container.className = "ztree file_tree_container";
	this.file_tree_container.id = "file_browser_main";
	this.app_div.appendChild(this.file_tree_container);

	//socket events
	this.socket.on("receive_file_list", function(obj) {
		var nodes = [];
		//loading folders
		obj.folders.forEach(function(file) {
			var node = {};
			node.id = obj.root+"/"+file;
			node.pId = obj.root;
			node.name = file;
			node.icon = "/img/folder16.png";
			node.type = "folder";
			node.isParent = true;
			nodes.push(node);
		});
		//loading files
		obj.files.forEach(function(file) {
			var node = {};
			node.id = obj.root+"/"+file;
			node.pId = obj.root;
			node.name = file;
			node.icon = "/img/insert_drive_file16.png";
			node.type = "text";
			nodes.push(node);
		});

		var parent = self.get_file_tree_node(obj.root);
		if(parent)
			self.file_tree.removeChildNodes(parent);
		self.file_tree.addNodes(parent, nodes);
		self.file_tree_load_callback.forEach(function(cb) {
			cb.f(cb.a1, cb.a2);
		});
		self.file_tree_load_callback = [];
	});

	this.socket.on("file_rename_error", function(obj) {
		var node = self.get_file_tree_node(obj.file_id);
		var ar = obj.file_id.split("/");
		node.name = ar[ar.length-1];
		self.file_tree.refresh();
	});

	this.socket.on("file_rename_success", function(obj) {
		if(obj.file_id.split("/")[0] == PROJECT_ID)
		{
			var node = self.get_file_tree_node(obj.file_id);
			if(node)
			{
				node.id = obj.parent + "/" + obj.name;
				node.name = obj.name;
				self.file_tree.refresh();
			}
		}
	});

	this.socket.on("new_ot_revision_file_refresh", function() {

		self.file_tree.refresh();

	});

	this.socket.on("file_add_node", function(obj) {
		if(obj.parent.split("/")[0] == PROJECT_ID)
		{
			var node = self.get_file_tree_node(obj.file_id);
			var parent = self.get_file_tree_node(obj.parent);
			if(!node && (parent || obj.parent == PROJECT_ID))
			{
				node = {};
				node.id = obj.file_id;
				node.name = obj.file_name;
				node.pId = obj.parent;
				node.type = obj.file_type;
				if(obj.file_type == "folder")
				{
					node.icon = "/img/folder16.png";
					node.isParent = true; 
				}
				else
				{
					node.icon = "/img/insert_drive_file16.png";
				}
				self.file_tree.addNodes(parent, node);
				self.file_tree.refresh();
			}
		}
	});

	this.socket.on("file_remove_node", function(obj) {
		if(obj.file_id.split("/")[0] == PROJECT_ID)
		{
			var node = self.get_file_tree_node(obj.file_id);
			if(node)
			{
				self.file_tree.removeNode(node);
				var parent = self.get_file_tree_node(node.pId);
				if(parent !== null)
				{
					parent.isParent = true;
				}
				self.file_tree.refresh();
			}
		}
	});

	//Registering Delivery
	this.socket.on("connect", function(){
    self.delivery = new Delivery(self.socket);

    self.delivery.on("send.success",function(fileUID){
      self.to_be_uploaded --;
      if(self.to_be_uploaded === 0) {
      	self.upload_wait.style.display = "none";
      	self.upload_input.value = "";
      	self.upload_drop.close();
      	alertify.success("File(s) successfully uploaded.");
      } else {
      	self.delivery.send(self.upload_input.files[self.to_be_uploaded - 1]);
      }
    });

    self.delivery.on("receive.success", function (file) {
    	var link = document.createElement("a");
    	link.download = file.name;
    	link.href = file.dataURL();
    	link.click();
    });
  });

  //upload ack
  this.socket.on("upload_ack", function () {
		self.delivery.send(self.upload_input.files[self.to_be_uploaded - 1]);
  });

	this.load_file = function()
	{
		self.socket.emit("get_file_list", {path: PROJECT_ID});

		var setting = {
			edit: {
				enable: true,
				showRemoveBtn: false
			},
			data: {
				simpleData: {
					enable: true
				}
			},
			callback: {
				beforeDrag: self.beforeDrag,
				beforeExpand: self.file_tree_expand,
				beforeCollapse: self.file_tree_collapse,
				onRename: self.file_tree_rename,
				beforeRemove: self.file_tree_remove,
				onDblClick: self.file_tree_dblclick,
				onClick: self.file_tree_click
			},
		};
	    self.file_tree = $.fn.zTree.init($("#file_browser_main"), setting, null);
	    self.file_tree_waitlist = [];
	};

	this.beforeDrag = function(treeId, treeNodes) 
	{
		return false;
	};

	this.file_tree_expand = function(event, node)
	{
		self.socket.emit("get_file_list", {path: node.id});
	};

	this.file_tree_collapse = function(event, node)
	{
		var cnode = {};
		cnode.name = "";
		cnode.id = node.id+"/"+"loading";
		cnode.pId = node.id;
	};

	this.file_tree_rename = function(event, treeId, node, isCancel)
	{
		if(node.pId === null)
			pid = PROJECT_ID;
		else
			pid = node.pId;
		self.socket.emit("file_rename", {project_id: PROJECT_ID, file_id: node.id, name: node.name, parent: pid, type: node.type});
	};

	this.file_tree_remove = function(treeId, node)
	{
		if(node === null)
		{
			selected_nodes = self.file_tree.getSelectedNodes();
			node = selected_nodes[0];
			if(!node)
			{
				self.delete_drop.open();
				return;
			}
		}
		self.socket.emit("file_remove", {file_id: node.id});
		return false;
	};

	this.file_tree_container.onclick = function(e)
	{
		 setTimeout(function()
		 {
		 	if(self.file_tree_click_flag)
		 		self.file_tree_click_flag = false;
		 	else
		 		self.file_tree.cancelSelectedNode();
		 }, 50);
	};

	this.file_tree_click = function(event, treeId, node)
	{
		self.file_tree_click_flag = true;
	};

	this.file_tree_dblclick = function(event, treeId, node)
	{
		if(!node)
		{
			self.file_tree.cancelSelectedNode();
			return;
		}
		if(node.type == "folder")
			return;
		apps.editor.open_file(node.id, node.name);
		self.file_tree.cancelSelectedNode();
	};

	this.get_file_tree_node = function(id)
	{
		var ar = id.split("/");
		var tid = "";
		var nodes = self.file_tree.getNodes();
		for(i=1; i<ar.length -1;i++)
		{
			tid += ar[i-1]+"/";
			f = true;
			for(j=0; j<nodes.length && f; j++)
			{
				if(nodes[j].id == tid+ar[i])
				{
					nodes = nodes[j].children;
					f = false;
				}
			}
		}
		tid += ar[i-1]+"/";
		for(i=0; i<nodes.length; i++)
		{
			if(nodes[i].id == tid+ar[ar.length-1])
				return nodes[i];
		}
		return null;
	};

	this.create_file = function(type)
	{
		//finding the parent node
		selected_nodes = self.file_tree.getSelectedNodes();
		parent = selected_nodes[0];
		if(parent && parent.type != "folder")
		{
			self.drops.new_file.open();
			return;
		}

		node = {};
		node.name = "new_file";
		node.type = type;
		if(!parent)
		{
			node.id = PROJECT_ID+"/new_file";
		}
		else
		{
			node.id = parent.id+"/new_file";
		}
		if(type == "folder")
		{
			node.icon = "/img/folder16.png";
			node.isParent = true;
		}
		else
		{
			node.icon = "/img/insert_drive_file16.png";
		}
		if(!parent)
		{
			parent = null;
			self.create_file_callback (parent, node);
		}
		else
		{
			var cb = {};
			cb.f = self.create_file_callback;
			cb.a1 = parent;
			cb.a2 = node;
			self.file_tree_load_callback.push(cb);
			self.socket.emit("get_file_list", {path: parent.id});
		}
	};

	this.create_file_callback = function(parent, node)
	{
		tree_node = self.file_tree.addNodes(parent, node);
		self.file_tree.editName(tree_node[0]);
	}; 

	this.file_tree_copy = function() 
	{
		//get the selected file
		selected_nodes = self.file_tree.getSelectedNodes();
		node = selected_nodes[0];
		if(!node)
		{
			self.drops.copy.open();
			return;
		}
		self.file_tree_clipboard = node;
		self.file_tree_clipboard_action = "copy";
	};

	this.file_tree_cut = function() 
	{
		//get the selected file
		selected_nodes = self.file_tree.getSelectedNodes();
		node = selected_nodes[0];
		if(!node)
		{
			self.drops.cut.open();
			return;
		}
		self.file_tree_clipboard = node;
		self.file_tree_clipboard_action = "cut";
	};

	this.file_tree_paste = function() 
	{
		if(!self.file_tree_clipboard || !self.file_tree_clipboard_action)
		{
			self.drops.paste.open();
			return;
		}
		selected_nodes = self.file_tree.getSelectedNodes();
		parent = selected_nodes[0];
		if(parent)
			parent_id = parent.id;
		else
			parent_id = PROJECT_ID;
		var action = "file_"+self.file_tree_clipboard_action;
		self.socket.emit(action, {
			source_id: self.file_tree_clipboard.id, 
			target_id: parent_id, 
			file_name: self.file_tree_clipboard.name, 
			file_type: self.file_tree_clipboard.type
		});
		self.file_tree_clipboard = null;
	};

	this.file_tree_download = function() 
	{
		//get the selected file
		selected_nodes = self.file_tree.getSelectedNodes();
		node = selected_nodes[0];
		if(!node)
		{
			self.drops.download.open();
			return;
		}
		self.socket.emit("download", {id: node.id, type: node.type, name: node.name});
	};

	this.on_close = function () {
		self.socket.disconnect();
		self.app_div = null;
		self.parent.on_close();
	};

	//creating a new window and loading files
	
	self.app_window = wm.openElement(self.app_div, 320, 500, "random", "random", {"title" : "File Manager"}, {}, self.on_close);
	self.app_window.activate_menu();
	self.load_file();

	//
	$("html").click(function () {
		if(self.to_disappear.length === 0)
			return;
		for(var i = 0; i < self.to_disappear.length; i++)
			self.to_disappear[i].close();
		self.to_disappear = [];
	});
}
