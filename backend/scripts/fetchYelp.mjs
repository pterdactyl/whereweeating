import db from './db.mjs'
import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config()

const API_KEY = process.env.YELP_API_KEY
const YELP_API_URL = 'https://api.yelp.com/v3/businesses/search'

const locations = ['Toronto']

async function fetchRestaurantsForLocation(location) {
  try {
    const response = await axios.get(YELP_API_URL, {
      headers: { Authorization: `Bearer ${API_KEY}` },
      params: {
        location,
        term: 'restaurants',
        limit: 10,
      },
    })

    const businesses = response.data.businesses.map(biz => ({
      id: biz.id,
      name: biz.name,
      category: biz.categories.map(c => c.title).join(', '),
      location: `${biz.location.address1}, ${biz.location.city}`,
      price: biz.price || 'N/A',
    }))

    await db.read()
    const existingIds = new Set(db.data.restaurants.map(r => r.id))
    const newRestaurants = businesses.filter(r => !existingIds.has(r.id))

    db.data.restaurants.push(...newRestaurants)
    await db.write()

    console.log(`Added ${newRestaurants.length} restaurants for ${location}`)

  } catch (error) {
    console.error(`Error fetching Yelp data for ${location}:`, error.message)
  }
}

async function fetchAllLocations() {
  for (const location of locations) {
    await fetchRestaurantsForLocation(location)
  }
  console.log('Finished fetching all locations')
}

fetchAllLocations()
