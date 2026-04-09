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
  host_filters: SessionFilters | null;
  shortlist_restaurant_ids: string[];
  shown_restaurant_ids: string[];
  liked_restaurant_ids: string[];
};

export type Participant = {
  id: string;
  session_id: string;
  name: string;
  joined_at?: string;
  is_ready?: boolean;
  ready_at?: string | null;
};
