// Starts the real app (server.js) in a throwaway copy of the repo, so tests never touch
// ./database in the working tree. node_modules and public/ are symlinked. Nothing is sent to a
// grader: the app never dispatches submissions, and the tests play the grader's callback.
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const Database = require("better-sqlite3");

const repoRoot = path.resolve(__dirname, "..", "..");
const skip = new Set([".git", "node_modules", "public", "test", "database"]);

exports.PASSWORD = "test-password-123";
exports.SECRET = "s".repeat(48);
exports.API_SECRET = "a".repeat(32);

function freePort() {
  return new Promise(function (resolve, reject) {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", function () {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

function makeSandbox() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hcioj-test-"));
  for (const entry of fs.readdirSync(repoRoot)) {
    if (skip.has(entry) || entry.startsWith(".env")) continue;
    fs.cpSync(path.join(repoRoot, entry), path.join(dir, entry), { recursive: true });
  }
  fs.symlinkSync(path.join(repoRoot, "node_modules"), path.join(dir, "node_modules"), "dir");
  fs.symlinkSync(path.join(repoRoot, "public"), path.join(dir, "public"), "dir");
  return dir;
}

// server.js logs "HTTP Listening on port" right after calling listen(), so wait for the port
// itself. A TCP connect, not an HTTP request, so readiness never touches the app.
async function waitForPort(port, child, output) {
  const deadline = Date.now() + 15000;
  for (;;) {
    if (child.exitCode !== null)
      throw Error("App exited with code " + child.exitCode + ":\n" + output());
    const open = await new Promise(function (resolve) {
      const socket = net.connect(port, "127.0.0.1");
      socket.once("connect", () => resolve(socket.end() && true));
      socket.once("error", () => resolve(false));
    });
    if (open) return;
    if (Date.now() > deadline) throw Error("App did not start:\n" + output());
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

function launch(dir, env) {
  // cwd must be the (copied) repo root: express.static("public") and the views directory are
  // resolved against the working directory.
  return spawn(process.execPath, ["server.js"], {
    cwd: dir,
    env: {
      PATH: process.env.PATH,
      SESSION_SECRET: exports.SECRET,
      API_SECRET: exports.API_SECRET,
      GRADER_KEY: "k".repeat(32),
      IP: "127.0.0.1",
      DB_PATH: path.join(dir, "database", "test.db"),
      ...env,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

// Problems can only be created with a title and subtitle through the admin form, so the tests
// seed fuller ones straight into the database.
const PROBLEMS = [
  {
    title: "inside",
    subtitle: "Batch",
    tags: ["greedy"],
    subtasks: [{ score: 40 }, { score: 60 }],
  },
  { title: "outside", subtitle: "Batch", tags: ["graphs"], subtasks: [{ score: 100 }] },
  { title: "withfiles", subtitle: "Batch", subtasks: [{ score: 100 }], files: [{ name: "ans" }] },
];

function seedProblems(db) {
  const insert = db.prepare(
    `INSERT INTO problems (title, subtitle, added, tags, subtasks, files)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );
  PROBLEMS.forEach(function (p, i) {
    insert.run(
      p.title,
      p.subtitle,
      new Date(Date.UTC(2016, 0, 1 + i)).toISOString(),
      JSON.stringify(p.tags || []),
      JSON.stringify(p.subtasks),
      JSON.stringify(p.files || []),
    );
  });
}

// Resolves once the server accepts connections. `env` adds or overrides variables.
// `app.db` is a connection to the app's SQLite file (WAL mode, so both sides can use it).
exports.start = async function (env = {}) {
  const dir = makeSandbox();
  const port = await freePort();
  const child = launch(dir, { PORT: String(port), ...env });
  let output = "";
  child.stdout.on("data", (chunk) => (output += chunk));
  child.stderr.on("data", (chunk) => (output += chunk));
  try {
    await waitForPort(port, child, () => output);
  } catch (err) {
    child.kill();
    throw err;
  }
  const db = new Database(path.join(dir, "database", "test.db"));
  seedProblems(db);
  return {
    dir,
    db,
    baseUrl: "http://127.0.0.1:" + port,
    output: () => output,
    makeAdmin: (username) =>
      db.prepare("UPDATE users SET admin = 1 WHERE username = ?").run(username),
    stop: async function () {
      db.close();
      if (child.exitCode === null) {
        await new Promise(function (resolve) {
          child.once("exit", resolve);
          child.kill();
        });
      }
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
};

// Runs the app until it exits or `ms` passes; resolves to { code, output } (code null if it
// was still running).
exports.boot = async function (env, ms = 3000) {
  const dir = makeSandbox();
  const child = launch(dir, { PORT: String(await freePort()), ...env });
  let output = "";
  child.stdout.on("data", (chunk) => (output += chunk));
  child.stderr.on("data", (chunk) => (output += chunk));
  const code = await new Promise(function (resolve) {
    const timer = setTimeout(() => resolve(null), ms);
    child.once("exit", (exitCode) => {
      clearTimeout(timer);
      resolve(exitCode);
    });
  });
  if (child.exitCode === null) {
    await new Promise(function (resolve) {
      child.once("exit", resolve);
      child.kill();
    });
  }
  fs.rmSync(dir, { recursive: true, force: true });
  return { code, output };
};

function decode(s) {
  return s
    .replace(/&#x27;/g, "'")
    .replace(/&#x3D;/g, "=")
    .replace(/&#x60;/g, "`")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

// What a rendered page shows: the flash messages, the signed-in user (the layout's
// `var username`, empty when signed out) and the submission ids it links to.
exports.page = function (text) {
  const read = (re) => {
    const m = text.match(re);
    return m ? decode(m[1].trim()) : undefined;
  };
  const username = read(/var username = "([^"]*)";/) || undefined;
  return {
    error: read(
      /<p class="alert alert-danger">(?:<i class="fa fa-warning"><\/i>(?:&nbsp;)*)?([^<]*)<\/p>/,
    ),
    success: read(
      /<p class="alert alert-success"><i class="fa fa-rocket"><\/i>(?:&nbsp;)*([^<]*)<\/p>/,
    ),
    username,
    signedIn: username !== undefined,
    submissionIds: [...text.matchAll(/<a href="\/submissions\/(\d+)">/g)].map((m) => Number(m[1])),
  };
};

// A tiny browser stand-in: keeps cookies and reads the CSRF token from the forms' hidden
// _csrf field, the way the pages send it.
exports.Client = class Client {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.cookies = {};
    this.csrfToken = null;
  }

  get cookieHeader() {
    return Object.entries(this.cookies)
      .map(([k, v]) => k + "=" + v)
      .join("; ");
  }

  async request(method, url, { form, json, body, headers = {} } = {}) {
    const init = {
      method,
      redirect: "manual",
      headers: { cookie: this.cookieHeader, ...headers },
    };
    if (form) {
      init.body = new URLSearchParams(form).toString();
      init.headers["content-type"] = "application/x-www-form-urlencoded";
    } else if (json !== undefined) {
      init.body = JSON.stringify(json);
      init.headers["content-type"] = "application/json";
    } else if (body !== undefined) {
      init.body = body;
    }
    const res = await fetch(this.baseUrl + url, init);
    for (const cookie of res.headers.getSetCookie()) {
      const [pair] = cookie.split(";");
      const name = pair.slice(0, pair.indexOf("="));
      if (/expires=thu, 01 jan 1970/i.test(cookie)) delete this.cookies[name];
      else this.cookies[name] = pair.slice(pair.indexOf("=") + 1);
    }
    const text = await res.text();
    const token = text.match(/<input type="hidden" name="_csrf" value="([^"]+)"/);
    if (token) this.csrfToken = token[1];
    return {
      status: res.status,
      headers: res.headers,
      text,
      location: res.headers.get("location"),
    };
  }

  get(url, headers) {
    return this.request("GET", url, { headers });
  }

  // A POST the way the HTML forms send one: urlencoded, with the token in the _csrf field.
  post(url, fields = {}, headers) {
    return this.request("POST", url, { form: { _csrf: this.csrfToken, ...fields }, headers });
  }

  // Posts, then loads the redirect target and returns what it shows.
  async postAndFollow(url, fields, headers) {
    const res = await this.post(url, fields, headers);
    if (res.status !== 302) throw Error(`POST ${url}: expected a redirect, got ${res.status}`);
    const next = await this.get(res.location);
    return {
      location: res.location,
      status: next.status,
      text: next.text,
      ...exports.page(next.text),
    };
  }

  // GET then POST /signup with the form's fields; any field can be overridden. Both requests
  // count toward the auth rate limit (20 per 15 minutes per address, see baseline.test.js).
  async signUp(username, fields = {}) {
    await this.get("/signup");
    return this.postAndFollow("/signup", {
      username,
      realname: "User " + username,
      level: "2016",
      email: username + "@example.com",
      password: exports.PASSWORD,
      password2: fields.password ?? exports.PASSWORD,
      ...fields,
    });
  }

  async signIn(username, password = exports.PASSWORD) {
    await this.get("/signin");
    return this.postAndFollow("/signin", { username, password });
  }

  // Submits code through a problem page's form (practice, or a contest when `contestId` is set).
  // The form names the textarea "code" unless the problem has `files`.
  async submit(problem, { language = "cpp", code = "int main() {}", contestId } = {}) {
    const base = contestId ? `/contests/${contestId}` : "";
    await this.get(`${base}/problems/${problem}`);
    const action = contestId
      ? `/contests/${contestId}/submit/${problem}`
      : `/submissions/submit/${problem}`;
    return this.post(action, { language, code });
  }
};

// The grader's progress callback (documentation.json): form fields `secret` and `data` (JSON).
exports.graderCallback = function (baseUrl, data, secret = exports.API_SECRET) {
  return fetch(baseUrl + "/submissions/api", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret, data: JSON.stringify(data) }).toString(),
  });
};
