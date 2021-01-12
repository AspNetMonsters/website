(function($) { "use strict";
	
	/* Menu */
	jQuery(".navigation  ul li ul").parent("li").addClass("parent-list");
	jQuery(".parent-list").find("a:first").append("<span class='menu-nav-arrow'><i class='fa fa-angle-down'></i></span>");
	
	/* Header fixed */
	
	var aboveHeight   = jQuery("#header").outerHeight();
	var fixed_enabled = jQuery("#wrap").hasClass("fixed-enabled");
	if(fixed_enabled){
		jQuery(window).scroll(function(){
			if(jQuery(window).scrollTop() > aboveHeight ){
				jQuery("#header").css({"top":"0"}).addClass("fixed-nav");
			}else{
				jQuery("#header").css({"top":"auto"}).removeClass("fixed-nav");
			}
		});
	}else {
		jQuery("#header").removeClass("fixed-nav");
	}
	
	/* Header mobile */
	
	jQuery(".navigation > ul > li").clone().appendTo('.navigation_mobile > ul');
	
	if (jQuery(".navigation_mobile_click").length) {
		jQuery(".navigation_mobile_click").click(function() {
			if (jQuery(this).hasClass("navigation_mobile_click_close")) {
				jQuery(this).next().slideUp(500);
				jQuery(this).removeClass("navigation_mobile_click_close");
			}else {
				jQuery(this).next().slideDown(500);
				jQuery(this).addClass("navigation_mobile_click_close");
			}
		});
		
		jQuery(".navigation_mobile ul li").each(function() {	
			var sub_menu = jQuery(this).find("ul:first");
			jQuery(this).find("> a").click(function() {
				if (jQuery(this).parent().find("ul").length > 0) {
					if (jQuery(this).parent().find("> ul").hasClass("sub_menu")) {
						jQuery(this).parent().find("> ul").removeClass("sub_menu");
						sub_menu.stop().slideUp(250, function() {	
							jQuery(this).css({overflow:"hidden", display:"none"});
						});
					}else {
						jQuery(this).parent().find("> ul").addClass("sub_menu");
						sub_menu.stop().css({overflow:"hidden", height:"auto", display:"none", paddingTop:0}).slideDown(250, function() {
							jQuery(this).css({overflow:"visible", height:"auto"});
						});
					}
					return false;
				}else {
					return true;
				}
			});	
		});
	}
	
	/* Search */
	
	jQuery(".header-search-a").click(function (){
		var header_search = jQuery(this).parent();
		if (header_search.hasClass("header-search-active")) {
			header_search.removeClass("header-search-active");
			header_search.find("i").addClass("fa-search").removeClass("fa-times");
			jQuery(".wrap-search").slideUp(300);
		}else {
			var header = jQuery("#header").height();
			header_search.addClass("header-search-active");
			header_search.find("i").addClass("fa-times").removeClass("fa-search");
			jQuery(".wrap-search").css({"padding-top":header+50});
			jQuery(".wrap-search").slideDown(300);
		}
	});
	
	/* Header follow */
	
	jQuery(".header-follow-a").click(function (){
		var header_follow = jQuery(this).parent();
		if (header_follow.hasClass("header-follow-active")) {
			header_follow.removeClass("header-follow-active");
		}else {
			header_follow.addClass("header-follow-active");
		}
	});
	
	
	/* bxSlider */
	
	jQuery(".related-posts.related-posts-full > ul").each(function () {
		var vids = jQuery(".related-post-item",this);
		for(var i = 0; i < vids.length; i+=3) {
		    vids.slice(i, i+3).wrapAll('<li></li>');
		}
	});
	
	jQuery(".related-posts.related-posts-half > ul").each(function () {
		var vids = jQuery(".related-post-item",this);
		for(var i = 0; i < vids.length; i+=2) {
		    vids.slice(i, i+2).wrapAll('<li></li>');
		}
	});
	
	jQuery(".post-gallery .post-img ul,.related-posts > ul,.box-slideshow > ul,.related-posts > div,.news-ticker-content > ul,.carousel-box-1 > ul,.carousel-box-2 > ul").bxSlider({easing: "linear",tickerHover: true,slideWidth: 1170,adaptiveHeightSpeed: 1500,moveSlides: 1,maxSlides: 1,auto: true});
	
	/* Go up */
	
	jQuery(window).scroll(function () {
		if(jQuery(this).scrollTop() > 100 ) {
			jQuery(".go-up").css("right","20px");
		}else {
			jQuery(".go-up").css("right","-60px");
		}
	});
	jQuery(".go-up").click(function(){
		jQuery("html,body").animate({scrollTop:0},500);
		return false;
	});
	
	/* Tabs */

	jQuery(".widget ul.tabs").tabs(".widget .tab-inner-warp",{effect:"slide",fadeInSpeed:100});
	
	jQuery("ul.tabs-box").tabs(".tab-inner-warp-box",{effect:"slide",fadeInSpeed:100});
	
	/* Accordion & Toggle */
	
	jQuery(".accordion .accordion-title").each(function(){
		jQuery(this).click(function() {
			if (jQuery(this).parent().parent().hasClass("toggle-accordion")) {
				jQuery(this).parent().find("li:first .accordion-title").addClass("active");
				jQuery(this).parent().find("li:first .accordion-title").next(".accordion-inner").addClass("active");
				jQuery(this).toggleClass("active");
				jQuery(this).next(".accordion-inner").slideToggle().toggleClass("active");
				jQuery(this).find("i").toggleClass("fa-minus").toggleClass("fa-plus");
			}else {
				if (jQuery(this).next().is(":hidden")) {
					jQuery(this).parent().parent().find(".accordion-title").removeClass("active").next().slideUp(200);
					jQuery(this).parent().parent().find(".accordion-title").next().removeClass("active").slideUp(200);
					jQuery(this).toggleClass("active").next().slideDown(200);
					jQuery(this).next(".accordion-inner").toggleClass("active");
					jQuery(this).parent().parent().find("i").removeClass("fa-plus").addClass("fa-minus");
					jQuery(this).find("i").removeClass("fa-minus").addClass("fa-plus");
				}
			}
			return false;
		});
	});
	

	/* animation */
	
	jQuery(".animation").each( function() {
		var $this = jQuery(this);
		var animation = $this.attr("data-animate");
		$this.bind("inview", function(event, isInView, visiblePartX, visiblePartY) {
			if (isInView) {
				$this.css("visibility","visible");
				$this.addClass(animation);
				if(animation.indexOf("fade") === -1) {
					$this.css("opacity", "1");
				}
			}
		});
	});
	
	/* Post 3 */
	
	if (jQuery(".post-3").length > 0) {
		var $container = jQuery(".blog-all");
		$container.isotope({
			filter: "*",
			animationOptions: {
				duration: 750,
				itemSelector: '.post-3',
				easing: "linear",
				queue: false,
			}
		});
	}
	
	/* Lightbox */
	
	var lightboxArgs = {			
		animation_speed: "fast",
		overlay_gallery: true,
		autoplay_slideshow: false,
		slideshow: 5000, // light_rounded / dark_rounded / light_square / dark_square / facebook
		theme: "pp_default", 
		opacity: 0.8,
		show_title: false,
		social_tools: "",
		deeplinking: false,
		allow_resize: true, // Resize the photos bigger than viewport. true/false
		counter_separator_label: "/", // The separator for the gallery counter 1 "of" 2
		default_width: 940,
		default_height: 529
	};
		
	jQuery("a[href$=jpg], a[href$=JPG], a[href$=jpeg], a[href$=JPEG], a[href$=png], a[href$=gif], a[href$=bmp]:has(img)").prettyPhoto(lightboxArgs);
			
	jQuery("a[class^='prettyPhoto'], a[rel^='prettyPhoto']").prettyPhoto(lightboxArgs);
	
	/* Dribbble */
	

	
	/* Twitter */

	
	/* Flickr */

	
	/* Load */
	
	jQuery(window).load(function() {
		
		
		/* Post 3 */
		
		if (jQuery(".post-3").length > 0) {
			var $container = jQuery(".blog-all");
			setInterval(function() {
	            $container.isotope({
	            	filter: "*",
	            	animationOptions: {
	            		duration: 750,
	            		itemSelector: '.post-3',
	            		easing: "linear",
	            		queue: false,
	            	}
	            });
	        },2000);
		}
	});
	
	
})(jQuery);