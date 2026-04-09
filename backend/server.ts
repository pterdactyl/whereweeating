import cors from 'cors'
import dotenv from 'dotenv'
import db from './db/index.js'
import bcrypt from 'bcryptjs';
import jwt, { Secret } from 'jsonwebtoken';
import express, { NextFunction, Request, Response } from 'express';
import rateLimit from "express-rate-limit";
import {
  pickOneFromTopWeighted,
  rankRestaurantsForSession,
  type RestaurantRecommendation,
} from './groupDecision/rankRestaurantsForSession.js';

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
    if (err) {
      const isExpired = err.name === 'TokenExpiredError';
      return res.status(isExpired ? 401 : 403).json({
        message: isExpired ? 'Token expired' : 'Invalid token',
      });
    }
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

// ======================= GROUP SESSION HELPERS (weighted, pool, shortlist) =======================

type Restaurant = { id: string; name: string; category: string; location: string; price: string };
type SessionFilters = { categories: string[]; price: string | null; locations: string[] };

function stableStringify(value: unknown): string {
  return JSON.stringify(value ?? null);
}

function getRestaurantCategories(categoryStr: string): string[] {
  return (categoryStr || '').split(',').map(s => s.trim()).filter(Boolean);
}
function getCityFromLocation(loc: string): string {
  if (!loc) return '';
  const parts = loc.split(',');
  return parts[parts.length - 1].trim();
}

function filterPool(restaurants: Restaurant[], hostFilters: SessionFilters | null): Restaurant[] {
  const f = hostFilters || { categories: [], price: null, locations: [] };
  let out = [...restaurants];
  if (f.categories?.length) {
    out = out.filter(r => {
      const restCats = getRestaurantCategories(r.category || '');
      return restCats.some(rc => f.categories!.some(sc => rc.toLowerCase() === sc.toLowerCase()));
    });
  }
  if (f.price) out = out.filter(r => r.price === f.price);
  if (f.locations?.length) {
    out = out.filter(r => {
      const city = getCityFromLocation(r.location || '');
      return f.locations!.some(sel => city.toLowerCase() === sel.toLowerCase());
    });
  }
  return out;
}

function matchScore(restaurant: Restaurant, preferences: SessionFilters): number {
  let score = 0;
  const restCats = getRestaurantCategories(restaurant.category || '');
  if (preferences.categories?.length) {
    const match = restCats.filter(rc =>
      preferences.categories!.some(pc => rc.toLowerCase() === pc.toLowerCase()),
    ).length;
    score += match;
  }
  if (preferences.price && restaurant.price === preferences.price) score += 1;
  const city = getCityFromLocation(restaurant.location || '');
  if (preferences.locations?.length && preferences.locations.some(loc => city.toLowerCase() === loc.toLowerCase())) {
    score += 1;
  }
  return Math.max(0, score);
}

function pickFromRecommendations(
  ranked: RestaurantRecommendation[],
  excludeIds: Set<string>,
  opts: { topK: number; mode: 'top' | 'weighted_top' },
): RestaurantRecommendation | null {
  if (opts.mode === 'top') {
    return ranked.find(r => !excludeIds.has(r.restaurantId)) ?? null;
  }
  return pickOneFromTopWeighted(ranked, excludeIds, opts.topK);
}

const SHORTLIST_SIZE = 5;
const SHORTLIST_TOP_K = 20;
const SHORTLIST_PICK_MODE: 'top' | 'weighted_top' = 'weighted_top';

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

    const trimmedName = name.trim();
    let participant;
    try {
      participant = await db.groupSessions.addParticipant(session.id, trimmedName);
    } catch (err: any) {
      if (err?.code === '23505') {
        const existing = await db.groupSessions.getParticipantByName(session.id, trimmedName);
        if (existing) {
          participant = existing;
        } else {
          throw err;
        }
      } else {
        throw err;
      }
    }
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

app.patch('/api/group-sessions/:id/host-filters', authenticateToken, async (req, res) => {
  try {
    const id = req.params.id as string;
    const user = (req as any).user as { userID: string };
    const session = await db.groupSessions.getSessionById(id);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (session.host_user_id !== user.userID) {
      return res.status(403).json({ message: 'Only host can set room filters' });
    }
    if (session.state !== 'lobby') {
      return res.status(400).json({ message: 'Cannot change filters after shortlist is generated' });
    }
    const filters = req.body as { categories?: string[]; price?: string | null; locations?: string[] };
    const hostFilters = {
      categories: Array.isArray(filters.categories) ? filters.categories : [],
      price: typeof filters.price === 'string' ? filters.price : null,
      locations: Array.isArray(filters.locations) ? filters.locations : [],
    };
    const updated = await db.groupSessions.updateHostFilters(id, hostFilters);
    res.json(updated);
  } catch (err: any) {
    console.error('Update host filters error:', err);
    res.status(500).json({ message: 'Failed to update host filters' });
  }
});

