import bcrypt from 'bcrypt'

/**
 * Fixture users for the integration tests. Loaded by tests/testConfig/globalSetup.js
 * and again before every test by tests/testConfig/cleanTestDB.js.
 *
 * The ids are explicit and the sequence is reset afterwards, because the tests
 * authenticate as `{ id: 1, role: 'teacher' }`. Letting Postgres assign the ids
 * does not work: running the migrations leaves the users id sequence at 2, so
 * the first teacher would come out as id 2 and every student referencing
 * teacher_id 1 would fail the foreign key.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function seed(knex) {
    const password_hash = await bcrypt.hash('Password-1', 12)

    await knex('users').del()

    await knex('users').insert([
        {
            id: 1,
            email: 'john@doe.com',
            name: 'John',
            password_hash,
            avatar: 'avatars/avatar1.jpg',
            grade: 1,
            role: 'teacher',
            teacher_id: null
        },
        {
            id: 2,
            name: 'Alice',
            password_hash,
            avatar: 'avatars/avatar2.jpg',
            grade: 2,
            role: 'student',
            teacher_id: 1
        },
        {
            id: 3,
            name: 'Kalle',
            password_hash,
            avatar: 'avatars/avatar3.jpg',
            grade: 1,
            role: 'student',
            teacher_id: 1
        },
        {
            id: 4,
            name: 'Pekka',
            password_hash,
            avatar: 'avatars/avatar3.jpg',
            grade: 1,
            role: 'student',
            teacher_id: null
        },
        {
            id: 5,
            email: 'timo@edu.com',
            name: 'Timo',
            password_hash,
            avatar: 'avatars/avatar4.jpg',
            grade: 1,
            role: 'teacher',
            teacher_id: null
        },
        {
            id: 6,
            name: 'Maija',
            password_hash,
            avatar: 'avatars/avatar5.jpg',
            grade: 3,
            role: 'student',
            teacher_id: 5
        }
    ])

    // Hand the sequence back to Postgres so later inserts do not collide.
    await knex.raw(`SELECT setval(pg_get_serial_sequence('users', 'id'), (SELECT MAX(id) FROM users))`)
}
