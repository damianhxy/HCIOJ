var socket = io();
var ys = document.getElementById("submissions");

socket.on('newSub', function(submission){
	submission.language = languages[submission.language];
	submission.submitted_date = moment(submission.submitted_date).format("DD MMM YY, HH:MM:ss");
	
	if(ys && submission.user == thisusername){
		var y = document.createElement("tr");
		y.innerHTML = '<tr style="height: 0px;" >' + 
			'<td><a href="/submissions/' + submission.numid + '">' + submission.numid + '</td>' + // please add a check if it is a contest
			'<td><a href="/problems/' + submission.problem + '">' + submission.problem + '</td>' +
			'<td>' + submission.submitted_date + '</td>' +
			'<td>' + submission.language + '</td>' +
			'<td><span class="score-' + submission.score + '">' + submission.score + '</td>' +
			'<td><span style="color: gray">' + submission.progress + '</span></td>' +
			'</tr>';
		ys.insertBefore(y, ys.firstChild);
	}
});