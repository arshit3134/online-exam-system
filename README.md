# ExamFlow — Online Examination System (MERN)

A secure, MCQ-only examination platform with a teacher analytics workspace and a distraction-free candidate exam experience. Dark, responsive SaaS UI.

**Stack** — React 18 + Vite, Tailwind CSS, React Router, Axios, Framer Motion, Lucide, Recharts · Node.js, Express, MongoDB/Mongoose, JWT in HTTP-only cookies, bcryptjs, Zod, Helmet, rate limiting.

## Features

**Teacher** — live dashboard (students, exams, attempts, average / highest / lowest score, pass rate), five Recharts charts, **Most Difficult Questions** ranking (incorrect count, % incorrect, correct answer, most-chosen wrong option), exam create/edit/delete/publish, MCQ editor (2–4 options, one correct answer, marks, explanation, reorder, question counter), per-exam attempts, per-student review, per-exam or per-attempt result release.

**Candidate** — dashboard with stats, available exams, exam screen with server-synced countdown, question navigator (current / answered / visited / not visited), autosave every 10 s, refresh recovery, confirmation before submit, auto-submit at zero, result page with donut chart and full answer review with explanations.

**Only two roles.** Public registration always creates a *candidate*. Teachers are provisioned by script or env seed (below).

## Architecture

```
online-exam-system/
├── client/                 React SPA (Vite)
│   └── src/ components · pages (auth, teacher, candidate) · layouts · context · hooks · services · utils
└── server/                 Express API
    ├── config/ controllers/ middleware/ models/ routes/ services/ validators/ utils/
    ├── scripts/            createTeacher · seedDemo · e2e
    └── server.js
```

Questions are embedded in the `Exam` document. `ExamAttempt` stores answers, grading result, timing and release state.

### How the security rules are met

| Requirement | Implementation |
|---|---|
| Answer key never sent before submission | Candidate payloads are built field-by-field (`toCandidateQuestions`); `correctOption` / `explanation` only appear in `buildReview`, which is served only for a *submitted + released* attempt owned by the caller. |
| Grading only on the backend | `attemptService.grade` uses the stored key. The client sends only selected option indexes; any score it sends is ignored. |
| Server-side timing | `expiresAt` is fixed at start (`min(duration, exam end)`). Answers arriving after expiry + grace are ignored. A background sweeper auto-submits abandoned attempts. |
| No double submission | Finalisation is an atomic `findOneAndUpdate({status:'in_progress'})`; repeat or concurrent submits return the same result. |
| No duplicate attempts | Attempt limit per candidate (default 1; teacher may allow more) plus a unique partial index allowing one in-progress attempt. |
| Auth | bcrypt hashes, JWT in `HttpOnly` + `Secure` (prod) cookie, role middleware, strict CORS, CSRF header, Helmet, auth rate limiter, Zod validation, NoSQL-operator stripping, centralised error handler. |
| Result release | Per exam: `immediate` or `manual`; teachers can also release/hide a single attempt. Unreleased results expose no score, answers or explanations. |

## Run locally

Prerequisites: Node 18+, a MongoDB instance (local or Atlas).

```bash
# 1. API
cd server
cp .env.example .env        # set MONGODB_URI and a JWT_SECRET (32+ chars)
npm install
npm run create-teacher -- --name "Jane Doe" --email jane@school.edu --password "Str0ng-Password"
npm run dev                 # http://localhost:5000

# 2. Client (new terminal)
cd client
cp .env.example .env        # leave VITE_API_URL empty; Vite proxies /api to :5000
npm install
npm run dev                 # http://localhost:5173
```

Optional demo data (refuses to run in production): `npm run seed:demo` → teacher `teacher@demo.dev`, students `student1@demo.dev` … `student12@demo.dev`, password `Demo1234`.

Sign in: candidates at `/login` (register at `/register`), teachers at `/teacher/login`.

Generate a JWT secret: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

## Create the first teacher

Any one of:

