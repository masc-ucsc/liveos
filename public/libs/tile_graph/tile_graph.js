/** Construct Tile Graph
  * t_list stores list of nodes
*/
var Tile_Graph = function (){
	_this = this;
	this.t_list = new Array();
	this.size = 0;

};

//prints list of nodes
Tile_Graph.prototype.print = function () {
	for(var i = 0; i < this.t_list.length; i++){
		this.t_list[i].print('none');
	}
};

//takes JSWindow as an argument and returns the node pointing to it
Tile_Graph.prototype.find = function (window) {
	if(this.t_list.length === 0){ return null;}
	for(var i = 0; i < this.t_list.length; i++){
    if(this.t_list[i].self === window){
			return this.t_list[i];
		}
	}
	return null;
};

Tile_Graph.prototype.detect_windows_below = function (window){
	if(this.t_list.length === 0){ return null;}
	var curr = this.find(window);
	var pos = window.getPosition();
	this.update_position(window,pos.left,pos.top);
	var biggest = 0;
	var hero = null;
	for(var i = 0; i < this.t_list.length; i++){
		var tmp = this.t_list[i];
		var border = $(tmp.self.meta_container);
		border.css('background-color','black');
		var hit_size = collision_size(curr, tmp);
		if( curr != tmp && collision(curr, tmp) ){
			if(curr != tmp && biggest < hit_size ){
				biggest = hit_size;
				hero = tmp.self;
			}
		}
	}
	return hero;
}

function collision(node1, node2) {
      var x1 = node1.left;
      var y1 = node1.top;
      var h1 = node1.h;
      var w1 = node1.w;
      var b1 = y1 + h1;
      var r1 = x1 + w1;
      var x2 = node2.left;
      var y2 = node2.top;
      var h2 = node2.h;
      var w2 = node2.w;
      var b2 = y2 + h2;
      var r2 = x2 + w2;
      if (b1 < y2 || y1 > b2 || r1 < x2 || x1 > r2) return false;
      return true;
}

function collision_size(node1, node2) {
      var x1 = node1.left;
      var y1 = node1.top;
      var h1 = node1.h;
      var w1 = node1.w;
      var x2 = node2.left;
      var y2 = node2.top;
      var h2 = node2.h;
      var w2 = node2.w;
			var width = Math.max(Math.min(x1+w1,x2+w2) - Math.max(x1,x2),0);
			var height = Math.max(Math.min(y1+h1,y2+h2) - Math.max(y1,y2),0);
			return width*height;
}

//Updates the connections of the entire graph
Tile_Graph.prototype.updateGraphState = function (window) {
	//console.log("-----Updating the following-----");
	for(var i = 0; i < this.t_list.length; i++){
		this.t_list[i].updateLinks(this.t_list);
	}
		//console.log("---------------");
	this.patchGraph();
};

Tile_Graph.prototype.patchGraph = function () {
	//console.log("-----Updating the following-----");
	for(var i = 0; i < this.t_list.length; i++){
		this.t_list[i].patchLinks();
	}
		//console.log("---------------");
};

