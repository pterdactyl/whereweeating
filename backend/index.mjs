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

// POST add a single restaurant manually (with full details)
app.post('/restaurants', async (req, res) => {
  const { name, category, location, price } = req.body
  if (!name || !category || !location || !price) {
    return res.status(400).json({ error: 'Name, location, category, and price are required' })
  }

  await db.read()
  // Use a unique id generator or timestamp
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

