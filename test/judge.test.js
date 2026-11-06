const assert = require("node:assert/strict");
const { describe, test, before, after } = require("node:test");
const { start, Client, page, graderCallback } = require("./helpers/app.js");

// HCIOJ is kept at archive level: submissions are stored and listed, but nothing sends them to a
// grader (models/submission.js `dispatch` has no callers). These tests check what is stored and
// shown, and play the grader's progress callback by hand.

describe("problems", () => {
  let app;
  before(async () => (app = await start()));
  after(() => app.stop());

  test("the problem list shows every problem", async () => {
    const res = await new Client(app.baseUrl).get("/problems");
    assert.equal(res.status, 200);
    for (const title of ["inside", "outside", "withfiles"])
      assert.match(res.text, new RegExp(title));
  });

  test("/problems/latest lists the newest first", async () => {
    const res = await new Client(app.baseUrl).get("/problems/latest");
    assert.equal(res.status, 200);
    const order = [...res.text.matchAll(/href="\/problems\/(inside|outside|withfiles)"/g)].map(
      (m) => m[1],
    );
    assert.deepEqual([...new Set(order)], ["withfiles", "outside", "inside"]);
  });

  test("search matches a tag", async () => {
    const res = await new Client(app.baseUrl).get("/problems/search?query=graph");
    assert.equal(res.status, 200);
    assert.match(res.text, /href="\/problems\/outside"/);
    assert.doesNotMatch(res.text, /href="\/problems\/inside"/);
  });

  test("a problem page shows its title and the submit form", async () => {
    const res = await new Client(app.baseUrl).get("/problems/inside");
    assert.equal(res.status, 200);
    assert.match(res.text, /<h2>inside <small>Batch<\/small><\/h2>/);
    assert.match(res.text, /<form method="post" action="\/submissions\/submit\/inside"/);
  });

  test("an unknown problem redirects with an error", async () => {
    const client = new Client(app.baseUrl);
    const res = await client.get("/problems/nope");
    assert.equal(res.status, 302);
    assert.equal(page((await client.get("/problems")).text).error, "An error was encountered");
  });
});