/** 
 * @decription adds new_win into tile graph
 * @param JSWindow active - a window that is already tiled or null
 * @param JSWindow new_win - the floting window that you want to tile
 * @param char mode - takes 'h' or 'v' which represents which direction you want to tile 
*/
/** 
 * @decription adds new_win into tile graph
 * @param JSWindow active - a window that is already tiled or null
 * @param JSWindow new_win - the floting window that you want to tile
 * @param char mode - takes 'h' or 'v' which represents which direction you want to tile 
 * @param bigTile, used for making a large window when tiled, 1 for right, 2 for left, 3 for up, 4 for down
 * @param wm - needed with bigTile to retile all the windows according to the new bigTile window
*/
Tile_Graph.prototype.add = function (active, new_win, mode, bigTile) {
	if(this.isinGraph(new_win)){
		return;
	}
	//save position when we untile
	var pos = new_win.getPosition();
	new_win.lastXpos = pos.left;
  	new_win.lastYpos = pos.top;
	var Jwindow = $(new_win);
	//var tmp = new node(new_win);
	var tmp = new node(Jwindow);
	var padding = 2;
	var h;
	var w;
	if(this.t_list.length === 0 || (wm.bigTileDirection != null && this.t_list.length === 1)){	//If it's the first window
		if(wm.bigTileDirection != null && this.t_list.length === 1){
			if(wm.bigTileDirection === 1){
				h = $( window ).height() - padding;
				w = 2*($(window).width()/3) - padding;
				new_win.setSize(w,h);
				new_win.setPosition(0,0,false);
				tmp.w = w;
				tmp.h = h;
				tmp.top = 0;
				tmp.left = 0;	
			}
			else if(wm.bigTileDirection === 2){
				h = $( window ).height() - padding;
				w = 2*($(window).width()/3) - padding;
				new_win.setSize(w,h);
				new_win.setPosition(($(window).width()/3),0,false);
				tmp.w = w;
				tmp.h = h;
				tmp.top = 0;
				tmp.left = ($(window).width()/3);				
			}
			else if(wm.bigTileDirection === 3){
				h = 2*$(window).height()/3 - padding;
				w = ($(window).width()) - padding;
				new_win.setSize(w,h);
				new_win.setPosition(0,($(window).height()/3),false);
				tmp.w = w;
				tmp.h = h;
				tmp.top = ($(window).height()/3);
				tmp.left = 0;
			}
			else if(wm.bigTileDirection === 4){
				h = 2*$(window).height()/3 - padding;
				w = ($(window).width()) - padding;
				new_win.setSize(w,h);
				new_win.setPosition(0,0,false);
				tmp.w = w;
				tmp.h = h;
				tmp.top = 0;
				tmp.left = 0;
			}
		}
		else if(bigTile === undefined || bigTile === null){
			h = $( window ).height() - padding;
			w = $( window ).width() - padding;
			new_win.setSize(w,h);
			new_win.setPosition(0,0,false);
			tmp.w = w;
			tmp.h = h;
			tmp.top = 0;
			tmp.left = 0;
		}
		//bigTile is to enlarge the selected tile in the side selected
		else if(bigTile != undefined && bigTile != null){
			if(bigTile === 1){
				console.log("right");
				h = ($(window).height()) - padding;
				w = ($(window).width()/3) - padding;
				new_win.setSize(w,h);
				new_win.setPosition(2*($(window).width()/3),0,false);
				tmp.w = ($(window).width()/3) - padding;
				tmp.h = ($(window).height()) - padding;
				tmp.top = 0;
				tmp.left = 2*($(window).width()/3);
			}
			if(bigTile === 2){
				console.log("left");
				h = ($(window).height()) - padding;
				w = ($(window).width()/3) - padding;
				new_win.setSize(w,h);
				new_win.setPosition(0,0,false);
				tmp.w = ($(window).width()/3) - padding;
				tmp.h = ($(window).height()) - padding;
				tmp.top = 0;
				tmp.left = 0;
			}
			if(bigTile === 3){
				console.log("up");
				h = ($(window).height()/3) - padding;
				w = ($(window).width()) - padding;
				new_win.setSize(w,h);
				new_win.setPosition(0,0,false);
				tmp.w = ($(window).width()) - padding;
				tmp.h = ($(window).height()/3) - padding;
				tmp.top = 0;
				tmp.left = 0;
			}
			if(bigTile === 4){
				console.log("down");
				h = ($(window).height()/3) - padding;
				w = ($(window).width()) - padding;
				new_win.setSize(w,h);
				new_win.setPosition(0,2*($(window).height()/3),false);
				tmp.w = ($(window).width()) - padding;
				tmp.h = ($(window).height()/3) - padding;
				tmp.top = 2*($(window).height()/3);
				tmp.left = 0;
			}
		}
		if(h > w){
			tmp.mode = 'h';
		}else{
			tmp.mode = 'v';
		}
		this.t_list[this.size++] = tmp;
		this.t_list[this.size-1].print('links');
	}else{	//If the is more than one
		if (active === null){
			var largest = this.t_list[0];
			var i = 0;
			//if theres is a bigTile
			if(wm.bigTileDirection != null){
				i++;
				largest = this.t_list[1];
			}
			for(; i < this.t_list.length; i++){
				var a = this.t_list[i].w * this.t_list[i].h;
				var b = largest.w * largest.h;
				if(a > b){
					largest = this.t_list[i];
				}
			}
			//active = this.t_list[this.t_list.length - 1].self;
			active = largest.self;
		}
		for(var i = 0; i < this.t_list.length; i++){
			if(active === this.t_list[i].self){
				if(mode != null){
					this.t_list[i].mode = mode;
				}
				var parent = this.t_list[i];
				h = parent.h;
				w = parent.w;
				if(parent.mode === 'h'){
					tmp.top = parent.top + h/2;
					tmp.left = parent.left;
					new_win.setPosition(tmp.left, tmp.top, false);
					tmp.h = h/2;
					parent.h = h/2;
					tmp.w = w;
					new_win.setSize(tmp.w,tmp.h);
					parent.self.setSize(parent.w,parent.h);
					if(tmp.h > tmp.w){
						tmp.mode = 'h';
						parent.mode = 'h';
					}else{
						tmp.mode = 'v';
						parent.mode = 'v';
					}
					this.t_list[this.size++] = tmp;
					this.updateH(parent, tmp);
				}

				else if(parent.mode === 'v'){
					tmp.top = parent.top;
					tmp.left = parent.left + w/2;
					new_win.setPosition(tmp.left, tmp.top, false);
					tmp.w = w/2;
					parent.w = w/2;
					tmp.h = h;
					new_win.setSize(tmp.w,tmp.h);
					parent.self.setSize(parent.w,parent.h);
					if(tmp.h > tmp.w){
						tmp.mode = 'h';
						parent.mode = 'h';
					}else{
						tmp.mode = 'v';
						parent.mode = 'v';
					}
					this.t_list[this.size++] = tmp;
					this.updateV(parent,tmp);
				}
			}
		}
	}
	new_win.tile();
};

//utility function not part of graph
function debug(graph, wm){
	graph.print();
};

