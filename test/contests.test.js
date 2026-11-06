const assert = require("node:assert/strict");
const { describe, test, before, after } = require("node:test");
const { start, Client, page } = require("./helpers/app.js");

function iso(minutesFromNow) {
  return new Date(Date.now() + minutesFromNow * 60000).toISOString();
}

describe("admin", () => {
  let app, admin;
  before(async () => {
    app = await start();
    admin = new Client(app.baseUrl);
    await admin.signUp("root");
    app.makeAdmin("root");
  });
  after(() => app.stop());

  test("the admin panel and its editors load", async () => {
    for (const url of [
      "/admin",
      "/admin/problems",
      "/admin/problems/new",
      "/admin/problems/inside",
      "/admin/contests",
      "/admin/contests/new",
    ]) {
      const res = await admin.get(url);
      assert.equal(res.status, 200, url);
    }
  });

  test("the side bar links to the admin panel", async () => {
    const res = await admin.get("/");
    assert.match(res.text, /<a href="\/admin" class="sidelink">/);
  });

  test("adding a problem stores it and lists it", async () => {
    await admin.get("/admin/problems/new");
    const res = await admin.postAndFollow("/admin/addproblem", {
      title: "newprob",
      subtitle: "Output Only",
    });
    assert.equal(res.location, "/admin/problems");
    assert.equal(res.success, "Problem Added Successfully");
    const list = await admin.get("/problems");
    assert.match(list.text, /href="\/problems\/newprob"/);
  });

  test("adding a contest stores it with its problems", async () => {
    await admin.get("/admin/contests/new");
    const res = await admin.postAndFollow("/admin/addcontest", {
      title: "Weekly 1",
      desc: "Two problems",
      start: iso(-60),
      end: iso(60),
      time: "240",
      problems: "inside,outside",
      scoreboard: "on",
    });
    assert.equal(res.success, "Contest Added Successfully");
    const row = app.db.prepare("SELECT * FROM contests WHERE id = '1'").get();
    assert.equal(row.title, "Weekly 1");
    assert.equal(row.problems, '["inside","outside"]');
    assert.equal(row.scoreboard, 1);
    assert.equal(row.url, "/contests/1");
    const edit = await admin.get("/admin/contests/1");
    assert.equal(edit.status, 200);
    assert.match(edit.text, /Weekly 1/);
  });

  test.todo("one-repo finding: /admin/users loads (it renders a missing 'edituser' view, 500)");
  test.todo(
    "one-repo finding: the edit-contest form saves its changes (the form sends no contest id)",
  );
});

describe("contests", () => {
  let app, alice, bob;
  before(async () => {
    app = await start();
    const insert = app.db.prepare(
      `INSERT INTO contests (id, title, "desc", start, "end", time, problems, scoreboard, url)
       VALUES (?, ?, ?, ?, ?, 240, ?, ?, ?)`,
    );
    insert.run("1", "Weekly 1", "Two problems", iso(-60), iso(60), '["inside"]', 1, "/contests/1");
    insert.run("2", "Hidden board", "", iso(-60), iso(60), '["inside"]', 0, "/contests/2");
    alice = new Client(app.baseUrl);
    await alice.signUp("alice");
    bob = new Client(app.baseUrl);
    await bob.signUp("bob");
  });
  after(() => app.stop());

  test("signed-in users see the contest list", async () => {
    const res = await alice.get("/contests");
    assert.equal(res.status, 200);
    assert.match(res.text, /Weekly 1/);
  });

  test("a contest shows a join page until the user joins", async () => {
    const res = await alice.get("/contests/1");
    assert.equal(res.status, 200);
    assert.match(res.text, /<form action="\/contests\/1\/join" method="post">/);
  });

  test("joining stores an entry and opens the contest's problem list", async () => {
    const res = await alice.post("/contests/1/join");
    assert.equal(res.location, "/contests/1");
    const entry = app.db.prepare("SELECT * FROM entries WHERE username = 'alice'").get();
    assert.equal(entry.contest, "1");
    assert.equal(entry.total, 0);
    const view = await alice.get("/contests/1");
    assert.match(view.text, />inside<\/a><\/td>/);
    assert.doesNotMatch(view.text, /\/join"/);
  });

  test("joining twice is refused with 'Already in contest'", async () => {
    await alice.get("/contests/1/problems/inside");
    const res = await alice.post("/contests/1/join");
    assert.equal(res.location, "/contests/1");
    assert.equal(page((await alice.get("/problems")).text).error, "Already in contest");
    assert.equal(app.db.prepare("SELECT COUNT(*) AS n FROM entries").get().n, 1);
  });

  test("a contest submission stores its code and contest and opens its page", async () => {
    const res = await alice.submit("inside", { contestId: "1", code: "print(3)", language: "py" });
    assert.equal(res.location, "/contests/1/submissions/1");
    const row = app.db.prepare("SELECT * FROM submissions WHERE numid = 1").get();
    assert.equal(row.title, "inside");
    assert.equal(row.contest, "1");
    assert.equal(row.code, "print(3)");
    const view = await alice.get("/contests/1/submissions/1");
    assert.equal(view.status, 200);
    assert.match(view.text, /#1 by alice/);
    assert.match(view.text, /<div id="editor">print\(3\)<\/div>/);
  });

  test("the scoreboard lists entrants", async () => {
    const res = await alice.get("/contests/1/scoreboard");
    assert.equal(res.status, 200);
    assert.match(res.text, /<td>alice<\/td>/);
  });

  test("a hidden scoreboard redirects with 'Scoreboard hidden'", async () => {
    const res = await alice.get("/contests/2/scoreboard");
    assert.equal(res.location, "/contests/2");
    assert.equal(page((await alice.get("/problems")).text).error, "Scoreboard hidden");
  });

  test("contest clarifications are stored per contest", async () => {
    await alice.get("/contests/1/clarifications");
    const res = await alice.post("/contests/1/clarifications", {
      problem: "inside",
      query: "Contest question",
    });
    assert.equal(res.location, "/contests/1/clarifications");
    const contestList = await alice.get("/contests/1/clarifications");
    assert.match(contestList.text, /Contest question/);
    const general = await alice.get("/clarifications");
    assert.doesNotMatch(general.text, /Contest question/);
  });

  test("an unknown contest redirects to the list", async () => {
    const res = await bob.get("/contests/99");
    assert.equal(res.location, "/contests");
  });

  test.todo(
    "one-repo finding: the contest page links its problems to /contests/<id>/problems/<title> (it renders /contests//problems/<title>)",
  );
  test.todo(
    "one-repo finding: a user who has not joined cannot open the contest's problems, submit or read its clarifications (open PR #3)",
  );
  test.todo(
    "one-repo finding: an entrant cannot submit a problem that is not in the contest (open PR #3)",
  );
  test.todo(
    "one-repo finding: a final contest result (restype 5) adds to the entry's total on the scoreboard (open PR #1)",
  );
});
