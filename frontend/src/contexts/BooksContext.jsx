import React, { createContext, useState, useEffect } from 'react';
import { fetchBooks } from '../services/api';

const BooksContext = createContext({ books: [], setBooks: () => { } });

export function BooksProvider({ children }) {
    const [books, setBooks] = useState([]);

    const fetchMyBooks = async () => {
        try {
            const res = await fetchBooks()
            setBooks(res)
        } catch {
            setBooks([])
        }
    }

    useEffect(() => {
        fetchMyBooks()
    }, []);
    
    return (
        <BooksContext.Provider value={{ books, setBooks }}>
            {children}
        </BooksContext.Provider>
    )
}

export default BooksContext;