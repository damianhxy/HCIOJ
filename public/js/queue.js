var socket = io();
socket.on('newSub', function(submission){
	var x = document.createElement("tr");
	submission.language = languages[submission.language];
	x.innerHTML = '<tr style="height: 0px;" >' + 
					'<td><a href="/submissions/' + submission.numid + '">' + submission.numid + '</td>' + // please add a check if it is a contest
					'<td><a href="/users/' + submission.user + '">' + submission.user + '</td>' + // add links for the below
					'<td><a href="/problems/' + submission.problem + '">' + submission.problem + '</td>' +
					'<td>' + submission.language + '</td>' +
					'<td><span style="color: gray">' + submission.progress + '</span></td>' +
					'</tr>';
	document.querySelector(".table tbody").appendChild(x);
	// $('.table tbody').prepend('<tr style="height: 0px;" >' + 
	// 							'<td><a href="/submissions/' + submission.numid + '">' + submission.numid + '</td>' + // please add a check if it is a contest
	// 							'<td>' + submission.user + '</td>' + // add links for the below
	// 							'<td>' + submission.title + '</td>' +
	// 							'<td>' + submission.language + '</td>' +
	// 							'<td>' + submission.progress + '</td>' +
	// 							'</tr>');
	// $('.table tbody tr:first').slideDown(500);
});
socket.on('dank',function(data){
	alert(data);
});