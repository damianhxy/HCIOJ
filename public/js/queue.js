var socket = io();

socket.on('newSub', function(submission){
	var x = document.createElement("tr");
	submission.language = languages[submission.language];
	x.innerHTML = '<td><a href="/submissions/' + submission.numid + '">' + submission.numid + '</td>' + // please add a check if it is a contest
		'<td><a href="/users/' + submission.user + '">' + submission.user + '</td>' + // add links for the below
		'<td><a href="/problems/' + submission.problem + '">' + submission.problem + '</td>' +
		'<td>' + submission.language + '</td>' +
		'<td><span style="color: gray">' + submission.progress + '</span></td>';
	document.getElementById("queue").insertBefore(x, document.getElementById("queue").firstChild);
	// $('.table tbody').prepend('<tr style="height: 0px;" >' + 
	// 							'<td><a href="/submissions/' + submission.numid + '">' + submission.numid + '</td>' + // please add a check if it is a contest
	// 							'<td>' + submission.user + '</td>' + // add links for the below
	// 							'<td>' + submission.title + '</td>' +
	// 							'<td>' + submission.language + '</td>' +
	// 							'<td>' + submission.progress + '</td>' +
	// 							'</tr>');
	// $('.table tbody tr:first').slideDown(500);
});

socket.on('updateSub', function(submission){
	// later add a class to the added element to manipulate value
});