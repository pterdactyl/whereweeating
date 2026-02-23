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
};

export type Participant = {
  id: string;
  session_id: string;
  name: string;
};

