import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

export type Restaurant = {
  id: string
  name: string
  category: string
  location: string
  price: string
}

export type User = {
  id: string
  email: string
  password_hash: string
}

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend .env')
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function getRestaurants(): Promise<Restaurant[]> {
  const { data, error } = await supabase
    .from('restaurants')
    .select('id,name,category,location,price')

  if (error) throw error
  return (data ?? []) as Restaurant[]
}

async function addRestaurant(input: Omit<Restaurant, 'id'>): Promise<Restaurant> {
  const { data, error } = await supabase
    .from('restaurants')
    .insert(input)
    .select('id,name,category,location,price')
    .single()

  if (error) throw error
  return data as Restaurant
}

async function updateRestaurant(id: string, patch: Partial<Omit<Restaurant, 'id'>>): Promise<Restaurant> {
  const { data, error } = await supabase
    .from('restaurants')
    .update(patch)
    .eq('id', id)
    .select('id,name,category,location,price')
    .single()

  if (error) throw error
  return data as Restaurant
}

async function deleteRestaurant(id: string): Promise<void> {
  const { error } = await supabase.from('restaurants').delete().eq('id', id)
  if (error) throw error
}

async function getUserByEmail(email: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id,email,password_hash')
    .eq('email', email)
    .maybeSingle()

  if (error) throw error
  return (data ?? null) as User | null
}

async function createUser(email: string, password_hash: string): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .insert({ email, password_hash })
    .select('id,email,password_hash')
    .single()

  if (error) throw error
  return data as User
}

export default {
  restaurants: { getRestaurants, addRestaurant, updateRestaurant, deleteRestaurant },
  users: { getUserByEmail, createUser },
}
