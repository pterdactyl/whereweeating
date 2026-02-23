import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { apiUrl } from '../lib/api';
import { useToast } from '../components/Toast';
import type { GroupSession, Participant, SessionFilters } from '../types/GroupSession';
import type { Restaurant } from '../types/Restaurant';
import Multiselect from '../components/Multiselect';

type SessionResponse = {
  session: GroupSession;
  participants: Participant[];
};

type JoinResponse = {
  session: GroupSession;
  participant: Participant;
  participants: Participant[];
};

type GenerateResponse = {
  session: GroupSession;
  resultRestaurant: Restaurant;
};

const emptyFilters: SessionFilters = {
  categories: [],
  price: null,
  locations: [],
};

function CreateOrJoinScreen() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [isCreating, setIsCreating] = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const [joinName, setJoinName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('token');
      if (!token) {
        showToast('error', 'Please log in to create a session');
        return;
      }

      const res = await fetch(apiUrl('/api/group-sessions'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        showToast('error', 'Failed to create session');
        return;
      }

      const session: GroupSession = await res.json();
      navigate(`/group-sessions/${session.id}`);
    } catch {
      showToast('error', 'Network error. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim() || !joinName.trim()) {
      showToast('warning', 'Enter a name and code');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(apiUrl('/api/group-sessions/join'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: joinCode.trim().toUpperCase(),
          name: joinName.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showToast('error', data.message || 'Failed to join session');
        return;
      }

      const data: JoinResponse = await res.json();
      sessionStorage.setItem('group_participant_id', data.participant.id);
      navigate(`/group-sessions/${data.session.id}`);
    } catch {
      showToast('error', 'Network error. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page">
      <div className="page-bg" />
      <div className="page-content">
        <div className="flex flex-col items-center gap-6 w-full px-4 py-8 sm:py-12">
          <div className="content w-full max-w-md">
            <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-left">Group Session</h1>

            <div className="flex gap-2 mb-6 bg-white/90 rounded-lg p-1 shadow-md">
              <button
                className={`flex-1 py-2 px-4 rounded-md font-semibold transition-all ${
                  isCreating
                    ? 'bg-black text-white shadow-md'
                    : 'text-gray-700 hover:text-black'
                }`}
                onClick={() => setIsCreating(true)}
              >
                Host
              </button>
              <button
                className={`flex-1 py-2 px-4 rounded-md font-semibold transition-all ${
                  !isCreating
                    ? 'bg-black text-white shadow-md'
                    : 'text-gray-700 hover:text-black'
                }`}
                onClick={() => setIsCreating(false)}
              >
                Join
              </button>
            </div>

            {isCreating ? (
              <div className="space-y-4 text-left">
                <p className="text-sm text-gray-700">
                  Create a new group session and share the code with friends.
                </p>
                <button
                  onClick={handleCreate}
                  disabled={isSubmitting}
                  className="w-full bg-black hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  {isSubmitting ? 'Creating…' : 'Create Session'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-left">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Your Name
                  </label>
                  <input
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
                    value={joinName}
                    onChange={e => setJoinName(e.target.value)}
                  />
                </div>
                <div className="text-left">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Session Code
                  </label>
                  <input
                    className="w-full border border-gray-300 rounded-md px-3 py-2 uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-black"
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  />
                </div>
                <button
                  onClick={handleJoin}
                  disabled={isSubmitting}
                  className="w-full bg-black hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  {isSubmitting ? 'Joining…' : 'Join Session'}
                </button>
              </div>
            )}
          </div>
        </div>
        <BottomNav />
      </div>
    </div>
  );
}

export default function GroupSessionPage() {
  const params = useParams<{ id?: string }>();

  if (!params.id) {
    return <CreateOrJoinScreen />;
  }

  return <ActiveSessionView sessionId={params.id} />;
}

function ActiveSessionView({ sessionId }: { sessionId: string }) {
  const { showToast } = useToast();
  const [data, setData] = useState<SessionResponse | null>(null);
  const [allRestaurants, setAllRestaurants] = useState<Restaurant[]>([]);
  const [filters, setFilters] = useState<SessionFilters>(emptyFilters);
  const [result, setResult] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingFilters, setIsSavingFilters] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const participantId = sessionStorage.getItem('group_participant_id') || '';

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const [sessionRes, restRes] = await Promise.all([
          fetch(apiUrl(`/api/group-sessions/${sessionId}`)),
          fetch(apiUrl('/api/restaurants')),
        ]);

        if (!sessionRes.ok) {
          showToast('error', 'Failed to load session');
          return;
        }

        const sessionData: SessionResponse = await sessionRes.json();
        setData(sessionData);

        if (!restRes.ok) {
          showToast('error', 'Failed to load restaurants');
        } else {
          const restaurants: Restaurant[] = await restRes.json();
          setAllRestaurants(restaurants);
        }
      } catch {
        showToast('error', 'Network error. Try again.');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [sessionId, showToast]);

  const handleSaveFilters = async () => {
    if (!participantId) {
      showToast('error', 'Missing participant. Join the session again.');
      return;
    }

    try {
      setIsSavingFilters(true);
      const res = await fetch(apiUrl(`/api/group-sessions/${sessionId}/filters`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ participantId, filters }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showToast('error', data.message || 'Failed to save filters');
        return;
      }

      showToast('success', 'Filters saved');
    } catch {
      showToast('error', 'Network error. Try again.');
    } finally {
      setIsSavingFilters(false);
    }
  };

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      const token = localStorage.getItem('token');
      if (!token) {
        showToast('error', 'Only the host can generate');
        return;
      }

      const res = await fetch(apiUrl(`/api/group-sessions/${sessionId}/generate`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showToast('error', data.message || 'Failed to generate result');
        return;
      }

      const dataRes: GenerateResponse = await res.json();
      setData(prev => (prev ? { ...prev, session: dataRes.session } : prev));
      setResult(dataRes.resultRestaurant);
    } catch {
      showToast('error', 'Network error. Try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const categoryOptions = Array.from(
    new Set(
      allRestaurants.flatMap(r =>
        (r.category || '')
          .split(',')
          .map(s => s.trim())
          .filter(Boolean),
      ),
    ),
  ).sort();

  const getCityFromLocation = (loc: string): string => {
    if (!loc) return '';
    const parts = loc.split(',');
    return parts[parts.length - 1].trim();
  };

  const cityOptions = Array.from(
    new Set(
      allRestaurants
        .map(r => getCityFromLocation(r.location || ''))
        .filter(Boolean),
    ),
  ).sort();

  if (isLoading || !data) {
    return (
      <div className="page">
        <div className="page-bg" />
        <div className="page-content">
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
          </div>
          <BottomNav />
        </div>
      </div>
    );
  }

  const isHost = (() => {
    const email = localStorage.getItem('email');
    // host enforcement is done on backend; here we only toggle button UX
    return Boolean(email);
  })();

  return (
    <div className="page">
      <div className="page-bg" />
      <div className="page-content">
        <div className="flex flex-col items-center gap-6 w-full px-4 py-8 sm:py-12">
          <div className="content w-full max-w-md text-left">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold">Group Session</h1>
                <p className="text-xs text-gray-600 mt-1">
                  State: <span className="font-semibold">{data.session.state}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-[0.7rem] uppercase tracking-widest text-gray-500">
                  Code
                </p>
                <p className="font-mono font-semibold text-sm">
                  {data.session.code}
                </p>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-700 mb-1">Participants</p>
              <div className="flex flex-wrap gap-2">
                {data.participants.length === 0 ? (
                  <span className="text-xs text-gray-500">No one joined yet</span>
                ) : (
                  data.participants.map(p => (
                    <span
                      key={p.id}
                      className="px-2 py-1 rounded-full bg-gray-100 text-xs text-gray-800"
                    >
                      {p.name}
                    </span>
                  ))
                )}
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4 mt-4">
              <p className="text-sm font-semibold mb-2">Your Filters</p>
              <div className="flex flex-col gap-3">
                <Multiselect
                  label="Category"
                  options={categoryOptions}
                  selected={filters.categories}
                  onChange={cats => setFilters(prev => ({ ...prev, categories: cats }))}
                  placeholder="Choose categories…"
                />

                <div>
                  <label className="text-sm font-medium block mb-2">Price</label>
                  <div className="relative">
                    <select
                      value={filters.price || ''}
                      onChange={e =>
                        setFilters(prev => ({
                          ...prev,
                          price: e.target.value || null,
                        }))
                      }
                      className="w-full min-h-[40px] px-3 py-2 rounded-md border border-gray-200 bg-white/90 hover:border-gray-300 transition-colors"
                    >
                      <option value="">All Prices</option>
                      <option value="$">$</option>
                      <option value="$$">$$</option>
                      <option value="$$$">$$$</option>
                      <option value="$$$$">$$$$</option>
                    </select>
                  </div>
                </div>

                <Multiselect
                  label="City"
                  options={cityOptions}
                  selected={filters.locations}
                  onChange={locs => setFilters(prev => ({ ...prev, locations: locs }))}
                  placeholder="Choose cities…"
                />

                <button
                  onClick={handleSaveFilters}
                  disabled={isSavingFilters}
                  className="mt-1 w-full bg-white border border-gray-300 hover:border-gray-400 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  {isSavingFilters ? 'Saving…' : 'Save Filters'}
                </button>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4 mt-4">
              <p className="text-sm font-semibold mb-3">Group Result</p>
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !isHost}
                className="w-full bg-black hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors mb-4"
              >
                {isGenerating ? 'Generating…' : 'Generate for Group'}
              </button>

              {result && (
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-4 shadow-md">
                  <p className="text-xs text-gray-600 mb-1">You should eat at:</p>
                  <p className="font-bold text-lg text-black mb-2">{result.name}</p>
                  <p className="text-xs text-gray-600">
                    {result.category} • {result.location} •{' '}
                    <span className="font-semibold">{result.price}</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        <BottomNav />
      </div>
    </div>
  );
}

