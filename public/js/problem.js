const socket = io();
const as = document.getElementById("submissions");
const ys = document.getElementById("yourSubmissions");

function esc(s) {
    return String(s).replace(/[&<>"']/g, function(c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
}

socket.on('newSub', function(submission) {
    const date = moment(submission.submitted_date).format("DD MMM YY, HH:MM:ss");

    if (as) {
        const x = document.createElement("tr");
        x.innerHTML =
            '<td><a href="/submissions/' + esc(submission.numid) + '">' + esc(submission.numid) + '</a></td>' +
            '<td><a href="/users/' + esc(submission.user) + '">' + esc(submission.user) + '</a></td>' +
            '<td>' + esc(date) + '</td>' +
            '<td>' + esc(submission.language) + '</td>' +
            '<td>' + esc(submission.runtime) + 's</td>' +
            '<td><span class="score-' + esc(submission.score) + '">' + esc(submission.score) + '</span></td>' +
            '<td><span style="color: gray">' + esc(submission.progress) + '</span></td>';
        as.insertBefore(x, as.firstChild);
    }

    if (ys && submission.user === username) {
        const y = document.createElement("tr");
        y.innerHTML =
            '<td><a href="/submissions/' + esc(submission.numid) + '">' + esc(submission.numid) + '</a></td>' +
            '<td>' + esc(date) + '</td>' +
            '<td>' + esc(submission.language) + '</td>' +
            '<td>' + esc(submission.runtime) + 's</td>' +
            '<td><span class="score-' + esc(submission.score) + '">' + esc(submission.score) + '</span></td>' +
            '<td><span style="color: gray">' + esc(submission.progress) + '</span></td>';
        ys.insertBefore(y, ys.firstChild);
    }
});