//this function is called in graph.add() its used to update links to newly added node
Tile_Graph.prototype.updateH = function (parent, curr) {
	//console.log("Updating Horizontal");
	var tmp;

	if(parent.east.length != 0){
		tmp = parent.east;
		parent.east = new Array();
		var j = 0; //counter for curr east
		var k = 0; //counter for parent east
		for(var i = 0; i < tmp.length; i++){
			if(tmp[i].top < (parent.top + parent.h) ){ //if window is next to parent
				parent.east[k] = tmp[i];
				k++;
			}else{
				for(var x = 0; x < tmp[i].west.length; x++){ //remove conection to parent
					if(tmp[i].west[x] === parent){
						tmp[i].west.splice(x,0);
					}
				}
			}
			if( (tmp[i].top + tmp[i].h) > curr.top ){ //if window is next to curr
				curr.east[j] = tmp[i];
				if(tmp[i].top < (parent.top + parent.h) ){
					curr.east[j].west[curr.east[j].west.length] = curr;
				}else{
					var west = curr.east[j].west;
					for(var d = 0; d < west.length; d++){
						if(west[d] === parent){
							west[d] = curr;
						}
					}
				}
				j++
			}
		}
	}

	if(parent.west.length != 0){
		tmp = parent.west;
		parent.west = new Array();
		var j = 0; //counter for curr west
		var k = 0; //counter for parent west
		for(var i = 0; i < tmp.length; i++){
			if(tmp[i].top < (parent.top + parent.h) ){ //if its next to parent
				parent.west[k] = tmp[i];
				k++;
			}else{
				for(var x = 0; x < tmp[i].east.length; x++){ //remove link to parent
					if(tmp[i].east[x] === parent){
						tmp[i].east.splice(x, 1);
					}
				}
			}
			if( (tmp[i].top + tmp[i].h) > curr.top ){ //add curr's links
				curr.west[j] = tmp[i];
					//if(tmp[i].top < (parent.top + parent.h) ){
						//console.log("blop");
						curr.west[j].east[curr.west[j].east.length] = curr;
						//curr.west[j].east.splice(i, 0, curr);
					/*}else{
						var east = curr.west[j].east;
						for(var d = 0; d < east.length; d++){
							if(east[d] === parent){
								console.log("blap");
								east[d] = curr;
							}
						}
					}*/
				j++;
			}
		}
	}

	if(parent.south.length != 0){
		tmp = parent.south;
		parent.south = new Array();
		for(var i = 0; i < tmp.length; i++){
			curr.south[i] = tmp[i];
			//parent.south[i].north[parent.south[i].north.length] = curr;
			for(var x = 0; x < curr.south[i].north.length; x++){
				if(curr.south[i].north[x] === parent){
					curr.south[i].north[x] = curr;
				}
			}
		}
	}

	parent.south[0] = curr;
	curr.north[0] = parent;

};

//this function is called in graph.add() its used to update links to newly added node
Tile_Graph.prototype.updateV = function (parent, curr) {
	//console.log("Updating Vertical");
	var tmp;

	if(parent.north.length != 0){
		tmp = parent.north;
		parent.north = new Array();
		var j = 0; //counter for parent
		var k = 0; //counter for curr
		for(var i = 0; i < tmp.length; i++){
			if(tmp[i].left < (parent.left + parent.w) ){ //if window is above parent
				parent.north[j] = tmp[i];
				j++;
			}else{
      	for(var x = 0; x < tmp[i].south.length; x++){ //remove link to parent
					if(tmp[i].south[x] === parent){
						tmp[i].south.splice(x,0);
					}
				}
			}

			if( (tmp[i].left + tmp[i].w) > curr.left){ //if window is above curr
				curr.north[k] = tmp[i];
				if(tmp[i].left < (parent.left + parent.w) ){ //if window was also below curr
        	curr.north[k].south[curr.north[k].south.length] = curr;
				}else{
					for(var x = 0; x < tmp[i].south.length; x++){
						if(tmp[i].south[x] === parent){
							tmp[i].south[x] = curr;
						}
					}
				}
				k++;
			}
		}
	}

	if(parent.south.length != 0){
		tmp = parent.south;
		parent.south = new Array();
		var j = 0; //counter for parent
    var k = 0; //counter for curr
		for(var i = 0; i < tmp.length; i++){
			if(tmp[i].left < (parent.left + parent.w) ){ //if window is below parent
				parent.south[j] = tmp[i];
				j++
			}else{
				for(var x = 0; x < tmp[i].north.length; x++){ //remove link to parent
					if(tmp[i].north[x] === parent){
						tmp[i].north.splice(x,0);
					}
				}
			}
			if( (tmp[i].left + tmp[i].w) > curr.left){ //if window is below curr
				curr.south[k] = tmp[i];
				if(tmp[i].left < (parent.left + parent.w) ){ //if window was also below parent
					curr.south[k].north[curr.south[k].north.length] = curr;
				}else{
					for(var x = 0; x < curr.south[k].north.length; x++){
						if(curr.south[k].north[x] === parent){
							curr.south[k].north[x] = curr;
						}
					}
        }
				k++;
			}
		}
	}

	if(parent.east.length != 0){
		tmp = parent.east;
		parent.east = new Array();
		for(var i = 0; i < tmp.length; i++){
			curr.east[i] = tmp[i];
			for(var x = 0; x < curr.east[i].west.length; x++){ //update west's links
				if(curr.east[i].west[x] === parent){
					curr.east[i].west[x] = curr;
				}
			}
		}
	}

	parent.east[0] = curr;
	curr.west[0] = parent;

};

