const socket = io();
const ys = document.getElementById("userSubmissions");

function esc(s) {
    return String(s).replace(/[&<>"']/g, function(c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
}

socket.on('newSub', function(submission) {
    const date = moment(submission.submitted_date).format("DD MMM YY, HH:MM:ss");

    if (ys && submission.user === thisusername) {
        const y = document.createElement("tr");
        y.innerHTML =
            '<td><a href="/submissions/' + esc(submission.numid) + '">' + esc(submission.numid) + '</a></td>' +
            '<td><a href="/problems/' + esc(submission.problem) + '">' + esc(submission.problem) + '</a></td>' +
            '<td>' + esc(date) + '</td>' +
            '<td>' + esc(submission.language) + '</td>' +
            '<td><span class="score-' + esc(submission.score) + '">' + esc(submission.score) + '</span></td>' +
            '<td><span style="color: gray">' + esc(submission.progress) + '</span></td>';
        ys.insertBefore(y, ys.firstChild);
    }
});
