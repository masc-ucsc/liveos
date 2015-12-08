

(function ( $ ) {
	//Top level function that makes the list click able
    $.fn.multLvlMenu = function() {
		var original = $(this);
		var a_menu = original.children().first();
		original.children().hide();
		a_menu.show();
		a_menu.click(function() {
			original.children().show();
			original.find("ul").each(function() {  //find every sub list and apply properties
				$(this).hide();
				$.fn.multLvlMenu.movefoward( $(this), original );
			});
			a_menu.hide();
			return false;
		});
        return this;
    };
	
	//makes the menu move forward and calls function to make menu move back 
	$.fn.multLvlMenu.movefoward = function(ul_curr, orig){
		var a_back = ul_curr.children().first().children().first();
		var a_curr = ul_curr.parent().children().first();
		var parent_ul = ul_curr.parent().parent();
		//setup back button
		a_back.click(function() {
			$.fn.multLvlMenu.moveBack(ul_curr, orig);
			return false;
		});
		//show next list of items
		a_curr.click(function() {
			$.fn.multLvlMenu.scroll( ul_curr ); //make scrollable
			orig.find("ul").each(function() {
				$(this).show();
			});
			ul_curr.parent().siblings().hide();
			a_curr.hide();
			ul_curr.find("ul").each(function() {
				$(this).hide();
			});
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
		orignal.children().first().hide();
	};

	//makes the list scroll when mouse is hovering
	$.fn.multLvlMenu.scroll = function(ul_curr){
		console.log("Entered scroll!");
		var maxHeight = 400;
		var $container = ul_curr,
		$list = $container,
        $anchor = $container.find("a"),
        height = $list.height() * 1.1,       // make sure there is enough room at the bottom
        multiplier = height / maxHeight;
		$container.data("origHeight", $container.height());
		// don't do any animation if list shorter than max
		if (multiplier > 1) {
			//console.log("in if stament!");
            $container.css({
                height: maxHeight,
                overflow: "hidden"
            })
			.mousemove(function(e) {
				//console.log("moving!" + -e.pageY);
                var offset = $container.offset();
                var relativeY = ((e.pageY - offset.top) * multiplier) - ($container.data("origHeight") * multiplier);
				var myWay = -( relativeY  + $container.data("origHeight") ) 
                if (relativeY > $container.data("origHeight")) {
                    $list.children().css("top", -e.pageY);
                };
				$list.children().css("top", myWay );	//moves list
            });
		}
	};
	
}( jQuery ));



$( document ).ready(function() {
   $( "#ul-menu" ).multLvlMenu(); 
   $( "#ul-menu2" ).multLvlMenu();
   
});


////////////Inspiration code from another plug-in/////////
var maxHeight = 400;
$(function(){

    $(".dropdown > li").hover(function() {
    
         var $container = $(this),
             $list = $container.find("ul"),
             $anchor = $container.find("a"),
             height = $list.height() * 1.1,       // make sure there is enough room at the bottom
             multiplier = height / maxHeight;     // needs to move faster if list is taller
        
        // need to save height here so it can revert on mouseout            
        //$container.data("origHeight", $container.height());
        
        // so it can retain it's rollover color all the while the dropdown is open
        //$anchor.addClass("hover");
        
        // make sure dropdown appears directly below parent list item    
        /*$list
            .show()
            .css({
                paddingTop: $container.data("origHeight")
            }); */
        
        // don't do any animation if list shorter than max
        if (multiplier > 1) {
            $container
                .css({
                    height: maxHeight,
                    overflow: "hidden"
                })
                .mousemove(function(e) {
                    var offset = $container.offset();
                    var relativeY = ((e.pageY - offset.top) * multiplier) - ($container.data("origHeight") * multiplier);
                    if (relativeY > $container.data("origHeight")) {
                        $list.css("top", -relativeY + $container.data("origHeight"));
                    };
                });
        }
        
    }, function() {
    
        var $el = $(this);
        
        // put things back to normal
        $el
            .height($(this).data("origHeight"))
            .find("ul")
            .css({ top: 0 })
            .hide()
            .end()
            .find("a")
            .removeClass("hover");
    
    });
    
    // Add down arrow only to menu items with submenus
    $(".dropdown > li:has('ul')").each(function() {
        //$(this).find("a:first").append("<img src='images/down-arrow.png' />");
    });
    
    
});