//checks if JSWindow is in our graph
Tile_Graph.prototype.isinGraph = function (window) {
	for(var i = 0; i < this.t_list.length; i++){
		if(this.t_list[i].self === window){
			return true;
		}
	}
	return false;
};

Tile_Graph.prototype.changeMode = function (window, mode) {
	for(var i = 0; i < this.t_list.length; i++){
		if(this.t_list[i].self === window){
			this.t_list[i].mode = mode;
		}
	}
};

//updates size of node in window size changes
Tile_Graph.prototype.update_size = function (window,w,h) {
	var curr = this.find(window);
	if(curr != null){
		curr.w = w;
		curr.h = h;
	}
};

Tile_Graph.prototype.update_position = function (window,l,t) {
	var curr = this.find(window);
	if(curr != null){
		curr.left = l;
		curr.top = t;
	}
};

//removes node from graph and resizes all the other tiled windows
Tile_Graph.prototype.remove = function (window, parent) {
	//console.log('removing window');
  var node = this.find(window);
	var resize_once = false;
	var sensitivity = 2; //how much can 2 windows vary for it to be replaced.
	var adjustment = 4;
	var north = false;
	var south = false;
	var east = false;
	var west = false;

	if(parent != null){
		north = true;
		south = true;
		east = true;
		west = true;
		if(	parent === 'n' ){
			north = false;
		}	
		if(	parent === 's' ){
			south = false;
		}
		if(	parent === 'e' ){
			east = false;
		}
		if(	parent === 'w' ){
			west = false;
		}
	}

	var width = 0;
	var height = 0;
	for(var i = 0; i < node.north.length; i++){
		width += node.north[i].w;
		height += node.north[i].h;
		if(parent != null && parent === node.north[i]){ north = false; } 
	}
	//if(width === node.w && !resize_once){ //resize north
	if( around(width, node.w, sensitivity) && !resize_once && !north){
		for(var i = 0; i < node.north.length; i++){
			var curr = node.north[i];
			curr.h += node.h + adjustment;
			curr.self.setSize(curr.w, curr.h, null, false);
		}
		resize_once = true;
	}

	var width = 0;
	var height = 0;
	for(var i = 0; i < node.south.length; i++){
		width += node.south[i].w;
		height += node.south[i].h;
		if(parent != null && parent === node.south[i]){ south = false; } 
	}
	//if(width === node.w && !resize_once){	//else resize south
	if( around(width, node.w, sensitivity) && !resize_once && !south){
		for(var i = 0; i < node.south.length; i++){
			var curr = node.south[i];
			curr.h += node.h + adjustment;
			curr.self.setSize(curr.w, curr.h, null, false);
			curr.top = node.top;
			curr.self.setPosition(curr.left, curr.top, false);
		}
		resize_once = true;
	}

	var width = 0;
	var height = 0;
	for(var i = 0; i < node.west.length; i++){
		width += node.west[i].w;
		height += node.west[i].h;
		if(parent != null && parent === node.west[i]){ west = false; } 
	}
	//if(height === node.h && !resize_once){	//else resize west
	if( around(height, node.h, sensitivity) && !resize_once && !west){
		for(var i = 0; i < node.west.length; i++){
			var curr = node.west[i];
			curr.w += node.w + adjustment;
			curr.self.setSize(curr.w, curr.h, null, false);
		}
		resize_once = true;
	}

	var width = 0;
	var height = 0;
	for(var i = 0; i < node.east.length; i++){
		width += node.east[i].w;
		height += node.east[i].h;
		if(parent != null && parent === node.east[i]){ east = false; } 
	}
	//if(height === node.h && !resize_once){	//else resize east
	if( around(height, node.h, sensitivity) && !resize_once && !east){
		for(var i = 0; i < node.east.length; i++){
			var curr = node.east[i];
			curr.w += node.w + adjustment;
			curr.self.setSize(curr.w, curr.h, null, false);
			curr.left = node.left;
			curr.self.setPosition(curr.left, curr.top, false);
		}
		resize_once = true;
	}

	//delete node
		node.cut_link('all');
		cut_self(this.t_list, node);
		this.size--;
		this.updateGraphState();
};

function around(num1, num2, size){
	if( (num1 - size) <= num2 && num2 <= (num1 + size) ){
		return true;
	}
	return false;
}

//switches position between two tiled windows
Tile_Graph.prototype.switch_win = function (window1,window2) {
	var a = this.find(window1);
	var b = this.find(window2);
	var tmp = a.self;
	a.self = b.self;
	b.self = tmp;
	reposition(a);
	reposition(b);
};

//used in graph.switch_win
function reposition(node){
	node.self.setPosition(node.left,node.top);
	node.self.setSize(node.w,node.h);
}

