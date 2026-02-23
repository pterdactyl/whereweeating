import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend .env');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export type SessionState = 'lobby' | 'result';

export type SessionFilters = {
  categories: string[];
  price: string | null;
  locations: string[];
};

export type GroupSession = {
  id: string;
  code: string;
  host_user_id: string;
  state: SessionState;
  result_restaurant_id: string | null;
  created_at: string;
};

export type Participant = {
  id: string;
  session_id: string;
  name: string;
  joined_at: string;
};

export type ParticipantFilters = {
  id: string;
  session_id: string;
  participant_id: string;
  filters: SessionFilters;
};

export async function createSession(hostUserId: string): Promise<GroupSession> {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();

  const { data, error } = await supabase
    .from('group_sessions')
    .insert({
      code,
      host_user_id: hostUserId,
      state: 'lobby',
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as GroupSession;
}

export async function getSessionByCode(code: string): Promise<GroupSession | null> {
  const { data, error } = await supabase
    .from('group_sessions')
    .select('*')
    .eq('code', code)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as GroupSession | null;
}

export async function getSessionById(id: string): Promise<GroupSession | null> {
  const { data, error } = await supabase
    .from('group_sessions')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as GroupSession | null;
}

export async function listParticipants(sessionId: string): Promise<Participant[]> {
  const { data, error } = await supabase
    .from('group_participants')
    .select('*')
    .eq('session_id', sessionId)
    .order('joined_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as Participant[];
}

export async function addParticipant(sessionId: string, name: string): Promise<Participant> {
  const { data, error } = await supabase
    .from('group_participants')
    .insert({
      session_id: sessionId,
      name,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as Participant;
}

export async function upsertParticipantFilters(
  sessionId: string,
  participantId: string,
  filters: SessionFilters,
): Promise<ParticipantFilters> {
  const { data, error } = await supabase
    .from('group_participant_filters')
    .upsert(
      {
        session_id: sessionId,
        participant_id: participantId,
        filters,
      },
      { onConflict: 'session_id,participant_id' },
    )
    .select('*')
    .single();

  if (error) throw error;
  return data as ParticipantFilters;
}

export async function listParticipantFilters(sessionId: string): Promise<ParticipantFilters[]> {
  const { data, error } = await supabase
    .from('group_participant_filters')
    .select('*')
    .eq('session_id', sessionId);

  if (error) throw error;
  return (data ?? []) as ParticipantFilters[];
}

export async function saveResult(
  sessionId: string,
  restaurantId: string | null,
): Promise<GroupSession> {
  const { data, error } = await supabase
    .from('group_sessions')
    .update({
      result_restaurant_id: restaurantId,
      state: restaurantId ? 'result' : 'lobby',
    })
    .eq('id', sessionId)
    .select('*')
    .single();

  if (error) throw error;
  return data as GroupSession;
}

