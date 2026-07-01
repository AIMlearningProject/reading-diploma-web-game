/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function seed(knex) {
    // Deletes ALL existing entries in the books table!!!
    return await knex('books').del()
        .then(async () => {
            // -- For inserting entries all at once --
            return await knex('books').insert([
                { id: 1, title: 'Seitsemän veljestä', author: 'Aleksis Kivi', coverimage: '/uploads/book-covers/defaultNoImg.ico', booktype: 'physical', content: '' },
                { id: 2, title: 'Väinö ja punainen posti', author: 'Anni Swan', coverimage: '/uploads/book-covers/defaultNoImg.ico', booktype: 'e-book', content: '' },
                { id: 3, title: 'Tirlittan', author: 'Oiva Paloheimo', coverimage: '/uploads/book-covers/defaultNoImg.ico', booktype: 'physical', content: '' },
                { id: 4, title: 'Poika ja varis', author: 'Aapeli', coverimage: '/uploads/book-covers/defaultNoImg.ico', booktype: 'physical', content: '' },
                { id: 5, title: 'Koiramäen tarinat', author: 'Maurice Sendak (Suom. Kirsi Kunnas)', coverimage: '/uploads/book-covers/defaultNoImg.ico', booktype: 'physical', content: '' },

                { id: 6, title: 'Risto Räppääjä ja pakastaja', author: 'Sinikka Nopola & Tiina Nopola', coverimage: '/uploads/book-covers/defaultNoImg.ico', booktype: 'physical', content: '' },
                { id: 7, title: 'Heikki ja Kaija', author: 'Anni Polva', coverimage: '/uploads/book-covers/defaultNoImg.ico', booktype: 'audio', content: '' },
                { id: 8, title: 'Ella ja kaverit', author: 'Timo Parvela', coverimage: '/uploads/book-covers/defaultNoImg.ico', booktype: 'e-book', content: '' },
                { id: 9, title: 'Koiramäen lapset kaupungissa', author: 'Maurice Sendak (Suom. Kirsi Kunnas)', coverimage: '/uploads/book-covers/defaultNoImg.ico', booktype: 'physical', content: '' },
                { id: 10, title: 'Pikku Pietarin piha', author: 'Aapeli', coverimage: '/uploads/book-covers/defaultNoImg.ico', booktype: 'audio', content: '' },

                { id: 11, title: 'Muumipappa ja meri', author: 'Tove Jansson', coverimage: '/uploads/book-covers/defaultNoImg.ico', booktype: 'physical', content: '' },
                { id: 12, title: 'Taikurin hattu', author: 'Tove Jansson', coverimage: '/uploads/book-covers/defaultNoImg.ico', booktype: 'e-book', content: '' },
                { id: 13, title: 'Vinski ja Vinsentti', author: 'Oiva Paloheimo', coverimage: '/uploads/book-covers/defaultNoImg.ico', booktype: 'physical', content: '' },
                { id: 14, title: 'Kiljusen herrasväki', author: 'Jalmari Finne', coverimage: '/uploads/book-covers/defaultNoImg.ico', booktype: 'e-book', content: '' },
                { id: 15, title: 'Konsta', author: 'Veikko Huovinen', coverimage: '/uploads/book-covers/defaultNoImg.ico', booktype: 'physical', content: '' },

                { id: 16, title: 'Hobitti (suom. Kersti Juva)', author: 'J.R.R. Tolkien', coverimage: '/uploads/book-covers/defaultNoImg.ico', booktype: 'physical', content: '' },
                { id: 17, title: 'Ronja, ryövärintytär', author: 'Astrid Lindgren (suom. Kristiina Rikman)', coverimage: '/uploads/book-covers/defaultNoImg.ico', booktype: 'physical', content: '' },
                { id: 18, title: 'Veljeni Leijonamieli', author: 'Astrid Lindgren (suom. Kaarina Helakisa)', coverimage: '/uploads/book-covers/defaultNoImg.ico', booktype: 'audio', content: '' },
                { id: 19, title: 'Sudenmorsian', author: 'Aino Kallas', coverimage: '/uploads/book-covers/defaultNoImg.ico', booktype: 'physical', content: '' },
                { id: 20, title: 'Kultainen kompassi (suom. Helene Bützow)', author: 'Philip Pullman', coverimage: '/uploads/book-covers/defaultNoImg.ico', booktype: 'e-book', content: '' },
            ])
        })
}
