var socket = io();
var as = document.getElementById("submissions");
var ys = document.getElementById("yourSubmissions");

socket.on('newSub', function(submission){
	submission.language = languages[submission.language];
	submission.submitted_date = moment(submission.submitted_date).format("DD MMM YY, HH:MM:ss");
	
	// to be added: check if submission has contest
	var x = document.createElement("tr");
	x.innerHTML = 
		'<td><a href="/submissions/' + submission.numid + '">' + submission.numid + '</td>' + // please add a check if it is a contest
		'<td><a href="/users/' + submission.user + '">' + submission.user + '</td>' + // add links for the below
		'<td><a href="/problems/' + submission.problem + '">' + submission.problem + '</td>' +
		'<td>' + submission.submitted_date + '</td>' +
		'<td>' + submission.language + '</td>' +
		'<td><span class="score-' + submission.score + '">' + submission.score + '</td>' +
		'<td><span style="color: gray">' + submission.progress + '</span></td>';
	as.insertBefore(y, ys.firstChild);
	if(ys && submission.user == username){
		var y = document.createElement("tr");
		y.innerHTML =
			'<td><a href="/submissions/' + submission.numid + '">' + submission.numid + '</td>' + // please add a check if it is a contest
			'<td><a href="/problems/' + submission.problem + '">' + submission.problem + '</td>' +
			'<td>' + submission.submitted_date + '</td>' +
			'<td>' + submission.runtime + 's</td>' +
			'<td>' + submission.language + '</td>' +
			'<td><span class="score-' + submission.score + '">' + submission.score + '</td>' +
			'<td><span style="color: gray">' + submission.progress + '</span></td>';
		ys.insertBefore(y, ys.firstChild);
	}
});

socket.on('updateSub', function(submission){
	
});