app.get('/api/group-sessions/:id/filters', async (req, res) => {
  try {
    const id = req.params.id as string;
    const participantId = req.query.participantId as string | undefined;
    if (!participantId) {
      return res.status(400).json({ message: 'participantId query is required' });
    }
    const all = await db.groupSessions.listParticipantFilters(id);
    const one = all.find(pf => pf.participant_id === participantId);
    if (!one) return res.status(200).json({ filters: null });
    return res.status(200).json(one);
  } catch (err: any) {
    console.error('Get filters error:', err);
    res.status(500).json({ message: 'Failed to fetch filters' });
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

    const normalized: SessionFilters = {
      categories: filters.categories ?? [],
      price: typeof filters.price === 'string' ? filters.price : null,
      locations: filters.locations ?? [],
    };

    // If filters changed for a ready participant, automatically reset them to not ready.
    const prevRow = (await db.groupSessions.listParticipantFilters(id)).find(
      pf => pf.participant_id === participantId,
    );
    const prevFilters = prevRow?.filters ?? null;
    const changed = stableStringify(prevFilters) !== stableStringify(normalized);

    const saved = await db.groupSessions.upsertParticipantFilters(id, participantId, normalized);

    if (changed) {
      const participant = await db.groupSessions.getParticipantById(id, participantId);
      if (participant?.is_ready) {
        await db.groupSessions.setParticipantReady(id, participantId, false);
      }
    }

    const participants = await db.groupSessions.listParticipants(id);
    res.status(200).json({ saved, participants });
  } catch (err: any) {
    console.error('Save filters error:', err);
    res.status(500).json({ message: 'Failed to save filters' });
  }
});

app.post('/api/group-sessions/:id/ready', async (req, res) => {
  try {
    const id = req.params.id as string;
    const { participantId, ready } = req.body as { participantId?: string; ready?: boolean };
    if (!participantId || typeof ready !== 'boolean') {
      return res.status(400).json({ message: 'participantId and ready (boolean) are required' });
    }

    const session = await db.groupSessions.getSessionById(id);
    if (!session || session.state !== 'lobby') {
      return res.status(400).json({ message: 'Session is not in lobby state' });
    }

    const updated = await db.groupSessions.setParticipantReady(id, participantId, ready);
    const participants = await db.groupSessions.listParticipants(id);
    return res.status(200).json({ participant: updated, participants });
  } catch (err: any) {
    console.error('Toggle ready error:', err);
    const msg = typeof err?.message === 'string' ? err.message : 'Failed to update readiness';
    return res.status(500).json({ message: msg });
  }
});

app.post('/api/group-sessions/:id/leave', async (req, res) => {
  try {
    const id = req.params.id as string;
    const { participantId } = req.body as { participantId?: string };
    if (!participantId) return res.status(400).json({ message: 'participantId required' });

    const session = await db.groupSessions.getSessionById(id);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    await db.groupSessions.deleteParticipant(id, participantId);
    const participants = await db.groupSessions.listParticipants(id);
    return res.status(200).json({ ok: true, participants });
  } catch (err: any) {
    console.error('Leave session error:', err);
    return res.status(500).json({ message: 'Failed to leave session' });
  }
});

app.post('/api/group-sessions/:id/close', authenticateToken, async (req, res) => {
  try {
    const id = req.params.id as string;
    const user = (req as any).user as { userID: string };
    const session = await db.groupSessions.getSessionById(id);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (session.host_user_id !== user.userID) {
      return res.status(403).json({ message: 'Only host can close session' });
    }

    await db.groupSessions.closeSession(id);
    return res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error('Close session error:', err);
    return res.status(500).json({ message: 'Failed to close session' });
  }
});

app.post('/api/group-sessions/:id/generate', authenticateToken, async (req, res) => {
  try {
    const id = req.params.id as string;
    const user = (req as any).user as { userID: string };

    const session = await db.groupSessions.getSessionById(id);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (session.host_user_id !== user.userID) {
      return res.status(403).json({ message: 'Only host can generate shortlist' });
    }
    if (session.state !== 'lobby') {
      return res.status(400).json({ message: 'Shortlist already generated' });
    }

    const readyParticipants = await db.groupSessions.listReadyParticipants(id);
    if (readyParticipants.length < 1) {
      return res.status(400).json({ message: 'At least 1 participant must be ready to generate' });
    }

    const ranking = await rankRestaurantsForSession(id, {
      includeLikeBonus: false,
      participantIds: readyParticipants.map(p => p.id),
    });
    if (!ranking.poolSize) {
      return res.status(404).json({ message: 'No restaurants available' });
    }

    const shown = new Set<string>();
    const shortlist: string[] = [];
    for (let i = 0; i < SHORTLIST_SIZE; i++) {
      const pick = pickFromRecommendations(ranking.recommendations, shown, {
        topK: SHORTLIST_TOP_K,
        mode: SHORTLIST_PICK_MODE,
      });
      if (!pick) break;
      shortlist.push(pick.restaurantId);
      shown.add(pick.restaurantId);
    }

    const updatedSession = await db.groupSessions.setShortlist(id, shortlist, [...shown]);
    const allRestaurants = await db.restaurants.getRestaurants() as Restaurant[];
    const shortlistRestaurants = shortlist
      .map(rid => allRestaurants.find(r => r.id === rid))
      .filter(Boolean) as Restaurant[];

    res.status(200).json({ session: updatedSession, shortlistRestaurants });
  } catch (err: any) {
    console.error('Generate shortlist error:', err);
    res.status(500).json({ message: 'Failed to generate shortlist' });
  }
});