1. **Script** (recommended): `cd server && npm run create-teacher -- --name "…" --email … --password "…"` (run with `MONGODB_URI` pointing at production; use `--promote` to upgrade an existing candidate).
2. **Env seed**: set `SEED_TEACHER_NAME`, `SEED_TEACHER_EMAIL`, `SEED_TEACHER_PASSWORD` on the API. The account is created on boot if absent. Remove the variables after the first successful deploy.

## Database setup (MongoDB Atlas)

1. Create a free **M0** cluster at <https://cloud.mongodb.com>.
2. *Database Access* → add a user with a strong password (read/write on any database).
3. *Network Access* → allow `0.0.0.0/0` (Render/Railway free tiers use dynamic IPs) or the provider's egress IPs.
4. *Connect → Drivers* → copy the URI, add a database name:
   `mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/exam-system?retryWrites=true&w=majority`
5. Indexes are created automatically by Mongoose on first boot.

## Deploy

### 1. API on Render (or Railway)

**Render** — *New → Blueprint*, select the repo; `render.yaml` provisions the service. Then set in the dashboard:

| Variable | Value |
|---|---|
| `MONGODB_URI` | Atlas URI from above |
| `CLIENT_URL` | Your Vercel URL, e.g. `https://examflow.vercel.app` (comma-separate multiple origins, no trailing slash) |
| `JWT_SECRET` | auto-generated by the blueprint |

Manual setup: root directory `server`, build `npm ci --omit=dev`, start `npm start`, health check `/api/health`.

**Railway** — new project from the repo, root directory `server` (`railway.json` included), add the same variables.

Create the teacher account afterwards (script from your machine, or the env seed).

### 2. Client on Vercel

1. Import the repo, set **Root Directory** to `client` (Vite is detected).
2. Edit `client/vercel.json` and replace `https://YOUR-BACKEND.onrender.com` in the `/api` rewrite with your API URL. With this rewrite the browser only talks to the Vercel domain, so cookies are first-party and CORS is not involved.
3. Deploy.

*Alternative without the rewrite:* set `VITE_API_URL=https://your-api.onrender.com/api` in Vercel and keep `CLIENT_URL` on the API set to the Vercel origin. Cookies are then cross-site (`SameSite=None; Secure`, the production default); some browsers block third-party cookies, so the rewrite is the more robust option.

### 3. Verify

`GET https://<api>/api/health` → `{"status":"ok"}`. Sign in as the teacher, create and publish an exam, register a candidate in a private window and take it.

> Render's free tier sleeps after inactivity; the first request may take ~30 s.

## Environment variables

**server/.env**

| Name | Description |
|---|---|
| `NODE_ENV` | `development` / `production` |
| `PORT` | default `5000` |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | ≥ 32 chars |
| `JWT_EXPIRES_DAYS` | session length, default 7 |
| `CLIENT_URL` | allowed browser origin(s) |
| `COOKIE_SAME_SITE` | override `lax` / `strict` / `none` |
| `SUBMIT_GRACE_SECONDS` | network grace after the timer ends, default 15 |
| `SEED_TEACHER_*` | optional first-teacher seed |

**client/.env** — `VITE_API_URL` (empty = same-origin `/api`).

## API summary

`POST /api/auth/register|login|logout`, `GET /api/auth/me`

Teacher: `GET /api/teacher/dashboard|analytics|difficult-questions|students`, `GET|POST /api/teacher/exams`, `GET|PUT|DELETE /api/teacher/exams/:id`, `PATCH /exams/:id/status`, `PATCH /exams/:id/release-results`, `GET /exams/:id/attempts`, `GET /attempts/:id`, `PATCH /attempts/:id/release`

Candidate: `GET /api/candidate/dashboard|exams|exams/:id|results|results/:id|attempts/:id`, `POST /exams/:id/start`, `PUT /attempts/:id/answers`, `POST /attempts/:id/submit`

List endpoints accept `page`, `limit`, and `q` where relevant. All state-changing requests need the `X-Requested-With: XMLHttpRequest` header (the client sends it).

## Testing

`cd server && npm run test:e2e` runs 51 end-to-end checks against the real HTTP API (auth, RBAC, answer-key secrecy, grading, timers, duplicate submission, release rules, analytics). It starts an in-memory MongoDB automatically, or uses `E2E_MONGODB_URI`.
