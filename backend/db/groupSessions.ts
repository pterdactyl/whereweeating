import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend .env');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export type SessionState = 'lobby' | 'shortlist' | 'result';

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
  expires_at: string;
  host_filters: SessionFilters | null;
  shortlist_restaurant_ids: string[];
  shown_restaurant_ids: string[];
  liked_restaurant_ids: string[];
};

export type Participant = {
  id: string;
  session_id: string;
  name: string;
  joined_at: string;
  is_ready: boolean;
  ready_at: string | null;
};

export type ParticipantFilters = {
  id: string;
  session_id: string;
  participant_id: string;
  filters: SessionFilters;
};

const defaultHostFilters: SessionFilters = {
  categories: [],
  price: null,
  locations: [],
};

export async function createSession(hostUserId: string): Promise<GroupSession> {
  await deleteExpiredSessions();

  const code = Math.random().toString(36).substring(2, 8).toUpperCase();

  const { data, error } = await supabase
    .from('group_sessions')
    .insert({
      code,
      host_user_id: hostUserId,
      state: 'lobby',
      host_filters: defaultHostFilters,
      shortlist_restaurant_ids: [],
      shown_restaurant_ids: [],
      liked_restaurant_ids: [],
    })
    .select('*')
    .single();

  if (error) throw error;
  return normalizeSession(data);
}

function normalizeSession(row: any): GroupSession {
  return {
    id: row.id,
    code: row.code,
    host_user_id: row.host_user_id,
    state: row.state ?? 'lobby',
    result_restaurant_id: row.result_restaurant_id ?? null,
    created_at: row.created_at,
    expires_at: row.expires_at ?? row.created_at,
    host_filters: row.host_filters ?? defaultHostFilters,
    shortlist_restaurant_ids: Array.isArray(row.shortlist_restaurant_ids) ? row.shortlist_restaurant_ids : [],
    shown_restaurant_ids: Array.isArray(row.shown_restaurant_ids) ? row.shown_restaurant_ids : [],
    liked_restaurant_ids: Array.isArray(row.liked_restaurant_ids) ? row.liked_restaurant_ids : [],
  };
}

export async function deleteExpiredSessions(): Promise<number> {
  const { data, error } = await supabase.rpc('delete_expired_group_sessions');
  if (error) {
    console.warn('deleteExpiredSessions failed:', error.message);
    return 0;
  }
  return typeof data === 'number' ? data : 0;
}

export async function getSessionByCode(code: string): Promise<GroupSession | null> {
  const { data, error } = await supabase
    .from('group_sessions')
    .select('*')
    .eq('code', code)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (error) throw error;
  return data ? normalizeSession(data) : null;
}

