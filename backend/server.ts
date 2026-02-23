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

app.patch('/api/restaurants/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const id = req.params.id as string;
      const { name, category, location, price } = req.body;

      if (!name || !category || !location || !price) {
        return res.status(400).json({
          message: 'Name, location, category, and price are required'
        });
      }

      const updated = await db.restaurants.updateRestaurant(id, {
        name: String(name).trim(),
        category: String(category).trim(),
        location: String(location).trim(),
        price: String(price).trim(),
      });

      return res.json(updated);

    } catch (err: any) {

      if (err?.code === '23505') {
        return res.status(409).json({
          message: 'Restaurant with these details already exists.'
        });
      }

      console.error('Update restaurant error:', err);

      return res.status(500).json({
        message: err?.message || 'Server error',
        code: err?.code,
      });
    }
  });


app.delete('/api/restaurants/:id', authenticateToken, requireAdmin, async (req, res) => {
  const id = req.params.id as string;
  await db.restaurants.deleteRestaurant(id);
  res.status(204).end();
});

// ======================= GROUP SESSION ROUTES =======================

app.post('/api/group-sessions', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user as { userID: string };
    const session = await db.groupSessions.createSession(user.userID);
    res.status(201).json(session);
  } catch (err: any) {
    console.error('Create session error:', err);
    res.status(500).json({ message: 'Failed to create session' });
  }
});

app.post('/api/group-sessions/join', async (req, res) => {
  try {
    const { code, name } = req.body as { code?: string; name?: string };
    if (!code || !name) {
      return res.status(400).json({ message: 'Code and name are required' });
    }

    const session = await db.groupSessions.getSessionByCode(code.toUpperCase());
    if (!session || session.state !== 'lobby') {
      return res.status(404).json({ message: 'Session not found or not joinable' });
    }

    const participant = await db.groupSessions.addParticipant(session.id, name.trim());
    const participants = await db.groupSessions.listParticipants(session.id);

    res.status(201).json({ session, participant, participants });
  } catch (err: any) {
    console.error('Join session error:', err);
    res.status(500).json({ message: 'Failed to join session' });
  }
});

app.get('/api/group-sessions/:id', async (req, res) => {
  try {
    const id = req.params.id as string;
    const session = await db.groupSessions.getSessionById(id);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    const participants = await db.groupSessions.listParticipants(id);
    res.json({ session, participants });
  } catch (err: any) {
    console.error('Get session error:', err);
    res.status(500).json({ message: 'Failed to fetch session' });
  }
});

app.post('/api/group-sessions/:id/filters', async (req, res) => {
  try {
    const id = req.params.id as string;
    const { participantId, filters } = req.body as {
      participantId?: string;
      filters?: {
        categories?: string[];
        price?: string | null;
        locations?: string[];
      };
    };

    if (!participantId || !filters) {
      return res.status(400).json({ message: 'participantId and filters are required' });
    }

    const session = await db.groupSessions.getSessionById(id);
    if (!session || session.state !== 'lobby') {
      return res.status(400).json({ message: 'Session is not in lobby state' });
    }

    const saved = await db.groupSessions.upsertParticipantFilters(id, participantId, {
      categories: filters.categories ?? [],
      price: typeof filters.price === 'string' ? filters.price : null,
      locations: filters.locations ?? [],
    });
    res.status(200).json(saved);
  } catch (err: any) {
    console.error('Save filters error:', err);
    res.status(500).json({ message: 'Failed to save filters' });
  }
});

app.post('/api/group-sessions/:id/generate', authenticateToken, async (req, res) => {
  try {
    const id = req.params.id as string;
    const user = (req as any).user as { userID: string };

    const session = await db.groupSessions.getSessionById(id);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (session.host_user_id !== user.userID) {
      return res.status(403).json({ message: 'Only host can generate' });
    }

    const allRestaurants = await db.restaurants.getRestaurants();
    const allFilters = await db.groupSessions.listParticipantFilters(id);

    // Merge filters (simple union)
    const merged = allFilters.reduce(
      (acc: { categories: string[]; price: string | null; locations: string[] }, pf) => {
        const catList = Array.isArray(pf.filters.categories) ? pf.filters.categories : [];
        const locList = Array.isArray(pf.filters.locations) ? pf.filters.locations : [];

        acc.categories = Array.from(new Set([...acc.categories, ...catList]));
        acc.locations = Array.from(new Set([...acc.locations, ...locList]));

        if (!acc.price && typeof pf.filters.price === 'string') {
          acc.price = pf.filters.price;
        }

        return acc;
      },
      { categories: [], price: null, locations: [] },
    );

    // Apply same filter logic as frontend
    const getRestaurantCategories = (categoryStr: string): string[] =>
      (categoryStr || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

    const getCityFromLocation = (loc: string): string => {
      if (!loc) return '';
      const parts = loc.split(',');
      return parts[parts.length - 1].trim();
    };

    let filtered = [...allRestaurants];

    if (merged.categories.length > 0) {
      filtered = filtered.filter(r => {
        const restCats = getRestaurantCategories(r.category || '');
        return restCats.some(rc =>
          merged.categories.some(sc => rc.toLowerCase() === sc.toLowerCase()),
        );
      });
    }

    if (merged.price) {
      filtered = filtered.filter(r => r.price === merged.price);
    }

    if (merged.locations.length > 0) {
      filtered = filtered.filter(r => {
        const city = getCityFromLocation(r.location || '');
        return merged.locations.some(sel => city.toLowerCase() === sel.toLowerCase());
      });
    }

    if (!filtered.length) {
      await db.groupSessions.saveResult(id, null);
      return res.status(404).json({ message: 'No restaurants match group filters' });
    }

    const randomIndex = Math.floor(Math.random() * filtered.length);
    const chosen = filtered[randomIndex];

    const updatedSession = await db.groupSessions.saveResult(id, chosen.id);

    res.status(200).json({ session: updatedSession, resultRestaurant: chosen });
  } catch (err: any) {
    console.error('Generate result error:', err);
    res.status(500).json({ message: 'Failed to generate result' });
  }
});

app.use((err: any, req: any, res: any, next: any) => {
  console.error("GLOBAL ERROR HANDLER:", err);
  res.status(err?.status || 500).json({
    message: err?.message || "Internal Server Error",
    code: err?.code,
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

