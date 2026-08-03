const socket = io();

function esc(s) {
    return String(s).replace(/[&<>"']/g, function(c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
}

socket.on('newSub', function(submission) {
    const x = document.createElement("tr");
    x.innerHTML =
        '<td><a href="/submissions/' + esc(submission.numid) + '">' + esc(submission.numid) + '</a></td>' +
        '<td><a href="/users/' + esc(submission.user) + '">' + esc(submission.user) + '</a></td>' +
        '<td><a href="/problems/' + esc(submission.problem) + '">' + esc(submission.problem) + '</a></td>' +
        '<td>' + esc(submission.language) + '</td>' +
        '<td><span style="color: gray">' + esc(submission.progress) + '</span></td>';
    const table = document.getElementById("queue");
    table.insertBefore(x, table.firstChild);
});
