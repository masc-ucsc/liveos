var JSWM;

//resizing code until jswm_init function 
var bheight = 0;
var bwidth = 0;
var origdocheight = 0;
var origdocwidth = 0;
var hasbeenzoomed = 0;
var oldtotalwidth = 0;
var oldtotalheight = 0;
//on load of browser set the xy of the browser
$(window).load (function (){
  bheight = $(window).height();
  //console.log("init bheight");
  //console.log(bheight);
  bwidth = $(window).width();
  //console.log("init bwidth");
  //console.log(bwidth);
  origdocheight = $(document).height();
  origdocwidth = $(document).width();
  oldtotalwidth = window.outerWidth;
  oldtotalheight = window.outerHeight;
});
//function to resize applications when the browser gets resized
$(window).resize(function () {
  //this is to not resize the zoom of a window
  
  if(origdocheight === window.outerHeight){
    hasbeenzoomed = 1;   
  };
  if(origdocwidth === window.outerWidth){
    hasbeenzoomed = 1;
  };
  
  //$('body').css('height', $(window).height());
  //$('body').css('width', $(window).width());
  origdocheight = window.outerHeight;
  origdocwidth = window.outerWidth;
  var docheight = $(document).height();
  //console.log("document height: " + docheight + "\n");
  var docwidth = $(document).width();
  //console.log("document width: " + docwidth + "\n");
  var deltaH = $(window).height() - bheight;
  var deltaW = $(window).width() - bwidth;

  var origH = $(window).height();
  var origW = $(window).width();
  // ratio of the old size of the browser, vs the new.
  var ratioH = $(window).height()/bheight;
  var ratioW = $(window).width()/bwidth;
  var origWindowPos = new Array();
  var BrowseToWinRatioH = new Array();
  var BrowseToWinRatioW = new Array();
  for(var kk = 0; kk < wm.windows.length; kk++){
    origWindowPos[kk] = wm.windows[kk].getPosition();
  }  
  for(var jj = 0; jj < wm.windows.length; jj++){
    BrowseToWinRatioH[jj] = origWindowPos[jj].top/bheight;
    BrowseToWinRatioW[jj] = origWindowPos[jj].left/bwidth;
  }     
  bheight = $(window).height();
  bwidth = $(window).width();
  //get the position of all the windows originals before resizing them.
  var numwinds = wm.windows.length;
  //console.log("numwinds");
  //console.log(numwinds);
  for(var ii = 0; ii < wm.windows.length; ii++){
    if(tile_graph.isinGraph(wm.windows[ii])){
      var currsize = wm.windows[ii].getSize();
      var currpos = wm.windows[ii].getPosition();
      var disttoBW = 0;
      //console.log("size ratiow: "+ (currsize.width/bwidth));
      //console.log("size ratioh: "+ (currsize.height/bheight)+'\n');
      /*
      if(currpos.left + currsize.width >= bwidth -5){
        console.log("its really close");
        disttoBW = bwidth - (currpos.left + currsize.width);
      }
      */
      //if(currpos.left + currsize.width > bwidth){
       // disttoBW = (currpos.left + currsize.width) - bwidth;
      //}
      //+2 because of the padding
      //divide +2 based on how many windows are across from it, and above it for the 2.1
      wm.windows[ii].setSize(currsize.width*ratioW + 2 + disttoBW,currsize.height*ratioH + 2,null,false);
      // the new position of the window not taking into account the amount of other windows
      var increaseleft = currpos.left * ratioW;
      var increasetop = currpos.top * ratioH;
      // the difference between now and before the resiz
      //console.log(BrowseToWinRatioW[ii]);
      //console.log("^ left and ! top");
      //console.log(BrowseToWinRatioH[ii]);
      wm.windows[ii].setPosition(BrowseToWinRatioW[ii] * origW + 0.5, BrowseToWinRatioH[ii] * origH +0.5, false);
      currsize = wm.windows[ii].getSize();
      if(tile_graph.isinGraph(wm.windows[ii])){
        tile_graph.update_size(wm.windows[ii], currsize.width,currsize.height);
        tile_graph.update_position(wm.windows[ii], BrowseToWinRatioW[ii] * origW, BrowseToWinRatioH[ii] * origH);
      }
      tile_graph.updateGraphState();
      tile_graph.patchGraph();
      /*
      console.log("calling resizeS");
      wm.windows[ii].resS(wm.windows[ii],wm.windows[ii]);
      console.log("calling resizeE");
      wm.windows[ii].resE(wm.windows[ii],wm.windows[ii]);
      */
    }
  }
  //$('body').css('height', $(window).height());
  //$('body').css('width', $(window).width());
});

