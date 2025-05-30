import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import axios from 'axios'
import db from './db.mjs'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

const API_KEY = process.env.YELP_API_KEY
const YELP_API_URL = 'https://api.yelp.com/v3/businesses/search'

// GET all restaurants
app.get('/restaurants', async (req, res) => {
  await db.read()
  res.json(db.data.restaurants)
})

// GET one random restaurant
app.get('/restaurants/random', async (req, res) => {
  await db.read()
  const restaurants = db.data.restaurants
  if (!restaurants.length) {
    return res.status(404).json({ error: 'No restaurants found' })
  }
  const random = restaurants[Math.floor(Math.random() * restaurants.length)]
  res.json(random)
})

// POST add a single restaurant manually
app.post('/restaurants', async (req, res) => {
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
app.patch('/restaurants/:id', async (req, res) => {
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

app.delete('/restaurants/:id', async (req, res) => {
  const { id } = req.params;
  await db.read();
  db.data.restaurants = db.data.restaurants.filter(r => r.id !== id);
  await db.write();
  res.status(204).end();
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

