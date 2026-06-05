const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const db = require('./database');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Session setup (stores session in server memory — fine for development)
app.use(session({
  secret: 'bookstore-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 day
}));

// ---------- Book Routes (already working) ----------
app.get('/api/books', (req, res) => {
  const books = db.prepare('SELECT * FROM books').all();
  res.json(books);
});

app.get('/api/books/:id', (req, res) => {
  const { id } = req.params;
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(id);
  if (book) res.json(book);
  else res.status(404).json({ error: 'Book not found' });
});

// Protected admin route for adding books
app.post('/api/books', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'You must be logged in to add books.' });
  }

  const { title, author, price, cover_url, description } = req.body;
  if (!title || !author || !price) {
    return res.status(400).json({ error: 'Title, author, and price are required.' });
  }

  const stmt = db.prepare('INSERT INTO books (title, author, price, cover_url, description) VALUES (?, ?, ?, ?, ?)');
  const result = stmt.run(title, author, price, cover_url || null, description || null);
  res.status(201).json({ id: result.lastInsertRowid, message: 'Book added successfully!' });
});

// ---------- Order Routes (already working) ----------
app.post('/api/orders', (req, res) => {
  const { items } = req.body;
  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty.' });
  }

  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const stmt = db.prepare('INSERT INTO orders (items, total) VALUES (?, ?)');
  const result = stmt.run(JSON.stringify(items), total);

  res.status(201).json({ orderId: result.lastInsertRowid, total, message: 'Order placed successfully!' });
});

// ---------- Authentication Routes ----------

// Signup
app.post('/api/signup', (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  // Check if user already exists
  const existingUser = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
  if (existingUser) {
    return res.status(409).json({ error: 'Username or email already taken.' });
  }

  // Hash password
  const hashedPassword = bcrypt.hashSync(password, 10);

  const stmt = db.prepare('INSERT INTO users (username, email, password) VALUES (?, ?, ?)');
  const result = stmt.run(username, email, hashedPassword);

  // Log the user in automatically after signup
  req.session.userId = result.lastInsertRowid;
  req.session.username = username;

  res.status(201).json({ message: 'Signup successful!', username });
});

// Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  const passwordMatch = bcrypt.compareSync(password, user.password);
  if (!passwordMatch) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  // Create session
  req.session.userId = user.id;
  req.session.username = user.username;

  res.json({ message: 'Login successful!', username: user.username });
});

// Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ error: 'Could not log out.' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out.' });
  });
});

// Get current user (for frontend to check auth status)
app.get('/api/me', (req, res) => {
  if (req.session.userId) {
    res.json({ loggedIn: true, username: req.session.username });
  } else {
    res.status(401).json({ loggedIn: false });
  }
});

// ---------- Start Server ----------
app.listen(PORT, () => {
  console.log(`📚 Server running at http://localhost:${PORT}`);
});