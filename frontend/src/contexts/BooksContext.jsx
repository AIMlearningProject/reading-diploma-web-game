import { createContext, useState, useEffect } from 'react';
import { fetchMyBooks } from '../services/api';

const BooksContext = createContext({ books: [], setBooks: () => {} });

export function BooksProvider({ children }) {
    const [books, setBooks] = useState([]);

    const fetchBookList = async () => {
        try {
            const res = await fetchMyBooks()
            setBooks(res)
        } catch {
            setBooks([])
        }
    }

    useEffect(() => {
        fetchBookList()
    }, []);
    
    return (
        <BooksContext.Provider value={{ books, setBooks }}>
            {children}
        </BooksContext.Provider>
    )
}

export default BooksContext;