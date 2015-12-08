

(function ( $ ) {
	//Top level function that makes the list click able
    $.fn.multLvlMenu = function() {
		//Fades in if hovered over
		var wrapper = $(this);
		$(this).hover(function() {
			if(original.data("toggle") === 0){
				$(this).animate({opacity:1},100);
			}
		});
		//fades out when mouse leaves
		$(this).mouseleave(function() {
			if(original.data("toggle") === 0){
				$(this).animate({opacity:0},100);
			}
		});
	
		var original = $(this).find("ul").first();
		$(".dl-menuwrapper li:not(ul)" ).click(function () {
			$.fn.multLvlMenu.close_menu(original, wrapper, false);
		});
		original.data("toggle", 0);	//used to toggle menu off and on
		original.data("curr_ul", null);	//used to get the current sub-menu being displayed
		$.fn.multLvlMenu.click_out($(this), original);
		original.find("ul").each(function() {  //find every sub list and apply properties
				$(this).hide();
				$.fn.multLvlMenu.movefoward( $(this), original ); 
		});
		original.children().hide();
		var menu_button = $(this).find("button").first();
		menu_button.click(function() {
			if(original.data("toggle") === 0){	//if menu is not displaying display menu
				original.data("toggle", 1);
				original.children().show();
				original.show();
				$.fn.multLvlMenu.scroll(original, original);
				original.find("ul").each(function() { 
					$(this).hide();
				});
				$(this).siblings().show();
			}else{	//if menu is displaying hide menu
				$.fn.multLvlMenu.close_menu(original, wrapper, false);
			}	
			return false;
		});
        return this;
    };
	
	//makes the menu move forward and calls function to make menu move back 
	$.fn.multLvlMenu.movefoward = function(ul_curr, orig){
		var a_back = ul_curr.children().first().children().first();
		var a_curr = ul_curr.parent().children().first();
		var parent_ul = ul_curr.parent().parent().parent().find('ul').first();
		//set up back button
		a_back.click(function() {
			$.fn.multLvlMenu.moveBack(ul_curr, orig);
			return false;
		});
		//show next list of items
		a_curr.click(function() {
			orig.data("curr_ul", ul_curr);
			orig.find("ul").each(function() {
				$(this).show();
			});
			ul_curr.parent().siblings().hide();
			a_curr.hide();
			ul_curr.find("ul").each(function() {
				$(this).hide();
			});
			$.fn.multLvlMenu.disable_scroll(parent_ul );
			$.fn.multLvlMenu.scroll( ul_curr, orig ); //make scrollable
			return false;
			
		});
	};
	
	//Makes you move back to previous list menu.
	$.fn.multLvlMenu.moveBack = function(ul_curr, orignal){
		var parent_ul = ul_curr.parent().parent();
		var parent_a = ul_curr.parent().first().children().first();
		parent_ul.children().show(); //show parent list
		parent_a.show();
		ul_curr.hide(); //hide everything else
		parent_ul.find("ul").each(function() {
			$(this).hide();
		});
		$.fn.multLvlMenu.disable_scroll(ul_curr );
		$.fn.multLvlMenu.scroll( parent_ul, orignal );
	};

	//When user clicks menu button again this recursively displays all menus before it
	$.fn.multLvlMenu.recurDisplay = function(ul_curr, orignal){
		var parent_a = ul_curr.parent().first().children().first();
		var parent_ul = ul_curr.parent().parent();
		parent_a.show();
		parent_ul.children().show();
		if(parent_ul.is(orignal) === false){
			$.fn.multLvlMenu.recurDisplay(parent_ul, orignal);
		}
	}
	
	//makes the list scroll when mouse is hovering
	$.fn.multLvlMenu.scroll = function(ul_curr, orig){
		var maxHeight = 400;
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
	
	$.fn.multLvlMenu.disable_scroll = function(ul_curr){
		ul_curr.children().css("top", 0 );
		ul_curr.off( "mousemove");
	}

	//Closes an open menu properly.
	$.fn.multLvlMenu.close_menu = function(original, wrapper, anime){
		original.data("toggle", 0);
		if(anime === true){
			wrapper.animate({opacity:0},100);
		}
		if (original.data("curr_ul") != null){
			var ul_curr = original.data("curr_ul");
			$.fn.multLvlMenu.recurDisplay(ul_curr, original);
		}
		original.children().hide();
		original.find("ul").each(function() {  //find every sub list and apply properties
			$(this).hide();
			$.fn.multLvlMenu.disable_scroll( $(this) );
		});
		original.hide();
		return false;
	};
	
	//close if user clicks outside of menu
	$.fn.multLvlMenu.click_out = function(wrapper,original){
		$('html').click(function () {
			$.fn.multLvlMenu.close_menu(original,wrapper, true);
		});
		wrapper.click(function (e) {
			e.stopPropagation();
		});
	}
	
}( jQuery ));