app.get('/api/group-sessions/:id/recommendations', async (req, res) => {
  try {
    const id = req.params.id as string;

    const session = await db.groupSessions.getSessionById(id);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    const excludeShown = req.query.excludeShown === 'true';
    const excludeShortlist = req.query.excludeShortlist === 'true';
    const includeLikeBonus = req.query.includeLikeBonus !== 'false';

    const exclude = new Set<string>();
    if (excludeShown) (session.shown_restaurant_ids ?? []).forEach(rid => exclude.add(rid));
    if (excludeShortlist) (session.shortlist_restaurant_ids ?? []).forEach(rid => exclude.add(rid));

    const ranking = await rankRestaurantsForSession(id, { excludeIds: exclude, includeLikeBonus });

    return res.status(200).json({
      sessionId: id,
      participantCount: ranking.participantCount,
      poolSize: ranking.poolSize,
      recommendations: ranking.recommendations,
    });
  } catch (err: any) {
    console.error('Get recommendations error:', err);
    return res.status(500).json({ message: 'Failed to fetch recommendations' });
  }
});

app.post('/api/group-sessions/:id/shortlist/remove', async (req, res) => {
  try {
    const id = req.params.id as string;
    const { restaurantId } = req.body as { restaurantId?: string };
    if (!restaurantId) return res.status(400).json({ message: 'restaurantId required' });

    const session = await db.groupSessions.getSessionById(id);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (session.state !== 'shortlist') {
      return res.status(400).json({ message: 'No active shortlist' });
    }

    const shortlist = session.shortlist_restaurant_ids.filter(id => id !== restaurantId);
    const shown = new Set(session.shown_restaurant_ids || []);

    const ranking = await rankRestaurantsForSession(id, {
      excludeIds: shown,
      includeLikeBonus: true,
    });

    const pick = pickFromRecommendations(ranking.recommendations, shown, {
      topK: SHORTLIST_TOP_K,
      mode: SHORTLIST_PICK_MODE,
    });
    if (pick) {
      shortlist.push(pick.restaurantId);
      shown.add(pick.restaurantId);
    }

    const updatedSession = await db.groupSessions.removeFromShortlistAndAppendShown(
      id,
      restaurantId,
      shortlist,
      [...shown],
    );

    const allRestaurants = await db.restaurants.getRestaurants() as Restaurant[];
    const shortlistRestaurants = shortlist
      .map(rid => allRestaurants.find(r => r.id === rid))
      .filter(Boolean) as Restaurant[];

    res.status(200).json({ session: updatedSession, shortlistRestaurants });
  } catch (err: any) {
    console.error('Remove from shortlist error:', err);
    res.status(500).json({ message: 'Failed to remove and refill' });
  }
});

app.post('/api/group-sessions/:id/shortlist/like', async (req, res) => {
  try {
    const id = req.params.id as string;
    const { restaurantId, liked } = req.body as { restaurantId?: string; liked?: boolean };
    if (!restaurantId || typeof liked !== 'boolean') {
      return res.status(400).json({ message: 'restaurantId and liked (boolean) required' });
    }

    const session = await db.groupSessions.getSessionById(id);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    const updated = await db.groupSessions.toggleLiked(id, restaurantId, liked);
    res.json(updated);
  } catch (err: any) {
    console.error('Toggle like error:', err);
    res.status(500).json({ message: 'Failed to update like' });
  }
});

app.post('/api/group-sessions/:id/finalize', authenticateToken, async (req, res) => {
  try {
    const id = req.params.id as string;
    const user = (req as any).user as { userID: string };
    const { restaurantId } = req.body as { restaurantId?: string };
    if (!restaurantId) return res.status(400).json({ message: 'restaurantId required' });

    const session = await db.groupSessions.getSessionById(id);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (session.host_user_id !== user.userID) {
      return res.status(403).json({ message: 'Only host can finalize' });
    }
    if (session.state !== 'shortlist') {
      return res.status(400).json({ message: 'Generate a shortlist first' });
    }
    const inShortlist = (session.shortlist_restaurant_ids || []).includes(restaurantId);
    if (!inShortlist) {
      return res.status(400).json({ message: 'Must pick from current shortlist' });
    }

    const updated = await db.groupSessions.finalizeSession(id, restaurantId);
    res.json(updated);
  } catch (err: any) {
    console.error('Finalize error:', err);
    res.status(500).json({ message: 'Failed to finalize' });
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

