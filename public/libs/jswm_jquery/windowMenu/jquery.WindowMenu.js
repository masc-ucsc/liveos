

(function ( $ ) {
	//Top level function that makes the list click able
    $.fn.windowMenu = function() {
		var wrapper = $(this);
		$.fn.windowMenu.activate_hover(); //activates hover function every time a menu is created
		//Fades in if hovered over
		$(this).hover(function() {
			if(original.data("toggle") === 0 && original.data("dragged") === 0){
				$(this).velocity({opacity:1},100);
			}
		});
		//fades out when mouse leaves
		$(this).mouseleave(function() {
			if(original.data("toggle") === 0 && original.data("dragged") === 0){
				$(this).velocity({opacity:0},100);
			}
		});
	
		var original = $(this).find("ul").first();
		//$.fn.windowMenu.scroll(original); 
		$(".JSWM_window_handle li:not(ul)" ).click(function () {
			$.fn.windowMenu.close_menu(original, wrapper, false); 
		});
		
		original.data("toggle", 0);	//used to toggle menu off and on
		original.data("dragged", 0);
		original.data("curr_ul", null);	//used to get the current sub-menu being displayed
		$.fn.windowMenu.click_out($(this), original);
		original.children().hide();
		original.find("ul").each(function() {  //find every sub list and apply properties
				$(this).hide();
				$.fn.windowMenu.movefoward( $(this), original );
		});
		original.hide();
		var menu_button = $(this).find(".dl-trigger").first();
		menu_button.click(function(e) {
			e.preventDefault();	//meant to postpone the click function for 250 milliseconds  
			var menu_btn = this;//in order to not conflict with double click
			setTimeout(function() {
				var double = parseInt(wrapper.data('double'), 10);
				if (double > 0) {
					wrapper.data('double', double-1);
					return false;
				} else {
					//code for click event

					if( !($(wrapper).is(":hover")) ){ //if mouse is not hovering over menu
						setTimeout(function() { //wait a bit and then velocity menu
							if(original.data("toggle") === 1){
								$(wrapper).velocity({opacity:1},100);
							}else{
								$(wrapper).velocity({opacity:0},100);
							}
						},100);
					}
			
					if(original.data("dragged") === 1){	//does not open menu if menu was dragged
						original.data("dragged", 0);
						return false;
					}
					if(original.data("toggle") === 0 ){	//if menu is not displaying display menu
						original.data("toggle", 1);
						original.children().show();
						original.find("ul").each(function() { 
							$(this).hide();
						});
						$(menu_btn).siblings().show();
						$.fn.windowMenu.scroll(original, original);
					}else{	//if menu is displaying hide menu
						$.fn.windowMenu.close_menu(original, wrapper, false);
					}	
					return false;		
				}
			}, 250);
			return this;
		});
    };
	
	//makes the menu move forward and calls function to make menu move back 
	$.fn.windowMenu.movefoward = function(ul_curr, orig){
		var a_back = ul_curr.children().first().children().first();
		var a_curr = ul_curr.parent().children().first();
		var parent_ul = ul_curr.parent().parent().find('ul').first();
		//set up back button
		a_back.click(function() {
			$.fn.windowMenu.moveBack(ul_curr, orig);
			return false;
		});
		//show next list of items
		a_curr.click(function() {
			orig.data("curr_ul", ul_curr);
			//$.fn.windowMenu.scroll( ul_curr ); //make scrollable
			orig.find("ul").each(function() {
				$(this).show();
			});
			ul_curr.parent().siblings().hide();
			a_curr.hide();
			ul_curr.find("ul").each(function() {
				$(this).hide();
			});
			$.fn.windowMenu.disable_scroll(parent_ul );
			$.fn.windowMenu.scroll( ul_curr, orig ); //make scrollable
			return false;
			
		});
	};
	
	//Makes you move back to previous list menu.
	$.fn.windowMenu.moveBack = function(ul_curr, orignal){
		var parent_ul = ul_curr.parent().parent();
		var parent_a = ul_curr.parent().first().children().first();
		parent_ul.children().show(); //show parent list
		parent_a.show();
		ul_curr.hide(); //hide everything else
		parent_ul.find("ul").each(function() {
			$(this).hide();
		});
		$.fn.windowMenu.disable_scroll(ul_curr );
		$.fn.windowMenu.scroll( parent_ul, orignal );
	};

	//When user clicks menu button again this recursively displays all menus before it
	$.fn.windowMenu.recurDisplay = function(ul_curr, orignal){
		var parent_a = ul_curr.parent().first().children().first();
		var parent_ul = ul_curr.parent().parent();
		parent_a.show();
		parent_ul.children().show();
		if(parent_ul.is(orignal) === false){
			$.fn.windowMenu.recurDisplay(parent_ul, orignal);
		}
	}
	
	//makes the list scroll when mouse is hovering
	$.fn.windowMenu.scroll = function(ul_curr, orig){
		var maxHeight = 200;
		var $container = ul_curr;
		var height = $container[0].scrollHeight;
		$container.data("origHeight", $container[0].scrollHeight);
		var multiplier = (height - maxHeight ) / maxHeight;
		//console.log(">>multiplier:",multiplier);
		if (multiplier > 0) {	// don't do any animation if list shorter than max
    	$container.css({
      		height: maxHeight,
          overflow: "hidden"
       }).on('mousemove', function(e){ 
       	var offset = $container.offset();	
				//console.log("multiplier:",multiplier);
				var relativeY = (((e.pageY - offset.top) * multiplier) - $container.data("origHeight"));
				var finalTopValue = -( relativeY  + $container.data("origHeight"));
				$container.children().css("top", finalTopValue );	//moves list
			});
		}
	};
	
	$.fn.windowMenu.disable_scroll = function(ul_curr){
		ul_curr.children().css("top", 0 );
		ul_curr.off( "mousemove");
	}
	
	$.fn.windowMenu.close_menu = function(original, wrapper, anime){
		original.data("toggle", 0);
		if(anime === true){	//velocity out menu button 
			wrapper.velocity({opacity:0},100);
		}
		if (original.data("curr_ul") != null){
			var ul_curr = original.data("curr_ul");
				$.fn.windowMenu.recurDisplay(ul_curr, original);
			}
			original.children().hide();
			original.find("ul").each(function() {  //find every sub list and apply properties
				$(this).hide();
				$.fn.windowMenu.disable_scroll( $(this) );
			});
			original.hide(); 
		return false;
	};
	
	//Makes menu disappear if user clicks outside of div
	$.fn.windowMenu.click_out = function(wrapper,original){
		$('html').click(function () {
			$.fn.windowMenu.close_menu(original,wrapper, true);
		});
		wrapper.click(function (e) {
			e.stopPropagation();
		});
	}
	
	//responsible for the hover images NOTE: all hover images must be "_hover.png" added to the end to work 
	$.fn.windowMenu.activate_hover = function(){
		$('.div_hover').data('hoverOnce', false);
		$('.div_hover').hover(function(){
			if($(this).data('hoverOnce') === false){
				$('.div_hover').data('hoverOnce', true);
				var tmp = $(this).find('.menu_img').first().attr('src');
				tmp = tmp.substring(0, tmp.length-4);
				var hover = tmp + '_hover.png';
				$(this).find('.menu_img').first().attr('src', hover);
			}
		});
		$('.div_hover').mouseleave(function(){
			if($(this).data('hoverOnce') === true){
				$('.div_hover').data('hoverOnce', false);
				var tmp = $(this).find('.menu_img').first().attr('src');
				tmp = tmp.substring(0, tmp.length-10);
				var hover = tmp + '.png';
				$(this).find('.menu_img').first().attr('src', hover);
			}
		});
	}
	
}( jQuery ));