export async function getSessionById(id: string): Promise<GroupSession | null> {
  const { data, error } = await supabase
    .from('group_sessions')
    .select('*')
    .eq('id', id)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (error) throw error;
  return data ? normalizeSession(data) : null;
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

export async function getParticipantByName(
  sessionId: string,
  name: string,
): Promise<Participant | null> {
  const { data, error } = await supabase
    .from('group_participants')
    .select('*')
    .eq('session_id', sessionId)
    .eq('name', name)
    .maybeSingle();

  if (error) throw error;
  return (data as Participant) ?? null;
}

export async function deleteParticipant(
  sessionId: string,
  participantId: string,
): Promise<void> {
  const { error: filtersError } = await supabase
    .from('group_participant_filters')
    .delete()
    .eq('session_id', sessionId)
    .eq('participant_id', participantId);
  if (filtersError) throw filtersError;

  const { error } = await supabase
    .from('group_participants')
    .delete()
    .eq('session_id', sessionId)
    .eq('id', participantId);
  if (error) throw error;
}

export async function closeSession(
  sessionId: string,
): Promise<void> {
  const { error: filtersError } = await supabase
    .from('group_participant_filters')
    .delete()
    .eq('session_id', sessionId);
  if (filtersError) throw filtersError;

  const { error: participantsError } = await supabase
    .from('group_participants')
    .delete()
    .eq('session_id', sessionId);
  if (participantsError) throw participantsError;

  const { error } = await supabase
    .from('group_sessions')
    .delete()
    .eq('id', sessionId);
  if (error) throw error;
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

export async function setParticipantReady(
  sessionId: string,
  participantId: string,
  ready: boolean,
): Promise<Participant> {
  const { data, error } = await supabase
    .from('group_participants')
    .update({
      is_ready: ready,
      ready_at: ready ? new Date().toISOString() : null,
    })
    .eq('session_id', sessionId)
    .eq('id', participantId)
    .select('*')
    .single();

  if (error) {
    if ((error as any)?.code === 'PGRST204') {
      throw new Error(
        "Database schema missing readiness columns. Add `is_ready boolean default false` and `ready_at timestamptz` to `group_participants` in Supabase.",
      );
    }
    throw error;
  }
  return data as Participant;
}

export async function getParticipantById(
  sessionId: string,
  participantId: string,
): Promise<Participant | null> {
  const { data, error } = await supabase
    .from('group_participants')
    .select('*')
    .eq('session_id', sessionId)
    .eq('id', participantId)
    .maybeSingle();

  if (error) throw error;
  return (data as Participant) ?? null;
}

export async function listReadyParticipants(sessionId: string): Promise<Participant[]> {
  const { data, error } = await supabase
    .from('group_participants')
    .select('*')
    .eq('session_id', sessionId)
    .eq('is_ready', true)
    .order('joined_at', { ascending: true });

  if (error) {
    if ((error as any)?.code === 'PGRST204') {
      throw new Error(
        "Database schema missing readiness columns. Add `is_ready boolean default false` and `ready_at timestamptz` to `group_participants` in Supabase.",
      );
    }
    throw error;
  }
  return (data ?? []) as Participant[];
}

export async function listParticipantFiltersForParticipants(
  sessionId: string,
  participantIds: string[],
): Promise<ParticipantFilters[]> {
  if (!participantIds.length) return [];

  const { data, error } = await supabase
    .from('group_participant_filters')
    .select('*')
    .eq('session_id', sessionId)
    .in('participant_id', participantIds);

  if (error) throw error;
  return (data ?? []) as ParticipantFilters[];
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
  return normalizeSession(data);
}

export async function updateHostFilters(
  sessionId: string,
  hostFilters: SessionFilters,
): Promise<GroupSession> {
  const { data, error } = await supabase
    .from('group_sessions')
    .update({ host_filters: hostFilters })
    .eq('id', sessionId)
    .select('*')
    .single();

  if (error) throw error;
  return normalizeSession(data);
}

export async function setShortlist(
  sessionId: string,
  shortlistIds: string[],
  shownIds: string[],
): Promise<GroupSession> {
  const { data, error } = await supabase
    .from('group_sessions')
    .update({
      shortlist_restaurant_ids: shortlistIds,
      shown_restaurant_ids: shownIds,
      state: 'shortlist',
    })
    .eq('id', sessionId)
    .select('*')
    .single();

  if (error) throw error;
  return normalizeSession(data);
}

export async function removeFromShortlistAndAppendShown(
  sessionId: string,
  restaurantIdToRemove: string,
  newShortlist: string[],
  newShown: string[],
): Promise<GroupSession> {
  const { data, error } = await supabase
    .from('group_sessions')
    .update({
      shortlist_restaurant_ids: newShortlist,
      shown_restaurant_ids: newShown,
    })
    .eq('id', sessionId)
    .select('*')
    .single();

  if (error) throw error;
  return normalizeSession(data);
}

export async function toggleLiked(
  sessionId: string,
  restaurantId: string,
  liked: boolean,
): Promise<GroupSession> {
  const session = await getSessionById(sessionId);
  if (!session) throw new Error('Session not found');
  const current = session.liked_restaurant_ids || [];
  const next = liked
    ? (current.includes(restaurantId) ? current : [...current, restaurantId])
    : current.filter(id => id !== restaurantId);
  const { data, error } = await supabase
    .from('group_sessions')
    .update({ liked_restaurant_ids: next })
    .eq('id', sessionId)
    .select('*')
    .single();

  if (error) throw error;
  return normalizeSession(data);
}

export async function finalizeSession(
  sessionId: string,
  restaurantId: string,
): Promise<GroupSession> {
  const { data, error } = await supabase
    .from('group_sessions')
    .update({
      result_restaurant_id: restaurantId,
      state: 'result',
    })
    .eq('id', sessionId)
    .select('*')
    .single();

  if (error) throw error;
  return normalizeSession(data);
}

