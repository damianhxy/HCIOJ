if ($(".alert")) {
    function hide() {
        $(".alert").addClass("alert-hidden");
    }
    $(".alert").on("transitionend", function() {
        $(".alert").remove();
    });
    $(".alert").click(hide);
    setTimeout(hide, 2500);
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

// Contest Timer
var timer = document.getElementById("contestTimer");
if (timer) {
	var endTime = document.querySelector("nav.sidebar").getAttribute("data-contestEnd");
	var timeLeft = moment(endTime).diff(Date.now());
	if (timeLeft < 0) // Ended
		timer.textContent = "Ended";
	else {
		var duration = moment.duration(timeLeft);
		console.log(duration);
		timer.textContent = duration.days() + "d " + duration.hours() + ":" + duration.minutes() + ":" + duration.seconds();
		var interval = setInterval(function() {
			duration = duration.subtract(1, "s");
			if (duration.as("seconds") <= 0) {
				timer.textContent = "Ended";
				clearInterval(interval);
			} else
				timer.textContent = duration.days() + "d " + duration.hours() + ":" + duration.minutes() + ":" + duration.seconds();
		}, 1000);
	}
}