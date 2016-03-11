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