Tile_Graph.prototype.twist = function (windows, direction) {
	//console.log("windows:",windows);
	var node1 = this.find(windows[0]);
	var node2 = this.find(windows[1]);
	//console.log("adjacent:",node1.adjacent(node2));
	var height = 0;
	var width = 0;
	var top = $(window).height();
	var left = $(window).width();
	for(var i = 0; i < windows.length; i++){
		var s = windows[i].getSize();
		var p = windows[i].getPosition();
		width += s.width;
		height += s.height;
		top = Math.min(top, p.top);
		left = Math.min(left, p.left);
	}
	var orientation = node1.adjacent(node2);
	var size = windows[0].getSize();
	if(direction === 'h'){
		var newHeight = (size.height/windows.length);
		if( orientation === 2 ){
			//console.log("ohh");
			var newHeight = (size.height/windows.length);
			for(var i = 0; i < windows.length; i++){
				var s = windows[i].getSize();
				var p = windows[i].getPosition();
				windows[i].setSize(width + 2,newHeight + 2);
				windows[i].setPosition(left, top);
				top += newHeight;
			}
		}
		if( orientation === 1 ){
			//console.log("ahh");
			height = height/windows.length;
			for(var i = 0; i < windows.length; i++){
				var s = windows[i].getSize();
				var p = windows[i].getPosition();
				windows[i].setSize(s.width + 2, height + 2);
				windows[i].setPosition(left, top);
				top += height;
			}
		}
	}

	if(direction === 'v'){
		var newWidth = (size.width/windows.length);
		if( orientation === 1 ){
			//console.log("boo");
			for(var i = 0; i < windows.length; i++){
				var s = windows[i].getSize();
				var p = windows[i].getPosition();
				windows[i].setSize(newWidth + 2, height + 2);
				windows[i].setPosition(left, top);
				left += newWidth;
			}
		}
		if( orientation === 2 ){
			//console.log("baa");
			width = width/windows.length;
			for(var i = 0; i < windows.length; i++){
				var s = windows[i].getSize();
				var p = windows[i].getPosition();
				windows[i].setSize(width + 2, s.height + 2);
				windows[i].setPosition(left, top);
				//console.log(windows[i].title + ": left:",left,"top:",top);
				left += width;
			}
		}
	}
	this.updateGraphState();
};

Tile_Graph.prototype.rePosition = function (windows, direction) {
	console.log("In rePosition()");
	var twistable = true;
	var nodes = new Array();
	var per = new Array(); //store list of links for each array
	for(var i = 0;i < windows.length-1; i++){
		nodes[i] = this.find(windows[i]);
		nodes[i+1] = this.find(windows[i+1]);
		var links = new Array();	//put links into one array
		links = nodes[i].south.concat(nodes[i].north);
		links = links.concat(nodes[i].west);
		links = links.concat(nodes[i].east);
		per.push(links);
		//if( !nodes[i].adjacent(nodes[i+1]) ){
		if( nodes[i].adjacent(nodes[i+1]) === 0 ){
			twistable = false;
		}
	}
	if(nodes.length != 0){
		var links = new Array();
		links = nodes[nodes.length-1].south.concat(nodes[nodes.length-1].north);
		links = links.concat(nodes[nodes.length-1].west);
		links = links.concat(nodes[nodes.length-1].east);
		per.push(links);
	}
	if(twistable){
		console.log("twistable");
		this.twist(windows, direction);
	}else{
		console.log("not twistable");
		var ret = new Array();
		var possibleLinks = Permute(per.slice(), ret,addCommonLinks); //return all non-selected windows with two or more neighbors that are selected
		var parents = new Array(); //stores selceted nodes that are adjacent to children
		var children = new Array();	//stores non-selected nodes
		for(var i = 0; i < possibleLinks.length; i++){
			var addOnce = false;
			for(var j = 0; j < nodes.length; j++){ //temporarily remove non-selected windows
				var result = possibleLinks[i].adjacent(nodes[j])
				if(result != 0 && !addOnce ){
					parents.push(nodes[j]);
					children.push(possibleLinks[i]);
					console.log("removed: " + possibleLinks[i].self.title);
					this.remove(possibleLinks[i].self,	nodes[j]);
					addOnce = true;
				}
			}
		}
		var count = 0;
		var adj_list = new Array();
		while(count <= nodes.length){
			this.updateGraphState();
			console.log("count:",count);
			adj_list = new Array();
			adj_list = Permute(nodes.slice(), adj_list, returnAdjacentWindows);
			console.log("adj_list:",adj_list);
			if(adj_list.length != 0 && adj_list[0].length === nodes.length){ //if all nodes are adjacent
				//console.log("Broke");
				break;
			}
			for(var i = 0; i < adj_list.length; i++){
				var curr = adj_list[i];
				var node1 = this.find(curr[0]);
				var node2 = this.find(curr[1]);
				var adj = node1.adjacent(node2);
				if(adj === 1){
					//console.log("twist 1");
					this.twist(curr,'v'); 
					this.updateGraphState();
				}
				if(adj === 2){
					//console.log("twist 2");
					this.twist(curr,'h');
					this.updateGraphState(); 
				}
			}
			count++;
			//console.log("adj_list:",adj_list);
		}
		if(adj_list.length != 0 && adj_list[0].length > 1){
			this.twist(adj_list[0],direction);
			this.updateGraphState();
		}else{
			alert("ERROR: Please only choose windows that are next to each other"); 
		}
		for(var i = 0; i < parents.length; i++){
			console.log("parents["+i+"]:",parents[i].self.title);
			console.log("children["+i+"]:",children[i].self.title);
			if(parents[i].h > parents[i].w){
				this.add(parents[i].self,children[i].self,'h');
			}else{
				this.add(parents[i].self,children[i].self,'v');
			}
		}
	}
};



