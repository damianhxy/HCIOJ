# HCIOJ

"HCI Online Judge": an Express 5 + Handlebars online judge built at Hwa Chong Institution for
club training (release `final-2016`). Users sign up, read problems, submit code, join timed
contests, ask clarifications and appear in the rankings. Users, problems, submissions, contests,
entries and clarifications are in SQLite (better-sqlite3) at `database/hcioj.db` (or `DB_PATH`).
The site is not deployed.

The site is kept at **archive level**: pages work and submissions are stored, but nothing grades
them. The grader was a separate program (not in this repo) that reported progress to
`POST /submissions/api` (protocol in `documentation.json`); `models/submission.js` `dispatch`,
which would send it work, has no callers. Don't restore grading, and never run submitted code.

## Run and check

- Node: the version in `.node-version` (also the `engines` floor in `package.json`). On Docker
  use a full Debian trixie image (e.g. `node:22.23.4-trixie`): bookworm's glibc is too old for
  better-sqlite3's prebuilt binary, and slim images lack the tools to build it from source.
- `npm ci --engine-strict`, then copy `.env.example` to `.env` and set `SESSION_SECRET` (32+
  characters) and `API_SECRET` (16+). Run `npm start` (or `npm run dev`) **from the repo root**;
  it listens on `PORT` (8080) at `IP` (0.0.0.0). There is no admin sign-up: set `admin = 1` on a
  user in the `users` table.
- **Gate** (what CI runs; all must pass before a PR is ready):

  ```sh
  npm ci --engine-strict && npm run lint && npm run format:check && npm test && npm audit --omit=dev
  ```

- `npm test` boots the real `node server.js` in a temporary copy of the repo (your `database/` is
  never touched) and seeds three problems straight into its database (the admin form can only
  set a title and subtitle). `test/helpers/app.js` drives it over HTTP with a cookie-jar client
  that reads the CSRF token from the forms' hidden `_csrf` field, and plays the grader's callback
  with `graderCallback`. No network is needed. Every GET and POST of `/signin` and `/signup`
  counts toward one limit of 20 per 15 minutes, so each `describe` block starts its own app.

## Where things live

- `server.js`: startup (clears the online-users table, then listens and attaches socket.io).
  `controllers/settings.js`: env (port, secrets, grader address, languages).
  `controllers/config.js`: middleware (static files, request log, body parsing, MemoryStore
  sessions, the auth rate limiter, CSRF via csrf-sync, passport strategies, socket.io).
- `controllers/routes.js`: home, sign-in/up, sign-out, and the 404/500 handlers.
  `controllers/{problems,submissions,contests,clarifications,users,admin}.js`: one router each.
  `/submissions/api` is the grader callback (no CSRF; checked against `API_SECRET`).
- `models/db.js`: the connection and schema. `models/*.js`: queries per table.
  `helpers/*.js`: Handlebars helpers. `middlewares/`: `auth`, `admin`, flash messages.
- `views/*.handlebars`; `public/js/` (page scripts, socket.io live updates; vendored libraries).
- `test/`: `node:test` suites; `test/helpers/` holds the harness.
- `.github/workflows/ci.yml`: checks `test (floor)`, `test (lts)` and `audit` on every PR and
  push to `main`, weekly on Mondays; a failing scheduled run opens a "Scheduled CI failed" issue.
  `dependabot.yml`: monthly grouped updates. `dependabot-auto-merge.yml`: patch and minor
  Dependabot PRs merge themselves once the required checks pass.

## Conventions

- Damian merges. Agents work on branches and open or update PRs; they never merge, close PRs,
  push to `main` or change repository settings.
- One problem per commit, one theme per PR. Imperative, sentence-case subjects with no prefix,
  except dependency commits: `fix(deps): update <pkg> <old> -> <new> (GHSA-…)`.
- Commit bodies say what was wrong (citing the commit that caused it), the fix, and how it was
  verified: the result before and after. A behavioural fix adds a test that fails before it.
- Don't force-push a pushed branch; add commits, and merge the base in to update it.
- Stacked PRs say so in the description and give the merge order.
- Known gaps are `test.todo` entries named after the item they miss. Fixing one means dropping
  `.todo` in the same PR.
- The CSRF form field is `_csrf`; scripts send the token in `X-CSRF-Token`.
- Never execute submitted code, in tests or anywhere else.

## Decided against (don't re-propose)

- npm's audit "fix" for the dev-only eslint/minimatch advisory.
- Migrating old NeDB data into SQLite. There is no data worth migrating.
- Restoring grading (sending submissions to a grader). The site stays at archive level.
- Turning on a Content-Security-Policy as a side effect of another fix.

## Known issues (don't re-investigate)

- Sign-out (`GET /logout`) is a 500 and the user stays signed in: passport 0.7's `req.logout`
  needs a callback (open PR #1). Even then it is a GET, and the session isn't destroyed.
- A CSRF failure or a malformed body reaches Express's default handler, which shows a stack trace
  outside production; the 3-argument handler in `routes.js` never runs (open PR #1).
- Grader results are never scored: the code tests `res_type` but the grader sends `restype`, and
  `restype` is never stored, so graded submissions stay in the queue; every grader callback also
  creates a session (open PR #1).
- The practice form names its textarea `code` but the route reads `ans`, so practice submissions
  store empty code (open PR #6, stacked on #3).
- Anyone signed in can open a contest's problems, submit to it and read or post its
  clarifications without joining; entrants can submit problems outside the contest (open PR #3).
- Sign-in is case-sensitive while sign-up lowercases the username (open PR #7).
- The auth limiter is mounted with `app.use("/signin")` / `("/signup")`, so page loads count
  (open PR #8).
- Practice submissions show "Contest #0" and contest links are malformed (open PR #9).
- The CSRF token is also accepted from the query string (`?_csrf=`).
- The `.env.example` placeholders pass the secret length checks, so they boot; `GRADER_KEY`
  falls back to a placeholder.
- Sessions use MemoryStore (lost on restart, unbounded). The cookie is never `Secure` and
  `trust proxy` is never set. There is no helmet.
- The "Welcome" flash after sign-up or sign-in is never shown: passport 0.7 regenerates the
  session it was stored in.
- `users.disabled` is never checked at sign-in.
- `LOG_TIME_FORMAT` in `settings.js` (and the client scripts) uses `MM`, the month, for minutes.
- The contest page links its problems to `/contests//problems/<title>`: `views/contest.handlebars`
  uses `../../contest.id`, which was right for Handlebars 3 but overshoots in Handlebars 4.
- The admin UI is unfinished: `/admin/users` renders a missing view (500), the problem editor
  only stores a title and subtitle, `POST /admin/editproblem` edits a contest, the edit-contest
  form sends no contest id, and clarification answers can only be entered in the database.
- Error redirects go to the raw `Referer`, not checked for the same origin.
  `res.status(401).redirect(...)` sends 302 (redirect overrides the status); don't add more.
- Contest submissions are listed site-wide with user, score and verdict, so a hidden scoreboard
  doesn't hide results.
- `public/` and `views/` are resolved against the working directory, so the app only starts from
  the repo root. `README.md` still describes the old HTTPS server.
