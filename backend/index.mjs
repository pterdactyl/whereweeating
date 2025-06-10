import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import axios from 'axios'
import db from './db.mjs'
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

const JWT_SECRET = process.env.JWT_SECRET || 'yourSecretKey';

app.use(cors())
app.use(express.json())

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
}

// ======================= AUTHENTICATION ROUTES =======================

// POST user signup
app.post('/signup', async (req, res) => {
  await db.read();

  if (!db.data.users) {
    db.data.users = [];
  }

  const { email, password } = req.body;
  const existingUser = db.data.users.find(u => u.email === email);
  if (existingUser) return res.status(400).json({ message: 'User already exists' });

  const hashedPassword = await bcrypt.hash(password, 10);
  db.data.users.push({ email, password: hashedPassword });
  await db.write();

  res.status(201).json({ message: 'User created' });
});

// POST user login
app.post('/login', async (req, res) => {
  await db.read();

  if (!db.data.users) {
    db.data.users = [];
  }

  const { email, password } = req.body;
  const user = db.data.users.find(u => u.email === email);
  if (!user) return res.status(400).json({ message: 'Invalid credentials' });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

  const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '1h' });
  res.json({ token });
});

// ======================= RESTAURANT ROUTES =======================

// GET all restaurants
app.get('/restaurants', async (req, res) => {
  await db.read()
  res.json(db.data.restaurants)
})

// GET one random restaurant
app.get('/restaurants/random', async (req, res) => {
  await db.read();
  let filtered = db.data.restaurants;

  const { category, price, location } = req.query;

  if (category) {
  const searchTerm = category.toLowerCase();
  filtered = filtered.filter(r =>
    r.category && r.category.toLowerCase().includes(searchTerm)
  );
  }

  if (price) {
    filtered = filtered.filter(r => r.price === price);
  }

  if (location) {
  const locTerm = location.toLowerCase();
  filtered = filtered.filter(r =>
    r.location && r.location.toLowerCase().includes(locTerm)
  );
  }

  if (!filtered.length) {
    return res.status(404).json({ error: 'No matching restaurants found' });
  }

  const random = filtered[Math.floor(Math.random() * filtered.length)];
  res.json(random);
});

// POST add a single restaurant manually
app.post('/restaurants', authenticateToken, async (req, res) => {
  const { name, category, location, price } = req.body
  if (!name || !category || !location || !price) {
    return res.status(400).json({ error: 'Name, location, category, and price are required' })
  }

  await db.read()

  const newRestaurant = {
    id: `manual-${Date.now()}`, 
    name,
    category,
    location,
    price,
  }
  db.data.restaurants.push(newRestaurant)
  await db.write()

  res.status(201).json(newRestaurant)
})

// PATCH edit a restaurant
app.patch('/restaurants/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;

  await db.read();
  const index = db.data.restaurants.findIndex(r => r.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Restaurant not found' });
  }

  db.data.restaurants[index] = {
    ...db.data.restaurants[index],
    ...updatedData,
  };

  await db.write();
  res.json(db.data.restaurants[index]);
});

app.delete('/restaurants/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  await db.read();
  db.data.restaurants = db.data.restaurants.filter(r => r.id !== id);
  await db.write();
  res.status(204).end();
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

