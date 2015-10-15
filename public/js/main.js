if ($(".alert")) {
    function hide() {
        $(".alert").addClass("alert-hidden");
    }
    $(".alert").on("transitionend", function() {
        $(".alert").remove();
    });
    $(".alert").click(hide);
    setTimeout(hide, 5000);
}

$(".dropdown-menu").hover(function() {
	$(this).parent().toggleClass("hovered");
});

$(".fa-search").click(function() {
	if ($(this).prev().val())
		location.assign("/search/" + $(this).prev().val());
	else
		location.assign("/problems");
});

$("[type='search']").keydown(function(e) {
	if (e.which === 13)
		$(".fa-search").trigger("click");
	else if (e.which === 27)
		$(this).blur();
});
/*
var team_names =
[
	"Zhi Jian",
	"Gui Ming Jiang",
	"Damian Ho",
	"Dae Koon Lim",
	"Silas Yeo",
	"FanPu Zeng",
	"Yudong Sun",
	"Tan Wei Seng",
	"Cai Kaian"
];

$("footer .team span").html(team_names.map(function(e) { return "<b>" + e + "</b>"; }).join(" & "));
*/
$("nav.mobile-nav > ul > li > a").click(function() {
	var dropdown = $(this).parent().find("ul.mobile-nav-dropdown");
	if (dropdown.css("display") === "block") dropdown.slideUp();
	else {
		$("nav.mobile-nav ul.mobile-nav-dropdown").slideUp();
		dropdown.slideDown();
	}
});

$("pre").each(function() {
	$(this).html("<div class='copy-button'>Copy</div><div>" + $(this).html() + "</div>");
});
/*
$main = $("main");

$(function() {
	String.prototype.decodeHTML = function() {
		return $("<div>", {html: "" + this}).html();
	};

	ajaxLoad = function(html) {
		document.title = html
		.match(/<title>(.*?)<\/title>/)[1]
		.trim()
		.decodeHTML();
	},

	loadPage = function(href) {
		$main.load(href + " main>*", ajaxLoad);
	};

	$(window).on("popstate", function(e) {
		if (e.originalEvent.state !== null) {
			loadPage(location.href);
		}
	});

	$(document).on("click", "a, area", function(e) {
		var href = $(this).attr("href");
		if (~ href.indexOf(document.domain) !== -1 || ! ~ href.indexOf(':')) {
			history.pushState({}, '', href);
			loadPage(href);
			e.preventDefault();
			e.stopImmediatePropagation();
		}
	});
});*/