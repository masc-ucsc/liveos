function synthesis_client()
{
  //defining fields
  var self = this;

  this.open = function()
  {
    var app_window = new synthesis_window(function () {
      app_window = null;
    });
  };

  //FIXME: test stub for re-center graph function
  this.center = function (nodeId) {
    console.log("worked in client");
  };
}

function generate_graph(graph, format, engine) {
  var result = Viz(graph, format, engine);
  if (format === "svg")
    return result;
  else
    return inspect(result);
}


function synthesis_window(on_close)
{
  //---------------------------------------------------------------------------------------
  // Fields
  //---------------------------------------------------------------------------------------

  var self = this;
  this.source_file = '';
  this.parent_close = on_close;

  //socket connection
  this.yosys_server = io.connect('http://localhost:8085/yosys', {'force new connection': true, query: $.param({token: TOKEN})});
  this.graphServer = new WebSocket("ws://localhost:4567");


  this.delivery = null;
  this.view_type = 'netlist';
  this.doms = new Object();

  //graph containing elements
  this.nodes = new Array();
	this.multiselects = new Array();

  //---------------------------------------------------------------------------------------
  // Basic Functions
  //---------------------------------------------------------------------------------------

  //HTML Select Creator
	this.create_select = function (name, title, hidden, multi, options, onchange) {
		var container = name + '_container';
		var label = name + '_label';
		var select = name + '_select';
		self.doms[container] = document.createElement('div');
		if(hidden)
			self.doms[container].style.display = 'none';
		self.doms[container].className = 'esesc_select_container';
		self.top_bar.appendChild(self.doms[container]);
		self.doms[select] = document.createElement('select');
		if(multi)
			self.doms[select].multiple = true;
		self.doms[select].className = 'esesc_select multiselect';
		for(var i = 0; i < options.length; i++) {
			var opt = document.createElement('option');
			opt.value = options[i].value;
			opt.innerHTML = options[i].title;
			self.doms[select].add(opt);
		}
		self.doms[select].onchange = onchange;
		self.doms[container].appendChild(self.doms[select]);
		self.multiselects.push(select);
	};

  //update view
  this.update_view = function() {
    switch (self.view_type) {
      case 'netlist':
        self.graph_viewer.style.display = "";
        //self.results_viewer.style.display = "none";
        break;
      case 'reasults':
        self.graph_viewer.style.display = "none";
        //self.results_viewer.style.display = "";
        break;
      case 'none':
        self.graph_viewer.style.display = "none";
        //self.results_viewer.style.display = "none";
        break;
    };
  };

  this.random = function(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  //generate random graph
  this.generate_random = function() {
    var max_nodes = 10;
    var max_edges = 15;

    var num_nodes = self.random(2,max_nodes);
    var num_edges = self.random(max_nodes-1, max_edges);

    self.graph = { "graph" : new Object() };
    for(node_idx = 0; node_idx < num_nodes; node_idx++) {
      self.graph["graph"][node_idx] = new Array();
      for(edge_idx = 0; edge_idx < num_edges; edge_idx++) {
        if(self.random(0,1) == 1) {
          self.graph["graph"][node_idx].push(self.random(0,num_nodes));
        }
        else {
          edge_idx--;
        }
      }
    }
    self.update_graph();
  };

  //---------------------------------------------------------------------------------------
  // Socket methods
  //---------------------------------------------------------------------------------------

  this.yosys_server.on('compilation_complete', function (obj) {
    self.get_result();
    self.error_viewer.innerHTML = '';
    self.error_viewer.style.display = 'none';
  });

  this.yosys_server.on('compilation_error', function(err) {
    self.error_viewer.innerHTML = err;
    self.error_viewer.style.display = '';
  });

  //Sending recompile request to server
  this.recompile = function () {
    self.yosys_server.emit('recompile', {project_id: PROJECT_ID, source_file: self.source_input.value});
  };

  //Sending get result request
  this.get_result = function () {
    self.graphServer.send("request_graph");
  };

  this.on_close = function () {
    self.yosys_server.disconnect();
    self.parent_close();
  };

  this.html_escape = function (str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  };

  this.graphServer.onmessage = function(msg) {
    var txt = msg.data.split("##");
    switch(txt[0]) {
      case "graph":
        var obj = JSON.parse(txt[1]);
        self.graph = obj;
        self.update_graph();
        break;
    }
  }

  this.update_graph = function() {
    self.ngraph.clear();
    self.pixiGraph.clear();

    for(node in self.graph["graph"]) {
      self.ngraph.addNode(node);
      for(idx in self.graph["graph"][node]) {
        var to = self.graph["graph"][node][idx];
        self.ngraph.addLink(node,to);
      }
    }
  }

  //---------------------------------------------------------------------------------------
  // Visual elements
  //---------------------------------------------------------------------------------------

  //creating html canvas
  this.app_div = document.createElement('div');
  this.app_div.className = 'synth_container';
  this.app_div.id = 'synthesis_client_div_container';

  //top bar
  this.top_bar = document.createElement('div');
  this.top_bar.className = 'synth_top_bar';
  this.app_div.appendChild(this.top_bar);

  //source input
  this.source_input = document.createElement('input');
  this.source_input.type = 'text';
  this.source_input.value = 'Enter Synth source file here';
  this.source_input.className = 'synth_source_input';
  this.top_bar.appendChild(this.source_input);

  this.source_input.onfocus = function () {
    if(self.source_input.value == 'Enter Synth source file here')
      self.source_input.value = '';
  };

  this.source_input.onblur = function () {
    if(self.source_input.value == '')
      self.source_input.value = 'Enter Synth source file here';
  };

  this.source_input.onchange = function () {
    //self.yosys_server.emit('register_delivery', {project_id: PROJECT_ID, source_file: self.source_input.value});
    self.recompile();
  }

  //view selection
  this.create_select('view', 'Viewer', false, false, [
      {'value': 'netlist', 'title': 'Netlist Graph'},
      {'value': 'none', 'title': 'Nothing'}], 'netlist',
      function () {
        self.view_type = $(self.doms['view_select']).val();
        self.update_view();
  });

  //view selection
  this.create_select('radius', 'Radius', false, false, [
      {'value': '2', 'title': '2'},
      {'value': '3', 'title': '3'},
      {'value': '4', 'title': '4'},
      {'value': '5', 'title': '5'},
      {'value': 'inf', 'title': 'inf'}], '5',
      function () {
        self.radius = $(self.doms['radius_select']).val();
        self.update_view();
  });
  self.radius = $(self.doms['radius_select']).val();

  //generate random button
	this.random_button = document.createElement('img');
	this.random_button.className = 'esesc_history_button';
	this.random_button.src = '/img/add_circle_outline24.png';
	this.random_button.onclick = this.generate_random;
	this.top_bar.appendChild(this.random_button);


  //adding viewer
  this.graph_viewer = document.createElement('div');
  this.graph_viewer.className = 'graph_viewer';
  this.graph_viewer.id = 'synthesis_client_graph_viewer';
  this.app_div.appendChild(this.graph_viewer);

  this.error_viewer = document.createElement('div');
  this.error_viewer.className = 'synth_error_container';
  this.error_viewer.id = 'synthesis_client_error_viewer';
  self.error_viewer.style.display = 'none';
  this.app_div.appendChild(this.error_viewer);

  this.app_window = wm.openElement(self.app_div, 600, 600, 'random', 'random', {'title' : 'Synth'}, {}, self.on_close);
  this.menu_items = new Object();
  this.menu_items['recompile'] = this.app_window.add_menu_item('Recompile', '', 'title', this.app_window.menu, this.recompile);
  this.app_window.activate_menu();
  
  //---------------------------------------------------------------------------------------
  // User events callback methods
  //---------------------------------------------------------------------------------------
  this.node_menu = document.createElement('div');
  this.node_menu.className = 'synth_pane';
  this.node_menu.id = 'synthesis_node_menu';

  this.node_menu_title = document.createElement('div');
  this.node_menu_title.className = 'synth_pane_title';

  this.node_menu_content = document.createElement('div');
  this.node_menu_content.className = 'synth_pane_content';

  this.node_menu.appendChild(this.node_menu_title);
  this.node_menu.appendChild(this.node_menu_content);
  this.node_menu.style.display = 'none';

  this.app_div.appendChild(this.node_menu);
  this.node = null;

  this.on_resize = function(data) {
    self.pixiGraph.domContainer.style.height = $(self.app_div).height() + "px";
    self.pixiGraph.domContainer.style.width = $(self.app_div).width() + "px";
    //self.pixiGraph = ngraph.createPixiGraphics(self.ngraph, self.settings, self.nodeClick);
  }
  this.app_window.container.addEventListener('on_resize', self.on_resize);

  this.nodeClick = function(node, positionData, dragged) {
    if(node && !dragged) {
      self.node_menu_title.innerHTML = node.id;
      self.node_menu_content.innerHTML = "Center here";
      self.node_menu.style.top = positionData.y+20 + "px";
      self.node_menu.style.left = positionData.x + "px";
      self.node_menu.style.display = '';
      self.node = node;

      self.node_menu_content.onclick = function() {
          self.node_menu.style.display = 'none';
          self.graphServer.send("center##" + self.node.id + "##" + self.radius);
          }; 
    } else {
      self.node_menu.style.display = 'none';
    }
  };

  //graph related variables
  this.graph = null;
  this.ngraph = ngraph.createGraph();

  this.settings = { 
    container: self.graph_viewer,
    background: 0xAAAAAA,
    physics:  {springLength: 5, springCoeff: 0.00005, dragCoeff: 0.1, gravity: -0.1, theta: 1}
  };

  this.pixiGraph = ngraph.createPixiGraphics(self.ngraph, self.settings, self.nodeClick);
}


