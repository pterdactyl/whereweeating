import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import * as groupSessions from './groupSessions.js'

export type WeeklyHoursSchedule = Record<string, { open: string; close: string }[]> | null

export type Restaurant = {
  id: string
  name: string
  category: string
  location: string
  price: string
  hours_of_operation: string | null
  weekly_hours: WeeklyHoursSchedule
}

export type User = {
  id: string
  email: string
  password_hash: string
}

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const FALLBACK_SUPABASE_URL = 'http://127.0.0.1:54321'
const FALLBACK_SUPABASE_KEY = 'development-placeholder-key'

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing. Using development placeholders; DB calls will fail until backend/.env is configured.',
  )
}

const supabase = createClient(
  SUPABASE_URL || FALLBACK_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY || FALLBACK_SUPABASE_KEY,
)

const RESTAURANT_COLUMNS = 'id,name,category,location,price,hours_of_operation,weekly_hours' as const

async function getRestaurants(): Promise<Restaurant[]> {
  const { data, error } = await supabase
    .from('restaurants')
    .select(RESTAURANT_COLUMNS)

  if (error) throw error
  return (data ?? []) as Restaurant[]
}

async function addRestaurant(input: Omit<Restaurant, 'id'>): Promise<Restaurant> {
  const { data, error } = await supabase
    .from('restaurants')
    .insert({
      ...input,
      hours_of_operation: input.hours_of_operation ?? null,
      weekly_hours: input.weekly_hours ?? null,
    })
    .select(RESTAURANT_COLUMNS)
    .single()

  if (error) throw error
  return data as Restaurant
}

async function updateRestaurant(id: string, patch: Partial<Omit<Restaurant, 'id'>>): Promise<Restaurant> {
  const { data, error } = await supabase
    .from('restaurants')
    .update(patch)
    .eq('id', id)
    .select(RESTAURANT_COLUMNS)
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
  groupSessions,
}
