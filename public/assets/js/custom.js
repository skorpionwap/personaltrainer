(function ($) {
	
	"use strict";

	$(function() {
        $("#tabs").tabs();
    });

	$(window).scroll(function() {
	  var scroll = $(window).scrollTop();
	  var box = $('.header-text').height();
	  var header = $('header').height();

	  if (scroll >= box - header) {
	    $("header").addClass("background-header");
	  } else {
	    $("header").removeClass("background-header");
	  }
	});
	

	$('.schedule-filter li').on('click', function() {
        var tsfilter = $(this).data('tsfilter');
        $('.schedule-filter li').removeClass('active');
        $(this).addClass('active');
        if (tsfilter == 'all') {
            $('.schedule-table').removeClass('filtering');
            $('.ts-item').removeClass('show');
        } else {
            $('.schedule-table').addClass('filtering');
        }
        $('.ts-item').each(function() {
            $(this).removeClass('show');
            if ($(this).data('tsmeta') == tsfilter) {
                $(this).addClass('show');
            }
        });
    });


	// Window Resize Mobile Menu Fix
	mobileNav();


	// Scroll animation init
	window.sr = new scrollReveal();
	

	// Menu Dropdown Toggle
	if($('.menu-trigger').length){
		$(".menu-trigger").on('click', function() {	
			$(this).toggleClass('active');
			$('.header-area .nav').slideToggle(200);
		});
	}


	$(document).ready(function () {
		// Smooth scroll
		$('.scroll-to-section a[href^="#"]').on('click', function (e) {
			e.preventDefault();
	
			$('a').each(function () {
				$(this).removeClass('active');
			});
			$(this).addClass('active');
	
			var targetHash = this.hash;
			var target = $(targetHash);
			if (target.length) { // Verifică dacă elementul există
				$('html, body').stop().animate({
					scrollTop: target.offset().top + 1
				}, 500, 'swing', function () {
					// Odată ce animația de scroll este completă, poți să faci ceva aici dacă este necesar
					// De exemplu, reatașează listener-ul de scroll dacă este necesar
					// $(document).on("scroll", someFunction); // 'someFunction' trebuie să fie definită dacă dorești să o folosești
					window.location.hash = targetHash; // Actualizează hash-ul în URL
				});
			}
		});
	});
	

	$('.scroll-to-section a[href^="#"]').on('click', function (e) {
		e.preventDefault();
		var targetHash = this.hash;
		var target = $(targetHash);
	
		if (target.length) { // Asigură-te că elementul există
			$('html, body').stop().animate({
				scrollTop: target.offset().top + 1
			}, 500, 'swing', function () {
				window.location.hash = targetHash;
			});
		}
	});
	


	// Page loading animation
	 $(window).on('load', function() {

        $('#js-preloader').addClass('loaded');

    });


	// Window Resize Mobile Menu Fix
	$(window).on('resize', function() {
		mobileNav();
	});


	// Window Resize Mobile Menu Fix
	function mobileNav() {
		var width = $(window).width();
		$('.submenu').on('click', function() {
			if(width < 767) {
				$('.submenu ul').removeClass('active');
				$(this).find('ul').toggleClass('active');
			}
		});
	}


})(window.jQuery);