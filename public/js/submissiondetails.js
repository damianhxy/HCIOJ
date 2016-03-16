var socket = io();

function getStat(mask) {
    if (!mask)
        return "<span>Normal</span>";
    var html = "";
    if (mask & (1 << 0))
        html += "<span>TLE</span>";
    if (mask & (1 << 1))
        html += "<span>MLE</span>";
    if (mask & (1 << 2))
        html += "<span>Killed</span>";
    return html;
};

socket.on('updateSub', function(submission){
	if(submission.compilation) {
		document.getElementById("compile").textContent = submission.compilation;
	}
	if(submission.tc) {
		var x = document.createElement("tr");
		x.innerHTML = 
			'<td>' + submission.tc.num + '</td>' +
			'<td>' + submission.tc.msg + '</td>' +
			'<td><span class="score-' + submission.tc.score + '">' + submission.tc.score + '</td>' +
			'<td>' + submission.tc.msg + '</td>' +
			'<td>' + submission.tc.ram + ' MB</td>' +
			'<td>' + getStat(submission.tc.stat) + '</td>' +
			'<td><span style="color: gray">' + submission.progress + '</span></td>';
		document.getElementById("subtask-tbody-"+submission.tc.subtask).appendChild(d);
	}
	if(submission.subtask) {
		document.getElementById("subtask-score-"+submission.subtask.num).textContent = submission.subtask.score;
	}
	if(submission.restype == 5) { // finished submission
		document.getElementById("verdict").textContent = submission.verdict;
		document.getElementById("score").textContent = submission.totalscore;
		document.getElementById("graded_date").textContent = submission.graded_date;
		document.getElementById("runtime").textContent = submission.maxtime;
	}
	else if(submission.restype == 6) { // rejected submission
		document.getElementById("verdict").textContent = submission.verdict;
		document.getElementById("graded_date").textContent = submission.graded_date;
	}
});