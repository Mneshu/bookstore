const Database = require('better-sqlite3');

const db = new Database('bookstore.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    price REAL NOT NULL,
    cover_url TEXT,
    description TEXT
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    items TEXT NOT NULL,
    total REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  )
`);

// Seed sample books if empty
const count = db.prepare('SELECT COUNT(*) AS count FROM books').get();
if (count.count === 0) {
  const insert = db.prepare('INSERT INTO books (title, author, price, cover_url, description) VALUES (?, ?, ?, ?, ?)');
  insert.run('The Great Gatsby', 'F. Scott Fitzgerald', 12.99, 'https://covers.openlibrary.org/b/id/7222246-L.jpg', 'A story of the mysteriously wealthy Jay Gatsby...');
  insert.run('To Kill a Mockingbird', 'Harper Lee', 10.49, 'https://covers.openlibrary.org/b/id/8226191-L.jpg', 'A novel about racial injustice...');
  insert.run('1984', 'George Orwell', 9.99, 'https://covers.openlibrary.org/b/id/8575708-L.jpg', 'A dystopian social science fiction novel...');
  console.log('✅ Sample books added to the database.');
}

module.exports = db;