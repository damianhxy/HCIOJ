const assert = require("node:assert/strict");
const { describe, test, before, after } = require("node:test");
const { start, Client, page } = require("./helpers/app.js");

// Every GET and POST of /signin and /signup counts toward one limit of 20 per 15 minutes per
// address, shared by all clients of an app instance. signUp and signIn use 2 each, so each
// describe block starts its own app and stays under the limit.

describe("sign-up", () => {
  let app;
  before(async () => (app = await start()));
  after(() => app.stop());

  test("a new user is signed in on the home page, with the username lowercased", async () => {
    const client = new Client(app.baseUrl);
    const res = await client.signUp("Alice");
    assert.equal(res.location, "/");
    assert.equal(res.username, "alice");
    assert.match(res.text, /Hello, alice!/);
    const row = app.db.prepare("SELECT realname, email, level, admin FROM users").get();
    assert.deepEqual(
      { ...row },
      {
        realname: "User Alice",
        email: "Alice@example.com",
        level: "2016",
        admin: 0,
      },
    );
  });

  test("a taken username is refused", async () => {
    const res = await new Client(app.baseUrl).signUp("alice");
    assert.equal(res.location, "/signup");
    assert.equal(res.error, "Username in use: alice");
  });

  test("mismatched passwords are refused", async () => {
    const res = await new Client(app.baseUrl).signUp("bob", { password2: "something-else" });
    assert.equal(res.location, "/signup");
    assert.equal(res.error, "Passwords Mismatch");
  });

  test("a username outside [a-zA-Z0-9_]{3,20} is refused", async () => {
    const res = await new Client(app.baseUrl).signUp("a-b");
    assert.equal(res.location, "/signup");
    assert.match(res.error, /^Username must be 3-20 characters/);
  });

  test("a signed-in user is sent away from the sign-up page", async () => {
    const client = new Client(app.baseUrl);
    await client.signUp("carol");
    const res = await client.get("/signup");
    assert.equal(res.status, 302);
  });

  test.todo(
    "one-repo finding: the 'Welcome, <user>' flash is shown after sign-up (passport 0.7 regenerates the session, dropping it)",
  );
});

describe("sign-in and sign-out", () => {
  let app;
  before(async () => {
    app = await start();
    await new Client(app.baseUrl).signUp("dave");
  });
  after(() => app.stop());

  test("the right password signs in", async () => {
    const res = await new Client(app.baseUrl).signIn("dave");
    assert.equal(res.location, "/");
    assert.equal(res.username, "dave");
  });

  test("a wrong password and an unknown user get the same message", async () => {
    const wrong = await new Client(app.baseUrl).signIn("dave", "wrong-password");
    const unknown = await new Client(app.baseUrl).signIn("nobody");
    assert.equal(wrong.location, "/signin");
    assert.equal(wrong.error, "Invalid username or password");
    assert.equal(unknown.error, wrong.error);
  });

  test("the session cookie keeps the user signed in across pages", async () => {
    const client = new Client(app.baseUrl);
    await client.signIn("dave");
    for (const url of ["/problems", "/users/rankings", "/submissions/latest"]) {
      const res = await client.get(url);
      assert.equal(page(res.text).username, "dave", url);
    }
  });

  test.todo(
    "Sign-out → 500: GET /logout signs the user out instead of failing with 500 (open PR #1)",
  );
  test.todo(
    "3.6 POST sign-out + destroy: GET /logout is 404; POST with a token signs out and the old cookie is dead (#1 keeps GET)",
  );
  test.todo(
    "one-repo finding: sign-in accepts the username as typed at sign-up, e.g. 'Dave' (open PR #7)",
  );
  test.todo("one-repo finding: a disabled user (users.disabled = 1) cannot sign in");
  test.todo("one-repo finding: the 'Welcome back, <user>' flash is shown after sign-in");
});

describe("access control", () => {
  let app;
  before(async () => (app = await start()));
  after(() => app.stop());

  test("pages that need an account redirect visitors with 'Please log in'", async () => {
    for (const url of ["/submissions/mine", "/contests", "/contests/1"]) {
      const client = new Client(app.baseUrl);
      const res = await client.get(url);
      assert.equal(res.status, 302, url);
      assert.equal(res.location, "/", url);
      // The landing page shows no flash, so read it on the next page that does.
      const next = await client.get("/problems");
      assert.equal(page(next.text).error, "Please log in", url);
    }
  });

  test("an error redirect goes back to the Referer", async () => {
    const res = await new Client(app.baseUrl).get("/submissions/mine", {
      referer: app.baseUrl + "/problems",
    });
    assert.equal(res.location, app.baseUrl + "/problems");
  });

  test("the admin panel refuses ordinary users with 'Unauthorised'", async () => {
    const client = new Client(app.baseUrl);
    await client.signUp("erin");
    const res = await client.get("/admin");
    assert.equal(res.status, 302);
    assert.equal(page((await client.get("/problems")).text).error, "Unauthorised");
  });

  test.todo(
    "3.8 same-origin 'back' redirect: a Referer on another host is not followed (redirects use the raw Referer)",
  );
});

describe("profiles and rankings", () => {
  let app;
  before(async () => {
    app = await start();
    await new Client(app.baseUrl).signUp("frank");
    await new Client(app.baseUrl).signUp("grace");
    app.db.prepare("UPDATE users SET score = 140 WHERE username = 'grace'").run();
  });
  after(() => app.stop());

  test("rankings list users by score", async () => {
    const res = await new Client(app.baseUrl).get("/users/rankings");
    assert.equal(res.status, 200);
    const order = [...res.text.matchAll(/<a href="\/users\/(\w+)">/g)].map((m) => m[1]);
    assert.deepEqual(
      order.filter((u) => u === "frank" || u === "grace"),
      ["grace", "frank"],
    );
  });

  test("a profile shows the user's name, score and rank", async () => {
    const res = await new Client(app.baseUrl).get("/users/frank");
    assert.equal(res.status, 200);
    assert.match(res.text, /<tr><td>Real Name<\/td><td>User frank<\/td><\/tr>/);
    assert.match(res.text, /<tr><td>Total Points<\/td><td>0<\/td><\/tr>/);
    assert.match(res.text, /<tr><td>Ranking<\/td><td>2 \(of 2\)<\/td><\/tr>/);
  });

  test("an unknown profile redirects home with 'User not found'", async () => {
    const client = new Client(app.baseUrl);
    await client.signIn("frank");
    const res = await client.get("/users/nobody");
    assert.equal(res.location, "/");
    assert.equal(page((await client.get("/")).text).error, "User not found");
  });
});
