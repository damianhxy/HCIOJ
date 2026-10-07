const socket = io();

function esc(s) {
    return String(s).replace(/[&<>"']/g, function(c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
}

function getStat(mask) {
    if (!mask)
        return "<span>Normal</span>";
    let html = "";
    if (mask & (1 << 0))
        html += "<span>TLE</span>";
    if (mask & (1 << 1))
        html += "<span>MLE</span>";
    if (mask & (1 << 2))
        html += "<span>Killed</span>";
    return html;
}

socket.on('updateSub', function(submission){
    if (!submission || submission.subid !== subid) return; // updates for other submissions
    if(submission.compilation) {
        document.getElementById("compile").textContent = submission.compilation;
    }
    if(submission.tc) {
        const x = document.createElement("tr");
        x.innerHTML =
            '<td>' + esc(submission.tc.num) + '</td>' +
            '<td>' + esc(submission.tc.msg) + '</td>' +
            '<td><span class="score-' + esc(submission.tc.score) + '">' + esc(submission.tc.score) + '</span></td>' +
            '<td>' + esc(submission.tc.ram) + ' MB</td>' +
            '<td>' + getStat(submission.tc.stat) + '</td>' +
            '<td><span style="color: gray">' + esc(submission.progress) + '</span></td>';
        const tbody = document.getElementById("subtask-tbody-" + submission.tc.subtask);
        if (tbody) tbody.appendChild(x);
    }
    if(submission.subtask) {
        const subtaskScore = document.querySelector(".subtask-score-" + submission.subtask.num);
        if (subtaskScore) subtaskScore.textContent = submission.subtask.score;
    }
    if(submission.restype === 5) { // finished submission
        document.getElementById("verdict").textContent = submission.verdict;
        document.getElementById("score").textContent = submission.totalscore;
        document.getElementById("graded_date").textContent = submission.graded_date;
        document.getElementById("runtime").textContent = submission.maxtime;
    }
    else if(submission.restype === 6) { // rejected submission
        document.getElementById("verdict").textContent = submission.verdict;
        document.getElementById("graded_date").textContent = submission.graded_date;
    }
});
