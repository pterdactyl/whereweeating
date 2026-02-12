import cors from 'cors'
import dotenv from 'dotenv'
import db from './db/index.js'
import bcrypt from 'bcryptjs';
import jwt, { Secret } from 'jsonwebtoken';
import express, { NextFunction, Request, Response } from 'express';
import rateLimit from "express-rate-limit";

dotenv.config()

const app = express()
app.use((req, res, next) => {
  console.log("HIT:", req.method, req.path, "Origin:", req.headers.origin);
  next();
});
const PORT = process.env.PORT || 5000

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);

    if (ALLOWED_ORIGINS.includes(origin)) {
      return cb(null, true);
    }

    return cb(null, false);
  }
}));

app.use(express.json({ limit: "50kb" }));

const JWT_SECRET_STR = process.env.JWT_SECRET;
if (!JWT_SECRET_STR) throw new Error("JWT_SECRET is not set");
const JWT_SECRET: Secret = JWT_SECRET_STR;

app.get("/api/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean)
);
if (ADMIN_EMAILS.size === 0) console.warn("ADMIN_EMAILS is empty");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

const addRestaurantLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Token required' });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    (req as any).user = decoded;
    next();
  });
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user as { email?: string } | undefined;

  if (!user?.email || !ADMIN_EMAILS.has(user.email)) {
    return res.status(403).json({ message: "Admin only" });
  }

  next();
}

// ======================= AUTHENTICATION ROUTES =======================

// POST user signup
app.post('/api/signup', authLimiter, async (req, res) => {
  const { email, password } = req.body;

  const existingUser = await db.users.getUserByEmail(email);
  if (existingUser) return res.status(400).json({ message: 'User already exists' });

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = await db.users.createUser(email, hashedPassword);
  const token = jwt.sign({ userID: newUser.id, email: newUser.email}, 
    JWT_SECRET, 
    { expiresIn: '1h' });

  res.status(201).json({ token, email: newUser.email, message: 'User created' });
});

// POST user login
app.post('/api/login', authLimiter, async (req, res) => {

  const { email, password } = req.body;
  const user = await db.users.getUserByEmail(email);
  if (!user) return res.status(400).json({ message: 'Invalid credentials' });

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

  const token = jwt.sign({ userID: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
  res.json({ token, email: user.email });
});

// ======================= RESTAURANT ROUTES =======================

// GET all restaurants
app.get('/api/restaurants', async (req, res) => {
  const restaurants = await db.restaurants.getRestaurants();
  res.json(restaurants);
})

// GET one random restaurant
app.get('/api/restaurants/random', async (req, res) => {

  let filtered = await db.restaurants.getRestaurants();

  const category =
    typeof req.query.category === 'string' ? req.query.category : undefined;

  const price =
    typeof req.query.price === 'string' ? req.query.price : undefined;

  const location =
    typeof req.query.location === 'string' ? req.query.location : undefined;


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
app.post('/api/restaurants', addRestaurantLimiter, authenticateToken, async (req, res) => {
  try {
    const { name, category, location, price } = req.body;

    if (!name || !category || !location || !price) {
      return res.status(400).json({ message: 'Name, location, category, and price are required' });
    }

    const created = await db.restaurants.addRestaurant({
      name: String(name).trim(),
      category: String(category).trim(),
      location: String(location).trim(),
      price: String(price).trim(),
    });

    return res.status(201).json(created);
  } catch (err: any) {
    
    if (err?.code === '23505') {
      return res.status(409).json({ message: 'Restaurant already exists.' });
    }

    console.error('Add restaurant error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/restaurants/:id', authenticateToken, requireAdmin, async (req, res) => {
  const id = req.params.id as string;
  await db.restaurants.deleteRestaurant(id);
  res.status(204).end();
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

