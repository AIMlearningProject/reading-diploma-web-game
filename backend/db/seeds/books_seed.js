/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function seed(knex) {
    // 1. Find a qualified teacher user
    const teacher = await knex('users')
        .select('id')
        .where('role', 'teacher')
        .whereNotNull('email')
        .whereNotNull('name')
        .whereNotNull('avatar')
        .whereNull('password_hash')
        .first()

    // 2. If none exist, fail with a clear error
    if (!teacher) {
        throw new Error(
            'no teacher users found for the added_by field. Add a teacher user first'
        )
    }

    // 3. Deletes ALL existing entries in the books table!!!
    await knex('books').del()

    await knex('books').insert([
        { id: 1, title: 'Seitsemän veljestä', author: 'Aleksis Kivi', coverimage: '/uploads/book-covers/defaultNoImg.ico', booktype: 'physical', content: '', added_by: teacher.id },
        { id: 2, title: 'Väinö ja punainen posti', author: 'Anni Swan', coverimage: '/uploads/book-covers/defaultNoImg.ico', booktype: 'e-book', content: '', added_by: teacher.id },
        { id: 3, title: 'Tirlittan', author: 'Oiva Paloheimo', coverimage: '/uploads/book-covers/defaultNoImg.ico', booktype: 'physical', content: '', added_by: teacher.id },
        { id: 4, title: 'Poika ja varis', author: 'Aapeli', coverimage: '/uploads/book-covers/defaultNoImg.ico', booktype: 'physical', content: '', added_by: teacher.id },
        { id: 5, title: 'Koiramäen tarinat', author: 'Maurice Sendak (Suom. Kirsi Kunnas)', coverimage: '/uploads/book-covers/defaultNoImg.ico', booktype: 'physical', content: '', added_by: teacher.id },

        { id: 6, title: 'Risto Räppääjä ja pakastaja', author: 'Sinikka Nopola & Tiina Nopola', coverimage: '/uploads/book-covers/defaultNoImg.ico', booktype: 'physical', content: '', added_by: teacher.id },
        { id: 7, title: 'Heikki ja Kaija', author: 'Anni Polva', coverimage: '/uploads/book-covers/defaultNoImg.ico', booktype: 'audio', content: '', added_by: teacher.id },
        { id: 8, title: 'Ella ja kaverit', author: 'Timo Parvela', coverimage: '/uploads/book-covers/defaultNoImg.ico', booktype: 'e-book', content: '', added_by: teacher.id },
        { id: 9, title: 'Koiramäen lapset kaupungissa', author: 'Maurice Sendak (Suom. Kirsi Kunnas)', coverimage: '/uploads/book-covers/defaultNoImg.ico', booktype: 'physical', content: '', added_by: teacher.id },
        { id: 10, title: 'Pikku Pietarin piha', author: 'Aapeli', coverimage: '/uploads/book-covers/defaultNoImg.ico', booktype: 'audio', content: '', added_by: teacher.id },

        { id: 11, title: 'Muumipappa ja meri', author: 'Tove Jansson', coverimage: '/uploads/book-covers/defaultNoImg.ico', booktype: 'physical', content: '', added_by: teacher.id },
        { id: 12, title: 'Taikurin hattu', author: 'Tove Jansson', coverimage: '/uploads/book-covers/defaultNoImg.ico', booktype: 'e-book', content: '', added_by: teacher.id },
        { id: 13, title: 'Vinski ja Vinsentti', author: 'Oiva Paloheimo', coverimage: '/uploads/book-covers/defaultNoImg.ico', booktype: 'physical', content: '', added_by: teacher.id },
        { id: 14, title: 'Kiljusen herrasväki', author: 'Jalmari Finne', coverimage: '/uploads/book-covers/defaultNoImg.ico', booktype: 'e-book', content: '', added_by: teacher.id },
        { id: 15, title: 'Konsta', author: 'Veikko Huovinen', coverimage: '/uploads/book-covers/defaultNoImg.ico', booktype: 'physical', content: '', added_by: teacher.id },

        { id: 16, title: 'Hobitti (suom. Kersti Juva)', author: 'J.R.R. Tolkien', coverimage: '/uploads/book-covers/defaultNoImg.ico', booktype: 'physical', content: '', added_by: teacher.id },
        { id: 17, title: 'Ronja, ryövärintytär', author: 'Astrid Lindgren (suom. Kristiina Rikman)', coverimage: '/uploads/book-covers/defaultNoImg.ico', booktype: 'physical', content: '', added_by: teacher.id },
        { id: 18, title: 'Veljeni Leijonamieli', author: 'Astrid Lindgren (suom. Kaarina Helakisa)', coverimage: '/uploads/book-covers/defaultNoImg.ico', booktype: 'audio', content: '', added_by: teacher.id },
        { id: 19, title: 'Sudenmorsian', author: 'Aino Kallas', coverimage: '/uploads/book-covers/defaultNoImg.ico', booktype: 'physical', content: '', added_by: teacher.id },
        { id: 20, title: 'Kultainen kompassi (suom. Helene Bützow)', author: 'Philip Pullman', coverimage: '/uploads/book-covers/defaultNoImg.ico', booktype: 'e-book', content: '', added_by: teacher.id },
    ])
}
