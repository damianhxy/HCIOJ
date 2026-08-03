// Contest Timer
const timer = document.getElementById("contestTimer");
if (timer) {
	const endTime = document.querySelector("nav.sidebar").getAttribute("data-contestEnd");
	const timeLeft = moment(endTime).diff(Date.now());
	if (timeLeft < 0) // Ended
		timer.textContent = "Ended";
	else {
		let duration = moment.duration(timeLeft);
		timer.textContent = duration.days() + "d " + duration.hours() + ":" + duration.minutes() + ":" + duration.seconds();
		const interval = setInterval(function() {
			duration = duration.subtract(1, "s");
			if (duration.as("seconds") <= 0) {
				timer.textContent = "Ended";
				clearInterval(interval);
			} else
				timer.textContent = duration.days() + "d " + duration.hours() + ":" + duration.minutes() + ":" + duration.seconds();
		}, 1000);
	}
}