describe("practice submissions", () => {
  let app, alice;
  before(async () => {
    app = await start();
    alice = new Client(app.baseUrl);
    await alice.signUp("alice");
  });
  after(() => app.stop());

  const stored = (numid) => app.db.prepare("SELECT * FROM submissions WHERE numid = ?").get(numid);

  test("submitting stores the submission as waiting for grading and opens its page", async () => {
    const res = await alice.submit("inside", { language: "py" });
    assert.equal(res.status, 302);
    assert.equal(res.location, "/submissions/1");
    const row = stored(1);
    assert.equal(row.user, "alice");
    assert.equal(row.problem, "inside");
    assert.equal(row.language, "py");
    assert.equal(row.contest, "0");
    assert.equal(row.restype, 0);
    assert.equal(row.progress, "Grading");
    assert.deepEqual(JSON.parse(row.res), [
      { num: 1, maxscore: 40, score: 0 },
      { num: 2, maxscore: 60, score: 0 },
    ]);
    const view = await alice.get("/submissions/1");
    assert.equal(view.status, 200);
    assert.match(view.text, /#1 by alice/);
    assert.match(view.text, /<td id="langdisplay">py<\/td>/);
    assert.match(view.text, /Subtask 2 \(<span class="subtask-score-2">0<\/span> \/ 60\)/);
  });

  test("the submission is listed in latest, mine, the queue, the problem page and home", async () => {
    for (const url of ["/submissions/latest", "/submissions/mine", "/submissions/queue", "/"]) {
      const res = await alice.get(url);
      assert.equal(res.status, 200, url);
      assert.ok(page(res.text).submissionIds.includes(1), url);
    }
    const problem = await alice.get("/problems/inside");
    assert.match(problem.text, /href="\/submissions\/1"/);
  });

  test("ids keep counting up", async () => {
    const res = await alice.submit("outside");
    assert.equal(res.location, "/submissions/2");
    assert.equal(stored(2).problem, "outside");
  });

  test("an unknown language is refused", async () => {
    await alice.get("/problems/inside");
    const res = await alice.post("/submissions/submit/inside", { language: "cobol", code: "x" });
    assert.equal(res.status, 302);
    assert.equal(page((await alice.get("/problems")).text).error, "Invalid language");
    assert.equal(stored(3), undefined);
  });

  test("visitors cannot submit", async () => {
    const visitor = new Client(app.baseUrl);
    await visitor.get("/problems/inside");
    const res = await visitor.post("/submissions/submit/inside", { language: "cpp", code: "x" });
    assert.equal(res.status, 302);
    assert.equal(page((await visitor.get("/problems")).text).error, "Please log in");
  });

  test("another user's submission page hides the code", async () => {
    const bob = new Client(app.baseUrl);
    await bob.signUp("bob");
    const res = await bob.get("/submissions/1");
    assert.equal(res.status, 200);
    assert.doesNotMatch(res.text, /<div id="editor">/);
  });

  test.todo(
    "one-repo finding: the submitted code is stored from the practice form's 'code' field (open PR #6)",
  );
  test.todo(
    "one-repo finding: a practice submission shows 'Practice Mode', not 'Contest #0' (open PR #9)",
  );
});

describe("grader callback", () => {
  let app, alice;
  before(async () => {
    app = await start();
    alice = new Client(app.baseUrl);
    await alice.signUp("alice");
    await alice.submit("inside");
  });
  after(() => app.stop());

  const stored = () => app.db.prepare("SELECT * FROM submissions WHERE numid = 1").get();

  test("a wrong secret is refused with 401 and changes nothing", async () => {
    const res = await graderCallback(app.baseUrl, { subid: 1, status: "hacked" }, "x".repeat(32));
    assert.equal(res.status, 401);
    assert.equal(stored().status, "Sending to server");
  });

  test("malformed data is refused with 400", async () => {
    const res = await fetch(app.baseUrl + "/submissions/api", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: "secret=x&data=%7Bbad",
    });
    assert.equal(res.status, 400);
  });

  test("an unknown submission id is refused with 400", async () => {
    const res = await graderCallback(app.baseUrl, { subid: 99, status: "Compiling" });
    assert.equal(res.status, 400);
    assert.equal(await res.text(), "Submission not found");
  });

  test("progress updates are stored and shown on the submission page", async () => {
    let res = await graderCallback(app.baseUrl, { subid: 1, status: "Compiling" });
    assert.equal(res.status, 200);
    assert.equal(await res.text(), "Success");
    res = await graderCallback(app.baseUrl, {
      subid: 1,
      tc: { subtask: 1, num: 1, verdict: "AC", time: 0.01, mem: 1 },
    });
    assert.equal(res.status, 200);
    res = await graderCallback(app.baseUrl, { subid: 1, subtask: { num: 1, score: 40 } });
    assert.equal(res.status, 200);
    const row = stored();
    assert.equal(row.status, "Compiling");
    assert.deepEqual(JSON.parse(row.res)[0], {
      num: 1,
      maxscore: 40,
      score: 40,
      tcs: [{ num: 1, verdict: "AC", time: 0.01, mem: 1 }],
    });
    const view = await alice.get("/submissions/1");
    assert.match(view.text, /Subtask 1 \(<span class="subtask-score-1">40<\/span> \/ 40\)/);
  });

  test.todo(
    "one-repo finding: a final result (restype 5) is scored: the user's score, rankings and the problem's solve count update (open PR #1)",
  );
  test.todo("one-repo finding: a graded submission leaves the grading queue (open PR #1)");
});

describe("clarifications", () => {
  let app, alice;
  before(async () => {
    app = await start();
    alice = new Client(app.baseUrl);
    await alice.signUp("alice");
  });
  after(() => app.stop());

  test("a question is stored and listed with its author", async () => {
    await alice.get("/clarifications");
    const res = await alice.post("/clarifications", { problem: "inside", query: "Is n >= 1?" });
    assert.equal(res.location, "/clarifications");
    const list = await new Client(app.baseUrl).get("/clarifications");
    assert.equal(list.status, 200);
    assert.match(list.text, /<p>Is n &gt;&#x3D; 1\?<\/p>/);
    assert.match(list.text, /<a href="\/users\/alice">alice<\/a>/);
  });

  test("an answer entered in the database is shown", async () => {
    app.db.prepare("UPDATE clarifications SET answer = 'Yes' WHERE id = 1").run();
    const list = await new Client(app.baseUrl).get("/clarifications");
    assert.match(list.text, /<h3>Yes<\/h3>/);
  });

  test("visitors see the list but no form", async () => {
    const list = await new Client(app.baseUrl).get("/clarifications");
    assert.doesNotMatch(list.text, /id="clarification-form"/);
  });
});