jswm_init = function ($) {
    /*
    JSWMLib = {
        Version: '0.1',
        load: function() {}
    };
    JSWMLib.load();
    */

    TextButton = function (f, text, title) {
        var a = document.createElement('A');
        $(a).text(text).click(f).attr('href', '#').attr({
            title: title
        });
        return a;
    };
        
    ImageButton = function (f, src, alt, title, hoverSrc) {
        var img = document.createElement('IMG');
        $(img).click(f).addClass('JSWM_button').attr({
            src: src,
            title: title
        });
        if (hoverSrc) {
            // new mage().src = hoverSRC; // preload hover image
            $(img).mouseover(function () {
                img.src = hoverSrc;
            }).mouseout(function () {
                img.src = src;
            });
        }
        return img;
    };

    /**
     * Truncate text inside a span using log a binary search
     * @method
     * @param {string} text  text to truncate
     * @param {Element} element  in-line element containing text
     * @param {Element} container  block element containing text element (to test height change)
     * @param {int} w  Maximum width
     * @param {int} h  Maximum height
     */
    JSWMtruncate = function (text, element, container, w, h) {
        if ($(element).width() > w || $(container).height() > h) {
            var len = text.length;
            var i = Math.floor(len / 4);
            var lasti = 0;
            while (lasti != i && i < len && i >= 0) {
                var i2 = i;
                element.replaceChild(document.createTextNode(text.substring(0, text.length - i) + ''), element.firstChild);
                if ($(element).width() > w || $(container).height() > h) {
                    i += Math.ceil(Math.abs(lasti - i) / 2);
                } else if (Math.abs(lasti - i) > 1) {
                    i -= Math.ceil(Math.abs(lasti - i) / 2);
                } else {
                    break;
                }
                lasti = i2;
            }
            element.replaceChild(document.createTextNode(text.substring(0, text.length - i) + ''), element.firstChild);
        }
    };

    BrowserDetect = {
        init: function () {
            this.browser = this.searchString(this.dataBrowser) || "An unknown browser";
            this.version = this.searchVersion(navigator.userAgent) || this.searchVersion(navigator.appVersion) || "an unknown version";
            this.OS = this.searchString(this.dataOS) || "an unknown OS";
        },
        searchString: function (data) {
            for (var i = 0; i < data.length; i++) {
                var dataString = data[i].string;
                var dataProp = data[i].prop;
                this.versionSearchString = data[i].versionSearch || data[i].identity;
                if (dataString) {
                    if (dataString.indexOf(data[i].subString) != -1)
                        return data[i].identity;
                } else if (dataProp)
                    return data[i].identity;
            }
        },
        searchVersion: function (dataString) {
            var index = dataString.indexOf(this.versionSearchString);
            if (index == -1)
                return;
            return parseFloat(dataString.substring(index + this.versionSearchString.length + 1));
        },
        dataBrowser: [{
            // not exists in origin
            string: navigator.userAgent,
            subString: "Chrome",
            identity: "Google chrome"
        }, {
            string: navigator.userAgent,
            subString: "OmniWeb",
            versionSearch: "OmniWeb/",
            identity: "OmniWeb"
        }, {
            string: navigator.vendor,
            subString: "Apple",
            identity: "Safari"
        }, {
            prop: window.opera,
            identity: "Opera"
        }, {
            string: navigator.vendor,
            subString: "iCab",
            identity: "iCab"
        }, {
            string: navigator.vendor,
            subString: "KDE",
            identity: "Konqueror"
        }, {
            string: navigator.userAgent,
            subString: "Firefox",
            identity: "Firefox"
        }, {
            string: navigator.vendor,
            subString: "Camino",
            identity: "Camino"
        }, { // for newer Netscapes (6+)
            string: navigator.userAgent,
            subString: "Netscape",
            identity: "Netscape"
        }, {
            string: navigator.userAgent,
            subString: "MSIE",
            identity: "Explorer",
            versionSearch: "MSIE"
        }, {
            string: navigator.userAgent,
            subString: "Gecko",
            identity: "Mozilla",
            versionSearch: "rv"
        }, { // for older Netscapes (4-)
            string: navigator.userAgent,
            subString: "Mozilla",
            identity: "Netscape",
            versionSearch: "Mozilla"
        }],
        dataOS: [{
            string: navigator.platform,
            subString: "Win",
            identity: "Windows"
        }, {
            string: navigator.platform,
            subString: "Mac",
            identity: "Mac"
        }, {
            string: navigator.platform,
            subString: "Linux",
            identity: "Linux"
        }]
    };
    BrowserDetect.init();

    pngSupport = !(BrowserDetect.browser == 'Explorer' && BrowserDetect.OS == 'Windows' && BrowserDetect.version < 7);

    /**
     * Expand/collapse button (v/^)
     * @constructor
     * @param {Function} f  Function to be fired by the onclick event
     */
    ExpandButton = function (f) {
        this.img = document.createElement('IMG');
        $(this.img).click(f).addClass('JSWM_button').attr({
            alt: '+/-'
        });
        return this;
    };


    /**
     * Get Element
     * @method
     * @return {Element}  The expand button
     */
    ExpandButton.prototype.getButton = function () {
        return this.img;
    };

    /**
     * Set the expand button graphic
     * @method
     * @param {boolean} isExpanded  New state
     * @param {boolean} isNode  Item is a node (can't be expanded)
     */
    ExpandButton.prototype.set = function (isExpanded, isNode) {
        var _this = this;
        var icon = isExpanded ? JSWMImages.collapse : JSWMImages.expand;
        var iconhover = isExpanded ? JSWMImagesHover.collapse : JSWMImagesHover.expand;

        $(this.img).attr({
            src: icon
        });
        $(this.img).mouseover(function () {
            $(this).attr({
                src: iconhover
            });
        }).mouseout(function () {
            $(this).attr({
                src: icon
            });
        });
    };

    /**
     * Construct a window manager
     * @constructor
     * @param {int[]} margins  Window manager margins [top, right, bottom, left], default [0, 0, 0, 0]
     * @param {boolean[]} constraints  Window manager edge constraints [top, right, bottom, left], default [true, false, false, false]
     */
    JSWM = function (margins, constraints) {
        _this = this;
        this.contents = document.body.appendChild(document.createElement('DIV'));
        this.windowNum = 0;
        $(this.contents).addClass('JSWM_manager');
        this.windows = new Array();
        this.topZIndex = 100;
        this.metatopZIndex = 1;
        this.lastActiveWindow = null;
				this.shiftpressed = false;
        if (!margins)
            margins = [0, 0, 0, 0];
        this.margins = margins;
        if (!constraints)
            constraints = [true, false, false, false];
        this.constraints = constraints;
				this.selected = new Array();
				this.isMeta = false;
        this.bigTileDirection = null;
        this.session_object = new Object();
        this.session_object.siz = new Array();
        this.session_object.position = new Array();
        return this;
    };
    /**
    * Save windows to saved session positions
    * 
    */
    JSWM.prototype.set_session = function (){
      for(var ii = 0; ii < this.windows.length; ii++){
        this.session_object.siz[ii] = this.windows[ii].getSize();
        this.session_object.position[ii] = this.windows[ii].getPosition();
      }
    }
    /**
     * Tile all windows across the viewport
     * @method
     */
    JSWM.prototype.tile = function () {
			if(this.curr_active_window.mode === 'f'){
				if(this.selected.length === 0){
					/*for(var i = 0; i < this.windows.length; i++){
						if(this.windows[i].mode === 'f'){
							tile_graph.add(null, this.windows[i], null);
						}
					}*/
					tile_graph.add(null, this.curr_active_window, null);
				}else{		 
						if(this.selected[0].mode === 't'){
							tile_graph.add(this.selected[0], this.curr_active_window, null);
						}else{
							tile_graph.add(null, this.curr_active_window, null);
							for(var i = 0; i < this.selected.length; i++){				
								tile_graph.add(null, this.selected[i], null);
							}
						}
				}
			}else{
				var active = tile_graph.find(this.curr_active_window);
				for(var i = 0; i < this.selected.length; i++){
					var curr = tile_graph.find(this.selected[i]);
					//console.log("Is Adjacent:", active.adjacent(curr) );
				}
			}
			wm.meta(); //refresh meta divs
			wm.meta();
    };

    /*JSWM.prototype.untile_all = function (){
        for(var i = 0; i < this.windows.length; i++){
          console.log('should see this a bunch');
          this.windows[i].mode = 'f';
          tile_graph.remove(this.windows[i]);
          this.windows[i].setSize(this.windows[i]defaultWidth, this.windows[i].defaultHeight);
          var height = $(window).height();
          var width = $(window).width();
          var s = this.windows[i].getSize();
          var p = this.windows[i].getPosition();
          var top = p.top;
          var left = p.left;
          //console.log("height:",height,"width:",width);
          if(s.width + p.left > width){
            left = 0;
          }
          if(s.height + p.top > height){
            top = 0;
          }
          this.windows[i].setPosition(left,top);
          displayMetaResize(this.curr_active_window,  true);
        }
    };*/

    /**
     * Tiles active window into selected window horizontaly --
     * @method
     */
    JSWM.prototype.tileH = function () {
			if(this.curr_active_window.mode === 'f'){
				if(this.selected.length === 0){
					tile_graph.add(null, this.curr_active_window, 'h');
				}else{
					if(this.selected[0].mode === 't'){
						tile_graph.add(this.selected[0], this.curr_active_window, 'h');
					}else{
						tile_graph.add(null, this.curr_active_window, 'h');
						for(var i = 0; i < this.selected.length; i++){					
							tile_graph.add(null, this.selected[i], 'h');
						}
					}
				}
			}else{
				tile_graph.changeMode(this.curr_active_window, 'h');
				var windows = new Array();
				windows.push(this.curr_active_window);
				for(var i = 0; i < this.selected.length; i++){
					var s = this.selected[i].getPosition();
					var inserted = false;
					if(this.selected[i] != this.curr_active_window){
						for(var j = windows.length-1; j >= 0; j--){
							var w = windows[j].getPosition();
							if(s.top >= w.top && !isinArray(windows,this.selected[i]) ){
								windows.splice(j+1, 0, this.selected[i]);
								inserted = true;
							}
						}
						if(inserted === false){
							windows.unshift(this.selected[i]);
						}
						//windows.push(this.selected[i]);
					}
				}
				tile_graph.turn(windows, 'h');
			}
			wm.meta(); //refresh meta divs
			wm.meta();
		};

    /**
     * Tiles active window into selected window vertically ||
     * @method
     */
    JSWM.prototype.tileV = function () {
			if(this.curr_active_window.mode === 'f'){
				if(this.selected.length === 0){
					tile_graph.add(null, this.curr_active_window, 'v');
				}else{
					if(this.selected[0].mode === 't'){
						tile_graph.add(this.selected[0], this.curr_active_window, 'v');
					}else{
						tile_graph.add(null, this.curr_active_window, 'v');
						for(var i = 0; i < this.selected.length; i++){					
							tile_graph.add(null, this.selected[i], 'v');
						}
					}
				}
			}else{
				var windows = new Array();
				windows.push(this.curr_active_window);
				for(var i = 0; i < this.selected.length; i++){	//insert according to position
					var s = this.selected[i].getPosition();
					var inserted = false;
					if(this.selected[i] != this.curr_active_window){
						for(var j = windows.length-1; j >= 0; j--){
							var w = windows[j].getPosition();
							if(s.left >= w.left && !isinArray(windows,this.selected[i]) ){
								windows.splice(j+1, 0, this.selected[i]);
								inserted = true;
							}
						}
						if(inserted === false){
							windows.unshift(this.selected[i]);
						}
					}
				}
				tile_graph.turn(windows, 'v');
			}
			wm.meta(); //refresh meta divs
			wm.meta();
		};

    /**
     * Returns a window that is next to "this" window.
     * @direction 'r' returns a node pointing to window on the right
     * @direction 'l' returns a node pointing to window on the left
     * @direction 'u' returns a node pointing to window on the top
     * @direction 'd' returns a node pointing to window on the bottom
     * @opt null sets the returned window active else nothing happens
     */
		JSWM.prototype.selecter = function (direction, opt) {
			var curr = tile_graph.find(this.curr_active_window);
			if(direction === 'r'){
        //console.log("Selceted Right!");
				if(curr.east.length != 0){
					for(var i = 0; i < curr.east.length; i++){
						if(curr.east[i].top <= curr.top){
							if( (curr.east[i].top + curr.east[i].h) >= curr.top){
								if(opt === null){curr.east[i].self.setActive();}
								return curr.east[i];
							}
            }
					}
				}
      }
			if(direction === 'l'){
        //console.log("Selceted Left!");
				if(curr.west.length != 0){
					for(var i = 0; i < curr.west.length; i++){
						if(curr.west[i].top <= curr.top){
							if( (curr.west[i].top + curr.west[i].h) >= curr.top){
								if(opt === null){curr.west[i].self.setActive();}
								return curr.west[i];
							}
            }
					}
				}
      }
			if(direction === 'u'){
        //console.log("selceted Up!");
				if(curr.north.length != 0){
					for(var i = 0; i < curr.north.length; i++){
						if(curr.north[i].left <= (curr.left + curr.w) ){
							if( (curr.north[i].left + curr.north[i].w) >= (curr.left + curr.w) ){
								if(opt === null){curr.north[i].self.setActive();}
								return curr.north[i];
							}
            }
					}
				}
      }
			if(direction === 'd'){
        //console.log("selceted Down!");
				if(curr.south.length != 0){
					for(var i = 0; i < curr.south.length; i++){
						if(curr.south[i].left <= (curr.left + curr.w) ){
							if( (curr.south[i].left + curr.south[i].w) >= (curr.left + curr.w) ){
								if(opt === null){curr.south[i].self.setActive();}
								return curr.south[i];
							}
            }
					}
				}
      }

		};
    // @param bigwin, the window to make big in the tile
    // @param direction, which side to put the bigwin
    JSWM.prototype.bigTile = function(bigwin, direction){
      console.log("bigTile bigwin:" + bigwin + "\nbigTile direction:" + direction);
      for(var i = 0; i < wm.windows.length; i++){
        wm.untile(wm.windows[i]);
      }
      wm.bigTileDirection = direction;
      wm.curr_active_window.bigTile = direction;
      tile_graph.add(null, wm.curr_active_window, null, direction)
      for(var k = 0; k < wm.windows.length; k++){
        tile_graph.add(null, wm.windows[k], null);
      }  
    };
    //Helper function to switch windows
		JSWM.prototype.switcher = function (direction) {
			var win2 = this.selecter(direction,'notNull');
			tile_graph.switch_win(this.curr_active_window, win2.self);
		} 


		//Toggles meta mode when called
    JSWM.prototype.meta = function () {
    		if(this.isMeta === false){
    			this.isMeta = true;
					//console.log($(this.curr_active_window.keystroke_thief) );
     			$(this.curr_active_window.keystroke_thief ).focus();
					for(var i = 0; i < this.windows.length; i++){
						var window = this.windows[i];
						var s = window.getSize();
						$(window.meta_container).show();
						$(window.metaC).show();
					}
					displayMetaResize(this.curr_active_window,	true);
    		}else{
					if(this.curr_active_window.default_focus != null){
          	$(this.curr_active_window.default_focus ).focus();
					}else{
						console.log("ERROR: Please set default focus for this app!");
					}
    			this.unmeta();
    		}
		};

		//called by JSWM.prototype.meta 
    JSWM.prototype.unmeta = function () {
			for(var i = 0; i < this.windows.length; i++){
				//console.log(this.windows[i].title);
				$(this.windows[i].meta_container).hide();
				$(this.windows[i].metaC).hide();
			}
			displayMetaResize(this.curr_active_window, false);
			this.deselect();
			this.isMeta = false;
		};

    /**
     * Resposible for display/hiding the large resizing divs in meta mode
     * @win current window.
     * @toggle "true" display divs 
     * @toggle "false" hide divs 
     */
		function displayMetaResize(win,toggle){
			if(!win.manager.isMeta){ return; }
			var p = win.getPosition();
			var s = win.getSize();
      var height = $(window).height();
			var width = $(window).width();
			var leeway = 10;
			//variable below are used to prevent resizing on the edges of the screen
			var notonTop = p.top > leeway;
			var notonBottom = p.top + s.height < height - leeway;
			var notonLeft = p.left > leeway;
			var notonRight = p.left + s.width < width - leeway;
			if(toggle === true){
				if(notonTop && notonLeft){
					$(win.metaNW).show();
				}
				if(notonTop && notonRight){
					$(win.metaNE).show();
				}
				if(notonBottom && notonRight){
					$(win.metaSE).show();
        }
				if(notonBottom && notonLeft){
					$(win.metaSW).show();
        }
				if(notonTop){
					$(win.metaN).show();
        }
				if(notonBottom){
					$(win.metaS).show();
        }
				if(notonRight){
					$(win.metaE).show();
				}
				if(notonLeft){
					$(win.metaW).show();
				}
			}else{
				$(win.metaNW).hide();
				$(win.metaNE).hide();
				$(win.metaSE).hide();
				$(win.metaSW).hide();
				$(win.metaN).hide();
				$(win.metaS).hide();
				$(win.metaE).hide();
				$(win.metaW).hide();
			}
		}

		//Untiles window passed in through Window
    JSWM.prototype.untile = function (jsWindow){
				jsWindow.mode = 'f';
        if(jsWindow.bigTile != null){
          this.bigTileDirection = null;
          console.log("bigTile Window removed")
        }
        jsWindow.bigTile = null;
				tile_graph.remove(jsWindow);
				jsWindow.setSize(jsWindow.defaultWidth, jsWindow.defaultHeight);
				jsWindow.setPosition(jsWindow.lastXpos, jsWindow.lastYpos);
				var height = $(window).height();
				var width = $(window).width();
				var s = jsWindow.getSize();
				var p = jsWindow.getPosition();
				var top = p.top;
				var left = p.left;
				console.log("<<<<<",jsWindow.title,">>>>>");
				console.log("top:", top,"left:", left);
				console.log("lastYpos:", jsWindow.lastYpos,"lastXpos:", jsWindow.lastXpos);
				if(s.width + p.left > width){
					//left = 0;
				}
				if(s.height + p.top > height){
					//top = 0;
				}
				//jsWindow.setPosition(left,top);
				displayMetaResize(this.curr_active_window,	true);
    };

    /**
     * Cascade all windows across the viewport
     * @method
     */
    JSWM.prototype.cascade = function () {
        var windowSize = this.getWindowSize();
        var w = Math.floor((windowSize.width - 10) * 2 / 3);
        var h = Math.floor((windowSize.height - 10) * 2 / 3);
        var l = Math.floor((windowSize.width - 10 - w) / (this.windows.length - 1));
        var t = Math.floor((windowSize.height - 10 - h) / (this.windows.length - 1));
        if (this.windows.length == 1) {
            l = 0;
            t = 0;
        }
        for (var i = 0; i < this.windows.length; i++) {
            this.windows[i].setSize(w, h - 20);
            this.windows[i].setPosition(i * l, i * t);
            this.windows[i].redrawShadow();
            this.windows[i].setActive();
        }
    };

    /**
     * Collapse all collapsible windows
     * @method
     */
    JSWM.prototype.collapseAll = function () {
        
        for (var i = 0; i < this.windows.length; i++)
        if (!this.windows[i].noCollapse)
            this.windows[i].expand(false);
    };

    /**
     * Expand all collapsible windows
     * @method
     */
    JSWM.prototype.expandAll = function () {
        for (var i = 0; i < this.windows.length; i++)
        if (!this.windows[i].noCollapse)
            this.windows[i].expand(true);
    };

    /**
     * Create a new empty window
     * @method
     * @param {int} w  Window width
     * @param {int} h  Window height
     * @param {JSWindowOptions} options  Initial options
     */
    JSWM.prototype.openNew = function (w, h, l, t, options) {
        var jsWindow = new JSWindow(this, w, h, l, t, options);
        this.addWindow(jsWindow);
        console.log('jsWindow'); //////just added
    };

    /**
     * Create a new window with an iframe
     * @method
     * @param {string} uri  URI to load in iframe
     * @param {int} w  Window width
     * @param {int} h  Window height
     * @param {JSWindowOptions} options  Initial options
     */
    JSWM.prototype.openURI = function (uri, w, h, l, t, options) {
        var iFrame = document.createElement('IFRAME');
        iFrame.src = uri;
        iFrame.name = 'iframe' + Math.round(Math.random() * 1000000);
        $(iFrame).addClass('JSWM_iframe');
        var jsWindow = new JSWindow(this, w, h, l, t, options, iFrame);
        $(jsWindow.lastActiveTab.contents).css({
            overflow: 'hidden'
        });
        this.addWindow(jsWindow);
    };

    /**
     * Determines if an element is already wrapped
     * @method
     * @param {Element} contents  Contents to look for
     * @return {boolean}  True if element is wrapped in a window
     */
    JSWM.prototype.isWrapped = function (contents) {
        contents = $(contents).get(0) || $('#' + contents).get(0);
        for (var i = 0; i < this.windows.length; i++)
        for (var j = 0; j < this.windows[i].tabs.length; j++)
        if (this.windows[i].tabs[j].contents.firstChild == contents)
            return true;
        return false;
	 };

    /**
     * Create a new window around an existing content
     * @method
     * @param {Element} contents  Element to wrap
     * @param {int} w  Window width
     * @param {int} h  Window height
     * @param {JSWindowOptions} options  Initial options
     * @param {boolean} force  Re wrap contents even if already wrapped
     */
    JSWM.prototype.openElement = function (contents, w, h, l, t, options, force, on_close) {

        if (!force && this.isWrapped(contents))
            return; // return if content already wrapped
        var jsWindow = new JSWindow(this, w, h, l, t, options, contents, on_close);
        this.addWindow(jsWindow);
        //this.whichWindow(1);//A window has been opened, increase window count
        return jsWindow;//////
    };


    /**
     * Add a window to the manager
     * @method
     * @param {JSWindow} jsWindow  Window to add
     */
    JSWM.prototype.addWindow = function (jsWindow) {
        this.windows.push(jsWindow);
        jsWindow.redrawShadow();
        jsWindow.setActive();
    };

    /**
     * Keep track of the number of windows open
     * @method
     * @param {inc} boolean to inc or dec number of windows
     */
    JSWM.prototype.whichWindow = function(inc){
        if(inc == 1){
            _this.windowNum++;
            console.log(_this.windowNum);
        }else if(inc == 0 & _this.windowNum != 0){
          _this.windowNum--;
            console.log(_this.windowNum);
        }else{
            _this.windowNum = 0;
            console.log(_this.windowNum);
        }
        return _this.windowNum;
    }


    /**
     * Set target window as active
     * @method
     * @param {JSWindow} jsWindow  Window to make active
     */


    JSWM.prototype.setActiveWindow = function (jsWindow) {
        /*$(jsWindow.container).addClass('JSWM_window_active');
        if (this.lastActiveWindow && this.lastActiveWindow != jsWindow)
            $(this.lastActiveWindow.container).removeClass('JSWM_window_active');
        this.lastActiveWindow = jsWindow;
        //alert(this.lastActiveWindow)
        _this.curr_active_window = this.lastActiveWindow;*/
				//console.log("Setting active:", jsWindow.title);
        /*if(_this.isMeta){
					console.log($(jsWindow.keystroke_thief) );
     			$(jsWindow.keystroke_thief ).focus();
        }*/
        $(this.default_focus).focus();
				this.deselect();
				if(jsWindow != _this.curr_active_window){
					$(jsWindow.container).addClass('JSWM_window_active');
					$(jsWindow.container).removeClass('JSWM_window_selected');
					if(this.curr_active_window != null){
						this.lastActiveWindow = this.curr_active_window;
						$(this.lastActiveWindow.container).removeClass('JSWM_window_active');
						$(this.lastActiveWindow.container).blur();
					}
					this.curr_active_window = jsWindow;
	
					var last = this.lastActiveWindow;
					var curr = this.curr_active_window;
					if(curr.mode === 'f'){
        		$(curr.container).css({zIndex: this.topZIndex});
        		this.topZIndex++;
					}
					if(last != null && last.mode === 't'){
						//$(last.container).css({zIndex: 0});
					}
					if(curr.mode === 't'){
        		$(curr.container).css({zIndex: this.metatopZIndex});
						this.metatopZIndex++;
					}
					if(last != null){
						displayMetaResize(last, false); //turn off resize arrows
					}
					displayMetaResize(curr, true);
				}
      			if(_this.curr_active_window && _this.curr_active_window.default_focus)
				  $(_this.curr_active_window.default_focus).focus();
				//console.log("Setting "+ _this.curr_active_window.title + " window active!");
				
      return _this.curr_active_window;
        
    };

    /**
     * Selects jsWindow (white border in meta mode)
     * @method
     */
		JSWM.prototype.select = function (jsWindow) {
			if(jsWindow === _this.curr_active_window){ return; }
			if(this.isMeta){
				var s = $(jsWindow.container).attr('class');
				if(s.indexOf("JSWM_window_selected") != -1){
					for(var i = 0; i < this.selected.length; i++){
						if(this.selected[i] === jsWindow){
							$(this.selected[i].container).removeClass('JSWM_window_selected');
							this.selected.splice(i,1);
						}
					}
				}else{
					if(jsWindow != _this.curr_active_window){
						$(jsWindow.container).addClass('JSWM_window_selected');
						this.selected[this.selected.length] = jsWindow;
					}
				}
			}
		};

    /**
     * Deselects jsWindow (white border in meta mode)
     * @method
     */
		JSWM.prototype.deselect = function () {
			for(var i = 0; i < this.selected.length; i++){
				$(this.selected[i].container).removeClass('JSWM_window_selected');
			}
			this.selected = new Array();
		};

    /**
     * Get size of viewport (less margins)
     * @method
     * @returns {Object}  Dimension of viewport
     */
    JSWM.prototype.getWindowSize = function () {
        if (window.innerWidth) {
            w = window.innerWidth;
            h = window.innerHeight;
        } else if (window.document.documentElement && 			  window.document.documentElement.clientWidth) {
            w = window.document.documentElement.clientWidth;
            h = window.document.documentElement.clientHeight;
        } else {
            w = body.offsetWidth;
            h = body.offsetHeight;
        }
        w -= this.margins[1] + this.margins[3];
        h -= this.margins[0] + this.margins[2];
        return {
            width: w,
            height: h
        };
    };

    /**
     * Write object state data for serialisation
     * @method
     * @returns {Object} serialData  Object serialisation data
     */
    JSWM.prototype.writeObject = function () {
        var serialData = new Object();
        serialData.windows = new Array();
        for (var i = 0; i < this.windows.length; i++) {
            serialData.windows[i] = this.windows[i].writeObject();
            if (this.windows[i] == this.lastActiveWindow)
                serialData.lastActiveWindow = i;
        }
        return serialData;
    };

    /**
     * Read serialised object state data into the window manager
     * @method
     * @param {String} serialData  Object serialisation data
     */
    JSWM.prototype.readObject = function (serialData) {
        for (var i = 0; i < serialData.windows.length; i++) {
            var w = serialData.windows[i];
            var jsWindow = new JSWindow(this, w.size.width, w.size.height, w.position.left, w.position.top, w.options);
            this.addWindow(jsWindow)
            if (serialData.lastActiveWindow == i)
                jsWindow.setActive();
            jsWindow.readObject(w);
        }
    };


    JSWM.prototype.dumpWin = function () {
			var obj = new Object();
			obj.windows = this.windows;
			obj.tile_graph = tile_graph.t_list;
			return obj;
		};

    JSWM.prototype.loadWin = function (obj) {
			//remove common windows
			//tile_graph.rebuild_graph(obj.tile_graph)
			//add floting windows
		};

    /**
     * Window class
     * @constructor
     * @param {Element} element  Container window or contents (if contentExists)
     * @param {int} w  Window width
     * @param {int} h  Window height
     * @param {JSWindowOptions} options  Window options
     * @param {boolean} contentExists  Flag to indicate element points to existing content to be wrapped
     */
    JSWindow = function (manager, w, h, l, t, options, contents, on_close) {
        var _this = this;
        this.minWidth = 200;
        this.minHeight = 50;
        this.defaultWidth = w;
        this.defaultHeight = h;
        this.lastXpos = 0;
        this.lastYpos = 0;
        this.tabs = new Array();
        this.minTabButtonWidth = 100;
        this.maxTabButtonWidth = 200;
        this.manager = manager;
        this.options = options;
        this.on_close = on_close;
    		this.menu = this.default_menu();
    		this.menu.icon_count = null;
				this.adj_menu_pos_l = 0;
				this.adj_menu_pos_t = 0;
				this.mode = 'f'; // f = floating window, t = tiled window
        this.default_focus = null;
        this.bigTile = null;

		//add menu content div
		var old_div = $(contents).find("div").first();
		if( old_div.attr('class') != 'JSWM_window_handle'){
			$(this.menu).prependTo(contents);
		}else{	//make this.menu = to the menu already created
			this.menu = old_div[0];
		}



		$(this.menu).mousedown(function(){ //make sure that menu is on top right when clicked
			_this.setActive();

			setTimeout(function(){
				_this.move_menu_top_right(_this.w, _this.h);
				var scroll_obj = $(_this.contents).find('.JSWM_window_tab').first();
				var trigger = $(_this.menu).find('.dl-trigger').first();
				var ul_menu = $(_this.menu).find('.menu').first();	
				trigger.css( 'top',  scroll_obj.scrollTop() + 5 );
				ul_menu.css( 'top',  scroll_obj.scrollTop() + 50  );
				trigger.css( 'left',  scroll_obj.scrollLeft() );
				ul_menu.css( 'left',  scroll_obj.scrollLeft()  );	
			}, 200);

			return true;
		});

        this.container = this.manager.contents.appendChild(document.createElement('DIV'));
        this.keystroke_thief = this.container.appendChild(document.createElement('TEXTAREA'));
        	$(this.keystroke_thief).addClass('keystroke_thief').css({
          	position: 'absolute', 
						top: '1px',
						left: '1px',
        });

				this.shiftpressed = false;
				this.meta_container = this.container.appendChild(document.createElement('DIV'));
				$(this.meta_container).addClass('meta_container');
				$(this.meta_container).mousedown(function(){
					if(!_this.manager.shiftpressed){
						_this.setActive();
					}else{
						_this.make_selected();
					}
				});

				$(this.meta_container).hide();

        this.innerContainer = this.container.appendChild(document.createElement('DIV'));
        if (this.options.noCollapse) {
            this.slide = this.innerContainer.appendChild(document.createElement('DIV'));
            var nest = this.slide.appendChild(document.createElement('DIV'));
            this.contents = nest.appendChild(document.createElement('DIV'));
        } else {
            this.contents = this.innerContainer.appendChild(document.createElement('DIV'));
            this.slide = this.contents;
        }
        this.tabList = this.contents.appendChild(document.createElement('UL'));
        $(this.tabList).addClass('JSWM_tabList');
        $(this.tabList).sortable({axis: 'x', containment: 'parent', tolerance: 'pointer'});

        if (!contents)
            contents = document.createElement('DIV');
        this.openTab(contents);

        $(this.container).css({
            position: 'absolute'
        }); // IE fix
        $(this.container).addClass('JSWM_window');
        //this.handle = this.innerContainer.insertBefore(document.createElement('DIV'), this.slide);
				this.handle = this.innerContainer.getElementsByClassName("JSWM_window_handle")[0];
        //$(this.handle).addClass('JSWM_window_handle');
        //handleRight = this.handle.appendChild(document.createElement('DIV'));
        //$(handleRight).addClass('JSWM_window_handle_right');

        $(this.container).mousedown(function () {
            //_this.make_selected();
						if(!_this.manager.shiftpressed){
							_this.setActive();
						}else{
							_this.make_selected();
						}
        });

        if (!this.options.noResize) {
            this.resizeNW = this.innerContainer.appendChild(document.createElement('DIV'));
            $(this.resizeNW).addClass('JSWM_window_resize JSWM_window_resizeNW').css({
                position: 'absolute' /* IE fix*/
            });
            this.resizeNE = this.innerContainer.appendChild(document.createElement('DIV'));
            $(this.resizeNE).addClass('JSWM_window_resize JSWM_window_resizeNE').css({
                position: 'absolute' /* IE fix*/
            });
            this.resizeSW = this.innerContainer.appendChild(document.createElement('DIV'));
            $(this.resizeSW).addClass('JSWM_window_resize JSWM_window_resizeSW').css({
                position: 'absolute' /* IE fix*/
            });
            this.resizeSE = this.innerContainer.appendChild(document.createElement('DIV'));
            $(this.resizeSE).addClass('JSWM_window_resize JSWM_window_resizeSE').css({
                position: 'absolute' /* IE fix*/
            });

            var dragNW = function (drag, ui) {//this is right!
							if(_this.dragging === false){ return; }
							var n = calculateSize(drag, ui, this, _this, 'nw');
							resizeN(n, _this);
							resizeW(n, _this);
            };



            var dragNE = function (drag, ui) {//this is right
							if(_this.dragging === false){ return; }
							var n = calculateSize(drag, ui, this, _this, 'ne');
							resizeN(n, _this);
							resizeE(n, _this);
            };

            var dragSW = function (drag, ui) {//this is right
							if(_this.dragging === false){ return; }
							var n = calculateSize(drag, ui, this, _this, 'sw');
							resizeS(n, _this);
							resizeW(n, _this);
           };


            var dragSE = function (drag, ui) {//this works correctly
							if(_this.dragging === false){ return; }
							var n = calculateSize(drag, ui, this, _this, 'se');
							resizeS(n, _this);
							resizeE(n, _this);
            };

            if (!this.options.noResizeRedraw) {
                $(this.resizeNW).draggable({
                    drag: dragNW,
                    stop: dragNW
                });
                $(this.resizeNE).draggable({
                    drag: dragNE,
                    stop: dragNE
                });
                $(this.resizeSW).draggable({
                    drag: dragSW,
                    stop: dragSW
                });
                $(this.resizeSE).draggable({
                    drag: dragSE,
                    stop: dragSE
                });
            } else {
                $(this.resizeNW).draggable({
                    stop: dragNW
                });
                $(this.resizeNE).draggable({
										drag: dragNE,
                    stop: dragNE
                });
                $(this.resizeSW).draggable({
                    stop: dragSW
                });
                $(this.resizeSE).draggable({
                    stop: dragSE
                });
            }
            $(this.resizeNW).mousedown(function () {
                _this.setActive();
            });
            $(this.resizeNE).mousedown(function () {
                _this.setActive();
            });
            $(this.resizeSW).mousedown(function () {
                _this.setActive();
            });
            $(this.resizeSE).mousedown(function () {
                _this.setActive();
            });
            $(this.handle).dblclick(function (e) {
								$(this).data('double', 2);	//Stops 1 click event from triggering 
                _this.maximise();
								e.stopPropagation();
            });
            $(window).resize(function () {
                _this.updateMaximise();
            });
        }

				/////////////Meta Resizing/////////////////////
        this.metaNW = this.container.appendChild(document.createElement('DIV'));
        $(this.metaNW).addClass('JSWM_window_meta_resize JSWM_window_metaNW').css({
        	position: 'absolute' /* IE fix*/
        });
				$(this.metaNW).hide();
        this.metaNE = this.container.appendChild(document.createElement('DIV'));
        $(this.metaNE).addClass('JSWM_window_meta_resize JSWM_window_metaNE').css({
        	position: 'absolute' /* IE fix*/
        });
				$(this.metaNE).hide();
        this.metaSW = this.container.appendChild(document.createElement('DIV'));
        $(this.metaSW).addClass('JSWM_window_meta_resize JSWM_window_metaSW').css({
        	position: 'absolute' /* IE fix*/
        });
				$(this.metaSW).hide();
        this.metaSE = this.container.appendChild(document.createElement('DIV'));
        $(this.metaSE).addClass('JSWM_window_meta_resize JSWM_window_metaSE').css({
        	position: 'absolute' /* IE fix*/
        });
				$(this.metaSE).hide();


        this.metaN = this.container.appendChild(document.createElement('DIV'));
        $(this.metaN).addClass('JSWM_window_meta_resize JSWM_window_metaN').css({
        	position: 'absolute' /* IE fix*/
        });
				$(this.metaN).hide();
        this.metaS = this.container.appendChild(document.createElement('DIV'));
        $(this.metaS).addClass('JSWM_window_meta_resize JSWM_window_metaS').css({
        	position: 'absolute' /* IE fix*/
        });
				$(this.metaS).hide();
        this.metaE = this.container.appendChild(document.createElement('DIV'));
        $(this.metaE).addClass('JSWM_window_meta_resize JSWM_window_metaE').css({
        	position: 'absolute' /* IE fix*/
        });
				$(this.metaE).hide();
        this.metaW = this.container.appendChild(document.createElement('DIV'));
        $(this.metaW).addClass('JSWM_window_meta_resize JSWM_window_metaW').css({
        	position: 'absolute' /* IE fix*/
        });
				$(this.metaW).hide();
				this.metaC = this.container.appendChild(document.createElement('DIV'));
        $(this.metaC).addClass('JSWM_window_metaC').css({
        	position: 'absolute' /* IE fix*/
        });
				$(this.metaC).dblclick(function(){
					//_this.setActive();
				});
				$(this.metaC).hide();

	function resizeN(n, _this){
		var s = _this.getSize();
		var obj = new Object();
		obj.s = s;
		obj.hit = false;
		var stop = false;
		
		if(s.height <= _this.minHeight){
			_this.setSize(0, n.relative.top, 10, true);
			var S = _this.getSize();
			if(S.height > _this.minHeight - 2){
				_this.setPosition(0, -(n.relative.top - 2), true);
				stop = false;
			}else{
				stop = true;
			}
		}

		if(_this.mode === 't' && stop === false){
			var stack = new Array();
			stack.push(_this);

			var node = tile_graph.find(_this);
		
			for(var i = 0; i < node.north.length; i++){
				stack.push(node.north[i].self);
			}
			var nextStart = stack.length;
		
			for(var i = 0; i < node.north.length; i++){
				var north = node.north[i].self;
				var size = north.getSize();
				north.setSize(0, -n.relative.top + 3.5, 10, true);
				if( (size.height <= north.minHeight) ){
					obj.hit = true;
				}
		
				for(var j = 0; j < node.north[i].south.length; j++){
					if(	!isinArray(stack, node.north[i].south[j].self) ){
						stack.push(node.north[i].south[j].self);
					}
				}
			}

			function reSouth(other, n, obj){
				if(!obj.hit){
					other.setSize(0, n.relative.top, 10, true);
					other.setPosition(0, -(n.relative.top) + 2, true);
				}
			}
			function reNorth(other, n, obj){
				if(!obj.hit){ 
					other.setSize(0, -n.relative.top + 4, 10, true);
				}
			}	

			resizeLinks('n', reSouth, reNorth, n, stack, nextStart, obj); 
			//tile_graph.updateGraphState();
		}

		if( !obj.hit && !stop){
  		_this.setSize(0, n.relative.top, 10, true);
			if(s.height > _this.minHeight-2){
				_this.setPosition(0, -(n.relative.top - 2), true);
			}
		}

	}

	function resizeS(n, _this){
		var s = _this.getSize();
  	var p = _this.getPosition();
		var obj = new Object();
		obj.s = s;
		obj.p = p;
		obj.hit = false;
		if(_this.mode === 't'){
  	
			var stack = new Array();
			stack.push(_this);

			var node = tile_graph.find(_this);
	
			for(var i = 0; i < node.south.length; i++){
				stack.push(node.south[i].self);
			}
			var nextStart = stack.length;
	
			for(var i = 0; i < node.south.length; i++){
				var south = node.south[i].self;
				var pos = south.getPosition();
				var sos = south.getSize();
				var newSize = p.top + s.height - pos.top;
				south.setSize(sos.width, sos.height - newSize, 10, false);	
				if(sos.height > south.minHeight){
					south.setPosition(pos.left,pos.top + newSize + 2, false);  
				}else{ 
					if(!obj.hit){
						south.setPosition(pos.left,pos.top + newSize - 2, false);
					}
					obj.hit = true; 
				}		

				for(var j = 0; j < node.south[i].north.length; j++){
					if(!isinArray(stack, node.south[i].north[j].self) ){
						stack.push(node.south[i].north[j].self);
					}
				}
			}

			function reSouth(other, n, obj){
				var pos = other.getPosition();
				var newSize = obj.p.top + obj.s.height - pos.top;
				if(!obj.hit){
					other.setSize(0, -newSize, 10, true);	
					other.setPosition(0, newSize + 2, true);
				}
			}
			function reNorth(other, n){
				var sz = other.getSize();
				if(!obj.hit){
					other.setSize(sz.width, n.absolute.top + 2, 10, false);	
				}
			}

			resizeLinks('s', reSouth, reNorth, n, stack, nextStart, obj);  	
			//tile_graph.updateGraphState();
		}

		if(!obj.hit){
			_this.setSize(s.width, n.absolute.top, 10, false);
		}else{
			if(n.absolute.top < s.height){
				_this.setSize(s.width, n.absolute.top, 10, false);
			} 
		}
	}

	function resizeE(n, _this){
		var s = _this.getSize();
		var p = _this.getPosition();
		//_this.setSize(n.absolute.left, s.height, 11, false);
		var obj = new Object();
		obj.s = s;
		obj.p = p;
		obj.hit = false;

		if(_this.mode === 't'){
			
			var stack = new Array();
			stack.push(_this);

			var node = tile_graph.find(_this);
			
			for(var i = 0; i < node.east.length; i++){
				stack.push(node.east[i].self);
			}
			var nextStart = stack.length;
		
			for(var i = 0; i < node.east.length; i++){ //resize windows next to "this"
				var west = node.east[i].self;
				var pos = west.getPosition();
				var sos = west.getSize();
				var newSize =  p.left + s.width - pos.left;
				west.setSize(sos.width - newSize , sos.height, 11, false);	
				if(sos.width > west.minWidth-2){
					//west.setSize(sos.width - newSize , sos.height, 11, false);
					west.setPosition( pos.left + newSize + 2, pos.top, false);
				}else{
					obj.hit = true;
				}

				for(var j = 0; j < node.east[i].west.length; j++){
					if( !isinArray(stack, node.east[i].west[j].self) ){
						stack.push(node.east[i].west[j].self);
					}
				}
		}

			function reWest(other, n, obj){
				var pos = other.getPosition();
				var jos = other.getSize();
				var newSize =  obj.p.left + obj.s.width - pos.left;
				if(!obj.hit){ 
					other.setSize(-newSize, 0, 11, true);	
					other.setPosition( newSize + 2, 0, true);
				}else{
					if(n.absolute.left < jos.width){
						other.setSize(-newSize, 0, 11, true);	
						other.setPosition( newSize + 2, 0, true);					
					}
				}
			}
			function reEast(other, n, obj){
				var sz = other.getSize();
				var ps = other.getPosition();
				if(!obj.hit){ 
					other.setSize(n.absolute.left + 2, sz.height, 11, false);
					other.setPosition(ps.left,ps.top,false);
				}else{
					if(n.absolute.left < sz.width){
						other.setSize(n.absolute.left + 2, sz.height, 11, false);
						other.setPosition(ps.left,ps.top,false);
					}				
				}
			}

			resizeLinks('e', reWest, reEast, n, stack, nextStart, obj);
		}

		if(!obj.hit){ 
			_this.setSize(n.absolute.left, s.height, 11, false);
		}else{
			if(n.absolute.left < s.width){
				_this.setSize(n.absolute.left, s.height, 11, false);
			}
		}
	}

	function resizeW(n, _this){
		var s = _this.getSize();
		var obj = new Object();
		obj.s = s;
		//obj.p = p;
		obj.hit = false;
		var stop = false;

		if(s.width <= _this.minWidth){
			_this.setSize(n.relative.left, 0, 11, true);
			var S = _this.getSize();
			if(S.width > _this.minWidth-2){
				_this.setPosition(-(n.relative.left - 2), 0, true);
				stop = false;
			}else{
				stop = true;
			}
		}
		
		if(_this.mode === 't' && stop === false){
			var stack = new Array();
			stack.push(_this);

			var node = tile_graph.find(_this);
		
			for(var i = 0; i < node.west.length; i++){
				stack.push(node.west[i].self);
			}
			var nextStart = stack.length;
		
			for(var i = 0; i < node.west.length; i++){
				var east = node.west[i].self;
				var size = east.getSize();
				var pos = east.getPosition();
				east.setSize(-n.relative.left + 3.5, 0, 12, true);
				if( !(size.width > east.minWidth) ){
					obj.hit = true;
				}

				for( j = 0; j < node.west[i].east.length; j++){
					if( !isinArray(stack, node.west[i].east[j].self) ){
						stack.push(node.west[i].east[j].self);
					}
				}
			}

			function reWest(other, n, obj){
				if(!obj.hit){
					other.setSize(n.relative.left, 0, 11, true);
					other.setPosition(-n.relative.left + 2, 0, true);
				}
			}

			function reEast(other, n, obj){
				var size = other.getSize();
				if(!obj.hit){
					other.setSize(-n.relative.left + 4, 0, 11, true);
				}
			}

			resizeLinks('w', reWest, reEast, n, stack, nextStart, obj);
		}

		if(!obj.hit && !stop){
			_this.setSize(n.relative.left, 0, 11, true);
			if(s.width > _this.minWidth-2){
				_this.setPosition(-(n.relative.left - 2), 0, true);	
			}
		}
	}

	function isinArray(array,object){
		for(var k = 0; k < array.length; k++){
			if(object === array[k]){
				return true;
			}
		}
		return false;
	}
	
function resizeLinks(side, resize1, resize2, n, stack, num, obj){
		
	if(side === 'n'){
		var nextStart = stack.length;
		for(var i = num; i < nextStart; i++){
			resize1(stack[i], n, obj);
			var curr = tile_graph.find(stack[i]);	
			for(var k = 0; k < curr.north.length; k++){
				if(!isinArray(stack, curr.north[k].self)){
					stack.push(curr.north[k].self);
				}
			}
		}
		if(num === nextStart){return;}
		resizeLinks('s', resize1, resize2, n, stack, nextStart, obj);
	}
		
		
	if(side === 's'){
		var nextStart = stack.length;
		for(var i = num; i < nextStart; i++){
			resize2(stack[i], n, obj);
			var curr = tile_graph.find(stack[i]);
			for(var k = 0; k < curr.south.length; k++){
				if(!isinArray(stack, curr.south[k].self)){
					stack.push(curr.south[k].self);
				}
			}
		}
		if(num === nextStart){return;}
		resizeLinks('n', resize1, resize2, n, stack, nextStart, obj);
	}
				
	if(side === 'w'){
		//console.log('  Started West!');
		var nextStart = stack.length;
		for(var i = num; i < nextStart; i++){
			resize1(stack[i], n, obj);
			var curr = tile_graph.find(stack[i]);
			for(var k = 0; k < curr.west.length; k++){
				if(!isinArray(stack, curr.west[k].self)){
					stack.push(curr.west[k].self);
				}
			}
		}
		if(num === nextStart){return;}
		resizeLinks('e', resize1, resize2, n, stack, nextStart, obj);
	}

	if(side === 'e'){
		var nextStart = stack.length;
		for(var i = num; i < nextStart; i++){
			resize2(stack[i], n, obj);
			var curr = tile_graph.find(stack[i]);
			for(var k = 0; k < curr.east.length; k++){
				if(!isinArray(stack, curr.east[k].self) ){
					stack.push(curr.east[k].self);
				}
			}
		}
		if(num === nextStart){return;}
		resizeLinks('w', resize1, resize2, n, stack, nextStart, obj);
	}		
}	


function calculateSize(drag, ui, thee, win, direction){
	var s = win.getSize();
	var p = win.getPosition();
	var max_h = $( window ).height();
	var max_w = $( window ).width();
	var leway = 2;
  var relative = {
    left: $(thee.parentNode).offset().left - ui.offset.left,
    top: $(thee.parentNode).offset().top - ui.offset.top
  };
  var absolute = {
    left: $(thee).offset().left - $(thee.parentNode).offset().left + $(thee).width(),
    top: $(thee).offset().top - $(thee.parentNode).offset().top + $(thee).height()
  };
	if(direction === 'n' || direction === 'nw' || direction === 'ne'){
		if(relative.top + s.height > p.top + s.height + leway ){
			relative.top = p.top + leway;
		}
	}
	if(direction === 'w' || direction === 'nw' || direction === 'sw'){
		if(relative.left + s.width > p.left + s.width + leway ){
			relative.left = p.left + leway;
		}
	}
	if(direction === 's' || direction === 'sw' || direction === 'se'){
		if(absolute.top + p.top  > max_h - leway){
			absolute.top = max_h - leway - p.top;
		}
	}
	if(direction === 'e' || direction === 'se' || direction === 'ne'){
		if(absolute.left + p.left  > max_w - leway){
			absolute.left = max_w - leway - p.left;
		}
	}
	var x = new Object();
	x.relative = relative;
	x.absolute = absolute;
	return x;			
}

	var drag_metaN = function (drag, ui) {
		if(_this.dragging === false){ return; }
		var n = calculateSize(drag, ui, this, _this, 'n');
		resizeN(n,_this);
  };
	var drag_metaNstop = function (drag, ui) {
		if(_this.dragging === false){ return; }
		var n = calculateSize(drag, ui, this, _this, 'n');
		resizeN(n,_this);
		tile_graph.updateGraphState();
  };

	var drag_metaS = function (drag, ui) {
		if(_this.dragging === false){ return; }
		var n = calculateSize(drag, ui, this, _this, 's');
		resizeS(n, _this);
  };
	var drag_metaSstop = function (drag, ui) {
		if(_this.dragging === false){ return; }
		var n = calculateSize(drag, ui, this, _this, 's');
		resizeS(n, _this);
		tile_graph.updateGraphState();
  };


	var drag_metaE = function (drag, ui) {
		if(_this.dragging === false){ return; }
		var n = calculateSize(drag, ui, this, _this, 'e');
		resizeE(n,_this);
  };
	var drag_metaEstop = function (drag, ui) {
		if(_this.dragging === false){ return; }
		var n = calculateSize(drag, ui, this, _this, 'e');
		resizeE(n,_this);
		tile_graph.updateGraphState();
  };

	var drag_metaW = function (drag, ui) {
		if(_this.dragging === false){ return; }
		var n = calculateSize(drag, ui, this, _this, 'w');
		resizeW(n, _this);
  };
	var drag_metaWstop = function (drag, ui) {
		if(_this.dragging === false){ return; }
		var n = calculateSize(drag, ui, this, _this, 'w');
		resizeW(n, _this);
		tile_graph.updateGraphState();
  };

	var drag_metaNW = function (drag, ui) {
		if(_this.dragging === false){ return; }
		var n = calculateSize(drag, ui, this, _this, 'nw');
		resizeN(n, _this);
		resizeW(n, _this);

  };
	var drag_metaNE = function (drag, ui) {
		if(_this.dragging === false){ return; }
		var n = calculateSize(drag, ui, this, _this, 'ne');
		resizeN(n, _this);
		resizeE(n, _this);
  };
	var drag_metaSW = function (drag, ui) {
		if(_this.dragging === false){ return; }
		var n = calculateSize(drag, ui, this, _this, 'sw');
		resizeS(n, _this);
		resizeW(n, _this);
  };
	var drag_metaSE = function (drag, ui) {
		if(_this.dragging === false){ return; }
		var n = calculateSize(drag, ui, this, _this, 'se');
		resizeS(n, _this);
		resizeE(n, _this);
  };


      $(this.metaN).draggable({
      	drag: drag_metaN,
        stop: drag_metaNstop
      });
      $(this.metaS).draggable({
      	drag: drag_metaS,
        stop: drag_metaSstop
      });
      $(this.metaE).draggable({
      	drag: drag_metaE,
        stop: drag_metaEstop
      });
      $(this.metaW).draggable({
      	drag: drag_metaW,
        stop: drag_metaWstop
      });
      $(this.metaNW).draggable({
      	drag: drag_metaNW,
        stop: drag_metaNW
      });
      $(this.metaNE).draggable({
      	drag: drag_metaNE,
        stop: drag_metaNE
      });
      $(this.metaSW).draggable({
      	drag: drag_metaSW,
        stop: drag_metaSW
      });
      $(this.metaSE).draggable({
      	drag: drag_metaSE,
        stop: drag_metaSE
      });

        /*handleRight.appendChild(new ImageButton(function () {
            _this.openTab();
        }, JSWMImages.add, '+', 'add tab', JSWMImagesHover.add));*/

        if (!this.options.noCollapse) {
            this.slideOptions = {
                afterFinish: function () {
                    _this.redrawTabList(true);
                    _this.redrawShadow();
                },
                afterUpdate: function () {
                    _this.redrawShadow();
                },
                duration: 0.3,
            };
            this.expanded = true;
            this.expandButton = new ExpandButton(function () {
                _this.expand();
            });
            this.expandButton.set(true);
            //handleRight.appendChild(this.expandButton.getButton());
        }

        if (!this.options.noShadow && pngSupport) {
            /*var shadowContainer = this.container.insertBefore(document.createElement('DIV'), this.innerContainer);
            $(shadowContainer).addClass('JSWM_shadow_container');

            this.shadowNE = shadowContainer.appendChild(document.createElement('DIV'));
            $(this.shadowNE).addClass('JSWM_shadowNE');
            this.shadowSW = shadowContainer.appendChild(document.createElement('DIV'));
            $(this.shadowSW).addClass('JSWM_shadowSW');
            this.shadowSE = shadowContainer.appendChild(document.createElement('DIV'));
            $(this.shadowSE).addClass('JSWM_shadowSE');

            this.shadowS = shadowContainer.appendChild(document.createElement('DIV'));
            $(this.shadowS).addClass('JSWM_shadowS');
            this.shadowE = shadowContainer.appendChild(document.createElement('DIV'));
            $(this.shadowE).addClass('JSWM_shadowE');*/
        }

        /*if (!this.options.noClose) {
            var closeButton = handleRight.appendChild(new ImageButton(function () {
                //_this.on_close();
                _this.close();
                //alert(_this);
            }, JSWMImages.closeWindow, 'x', 'close', JSWMImagesHover.closeWindow));
            $(closeButton).addClass('close');
        }*/

    

        $(this.contents).addClass('JSWM_window_contents');
				$(this.contents).click(function(){
					setTimeout(function(){
						_this.move_menu_top_right(_this.w, _this.h);
						var scroll_obj = $(_this.contents).find('.JSWM_window_tab').first();
						var trigger = $(_this.menu).find('.dl-trigger').first();
						var ul_menu = $(_this.menu).find('.menu').first();	
						trigger.css( 'top',  scroll_obj.scrollTop() + 5 );
						ul_menu.css( 'top',  scroll_obj.scrollTop() + 50  );
						trigger.css( 'left',  scroll_obj.scrollLeft() );
						ul_menu.css( 'left',  scroll_obj.scrollLeft()  );	
					}, 200);
					return true;
				});

        this.titleLabel = this.handle.appendChild(document.createElement('DIV'));
        $(this.titleLabel).addClass('JSWM_window_title');
        if (!this.options.title)
            this.options.title = '';
        this.setTitle(this.options.title, this.options.icon);
				var handler = $([this.metaC, this.handle]);
        if (!this.options.noDrag) {
            $(this.container).draggable({
                handle: handler,
                start: function () {
                    _this.startPos = $(this).offset();
										_this.setActive();
										if(_this.mode === 't'){
											metadrag_switch(_this, 'start');
										}
                },
                drag: function (drag, ui) {
                    ui.position.top = Math.max(0 + _this.manager.margins[0], ui.position.top);
										$(_this.menu).find('ul').first().data("dragged", 1);
										preventScrolling(ui, _this);
										if(_this.mode === 't'){
											metadrag_switch(_this, 'drag');
										}
                },
                stop: function () {
                    _this.ondrop();
                    _this.setActive();
										$(_this.menu).find('ul').first().data("dragged", 1);
										//console.log('start');
										if(_this.mode === 't'){
											metadrag_switch(_this, 'stop');
										}
										setTimeout(	function(){menu_fix(_this);}, 300);
                }
            });
						$( this.handle ).disableSelection(); 
            $(this.innerContainer).mousedown(function () {
								if(_this.manager.isMeta === false){
                	_this.setActive();
									//console.log('active is ' + _this.manager.curr_active_window.title);
								}
            });
            $(this.handle).mousedown(function () {
                _this.setActive();
								//console.log('active is ' + _this.manager.curr_active_window.title);
            });
        }
        switch (String(l).toLowerCase()) {
        case 'left':
            l = 0;
            break;
        case 'center':
        case 'middle':
            l = (this.manager.getWindowSize().width - w) / 2;
            break;
        case 'right':
            l = this.manager.getWindowSize().width - w - 10;
            break;
        case 'random':
            l = Math.floor( (Math.random()*300) );//edit
						var max_ = this.manager.getWindowSize().width - w - 10;
						if (l > max_){ l = max_; }
            break; 
        }

        switch (String(t).toLowerCase()) {
        case 'top':
            t = 0;
            break;
        case 'center':
        case 'middle':
            t = (this.manager.getWindowSize().height - h) / 2;
            break;
        case 'bottom':
            t = this.manager.getWindowSize().height - h - 10;
            break;
        case 'random':
            t = Math.floor((Math.random()*200)+100) //edit
						var max_ = this.manager.getWindowSize().height - h - 10;
						if(t > max_){ t = max_; }
            break; 
        }
        t = Math.max(t, 0);
        this.setPosition(l, t);
        this.setSize(w, h, 0);

				this.move_menu_top_right(w,h);

				$(this.metaC).empty();
				$(this.metaC).append(this.title + "<br>");
				this.upFloatImg();

				//resize metaC before diplaying.
				var metaCsizeRef;
				var fw = $(this.metaC).width();
				var fh = $(this.metaC).height();
				if(fw > fh){ metaCsizeRef = fh;}else{ metaCsizeRef = fw;}
				$(this.metaC).css('font-size', (metaCsizeRef/4) + 'px');
				$(this.meta_img).css('width', (metaCsizeRef/4) + 'px');
				$(this.meta_img).css('height', (metaCsizeRef/4) + 'px');

				//display meta layers if meta mode is activated when window is opened
				if(this.manager.isMeta){
					displayMetaResize(this,true);
					$(this.meta_container).show();
					$(this.metaC).show();
				}
        return this;
    };

	//if mouse is not over menu after dragging, velocity menu out
	function menu_fix(_this){
		if( !($(_this.menu).is(":hover")) ){
			$(_this.menu).find('ul').first().data("dragged", 0);
			$(_this.menu).velocity({opacity:0},100);
		}
	}

		function preventScrolling(ui, _this){
			var max_height = $(window).height() - _this.getSize().height - 5;
			if(ui.position.top > max_height){
				ui.position.top = max_height;
			}

			var max_right = $(window).width() - _this.getSize().width - 5;
			if(ui.position.left > max_right){
				ui.position.left = max_right;
			}

			var max_left = $(window).width();
			if(ui.position.left < 0){
				ui.position.left = 0;
			}

		};

		//Swiches windows when tiled window is dragged
		function	metadrag_switch(_this, state){
			if(state === 'start'){ //saves old position and activates meta mode
				var pos = _this.getPosition();
				$(_this).data('pre_drag_pos',pos);
				if(!_this.manager.isMeta){
					wm.meta();
					$(_this).data('wasMeta',false);
				}else{
					$(_this).data('wasMeta',true);
				}
			}
			if(state === 'drag'){ //highlights window that your about to switch with.
				var over = tile_graph.detect_windows_below(_this);
				if(over != null){
					$(_this).data('hero',over);
					var border = $(over.meta_container);
						border.css('background-color','#76CDE3');
				}
			}
			if(state === 'stop'){ //sets everything back to normal and then switches
				var pos = $(_this).data('pre_drag_pos');
				var hero = $(_this).data('hero');
				var border = $(hero.meta_container);
				if($(_this).data('wasMeta')){
					border.css('background-color','black');
				}else{
					wm.unmeta();
				}
				_this.setPosition(pos.left, pos.top);
				tile_graph.update_position(_this, pos.left, pos.top)
				tile_graph.switch_win(_this,hero);
			}

		}

    /**
     * Changes mode of window to float and updates icons
     * @method
     */
		JSWindow.prototype.float = function () {
			this.mode = 'f';
			$(this.container).css({zIndex: 100});
				$(this.metaC).empty();
				$(this.metaC).append(this.title + "<br>");
				//$(this.metaC).append(this.mode	+ "<br>");
				this.upFloatImg();
		};


    /**
     * Changes mode of window to tile and updates icons
     * @method
     */
		JSWindow.prototype.tile = function () {
			this.mode = 't';
			$(this.container).css({zIndex: 0});
			$(this.metaC).empty();
			$(this.metaC).append(this.title + "<br>");
			this.upFloatImg();
			//$(this.metaC).append(tile_graph.find(this).mode	+ "<br>");
		};


		//returns copy of whatever is inside the window.
		JSWindow.prototype.return_appDiv = function () {
				var g = $(this.contents).find('.JSWM_window_handle').parent()[0];	//get appDiv
				g.parentNode.removeChild(g);	//remove menu
				return	g; //Note: remeber to close window after calling  this function
		};

		JSWindow.prototype.upFloatImg = function () {
			var img = document.createElement("img");
			img.setAttribute('class', 'float_img');
			if(this.mode === 'f'){
				img.setAttribute('src', 'libs/jswm_jquery/images/meta_f.png');
			}else{
				var node = tile_graph.find(this);
				if(node.mode === 'h'){
					img.setAttribute('src', 'libs/jswm_jquery/images/meta_h.png');
				}else{
					img.setAttribute('src', 'libs/jswm_jquery/images/meta_v.png');
				}
			}
			this.meta_img = img;
			$(this.metaC).append(img);
			var metaCsizeRef;
			var fw = $(this.metaC).width();
			var fh = $(this.metaC).height();
			if(fw > fh){ metaCsizeRef = fh;}else{ metaCsizeRef = fw;}
			$(this.meta_img).css('width', (metaCsizeRef/4) + 'px');
			$(this.meta_img).css('height', (metaCsizeRef/4) + 'px');

		};

    /**
     * Open a new tab in a window
     * @method
     * @param {Element} contents  Contents to place in tab
     * @param {boolean} force  Add even if contents are already wrapped
     */
    /*JSWindow.prototype.close_hotkey = function (jsWindow){
        _this = this;
        this.manager.windows = $(this.manager.windows).map(function () {
            if (this != _this)
                return this;
        });
        this.container.parentNode.removeChild(this.container);
    }*/

    JSWindow.prototype.openTab = function (contents, force) {
        var _this = this;
        contents = $(contents).get(0) || $('#' + contents).get(0);
        if (!force && contents && this.manager.isWrapped(contents))
            return false;
        var tabContents = document.createElement('DIV');
        if (contents)
            tabContents.appendChild(contents);
        var jsTab = new JSTab(this, tabContents, 'tab ' + this.tabs.length, 'images/tab.png');
        this.addTab(jsTab)
    };

    /**
     * Add a tab to the tab manager
     * @method
     * @param {JSTab} jsTab  Tab to add
     */
    JSWindow.prototype.addTab = function (jsTab) {
        jsTab.i = this.tabs.length;
        this.tabs.push(jsTab);
        this.tabList.appendChild(jsTab.getButton());
        this.redrawTabList();
        jsTab.setActive();
        this.contents.appendChild(jsTab.contents);
    };

    /**
     * Sets a tab as active
     * @method
     * @param {Element} jsTab  Tab to make active
     */
    JSWindow.prototype.setActiveTab = function (jsTab) {
        var redraw = false;
        if (this.fadeTabs)
            var scope = "tab" + Math.random();

        if (this.lastActiveTab && this.lastActiveTab != jsTab) {
            if (this.fadeTabs) {
                $(this.lastActiveTab.contents).velocity({display: 'block'}, {duration: 200});
            } else {
                $(this.lastActiveTab.contents).css({display: 'none'});
            }
            $(this.lastActiveTab.tabButton).removeClass('JSWM_tabButton_active');
            redraw = true;
        }

        if (this.fadeTabs && this.lastActiveTab != jsTab) {
            $(jsTab.contents).velocity({display: 'none'}, {duration: 200});
        } else {
            $(jsTab.contents).css({
                display: 'block'
            });
        }

        $(jsTab.tabButton).addClass('JSWM_tabButton_active');
        this.lastActiveTab = jsTab;
        if (redraw)
            this.setSize(0, 0, 0, true);
    };

    /**
     * Redraw the tab list
     * @method
     * @param {boolean} force  Recalculate tab name truncation even if width hasn't changed (for post collapse event) 
     */
    JSWindow.prototype.redrawTabList = function (force) {
        if (this.tabs.length <= 1) {
            $(this.tabList).css({display: 'none'});
        } else {
            $(this.tabList).css({display: 'block'});
            var w = this.getSize().width - 20;
            var tabWidth = Math.floor(w / this.tabs.length);
            tabWidth = Math.min(tabWidth, this.maxTabButtonWidth);
            tabWidth = Math.max(tabWidth, this.minTabButtonWidth);
            tabWidth -= JSWMTabMargins;
            tabsRemoved = 0;
            while (tabWidth * (this.tabs.length - tabsRemoved) > w)
            tabsRemoved++;

            var i = 0;
            // remove tabs before active one
            while (this.tabs[i] != this.lastActiveTab && i < this.tabs.length && i < tabsRemoved) {
                $(this.tabs[i].tabButton).css({
                    display: 'none'
                });
                i++;
            }
            // draw as many tabs as can fit
            var drawTo = this.tabs.length - (tabsRemoved - i);
            while (i < drawTo) {
                $(this.tabs[i].tabButton).css({
                    display: 'block'
                });
                var curWidth = parseInt($(this.tabs[i].tabButton).width());
                if (curWidth != tabWidth || force) {
                    $(this.tabs[i].tabButton).css({
                        width: tabWidth + 'px'
                    });
                    this.tabs[i].setTitle(this.tabs[i].title, this.tabs[i].icon);
                }
                i++;
            }
            // remove remaining tabs
            while (i < this.tabs.length) {
                $(this.tabs[i].tabButton).css({
                    display: 'none'
                });
                i++;
            }
        }
    };

    /**
     * Expand/collapse a collapsible window
     * @method
     * @param {boolean} expand  Mode to expand to, null to toggle
     */
    JSWindow.prototype.expand = function (expand) {
        if (expand == null || expand != this.expanded) {
            if (expand == null)
                this.expanded = !this.expanded;
            else
                this.expanded = expand
            $(this.slide).velocity({
                height: 'toggle'
            }, {
                duration: this.slideOptions.duration * 1000,
                step: this.slideOptions.afterUpdate,
                complete: this.slideOptions.afterFinish
            });
            this.expandButton.set(this.expanded);
        }
    };

    /**
     * Maximise / restore window
     * @method
     */
    JSWindow.prototype.maximise = function () {
        // change to: if ($(this.container).hasClass('JSWM_window_maximised'))
        if (this.maximised) {
            this.maximised = false;
            $(this.container).removeClass('JSWM_window_maximised');
            this.setPosition(this.restorePosition.left, this.restorePosition.top);
            this.setSize(this.restoreSize.width, this.restoreSize.height, 0);
        } else {
            $(this.container).addClass('JSWM_window_maximised');
            this.restoreSize = this.getSize();
            this.restorePosition = this.getPosition();
            this.setPosition(0, 0);
            //var windowSize = this.manager.getWindowSize();
						this.setSize( $(window).width() - 2, $(window).height() - 2);
            this.maximised = true;
        }
    };


    /**
     * Update maximise size if window is resized
     * @method
     */
    JSWindow.prototype.updateMaximise = function () {
        if (this.maximised) {
            //var windowSize = this.manager.getWindowSize();
            //this.maximised = false;
            //this.setSize(windowSize.width - 2, windowSize.height - 4 - 20, 0);
						this.setSize( $(window).width() - 2, $(window).height() - 2);
            this.maximised = true;
        }
    };

    /**
     * Get the current size
     * @method
     * @return {object}  Object containing .width and .height
     */
    JSWindow.prototype.getSize = function () {
        return {
            width: parseInt($(this.slide).width()),
            height: parseInt($(this.slide).height())
        };
    };

    /**
     * Get the current position
     * @method
     * @return {object}  Object containing .left and .top
     */
    JSWindow.prototype.getPosition = function () {
        // can i use $.offset().left ?
        return {
            left: parseInt($(this.container).css('left')) - this.manager.margins[3],
            top: parseInt($(this.container).css('top')) - this.manager.margins[0]
        };
    };

    /**
     * Set window as active, shortcut to JSWM.setActiveWindow()
     * @method
     */
    JSWindow.prototype.setActive = function () {
        this.manager.setActiveWindow(this);
    };

    /*JSWindow.prototype.killactive = function (){
        this.manager.killActiveWindow(this);
    };*/

    /**
     * Resize a window
     * @method
     * @param {int} w  New width, null indicates no change
     * @param {int} h  New height, null indicates no change
     * @param {int} fixedCorner  The corner to fix while resizing 0 = NW, 1 = NE, 2 = SW, 3 = SE
     * @param {boolean} relative  Indicates that the supplied size is relative to the current size
     */
    JSWindow.prototype.setSize = function (w, h, fixedCorner, relative) {
        var size = this.getSize();
		var pos = this.getPosition();
		var tw = w;
		var th = h;
		var max_w = $(window).width() - 2;
		var max_h = $(window).height() - 2;

        if (relative) {
            w += size.width;
            h += size.height;
        }
        if (this.maximised) {
            w = size.width;
            h = size.height;
        }
        if (w == null)
            w = size.width;
        if (h == null || !this.expanded)
            h = size.height;


		if(fixedCorner === 10){ //fixed metaN and metaS
			if(!this.maximised){
				w = size.width + 2;
			}else{
				w = size.width;
				h = size.height - 2;
				this.maximised = false;
				$(this.container).removeClass('JSWM_window_maximised');
			}
		}
		if(fixedCorner === 11){ //fixed metaE and metaW
			if(!this.maximised){
				h = Math.min(size.height + 2 , max_h);
			}else{
				h = size.height + 1;
				this.maximised = false;
				$(this.container).removeClass('JSWM_window_maximised');
			}
		}

		if(fixedCorner === 12){ //fixed simultaneous dragging East and west
			if(!this.maximised){
				h = Math.min(size.height + 2 , max_h);
				//w = size.width + 0;
			}else{
				h = size.height + 1;
				w = size.width - 4;
				this.maximised = false;
				$(this.container).removeClass('JSWM_window_maximised');
			}
		}
		
		if(fixedCorner === 13){ //fixed simultaneous dragging North and South
				w = size.width + 2;
		}

		w = Math.max(w, this.minWidth);
		h = Math.max(h, this.minHeight);

		this.w = w;
		this.h = h;
		tile_graph.update_size(this, w, h);

        $(this.handle).css({
            width: w + 'px'
        });
       	$(this.slide).css({
          	width: w + 'px',
        	  height: h + 'px'
        });
        $(this.contents).css({
            width: w + 'px'
        });
		var fontSize;
		var x = this.getSize();
		if(w > h){
			fontSize = h/10;
		}else{
			fontSize = w/10;
		}
		$(this.meta_container).css({
            width: (w-2) + 'px',
			height: (h-2) + 'px'
        });
		$(this.meta_container).css('font-size', fontSize + 'px');
        $(this.innerContainer).css({
            width: (w + 2) + 'px'
        });
        $(this.lastActiveTab.contents).css({
            width: w + 'px'
        });
        $(this.lastActiveTab.contents).css({
            height: (h - (this.tabs.length > 1 ? $(this.tabList).height() : 0)) + 'px'
        });

        w += 2; //total horizontal border width
        h += 4; //total vertical border height
        h += 20; //title bar
        $(this.resizeNW).css({
            left: 0,
            top: 0
        });
        $(this.resizeNE).css({
            left: (w - 10) + 'px',
            top: '0'
        });
        $(this.resizeSW).css({
            left: '0',
            top: (h - 34) + 'px'
        });
        $(this.resizeSE).css({
            left: (w - 10) + 'px',
            top: (h - 34) + 'px'
        });

		//Meta resize
		var meta_w = w/3;
		var meta_h = h/3;
        $(this.metaNW).css({
            left: 0,
            top: 0,
			width: meta_w,
			height: (meta_h - 10) + 'px'
        });
        $(this.metaNE).css({
            left: (w - meta_w) + 'px',
            top: '0',
			width: meta_w,
			height: (meta_h - 10) + 'px'
        });
        $(this.metaSW).css({
            left: '0',
            top: (h - meta_h - 12) + 'px',
			width: meta_w,
			height: (meta_h	- 10) + 'px'
        });
        $(this.metaSE).css({
            left: (w - meta_w) + 'px',
            top: (h - meta_h - 12) + 'px',
			width: meta_w,
			height: (meta_h - 10) + 'px'
        });

        $(this.metaN).css({
            left: meta_w,
            top: '0',
			width: meta_w,
			height: (meta_h - 10) + 'px'
        });
        $(this.metaS).css({
            left: meta_w + 'px',
            top: (h-meta_h-12),
			width: meta_w,
			height: (meta_h - 10) + 'px'
        });
        $(this.metaE).css({
            left: (w - meta_w) + 'px',
            top: (meta_h - 12) + 'px',
			width: meta_w,
			height: meta_h + 'px'
        });
        $(this.metaW).css({
            left: 0 + 'px',
            top: (meta_h - 12) + 'px',
			width: meta_w,
			height: meta_h + 'px'
        });
        $(this.metaC).css({
            left: meta_w + 'px',
            top: (meta_h - 12) + 'px',
			width: meta_w,
			height: meta_h + 'px'
        });

		var metaCsizeRef;
		var fw = $(this.metaC).width();
		var fh = $(this.metaC).height();
		if(fw > fh){ metaCsizeRef = fh;}else{ metaCsizeRef = fw;}
		//console.log('metaCsizeRef:',metaCsizeRef);
		$(this.metaC).css('font-size', (metaCsizeRef/4) + 'px');
		$(this.meta_img).css('width', (metaCsizeRef/4) + 'px');
		$(this.meta_img).css('height', (metaCsizeRef/4) + 'px');

        this.redrawShadow();
        this.redrawTabList();
        this.setTitle(this.title, this.icon);

		this.move_menu_top_right(w,h);

		var event = new Event('on_resize');
		this.container.dispatchEvent(event);
    };

		JSWindow.prototype.move_menu_top_right = function (w,h) {	
				//Puts menu on top right corner
				var scroll_obj = $(this.contents).find('.JSWM_window_tab').first();
				var scroll_visable = scroll_obj[0].scrollHeight > scroll_obj[0].clientHeight;
				var trigger = $(this.menu).find('.dl-trigger').first();
				var ul_menu = $(this.menu).find('.menu').first();	
				if(scroll_visable){	//moves menu to the side when scrollbar appers
					trigger.css( 'margin-right', -(w - 25) - this.adj_menu_pos_l);
					ul_menu.css( 'margin-left', w - 225 + this.adj_menu_pos_l );
				}else{
					trigger.css( 'margin-right', -(w - 10) - this.adj_menu_pos_l);
					ul_menu.css( 'margin-left', w - 210 + this.adj_menu_pos_l );
				}
				trigger.css( 'top',   5 + this.adj_menu_pos_t);
				ul_menu.css( 'top',   50 + this.adj_menu_pos_t);

				scroll_obj.scroll( function(){ 
    			//console.log("this.scrollTop: " + this.scrollTop );
					trigger.css( 'top',  this.scrollTop + 5 );
					ul_menu.css( 'top',  this.scrollTop + 50  );
					trigger.css( 'left',  this.scrollLeft );
					ul_menu.css( 'left',  this.scrollLeft  );					
				});
		};

   /**
     * Method is called if user wants to adjust the position of the menu
     * @method
     */
		JSWindow.prototype.adjust_menu_position = function (left, top) {		
			this.adj_menu_pos_l = left;
			this.adj_menu_pos_t = top;
			this.setSize(0, 0, null, true);
		};

    /**
     * Position the window aboslutely or relatively
     * @method
     * @param {int} l  Distance from the left of the viewport
     * @param {int} t  Distance from the top of the viewport
     * @param {boolean} relative  Indicates that the supplied coordinates a relative to the current position
     */
    JSWindow.prototype.setPosition = function (l, t, relative) {
        if (relative) {
            var position = this.getPosition();
            if (l != null)
                l += position.left;
            if (t != null)
                t += position.top;
        }
        if (l != null) {
            l += this.manager.margins[3];
            $(this.container).css({left: l + 'px'});
        }
        if (t != null) {
            t += this.manager.margins[0]
            $(this.container).css({top: t + 'px'});
        }

    };

    /**
     * Set the window title
     * @method
     * @param {string} title  The new title
     * @param {string} icon  Window icon uri
     */
    JSWindow.prototype.setTitle = function (title, icon) {
        this.title = title;
				//console.log('My title is: ' + this.title);
        $(this.titlelabel).html('<span>' + title + '</span');
        $(this.titleLabel).empty();
        var span = this.titleLabel.appendChild(document.createElement('SPAN'));
        span.appendChild(document.createTextNode(this.title));
        var titleSpace = $(this.titleLabel).width() - 20;
        JSWMtruncate(title, span, this.handle, titleSpace, 25);
        this.titleLabel.title = title;

        this.icon = icon;
        $(this.titleLabel).css({
            backgroundImage: 'url("' + this.icon + '")'
        });
    };

		JSWindow.prototype.setDF = function (focusable_element) {
			this.default_focus = focusable_element;
		};

    /**
     * Fires when component is moved (if set to draggable)
     * @method
     */
    JSWindow.prototype.onmove = function (drag) {};

    /**
     * Fires when component is dropped (if set to draggable)
     * @method
     */
    JSWindow.prototype.ondrop = function (drag) {};

    /**
     * Redraws the drop shadow
     * @method
     */
    JSWindow.prototype.redrawShadow = function () {
       /*if (!this.options.noShadow && pngSupport) {
            var w = $(this.innerContainer).width();
            var h = $(this.innerContainer).height();
            /*
            if(this.expanded)
                h += 2; // combined border width of top and bottom
            */
            /*$(this.shadowNE).css({left: w + 'px'});
            $(this.shadowSE).css({left: w + 'px'});
            $(this.shadowE).css({left: w + 'px'});
            $(this.shadowSW).css({top: h + 'px'});
            $(this.shadowSE).css({top: h + 'px'});
            $(this.shadowS).css({top: h + 'px'});
            if (w > 6)
                $(this.shadowS).css({width: (w - 6) + 'px'});
            if (h > 6)
                $(this.shadowE).css({height: (h - 6) + 'px'});
        }*/
    };

    /**
     * Start of tab dragging, calculate inital positions
     * @method
     * @param {Element} item  Tab being dragged
     */
    JSWindow.prototype.dragTabStart = function (item) {
        this.tabPositions = new Array();
        for (var i = 0; i < this.tabs.length; i++) {
            offset = $(this.tabs[i].tabButton).position();
            this.tabPositions[i] = [offset.left, offset.top]; //Position.positionedOffset(this.tabs[i].tabButton);
        }
        offset = $(item).position();
        this.start = [offset.left, offset.top]; //Position.positionedOffset(item);
    };

    /**
     * Read serialised object state data into the window
     * @method
     * @param {String} serialData  Object serialisation data
     */
    JSWindow.prototype.readObject = function (serialData) {
    	console.log("____Used readObject ____");
        this.setSize(serialData.size.width, serialData.size.height);
        this.setPosition(serialData.position.left, serialData.position.top);
        this.options = serialData.options;

        this.expand(serialData.expanded);
        if (serialData.maximised) {
            this.maximise();
            this.restoreSize = serialData.restoreSize;
            this.restorePosition = serialData.restorePosition;
        }
        $(this.contents).css({zIndex: serialData.zIndex});
        this.tabs[0].close();
        for (var i = 0; i < serialData.tabs.length; i++) {
            var t = serialData.tabs[i];
            var jsTab = new JSTab(this, document.createElement('DIV'), t.title, t.icon);
            this.addTab(jsTab);
            jsTab.readObject(t);
            if (serialData.lastActiveWindow == i)
                jsWindow.setActive();
        }
    };

    /**
     * Write object state data for serialisation
     * @method
     * @returns {Object} serialData  Object serialisation data
     */
    JSWindow.prototype.writeObject = function () {
        var serialData = new Object();
        serialData.size = this.getSize();
        serialData.position = this.getPosition();
        serialData.options = this.options;
        serialData.options.title = this.title;
        serialData.options.icon = this.icon;
        if (this.maximised) {
            serialData.maximised = this.maximised;
            serialData.restoreSize = this.restoreSize;
            serialData.restorePosition = this.restorePosition;
        }

        serialData.expanded = this.expanded;
        serialData.zIndex = $(this.container).css('zIndex');
        serialData.tabs = new Array();
        for (var i = 0; i < this.tabs.length; i++) {
            serialData.tabs[i] = this.tabs[i].writeObject();
            if (this.tabs[i] == this.lastActiveTab)
                serialData.lastActiveTab = i;
        }
        return serialData;
    };

    /**
     * Close window
     * @method
     */
    JSWindow.prototype.close = function () {
    	this.on_close();//have to call this here to fire the callback of each window f'n on_close.
      this.container.parentNode.removeChild(this.container);
			var highestZ = 0;
      var tmp = null;
			var kill;
			for(var i = 0; i < this.manager.windows.length; i++){
				if(this.manager.windows[i] === this){
          //this.manager.windows.splice(i,1);
					//continue;
					kill = i;
				}else{
        	if(highestZ < $(this.manager.windows[i].container).css("z-index")){
						tmp = this.manager.windows[i];
        	}
        }
			}
			this.manager.windows.splice(kill,1);
			if(this.mode === 't'){tile_graph.remove(this);}
			//tmp.setActive();
			setTimeout( function() { 
        if(tmp)
          tmp.setActive();
      }, 100 );
    };


	/**
   * Selects "this" window(White border);
   * @method
   */
	JSWindow.prototype.make_selected = function () {
		this.manager.select(this);
	};

	/**
   * Docks window to the left
   * @method
   */
	JSWindow.prototype.dock_left = function () {
		console.log("docking left");
	};
	
	/**
   *  Docks window to the right
   * @method
   */
	JSWindow.prototype.dock_right = function () {
		console.log("docking right");
	};
	
	/**
   * Returns default window menu 
   * @method
   */
	JSWindow.prototype.default_menu = function (){
        var parent = this;
		var img_close = document.createElement("img");
		img_close.setAttribute('src', 'libs/jswm_jquery/images/close.png');
		img_close.setAttribute('height', '15px');
		img_close.setAttribute('width', '15px');
		img_close.setAttribute('class', 'menu_img');
		//img_close.onclick = function(){ parent.close();};

		var div1 = document.createElement("div");
		div1.setAttribute('height', '15px');
		div1.setAttribute('width', '15px');
		div1.setAttribute('class', 'div_hover');
		div1.onclick = function(){ parent.close();};
		div1.appendChild(img_close);


		var img_minmax = document.createElement("img");
		img_minmax.setAttribute('src', 'libs/jswm_jquery/images/maximize_window.png');
		img_minmax.setAttribute('height', '15px');
		img_minmax.setAttribute('width', '15px');
		img_minmax.setAttribute('class', 'menu_img');
		//img_minmax.onclick = function(){ parent.maximise();};

		var div2 = document.createElement("div");
		div2.setAttribute('height', '15px');
		div2.setAttribute('width', '15px');
		div2.setAttribute('class', 'div_hover');
		div2.onclick = function(){ parent.maximise();};
		div2.appendChild(img_minmax);
	
		var img_ldock = document.createElement("img");
		img_ldock.setAttribute('src', 'libs/jswm_jquery/images/dock_left.png');
		img_ldock.setAttribute('height', '15px');
		img_ldock.setAttribute('width', '15px');
		img_ldock.setAttribute('class', 'menu_img');
		//img_ldock.onclick = function(){ parent.dock_left(); };

		var div3 = document.createElement("div");
		div3.setAttribute('height', '15px');
		div3.setAttribute('width', '15px');
		div3.setAttribute('class', 'div_hover');
		div3.onclick = function(){ parent.dock_left(); };
		div3.appendChild(img_ldock);
	
		var img_rdock = document.createElement("img");
		img_rdock.setAttribute('src', 'libs/jswm_jquery/images/dock_right.png');
		img_rdock.setAttribute('height', '15px');
		img_rdock.setAttribute('width', '15px');
		img_rdock.setAttribute('class', 'menu_img');
		//img_rdock.onclick = function(){ parent.dock_right(); };

		var div4 = document.createElement("div");
		div4.setAttribute('height', '15px');
		div4.setAttribute('width', '15px');
		div4.setAttribute('class', 'div_hover');
		div4.onclick = function(){ parent.dock_right(); };
		div4.appendChild(img_rdock);

		var a = document.createElement("a");
		a.setAttribute('href','#');
		a.appendChild(div1);
		a.appendChild(div2);
		a.appendChild(div3);
		a.appendChild(div4);
	
		var li = document.createElement("li");
		li.appendChild(a);
	
		var ul = document.createElement("ul");
		ul.setAttribute('class', 'menu');
		ul.setAttribute('id', 'ul-menu');
		ul.appendChild(li);
	
		var img_menu = document.createElement("img");
		img_menu.setAttribute('src', 'libs/jswm_jquery/images/menubtn.png');
		img_menu.setAttribute('height', '40px');
		img_menu.setAttribute('width', '40px');
		//img_menu.setAttribute('onclick', '');
		img_menu.setAttribute('class', 'img-button');
	
		var button = document.createElement("div");
		button.setAttribute('class', 'dl-trigger');
		button.appendChild(img_menu);
	
		var wrapper = document.createElement("Div");
		wrapper.setAttribute('class', 'JSWM_window_handle');
		wrapper.appendChild(button);
		wrapper.appendChild(ul);
		$(wrapper).data('has_sub_menu',1); 
		return wrapper;
	}

	    /**
     * Adds item to local menu 
     * @method
     * @param {title} The text inside item
     * @param {icon_url} Url of icon you want to appear
     * @param {mode} 'icon' 'icon_title' 'title' are your choices of what to display
     * @param {parent} Pass parent li element or mywindow.menu 
		 * @param {onclickFunc} Pass function you want to run when your item is clicked 
	 	 * @return {Object}  object.li is the li item that was added to the menu 
		 * object.title.nodeValue can be used to change title of li element 
     */	
	JSWindow.prototype.add_menu_item = function (title, icon_url, mode, parent, onclickFunc) {
		var li = document.createElement("li");
		$(li).data('has_sub_menu',0); 
		var a = document.createElement("a");
		a.setAttribute('href','#');
			
		if(mode === 'icon'){
			var img = document.createElement("img");
			img.setAttribute('src', icon_url);
			img.setAttribute('height', '15px');
			img.setAttribute('width', '15px');
			img.setAttribute('class', 'menu_img');
			img.onclick = onclickFunc; 

			var div = document.createElement("div");
			div.setAttribute('height', '15px');
			div.setAttribute('width', '15px');
			div.setAttribute('class', 'div_hover');
			div.onclick = onclickFunc;
			div.appendChild(img);


			if(this.menu.icon_count === null){
				a.appendChild(div);
				li.appendChild(a);
				this.menu.icon_count = 1;
				var pivot = $(parent).find('ul').first();
				pivot.append(li);
				return li;
			}else{
				this.menu.icon_count++;
				var pivot = $(parent).find('ul').find('li').last().find('a');
				pivot.append(div);
				if(this.menu.icon_count >= 4){this.menu.icon_count = null;}
				return $(parent).find('ul').find('li').last();
			}
		}
		
		var text;
		a.onclick = onclickFunc; 
		if(mode === 'title'){
			text = document.createTextNode(title);
			a.appendChild(text);
			li.appendChild(a);
		}
		
		if(mode === 'icon_title'){
			var img = document.createElement("img");
			img.setAttribute('src', icon_url);
			img.setAttribute('height', '15px');
			img.setAttribute('width', '15px');
			img.setAttribute('class', 'icon_title');
			text = document.createTextNode(title);
			a.appendChild(img);
			a.appendChild(text);
			li.appendChild(a);
		}

		//insert item to local menu
		if( $(parent).data('has_sub_menu') === 1){	//if sub-menu already exist
			var pivot = $(parent).find('ul').first();
			//console.log('pivot: ' + pivot);
			pivot.append(li);
		}else{	//creates new sub-menu if it does not exist
			//new sub-menu
			var ul = document.createElement("ul");
			ul.setAttribute('class', 'sub_menu');
			
			//make back button
			var back_li = document.createElement('li');
			var back_a = document.createElement('a');
			back_a.setAttribute('class', 'backbtn');
			back_a.setAttribute('href','#');
			var txt = document.createTextNode("Back");
			back_a.appendChild(txt);
			back_li.appendChild(back_a);
			
			$(ul).append(back_li);
			$(ul).append(li);
			$(parent).append(ul);
			$(parent).data('has_sub_menu',1);	
		}
		var o = new Object();
		o.li = li;
		o.title = text;
		return o;
	}

	//Should be called after all menu items have been added
	JSWindow.prototype.activate_menu = function () {
		//Only activate the menu once
		if( $(this.menu).data('activated_once') != true){
			$(this.menu).windowMenu();
			$(this.menu).data('activated_once', true);
			//console.log('menu activated');
		}else{
			console.log('ERROR: activated menu more than once!');
		}
		//this.setActive();
	}

    /**
     * Window tab
     * @constructor
     * @param {JSWindow} jsWindow  Tab title
     * @param {Element} contents  Element to wrap
     * @param {string} title  Tab title
     * @param {string} icon  Tab icon uri
     */
    JSTab = function (jsWindow, contents, title, icon) {
        var _this = this;
        this.jsWindow = jsWindow;
        this.contents = contents;
        $(this.contents).addClass('JSWM_window_tab');
        this.tabButton = document.createElement('LI');
        $(this.tabButton).css({float: 'left'});
        $(this.tabButton).addClass('JSWM_tabButton');
        this.tabButton.jsTab = this;

        this.tabLabel = this.tabButton.appendChild(document.createElement('DIV'));
        var closeButton = this.tabLabel.appendChild(new ImageButton(function () {
            _this.close();
        }, JSWMImages.closeTab, 'x', 'close', JSWMImagesHover.closeTab));
        $(closeButton).addClass('JSWM_tabClose');

        this.titleLabel = this.tabLabel.appendChild(document.createElement('DIV'));
        this.setTitle(title, icon);
        $(this.tabLabel).addClass('JSWM_tabLabel');
        $(this.tabButton).mousedown(function () {
            _this.setActive();
            _this.jsWindow.setActive();
        });
       return this;
    };

    /**
     * Set the tab title
     * @method
     * @param {string} title  The new title
     * @param {string} icon  Tab icon uri
     */
    JSTab.prototype.setTitle = function (title, icon) {
        this.title = title;
        $(this.titleLabel).empty();
        var span = this.titleLabel.appendChild(document.createElement('SPAN'));
        span.appendChild(document.createTextNode(this.title));
        var titleSpace = $(this.titleLabel).width() - 20;
        JSWMtruncate(title, span, this.tabButton, titleSpace, 25);
        this.titleLabel.title = title;
        this.icon = icon;
        $(this.tabLabel).css({
            backgroundImage: 'url("' + this.icon + '")'
        });
    };

    /**
     * Set tab as active, shortcut to JSWindow.setActiveTab()
     * @method
     */
    JSTab.prototype.setActive = function () {
        this.jsWindow.setActiveTab(this);
    };

    /**
     * Return the tab button HTML object
     * @method
     * @return {Element}  The tab button
     */
    JSTab.prototype.getButton = function () {
        return this.tabButton;
    };

    /**
     * Close the tab
     * @method
     */
    JSTab.prototype.close = function () {
        _this = this;
        this.jsWindow.contents.removeChild(this.contents); // remove contents
        this.tabButton.parentNode.removeChild(this.tabButton); // remove button
        this.jsWindow.tabs = $(this.jsWindow.tabs).map(function () {
            if (this != _this)
                return this;
        });

        if (this.jsWindow.lastActiveTab == this && this.jsWindow.tabs.length)
            this.jsWindow.tabs[0].setActive();
        this.jsWindow.redrawTabList();
    };

    /**
     * Write object state data for serialisation
     * @method
     * @returns {Object} serialData  Object serialisation data
     */
    JSTab.prototype.writeObject = function () {
        var serialData = new Object();
        serialData.title = this.title;
        serialData.icon = this.icon;
        serialData.innerHTML = this.contents.innerHTML;
        return serialData;
    };


    /**
     * Read serialised object state data into the tab
     * @method
     * @param {String} serialData  Object serialisation data
     */
    JSTab.prototype.readObject = function (serialData) {
        this.setTitle(serialData.title, serialData.icon)
        this.contents.innerHTML = serialData.innerHTML;
    };

};

