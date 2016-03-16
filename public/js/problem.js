var socket = io();
var as = document.getElementById("submissions");
var ys = document.getElementById("yourSubmissions");

socket.on('newSub', function(submission){
	submission.language = languages[submission.language];
	submission.submitted_date = moment(submission.submitted_date).format("DD MMM YY, HH:MM:ss");
	
	// to be added: check if submission has contest
	var x = document.createElement("tr");
	x.innerHTML = '<tr style="height: 0px;" >' + 
		'<td><a href="/submissions/' + submission.numid + '">' + submission.numid + '</td>' + // please add a check if it is a contest
		'<td><a href="/users/' + submission.user + '">' + submission.user + '</td>' +
		'<td>' + submission.submitted_date + '</td>' +
		'<td>' + submission.language + '</td>' +
		'<td>' + submission.runtime + 's</td>' +
		'<td><span class="score-' + submission.score + '">' + submission.score + '</td>' +
		'<td><span style="color: gray">' + submission.progress + '</span></td>' +
		'</tr>';
	as.insertBefore(y, ys.firstChild);
	if(ys && submission.user == username){
		var y = document.createElement("tr");
		y.innerHTML = '<tr style="height: 0px;" >' + 
			'<td><a href="/submissions/' + submission.numid + '">' + submission.numid + '</td>' + // please add a check if it is a contest
			'<td>' + submission.submitted_date + '</td>' +
			'<td>' + submission.language + '</td>' +
			'<td>' + submission.runtime + 's</td>' +
			'<td><span class="score-' + submission.score + '">' + submission.score + '</td>' +
			'<td><span style="color: gray">' + submission.progress + '</span></td>' +
			'</tr>';
		ys.insertBefore(y, ys.firstChild);
	}
});