# Backend Testing

Integration tests for the books, progress, submissions and rewards endpoints, written with
[Vitest](https://vitest.dev/) and [supertest](https://github.com/ladjs/supertest).

```bash
npm test
```

That is three steps: `pretest` creates the test database, `test` runs Vitest, `posttest` drops
the database again. The development database is never touched.

## Layout

- `integration/api_integration.test.js` — all of the tests. They live in one file on purpose:
  separate files run in parallel workers and fight over the knex migration lock.
- `testConfig/globalSetup.js` — runs once, migrates the test database and loads the fixtures.
- `testConfig/cleanTestDB.js` — `resetDB()`, called before every test.

## Test database

`NODE_ENV=test` selects the `test` environment in `knexfile.js`, which points at
`rdiplomatestintegration` (override with `INTEGRATION_TEST_DB_NAME`). It is created by
`scripts/createDatabase.js` and dropped by `scripts/removeTestDB.js`, both under
`backend/scripts/`.

`resetDB()` **truncates** the tables and reloads `db/seeds/users_seed.js`. Do not change it back
to rolling the migrations back and forward: the down migration of
`20260826113911_remove_books_coverimage` re-adds `coverimage` as `NOT NULL`, which fails as soon
as a test has inserted a book.

## Fixtures

`db/seeds/users_seed.js` inserts six users with **fixed ids**, because the tests authenticate as
id 1:

| id | name | role |
|----|------|------|
| 1 | John | teacher |
| 2 | Alice | student of John |
| 3 | Kalle | student of John |
| 4 | Pekka | student with no teacher |
| 5 | Timo | second teacher |
| 6 | Maija | student of Timo |

The ids have to be explicit: running the migrations leaves the users id sequence at 2, so letting
Postgres assign them would make the first teacher id 2 and break every `teacher_id` reference.

## Authentication

The tests build a small Express app around the real routers and fake only `request.user` and
`request.isAuthenticated()`. Everything below the controller — services, models, SQL — runs for
real. `loginAs(user)` decides who the next request comes from, which is how the teacher/student
authorisation cases are covered.

## Notes

- Keep the leading `./` in the `include` glob in `vitest.integration.config.js`. Without it Vitest
  finds no test files at all on Windows when the project path contains a space, and still exits 0.
- Vitest is pinned to `^3`. npm 10.9.2 cannot resolve Vitest 4's peer graph.
- Coverage (istanbul) is on by default and is the memory-hungry part of the run. Disable it with
  `--coverage.enabled=false` if the machine is short on RAM.
- There are no unit tests and no frontend tests. The original unit suite was deleted upstream in
  commit `c3216f6`; it is still in that commit's parent.
- CI does not run these tests. The only workflow is `.github/workflows/codeql.yml`.
