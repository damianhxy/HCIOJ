const assert = require("node:assert/strict");
const { describe, test, before, after } = require("node:test");
const { start, boot, Client, PASSWORD, SECRET, API_SECRET } = require("./helpers/app.js");

describe("CSRF", () => {
  let app;
  before(async () => (app = await start()));
  after(() => app.stop());

  async function visitor() {
    const client = new Client(app.baseUrl);
    await client.get("/signin");
    return client;
  }

  test("a POST without a token is refused with 403", async () => {
    const client = await visitor();
    const res = await client.request("POST", "/signin", {
      form: { username: "x", password: "y" },
    });
    assert.equal(res.status, 403);
  });

  test("a wrong token is refused with 403", async () => {
    const client = await visitor();
    const res = await client.request("POST", "/signin", {
      form: { _csrf: "not-the-token", username: "x", password: "y" },
    });
    assert.equal(res.status, 403);
  });

  test("the token in the form's _csrf field is accepted", async () => {
    const client = await visitor();
    const res = await client.post("/signin", { username: "x", password: "y" });
    assert.equal(res.status, 302);
  });

  test("the token in the X-CSRF-Token header is accepted", async () => {
    const client = await visitor();
    const res = await client.request("POST", "/signin", {
      form: { username: "x", password: "y" },
      headers: { "x-csrf-token": client.csrfToken },
    });
    assert.equal(res.status, 302);
  });

  test("a bodyless POST with the header token is neither 403 nor 500", async () => {
    const client = await visitor();
    const res = await client.request("POST", "/signin", {
      headers: { "x-csrf-token": client.csrfToken },
    });
    assert.equal(res.status, 302);
  });

  test("the grader callback needs no CSRF token", async () => {
    const res = await fetch(app.baseUrl + "/submissions/api", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: "secret=wrong&data=%7B%7D",
    });
    assert.equal(res.status, 401);
  });

  test.todo(
    "3.5 no query-string CSRF token: a POST with the token only in ?_csrf= is refused with 403",
  );
  test.todo(
    "3.7 app-level 4-arg error handler: a CSRF failure shows a short message, no stack trace (open PR #1)",
  );
});

describe("secrets", () => {
  test("a missing SESSION_SECRET stops startup with exit 1", async () => {
    const { code, output } = await boot({ SESSION_SECRET: "" });
    assert.equal(code, 1);
    assert.match(output, /SESSION_SECRET must be set/);
  });

  test("a SESSION_SECRET under 32 characters stops startup with exit 1", async () => {
    const { code } = await boot({ SESSION_SECRET: "short-secret" });
    assert.equal(code, 1);
  });

  test("a missing API_SECRET stops startup with exit 1", async () => {
    const { code, output } = await boot({ API_SECRET: "" });
    assert.equal(code, 1);
    assert.match(output, /API_SECRET must be set/);
  });

  test("the app boots with both secrets set", async () => {
    const { code } = await boot({ SESSION_SECRET: SECRET, API_SECRET });
    assert.equal(code, null);
  });

  test.todo(
    "3.3 placeholder/short secret refused: the .env.example SESSION_SECRET and API_SECRET placeholders stop startup with exit 1",
  );
  test.todo(
    "3.3 placeholder/short secret refused: a missing GRADER_KEY stops startup instead of falling back to a placeholder",
  );
});

describe("rate limits", () => {
  test("the 21st sign-in attempt within 15 minutes gets 429", async () => {
    const app = await start();
    try {
      const client = new Client(app.baseUrl);
      await client.get("/problems/inside"); // a CSRF token without touching /signin
      for (let i = 1; i <= 20; i++) {
        const res = await client.post("/signin", { username: "x", password: PASSWORD });
        assert.equal(res.status, 302, `attempt ${i}`);
      }
      const res = await client.post("/signin", { username: "x", password: PASSWORD });
      assert.equal(res.status, 429);
      assert.match(res.text, /Too many authentication attempts/);
    } finally {
      await app.stop();
    }
  });

  test("sign-up shares the sign-in limit", async () => {
    const app = await start();
    try {
      const client = new Client(app.baseUrl);
      await client.get("/problems/inside");
      for (let i = 1; i <= 20; i++) await client.post("/signin", { username: "x", password: "y" });
      const res = await client.post("/signup", { username: "late" });
      assert.equal(res.status, 429);
    } finally {
      await app.stop();
    }
  });

  test.todo("3.4 auth limiter POST-only: 25 loads of /signin get no 429 (open PR #8)");
});

describe("production mode", () => {
  test("NODE_ENV=production boots and serves the landing page", async () => {
    const app = await start({ NODE_ENV: "production" });
    try {
      assert.equal((await fetch(app.baseUrl + "/")).status, 200);
    } finally {
      await app.stop();
    }
  });

  test.todo(
    "3.4 TRUST_PROXY for the Secure cookie: with NODE_ENV=production behind an HTTPS proxy the session cookie is issued, Secure (no Secure flag at all today)",
  );
  test.todo("3.4 persistent session store: sessions survive a restart (MemoryStore today)");
});

describe("responses", () => {
  let app;
  before(async () => (app = await start()));
  after(() => app.stop());

  test("the landing page is served to visitors", async () => {
    const res = await fetch(app.baseUrl + "/");
    assert.equal(res.status, 200);
    assert.match(await res.text(), /<a href="\/signin"/);
  });

  test("an unknown path is a 404 page", async () => {
    const res = await fetch(app.baseUrl + "/no-such-page");
    assert.equal(res.status, 404);
    assert.match(await res.text(), /No such page exists/);
  });

  test("static files are served", async () => {
    const res = await fetch(app.baseUrl + "/css/main.css");
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type"), /text\/css/);
  });

  test("responses carry no X-Powered-By header", async () => {
    const res = await fetch(app.baseUrl + "/");
    assert.equal(res.headers.get("x-powered-by"), null);
  });

  test("the session cookie is HttpOnly", async () => {
    const res = await fetch(app.baseUrl + "/");
    const cookie = res.headers.getSetCookie().find((c) => c.startsWith("connect.sid="));
    assert.ok(cookie);
    assert.match(cookie, /HttpOnly/);
  });

  test("a malformed JSON body is a 400", async () => {
    const client = new Client(app.baseUrl);
    await client.get("/signin");
    const res = await client.request("POST", "/clarifications", {
      body: "{bad",
      headers: { "content-type": "application/json", "x-csrf-token": client.csrfToken },
    });
    assert.equal(res.status, 400);
  });

  test.todo(
    "3.7 app-level 4-arg error handler: a malformed JSON body shows a short message, no stack trace (open PR #1)",
  );
  test.todo("one-repo finding: responses carry helmet's headers (no helmet today)");
  test.todo(
    "one-repo finding: the request log's time shows minutes (settings.js LOG_TIME_FORMAT uses MM, the month)",
  );
});
