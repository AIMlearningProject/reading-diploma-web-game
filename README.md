# Reading Diploma Web Game
A web-based reading diploma game. The goal is to encourage the youth to read more by gamifying the reading of books.

### Endpoints in use

| Method | Endpoint                             | Description                                                    |
|--------|--------------------------------------|----------------------------------------------------------------|
| GET    | `/api/books/my-books`                | Get all books added by the user's "class" (teacher + students) |
| GET    | `/api/books/book-readers/:id`        | Get your student's names that are currently reading this book  |
| POST   | `/api/books`                         | Add new book                                                   |
| DELETE | `/api/books/:id`                     | Deletes book                                                   |
||||
| DELETE | `/api/users`                         | Deletes the teacher account making the request                 |
| PATCH  | `/api/users/profile/:id`             | Update profile info (name / avatar / grade)                    |
| PATCH  | `/api/users/profile/:id`             | Update profile info (name / avatar / grade)                    |
||||
| GET    | `/api/users/my-students`             | Get all students belonging to the logged-in teacher            |
| DELETE | `/api/users/my-students`             | Delete all your students and transfer requests                 |
| POST   | `/api/users/students`                | Create a student under the logged-in teacher                   |
| DELETE | `/api/users/students/:id/password`   | Change the student's password                                  |
||||
| GET    | `/api/progress`                      | Fetches all current user's progress entries                    |
| PUT    | `/api/progress/:level/completed`     | Updates level entry for user as complete                       |
| PUT    | `/api/progress/:level/status`        | Updates level status for student (incomplete/complete/reviewed)|
| GET    | `/api/progress/student/:id`          | Gets specified student's progress                              |
| GET    | `/api/progress/current-level`        | Gets user's most recent incomplete level                       |
| PUT    | `/api/progress/:level/add-book`      | Changes the book attached to a progress entry                  |
||||
| POST   | `/api/submissions/add-submission`    | adds a submission entry for the current user in current level  |
| GET    | `/api/submissions/student/:id`       | Gets specified student's submissions                           |
| GET    | `/api/submissions`                   | Gets user's submissions                                        |
| PUT    | `/api/submissions`                   | Updates the user's submissions for a level                     |
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
| POST   | `/auth/login`                        | Login using basic credentials (username, password)             |
| POST   | `/auth/logout`                       | Logout                                                         |
| GET    | `/auth/me`                           | Returns current session user                                   |
| GET    | `/auth/google`                       | Sign up or login using Google account                          |
| GET    | `/auth/google/callback`              | Redirects back to app frontend after login with Google         |
---

### Endpoints currently NOT in use (if no use is found, should be eventually removed)

| Method | Endpoint                             | Description                                                   |
|--------|--------------------------------------|---------------------------------------------------------------|
| GET    | `/api/books`                         | Get all books                                                 |
||||
| GET    | `/api/users`                         | Get all users                                                 |
| POST   | `/api/users/register`                | Create new user (also creates progress entries for new user)  |
| PATCH  | `/api/users/:id/role`                | Swaps the user role                                           |
| PATCH  | `/api/users/:id/change-password`     | Change user's password (needs currentPassword, password)      |
| GET    | `/api/users/profile/:id`             | Get user profile                                              |
||||
| POST   | `/api/progress/add-entry`            | Add a new progression entry                                   |
| GET    | `/api/progress/get-entry/:level`     | Gets specific level from current user                         |
||||
| GET    | `/api/submissions/my-students/:id`   | Gets specific submission entry                                |
| GET    | `/api/submissions/my-students`       | Gets current user's student submissions                       |
| DELETE | `/api/submissions/:id`               | Deletes specific submission entry                             |
||||
| GET    | `/api/rewards/:id`                   | Fetches all of user's rewards                                 |
---