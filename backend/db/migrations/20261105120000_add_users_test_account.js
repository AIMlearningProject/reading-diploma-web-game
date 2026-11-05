/**
 * Marks the accounts offered on the student login page during the public test
 * period (services/testAccountService.js). The value is the account's name in
 * db/seeds/data/testStudents.js, kept in its own column because a pupil can
 * rename themselves.
 *
 * The reset also reads the session table, so it is created here too. In
 * production connect-pg-simple has usually made it already.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
    await knex.schema.alterTable('users', (table) => {
        table.string('test_account', 32).nullable()
    })

    await knex.raw(`
        UPDATE users AS student
        SET test_account = student.name
        FROM users AS teacher
        WHERE student.teacher_id = teacher.id
            AND teacher.name = 'teacher'
            AND student.name IN ('student', 'Aino', 'Onni')
    `)

    if (!await knex.schema.hasTable('session')) {
        await knex.raw(`
            CREATE TABLE "session" (
                "sid" varchar NOT NULL COLLATE "default" PRIMARY KEY,
                "sess" json NOT NULL,
                "expire" timestamp(6) NOT NULL
            )
        `)
        await knex.raw('CREATE INDEX "IDX_session_expire" ON "session" ("expire")')
    }
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
    await knex.schema.alterTable('users', (table) => {
        table.dropColumn('test_account')
    })
}
