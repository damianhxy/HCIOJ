var socket = io();
socket.on('newSub', function(submission){
	$('#submissions tbody').prepend('<tr style="height: 0px;" >' + 
								'<td>' + submission.id + '</td>' +
								'<td>' + submission.user + '</td>' +
								'<td>' + submission.problem + '</td>' +
								'<td>' + submission.time + '</td>' +
								'<td>' + submission.score + '</td>' +
								'<td>' + submission.progress + '</td>' +
								'</tr>');
	$('#submissions tbody tr:first').slideDown(500);
});
socket.on('dank',function(data){
	alert(data);
});