Tile_Graph.prototype.turn = function (windows, direction) {
	console.log("In turn()");
	var twistable = true;
	var nodes = new Array();
	var per = new Array(); //store list of links for each array
	for(var i = 0;i < windows.length-1; i++){
		nodes[i] = this.find(windows[i]);
		nodes[i+1] = this.find(windows[i+1]);
		var links = new Array();	//put links into one array
		links = nodes[i].south.concat(nodes[i].north);
		links = links.concat(nodes[i].west);
		links = links.concat(nodes[i].east);
		per.push(links);
		//if( !nodes[i].adjacent(nodes[i+1]) ){
		if( nodes[i].adjacent(nodes[i+1]) === 0 ){
			twistable = false;
		}
	}
	if(nodes.length != 0){
		var links = new Array();
		links = nodes[nodes.length-1].south.concat(nodes[nodes.length-1].north);
		links = links.concat(nodes[nodes.length-1].west);
		links = links.concat(nodes[nodes.length-1].east);
		per.push(links);
	}
	if(twistable){
		console.log("twistable");
		this.twist(windows, direction);
	}else{
		console.log("not twistable");
		var ret = new Array();
		var possibleLinks = Permute(per.slice(), ret,addCommonLinks); //return all non-selected windows with two or more neighbors that are selected
		for(var i = 0; i < possibleLinks.length; i++){
			var addOnce = false;
			for(var j = 0; j < nodes.length; j++){ //temporarily remove non-selected windows
				var result = possibleLinks[i].adjacent(nodes[j])
				if(result != 0 && !addOnce ){
					//nodes.push(possibleLinks[i]);
					//console.log("added: " + possibleLinks[i].self.title);
					addOnce = true;
				}
			}
		}
		var count = 0;
		var adj_list = new Array();
		var twistStack = new Array();
		while(count <= nodes.length){
			//this.updateGraphState();
			//console.log("count:",count);
			adj_list = new Array();
			adj_list = Permute(nodes.slice(), adj_list, returnAdjacentWindows);
			//console.log("adj_list:",adj_list);
			if(adj_list.length != 0 && adj_list[0].length === nodes.length){ //if all nodes are adjacent
				console.log("Broke");
				break;
			}
			for(var i = 0; i < adj_list.length; i++){
				var curr = adj_list[i];
				var node1 = this.find(curr[0]);
				var node2 = this.find(curr[1]);
				var adj = node1.adjacent(node2);
				var stackObj = new Object();
				stackObj.nodes = curr;
				console.log("curr:",curr);
				stackObj.dir = adj;
				if(adj === 1){
					//console.log("twist 1");
					this.twist(curr,'v');
					twistStack.push(stackObj); 
					this.updateGraphState();
				}
				if(adj === 2){
					//console.log("twist 2");
					this.twist(curr,'h');
					twistStack.push(stackObj);
					this.updateGraphState(); 
				}
			}
			count++;
			//console.log("adj_list:",adj_list);
		}
		if(adj_list.length != 0 && adj_list[0].length > 1){
			console.log("time to twist back!");
			adj_list[0] = reorder(adj_list[0], direction);
			this.twist(adj_list[0], direction);
			this.updateGraphState();
			while(twistStack.length != 0){
				var curr = twistStack.pop();
				if(curr.dir === 1){
					curr.nodes = reorder(curr.nodes, 'v');
					this.twist(curr.nodes,'v');
					console.log("curr.dir === 1");
					console.log("curr.nodes:",curr.nodes);
				}
				if(curr.dir === 2){
					curr.nodes = reorder(curr.nodes, 'h');
					this.twist(curr.nodes,'h');
					console.log("curr.dir === 2");
				}
			this.updateGraphState();
			}
		}else{
			alert("ERROR: Please only choose windows that are next to each other"); 
		}
		/*for(var i = 0; i < parents.length; i++){
			console.log("parents["+i+"]:",parents[i].self.title);
			console.log("children["+i+"]:",children[i].self.title);
			if(parents[i].h > parents[i].w){
				this.add(parents[i].self,children[i].self,'h');
			}else{
				this.add(parents[i].self,children[i].self,'v');
			}
		}*/
	}	

};

function reorder(array, dir){
	var newOrder = new Array();
	for(var i = 0; i < array.length; i++){
		insertInOrder(dir, newOrder, array[i]);
	}
	return newOrder;
}

function addCommonLinks(a,b, ret){
	for(var i = 0; i < a.length; i++){
		for(var j = 0; j < b.length; j++){
			if(a[i] === b[j]){
				if( !isinArray(ret,a[i]) ){
					ret.push(a[i]);
				}
			}
		}
	}
}

