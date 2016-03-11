var socket = io();
socket.on('newSub', function(submission){ // change the selector to the queue pls
	$('#submissions tbody').prepend('<tr style="height: 0px;" >' + 
								'<td><a href="/submissions/' + submission.numid + '">' + submission.numid + '</td>' + // please add a check if it is a contest
								'<td>' + submission.user + '</td>' + // add links for the below
								'<td>' + submission.title + '</td>' +
								'<td>' + submission.language + '</td>' +
								'<td>' + submission.progress + '</td>' +
								'</tr>');
	$('#submissions tbody tr:first').slideDown(500);
});
socket.on('dank',function(data){
	alert(data);
});