# Reading Diploma Web Game
A web-based reading diploma game. The goal is to encourage the youth to read more by gamifying the reading of books.

## Installation & Setup 

### Prerequisites

- Node.js 22 or newer and npm
- PostgreSQL (https://www.postgresql.org/download/) installed and running
---
### Installation
### Backend
Create a .env file in /backend which contains AT LEAST these following **required** parameters. The optional parameters can be used to configure the database connection and names incase default values don't work. 
> Running npm install in /backend will also generate a default .env file containing randomly generated SESSION_SECRET and INVITE_SECRET, if one doesn't already exist.
```
# ∨∨∨ REQUIRED ∨∨∨
PORT=3001                                           #<--- Port where the backend will run
DB_PASSWORD=yourPostgresPassword                    #<--- Password set when installing PostgreSQL (password for DB_USER)
GOOGLE_CLIENT_ID=123                                #<--- Required for Google auth, not reavealed publicly!!!
GOOGLE_CLIENT_SECRET=123                            #<--- Required for Google auth, not reavealed publicly!!!
SESSION_SECRET=randomlyGeneratedStringOfCharacters  #<--- Generate this yourself (tools below)
INVITE_SECRET=randomlyGeneratedStringOfCharacters   #<--- Generate this yourself (tools below)
# ∧∧∧ REQUIRED ∧∧∧

# ∨∨∨ Required in production environments, to set the Access-Control-Allow-Origin to service domain
PUBLIC_URL=http://localhost:3001/                  #<--- server domain when running locally
# ∧∧∧ Production ∧∧∧

# ∨∨∨ optional ∨∨∨ These values will be set to these defaults if not defined here
DB_HOST=localhost                                 #<--- Where the database is hosted, localhost if not defined
DB_PORT=5432                                      #<--- Port where your PostgreSQL database is running (5432 by default)
DB_USER=postgres                                  #<--- PostgreSQL username (postgres by default)
DB_NAME=rdiploma                                  #<--- Name of the database, 'rdiploma' if not defined
NODE_ENV=development                              #<--- Environment mode (development/test/production), set by npm scripts
# ∧∧∧ optional ∧∧∧
```

>**IMPORTANT** GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are used for google authentication and can't be uploaded to GitHub, **Google authentication will not work without them**. You can create your own project in the Google cloud api console (https://console.developers.google.com/) and use the values provided there. More detailed instructions (for developers creating your own project) can be found at https://developers.google.com/identity/oauth2/web/guides/get-google-api-clientid.

>If you don't have the GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, you can also use the browser console snippets in the [Testing](#testing-without-google-auth) section instead. **Requires you to create a testing teacher account first** (e.g. with psql).

You can use the command `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` to generate the SESSION SECRET and INVITE_SECRET for the .env file. Generators can also be found online (e.g. [it-tools.tech/token-generator](https://it-tools.tech/token-generator)).

```bash
# Backend installation
# Creates required PostgreSQL database, installs required packages, and runs migrations.
cd backend
npm install
```

### Frontend
```bash
cd frontend
npm install
```

## Running the Application

### Development mode

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# Frontend runs on http://localhost:5173
# API calls to /api are proxied to the backend (http://localhost:3001) automatically, via vite.config.js
```

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
# Backend runs on http://localhost:3001, by default
```
---

### Production mode

**Terminal 2 - Frontend: (Production Build)**
```bash
cd frontend
npm run build    # Output in dist/
npm run preview  # Preview the production build locally
```

**Terminal 1 - Backend:**
```bash
cd backend
npm run start
# Application uses built frontend/dist/
# npm run start also checks if frontend/dist/ exists and builds it if it doesn't exist (check doesn't work in powershell or cmd).
```

## Frontend

### Routing
The app uses React Router. Users land on a welcome page and choose a role:
- `/` — WelcomePage (role selection)
- `/login/teacher` — Teacher login (email + password)
- `/login/student` — Student login (teacher name + student name + password)
- `/sign-up/student` — Student register (requires invitation link from a teacher account)
- `/teacher/dashboard` — Teacher dashboard (protected, teacher role only)
- `/game` — Phaser game (protected, student role only)

Auth state is managed by `AuthContext` (`src/contexts/AuthContext.jsx`) which checks the session via `GET /auth/me` on load.

> **Note:** Google OAuth requires `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `backend/.env` (ask a team member for the values). Once set, teacher login via Google works normally. If you don't have the credentials, use the browser console snippets in the [Testing](#testing-without-google-auth) section instead.


## Backend
### Endpoints

| Method | Endpoint                             | Description                                                    |
|--------|--------------------------------------|----------------------------------------------------------------|
| GET    | `/api/books/book-readers/:id`        | Get your student's names that are currently reading this book  |
| GET    | `/api/books/my-books`                | Get all books added by the user's "class" (teacher + students) |
| POST   | `/api/books`                         | Add new book                                                   |
| DELETE | `/api/books/:id`                     | Deletes book                                                   |
||||
| DELETE | `/api/users`                         | Deletes the teacher account making the request                 |
| PATCH  | `/api/users/profile/:id`             | Update profile info (name / avatar / grade)                    |
||||
| GET    | `/api/users/my-students`             | Get all students belonging to the logged-in teacher            |
| DELETE | `/api/users/my-students`             | Delete all your students and transfer requests                 |
| POST   | `/api/users/students`                | Create a student under the logged-in teacher                   |
| POST   | `/api/users/invite/student`          | Create a student under the inviting teacher                    |
| DELETE | `/api/users/students/:id`            | Delete a student account                                       |
| DELETE | `/api/users/students/:id/password`   | Change the student's password                                  |
||||
| GET    | `/api/progress`                      | Fetches all current user's progress entries                    |
| GET    | `/api/progress/student/:id`          | Gets specified student's progress                              |
| PUT    | `/api/progress/:level/completed`     | Updates level entry for user as complete                       |
| PUT    | `/api/progress/:level/current-progress`| Updates the current_progress of that level                   |
| PUT    | `/api/progress/:level/status`        | Updates level status for student (incomplete/complete/reviewed)|
| PUT    | `/api/progress/:level/add-book`      | Changes the book attached to a progress entry                  |
||||
| GET    | `/api/submissions`                   | Gets user's submissions                                        |
| PUT    | `/api/submissions`                   | Updates the user's submissions for a level                     |
| POST   | `/api/submissions/add-submission`    | adds a submission entry for the current user in current level  |
| GET    | `/api/submissions/student/:id`       | Gets specified student's submissions                           |
||||
| POST   | `/api/rewards/add-reward`            | Add a reward (avatar?) for user                                |
| GET    | `/api/rewards`                       | Fetches all of current user's rewards                          |
||||
| POST   | `/api/transfer-requests`             | Send request to transfer your students to another teacher      |
| GET    | `/api/transfer-requests/inbox`       | Get transfer requests sent to you                              |
| GET    | `/api/transfer-requests/outbox`      | Get transfer requests that you have sent                       |
| PATCH  | `/api/transfer-requests/:id/accept`  | Transfers all students from a teacher to you                   |
| PATCH  | `/api/transfer-requests/:id/reject`  | Reject transfer request                                        |
| DELETE | `/api/transfer-requests/:id`         | Delete transfer request that you have sent                     |
||||
| GET    | `/api/invite/`                       | Get invite link for current teacher                            |
| POST   | `/api/invite/regenerate`             | Regenerates a new invite link invalidating all previous links  |
| PATCH  | `/api/invite/toggle`                 | Enable / disable invite link                                   |
||||
| POST   | `/auth/login`                        | Login using basic credentials (username, password)             |
| POST   | `/auth/logout`                       | Logout                                                         |
| GET    | `/auth/me`                           | Returns current session user                                   |
| GET    | `/auth/google`                       | Sign up or login using Google account                          |
| GET    | `/auth/google/callback`              | Redirects back to app frontend after login with Google         |
---

## Testing without Google auth

If you don't have the Google OAuth credentials in your `.env`, you can log in via the browser console instead. Run these snippets at `http://localhost:5173`.

> **Important:** If you get `Unexpected end of JSON input` when running a snippet, you might already have an active session. Clear it first using **Option B** in the Troubleshooting section (DevTools → Application → Cookies → delete session cookie), then run the snippet again.

**Teacher dashboard:**
```js
fetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'TestTeacher', password: 'Test123!' })
}).then(r => r.json()).then(d => { console.log(d); window.location.href = '/teacher/dashboard' })
```

**Student dashboard — first create a student via the teacher dashboard, then:**
```js
fetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: '<student_name>', password: '<student_password>', teacher_name: 'TestTeacher' })
}).then(r => r.json()).then(d => { console.log(d); window.location.href = '/student/dashboard' })
```
Or directly log in through the login page by typing in the student credentials you just created.

## Troubleshooting

### Development phase

**Can't test endpoints using REST client**
- Error: 'Invalid CSRF token': comment out app.use(lusca({...})) for the duration of testing (It creates the csrf token requirement. Applies to all REST clients).
- If using **Thunder client**, after commenting out the lusca part, Error: 'Unauthorized' on every other endpoint except auth/**: reason for this is still unknown, but this problem doesn't appear when using Postman, so consider using that, or another REST client instead.

**Error: 'Invalid CSRF token' on request via frontend/UI**
- post, put, patch or delete fetch request is likely missing X-CSRF-TOKEN header. Add the header according to the instructions at [backend/app.js](https://github.com/Osoito/ReadingDiplomaWebGame_Capstone1/blob/main/backend/app.js) (At the part that says 'Set the X-CSRF-TOKEN header in the frontend like this').

**Error: 'Liian monta pyyntöä. Yritä uudelleen X sekunnin kuluttua.' on request**
- This happens due to request rate limiting applied in [backend/app.js](https://github.com/Osoito/ReadingDiplomaWebGame_Capstone1/blob/main/backend/app.js). Adjust the requests / time window (max/windowMs) accordingly if this error happens during regular application use. This is used to fend off Denial-of-Service attacks.

**If migrations (in backend) have been edited**
- run `npx knex migrate:rollback --all` to rollback all migrations, then run `npx knex migrate:latest` to rerun all new migrations

**If new migrations have been added (in backend)**
- run `npx knex migrate:latest` to run all new migrations

### Running the application

**Login page redirects straight to `/teacher/dashboard` or `/game`**
- Your browser still holds a session cookie from a previous login. The app correctly treats you as logged in and redirects you.
- **Option A (easiest):** Click the logout button in the Teacher Dashboard or Student game view to clear the session properly.
- **Option B (manual):** Open DevTools (`F12`) → **Application** tab → **Cookies** → `http://localhost:5173` → delete the session cookie entry → refresh the page.
- **Option C (console):** Run this snippet in the browser console to log out programmatically:
  ```js
  fetch('/auth/logout', { method: 'POST' }).then(() => window.location.href = '/')
  ```

**Dev server starts on port 5176 (or 5174/5175) instead of 5173**
- Multiple Vite instances are running from previous `npm run dev` calls that weren't stopped.
- Close all terminal windows that were running `npm run dev`, then start a fresh one. Port 5173 will be available again.
- Alternatively, in PowerShell: `Get-NetTCPConnection -LocalPort 5174,5175,5176 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }`

**'Command failed with exit code 1.' when running `npm install` or `npm run db:create` in backend/**
- Create a .env file in **backend/** and add the required fields to it mentioned in the [Installation](#installation) part. After that, run `npm install` in **backend/** to install the package and create the required database.

**Can't connect to database (Constant internal server errors on requests)**
- On Windows: open services, find postgresql, ensure it says running.
- Ensure you have a .env file in the backend root, which contains the values mentioned above ([Installation](#installation)).
- PostgreSQL might not always be running on port:5432 (e.g. if it's already in use). Check which port PostgreSQL is running on. With psql run:  `psql -h localhost -U postgres`, then run: `SHOW port;` Then update the shown port number to your .env file DB_PORT.