function returnAdjacentWindows(a,b, ret){
	//console.log("returnAdjacentWindows()");
	//console.log("a:",a.self.title,"b:", b.self.title);
	var adj = a.adjacent(b);
	if(adj != 0){
	//console.log("Are adjacent");
		if(ret.length === 0){
			var arr = new Array();
			arr.push(a.self);
			arr.push(b.self);
			ret.push(arr);
		}else{
			var added = false;
			for(var i = 0; i < ret.length; i++){ //add to array if a/b are already in an array
				var curr = ret[i];
				var len = curr.length;
				for(var j = 0; j < len; j++){
					if(a.self === curr[j]){
						if(adj === 1){ //if verticaly adjacent
							insertInOrder('v', curr, b.self);
							added = true;
						}
						if(adj === 2){ //if horazontaly adjacent
							insertInOrder('h', curr, b.self);
							added = true;
						}
					}
					if(b.self === curr[j]){
						if(adj === 1){ //if verticaly adjacent
							insertInOrder('v', curr, a.self);
							added = true;
						}
						if(adj === 2){ //if horazontaly adjacent
							insertInOrder('h', curr, a.self);
							added = true;
						}
					}
				}
			}
			if(!added){
				var arr = new Array();
				arr.push(a.self);
				arr.push(b.self);
				ret.push(arr);
			}
		}
	}
	return ret;
}

function insertInOrder(direction, array, window){
	var inserted = false;
	var s = window.getPosition();
	for(var j = array.length-1; j >= 0; j--){
		//console.log("j:",j);
		var w = array[j].getPosition();
		if(direction === 'v'){
			if(s.top >= w.top && !isinArray(array,window) ){
				array.splice(j+1, 0, window);
				inserted = true;
			}
		}
		if(direction === 'h'){
			if(s.left >= w.left && !isinArray(array,window) ){
				array.splice(j+1, 0, window);
				inserted = true;
			}
		}
	}
	if(inserted === false){
		array.unshift(window);
	}
}

function Permute(array, ret, aFunction){
	//console.log("In permute!");
	var x = array.pop();
	if(array.length < 1){
		//console.log("array.length < 1");
		return ret;
	}
	if(array.length === 1){
		//console.log("array.length === 1");
		aFunction(array[0], x, ret);
		return ret;
	}
	for(var i = 0; i < array.length; i++){
		aFunction(x, array[i], ret);
	}
	Permute(array, ret, aFunction);
	return ret;
}

/** 
 * @decription Node Constructor
 * @param JSWindow window - this a passed in as a jQuery object
 * @param self - window[0] converts it back into JSWindow object
 * @param mode - can be nether 'v' or 'h'
*/
var node = function (window) {
	//_this = this;
	this.self = window[0];
	this.north = new Array();
	this.south = new Array();
	this.east = new Array();
	this.west = new Array();
	this.top = 0;
	this.left = 0;
	this.w = 0;
	this.h = 0;
	this.mode = null;
	//console.log('created node');

}

/** 
 * @decription Prints node
 * @opt 'none' - prints the window's title
 * @opt null - prints the window's title, mode, links, size, and postion
 * @opt 'mode' - prints the window's mode
 * @opt 'links' - prints the window's links
 * @opt 'n'/'s'/'e'/'w' - prints the window's links for that direction
 * @opt 'ps' - prints the window's size and position
 * @opt 'pos' - prints the window's position
 * @opt 'size' - prints the window's size
*/
node.prototype.print = function (opt){
	console.log("<<<<<< " + this.self.title + " >>>>>>");
	if(opt === null || opt === 'mode' || opt === 'ps'){
		console.log('this.mode: ' + this.mode);
	}

	if(opt === null || opt === 'n' || opt === 'links'){
		if(this.north.length != 0){
			for(var i = 0; i < this.north.length; i++){
				console.log('this.north[' + i + ']: ' + this.north[i].self.title);
			}
		}else{
			console.log("this.north is empty");
		}
	}

	if(opt === null || opt === 's' || opt === 'links'){
		if(this.south.length != 0){
			for(var i = 0; i < this.south.length; i++){
				console.log('this.south[' + i + ']: ' + this.south[i].self.title);
			}
		}else{
			console.log("this.south is empty");
		}
	}

	if(opt === null || opt === 'e' || opt === 'links'){
		if(this.east.length != 0){
			for(var i = 0; i < this.east.length; i++){
				console.log('this.east[' + i + ']: ' + this.east[i].self.title);
			}
		}else{
			console.log("this.east is empty");
		}
	}

	if(opt === null || opt === 'w' || opt === 'links'){
		if(this.west.length != 0){
			for(var i = 0; i < this.west.length; i++){
				console.log('this.west[' + i + ']: ' + this.west[i].self.title);
			}
		}else{
			console.log("this.west is empty");
		}
	}

	if(opt === null || opt === 'pos' || opt === 'ps'){
		console.log('this.top: ' + this.top);
		console.log('this.left: ' + this.left);
	}

	if(opt === null || opt === 'size' || opt === 'ps'){
		console.log('this.w: ' + this.w);
		console.log('this.h: ' + this.h);
	}
	

};

/** 
 * @decription cuts links pointing to THIS node
 * @opt 'all' - cuts all links pointing to THIS and that THIS is pointing to 
 * @opt 'n'/'s'/'e'/'w' - cuts links in the direction specified
*/
node.prototype.cut_link = function (opt) {
	//console.log("Cutting link!");
	if(opt === 'n' || opt === 'all'){
		for(var i = 0; i < this.north.length; i++){
			cut_self(this.north[i].south, this);
		}	
		this.north = new Array();
	}	
	if(opt === 's' || opt === 'all'){
		for(var i = 0; i < this.south.length; i++){
			cut_self(this.south[i].north, this);
		}	
		this.south = new Array();
	}
	if(opt === 'e' || opt === 'all'){
		for(var i = 0; i < this.east.length; i++){
			cut_self(this.east[i].west, this);
		}	
		this.east = new Array();
	}
	if(opt === 'w' || opt === 'all'){
		for(var i = 0; i < this.west.length; i++){
			cut_self(this.west[i].east, this);
		}	
		this.west = new Array();
	}
};

