var socket = io();

socket.on('updateSub', function(submission){
	if(submission.compilation) {
		document.getElementById("compilation").textContent = submission.compilation;
	}
	if(submission.tc) {
		
	}
	if(submission.subtask) {
		
	}
	if(submission.restype == 5) { // finished submission
		document.getElementById("verdict").textContent = submission.verdict;
		document.getElementById("score").textContent = submission.score;
		document.getElementById("graded_date").textContent = submission.graded_date;
		document.getElementById("maxtime").textContent = submission.maxtime;
	}
	else if(submission.restype == 6) { // rejected submission
		
	}
});