//removes self from array.
function cut_self(array, self){
	var tmp = array;
	for(var i = 0; i < tmp.length; i++){
		if(array[i] === self){
			array.splice(i, 1);
		}
	}

}

/** 
 * @decription test to see if window is next to it.
 * @return 0 -if not adjacent
 * @return 1 -if vertically adjacent
 * @return 2 -if horizontally adjacent
*/
node.prototype.adjacent = function (node){
	tile_graph.updateGraphState();
	//console.log("In adjacent()");
	var sensitivity = 2;//2
	if( isinArray(this.north, node) ||  isinArray(this.south, node)){
 		if( around(this.w, node.w, sensitivity) ){
			return 1;
		} 
	}
	if( isinArray(this.east, node) ||  isinArray(this.west, node)){
 		if( around(this.h, node.h, sensitivity) ){
			return 2;
		} 
	}
	return 0;
}

function isinArray(array, obj){
	for(var i = 0; i < array.length; i++){
		if(array[i] === obj){
			return true;
		}
	}
	return false;
}



/** 
 * @decription Finds and links all windows next THIS node
 * @param Node nodes - an array of nodes most likely graph.t_list
*/
node.prototype.updateLinks = function (nodes) {
	//this.print("name");
	this.cut_link('all');
	var me = this.self;
	var s = me.getSize();
	var p = me.getPosition();
	this.w = s.width;
	this.h = s.height;
	this.left = p.left;
	this.top = p.top;

	for(var i = 0; i < nodes.length; i++){
		var tmp = nodes[i];

		if( above(tmp, this) ){
			if( isNextTo(tmp, this, 'ew') ){
				this.north.push(tmp);
			}
		}

		if( below(tmp, this) ){
			if( isNextTo(tmp, this, 'ew') ){
				this.south.push(tmp);
			}
		}

		if( onLeft(tmp, this) ){
			//if(this.self.title === 'conditinal.js'){ tmp.print('none'); }
			if( isNextTo(tmp, this, 'sn') ){
				//if(this.self.title === 'conditinal.js'){ console.log("Was Pushed"); }
				this.west.push(tmp);
			}
		}

		if( onRight(tmp, this) ){
			if( isNextTo(tmp, this, 'sn') ){
				this.east.push(tmp);
			}
		}
	}

};

//Some times updateLinks will only conect in one direction
node.prototype.patchLinks = function () {
	for(var i = 0; i < this.north.length; i++){
		var curr = this.north[i];
    if(!isinArray(curr.south, this) ){
			curr.south.push(this);
		}		
	}

	for(var i = 0; i < this.south.length; i++){
		var curr = this.south[i];
    if(!isinArray(curr.north, this) ){
			curr.north.push(this);
		}		
	}

	for(var i = 0; i < this.east.length; i++){
		var curr = this.east[i];
    if(!isinArray(curr.west, this) ){
			curr.west.push(this);
		}		
	}

	for(var i = 0; i < this.west.length; i++){
		var curr = this.west[i];
    if(!isinArray(curr.east, this) ){
			curr.east.push(this);
		}		
	}

};

/** 
 * @decription Figures out if a is a window on the row/column next to curr
 * @param Node a - a node being copaired to curr
 * @param Node curr - a node being copaired to a
 * @param String opt - 'ew' compair them verticaly 'sn' will copair them horozontaly 
*/
function isNextTo(a, curr, opt){
	if(opt === 'ew'){
		if( (a.left) < (curr.left + curr.w) ){
			if( (a.left + a.w) > curr.left ){
				return true;
			}
		}
	}
	if(opt === 'sn'){
		if( (curr.top + curr.h) > a.top){
			if(curr.top < (a.top + a.h) ){
				return true;
			}
		}
	}
	return false;
}

var x = 25;
//checks in if a is within range to point to curr(northern direction)
function above(a, curr){
	var minH = a.self.minHeight/2; //makes function less sensitive
	if( (a.top + a.h - minH ) <= curr.top){
		if(curr.top <= (a.top + a.h + minH ) ){
			return true;
		}
	} 
	return false;
}

//checks in if a is within range to point to curr(southern direction)
function below(a, curr){
	var minH = a.self.minHeight/2;	//makes function less sensitive
	var c = curr.top + curr.h;
	if(a.top - minH <= c){
		if(c <= a.top + minH){
			return true;
		}
	}
	return false;
}

//checks in if a is within range to point to curr(western direction)
function onLeft(a, curr){
	var minW = a.self.minWidth/2; //makes function less sensitive
	var l = a.left + a.w;
	if( (l - minW ) <= curr.left ){
		if(curr.left <= (l+minW) ){
			return true;
		}
	} 
	return false;
}

//checks in if a is within range to point to curr(eastern direction)
function onRight(a, curr){
	var minW = a.self.minWidth/2;	//makes function less sensitive
	var c = curr.left + curr.w;
	if(a.left - minW <= c){
		if(c <= a.left + minW){
			return true;
		}
	}
	return false;
}
