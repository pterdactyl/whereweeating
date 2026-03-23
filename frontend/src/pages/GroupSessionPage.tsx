import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { useAuthVersion } from '../lib/authSync';
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
  shortlistRestaurants: Restaurant[];
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
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem('token');
          showToast('error', 'Please log in again to create a session');
          return;
        }
        showToast('error', 'Failed to create session');
        return;
      }

      const session: GroupSession = await res.json();
      navigate(`/group-sessions/${session.id}?code=${encodeURIComponent(session.code)}&host=1`);
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
      const sid = data.session.id;
      const pid = data.participant.id;
      sessionStorage.setItem('group_participant_id', pid);
      try {
        localStorage.setItem(`group_participant_${sid}`, pid);
      } catch (_) {}
      navigate(`/group-sessions/${sid}`);
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

function getStoredParticipantId(sessionId: string): string {
  try {
    return localStorage.getItem(`group_participant_${sessionId}`) || sessionStorage.getItem('group_participant_id') || '';
  } catch {
    return sessionStorage.getItem('group_participant_id') || '';
  }
}

function setStoredParticipantId(sessionId: string, participantId: string) {
  sessionStorage.setItem('group_participant_id', participantId);
  try {
    localStorage.setItem(`group_participant_${sessionId}`, participantId);
  } catch (_) {}
}

function ActiveSessionView({ sessionId }: { sessionId: string }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();

  const needsHostAuth = searchParams.get('host') === '1' && searchParams.get('code');
  useEffect(() => {
    if (needsHostAuth && !localStorage.getItem('token')) {
      const returnTo = `/group-sessions/${sessionId}?${searchParams.toString()}`;
      navigate(`/login?returnTo=${encodeURIComponent(returnTo)}`, { replace: true });
    }
  }, [needsHostAuth, sessionId, searchParams, navigate]);
  const [data, setData] = useState<SessionResponse | null>(null);
  const [allRestaurants, setAllRestaurants] = useState<Restaurant[]>([]);
  const [filters, setFilters] = useState<SessionFilters>(emptyFilters);
  const [hostFilters, setHostFilters] = useState<SessionFilters>(emptyFilters);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingFilters, setIsSavingFilters] = useState(false);
  const [isSavingHostFilters, setIsSavingHostFilters] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hostName, setHostName] = useState('');
  const [isJoiningAsHost, setIsJoiningAsHost] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [finalizePick, setFinalizePick] = useState<string | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);

  useAuthVersion();
  const participantId = getStoredParticipantId(sessionId);
  const isHostPrompt = Boolean(searchParams.get('host') === '1' && searchParams.get('code') && !participantId);

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

        const hf = sessionData.session.host_filters;
        if (hf) {
          setHostFilters({
            categories: Array.isArray(hf.categories) ? hf.categories : [],
            price: typeof hf.price === 'string' ? hf.price : null,
            locations: Array.isArray(hf.locations) ? hf.locations : [],
          });
        }

        if (!restRes.ok) {
          showToast('error', 'Failed to load restaurants');
        } else {
          const restaurants: Restaurant[] = await restRes.json();
          setAllRestaurants(restaurants);
        }

        const pid = getStoredParticipantId(sessionId);
        if (pid) {
          const filtersRes = await fetch(apiUrl(`/api/group-sessions/${sessionId}/filters?participantId=${encodeURIComponent(pid)}`));
          if (filtersRes.ok) {
            const filtersData = await filtersRes.json();
            if (filtersData?.filters) {
              setFilters({
                categories: Array.isArray(filtersData.filters.categories) ? filtersData.filters.categories : [],
                price: typeof filtersData.filters.price === 'string' ? filtersData.filters.price : null,
                locations: Array.isArray(filtersData.filters.locations) ? filtersData.filters.locations : [],
              });
            }
          }
        }
      } catch {
        showToast('error', 'Network error. Try again.');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [sessionId, showToast]);

  const handleJoinAsHost = async () => {
    const code = searchParams.get('code')?.trim();
    const name = hostName.trim();
    if (!code || !name) {
      showToast('warning', 'Enter your name');
      return;
    }
    try {
      setIsJoiningAsHost(true);
      const res = await fetch(apiUrl('/api/group-sessions/join'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.toUpperCase(), name }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showToast('error', data.message || 'Failed to join as host');
        return;
      }
      const joinData: JoinResponse = await res.json();
      if (joinData.session.id !== sessionId) {
        showToast('error', 'Session mismatch');
        return;
      }
      setStoredParticipantId(sessionId, joinData.participant.id);
      setData(prev => prev ? { ...prev, participants: joinData.participants } : prev);
      setSearchParams({}, { replace: true });
      showToast('success', "You're in the session");
    } catch {
      showToast('error', 'Network error. Try again.');
    } finally {
      setIsJoiningAsHost(false);
    }
  };

  const handleSaveHostFilters = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      setIsSavingHostFilters(true);
      const res = await fetch(apiUrl(`/api/group-sessions/${sessionId}/host-filters`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(hostFilters),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        showToast('error', d.message || 'Failed to save room filters');
        return;
      }
      const updated = await res.json();
      setData(prev => (prev ? { ...prev, session: updated } : prev));
      showToast('success', 'Room filters saved');
    } catch {
      showToast('error', 'Network error. Try again.');
    } finally {
      setIsSavingHostFilters(false);
    }
  };

  const handleSaveFilters = async () => {
    if (!participantId) {
      showToast('error', 'Missing participant. Join the session again.');
      return;
    }
    try {
      setIsSavingFilters(true);
      const res = await fetch(apiUrl(`/api/group-sessions/${sessionId}/filters`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId, filters }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        showToast('error', d.message || 'Failed to save preferences');
        return;
      }
      showToast('success', 'Preferences saved');
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
        showToast('error', 'Only the host can generate shortlist');
        return;
      }
      const res = await fetch(apiUrl(`/api/group-sessions/${sessionId}/generate`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          showToast('error', 'Please log in again to generate');
          return;
        }
        const d = await res.json().catch(() => ({}));
        showToast('error', d.message || 'Failed to generate shortlist');
        return;
      }
      const dataRes: GenerateResponse = await res.json();
      setData(prev => (prev ? { ...prev, session: dataRes.session } : prev));
      showToast('success', 'Shortlist generated');
    } catch {
      showToast('error', 'Network error. Try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleVeto = async (restaurantId: string) => {
    setActionLoading(restaurantId);
    try {
      const res = await fetch(apiUrl(`/api/group-sessions/${sessionId}/shortlist/remove`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        showToast('error', d.message || 'Failed to remove');
        return;
      }
      const { session: updatedSession } = await res.json();
      setData(prev => (prev ? { ...prev, session: updatedSession } : prev));
      showToast('success', 'Removed and refilled');
    } catch {
      showToast('error', 'Network error. Try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleLike = async (restaurantId: string, liked: boolean) => {
    setActionLoading(restaurantId);
    try {
      const res = await fetch(apiUrl(`/api/group-sessions/${sessionId}/shortlist/like`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId, liked }),
      });
      if (!res.ok) return;
      const updated = await res.json();
      setData(prev => (prev ? { ...prev, session: updated } : prev));
    } catch {
      showToast('error', 'Failed to update like');
    } finally {
      setActionLoading(null);
    }
  };

  const handleFinalize = async (restaurantId: string) => {
    const token = localStorage.getItem('token');
    if (!token) {
      showToast('error', 'Please log in to finalize');
      return;
    }
    setIsFinalizing(true);
    try {
      const res = await fetch(apiUrl(`/api/group-sessions/${sessionId}/finalize`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ restaurantId }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        showToast('error', d.message || 'Failed to finalize');
        return;
      }
      const updated = await res.json();
      setData(prev => (prev ? { ...prev, session: updated } : prev));
      setFinalizePick(null);
      showToast('success', 'Final pick saved');
    } catch {
      showToast('error', 'Network error. Try again.');
    } finally {
      setIsFinalizing(false);
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
    return Boolean(email);
  })();

  const isLoggedOut = !localStorage.getItem('token');

  return (
    <div className="page">
      <div className="page-bg" />
      <div className="page-content">
        <div className="flex flex-col items-center gap-6 w-full px-4 py-8 sm:py-12">
          <div className="content w-full max-w-md text-left">
            {isLoggedOut && (
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-900 mb-2">
                  You&apos;ve been logged out. <Link to={`/login?returnTo=${encodeURIComponent(`/group-sessions/${sessionId}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`)}`} className="font-semibold underline">Log in again</Link> to access host features (room filters, generate shortlist, finalize).
                </p>
              </div>
            )}
            {isHostPrompt && (
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm font-medium text-amber-900 mb-2">Enter your name to join as host</p>
                <div className="flex gap-2">
                  <input
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                    placeholder="Your name"
                    value={hostName}
                    onChange={e => setHostName(e.target.value)}
                  />
                  <button
                    onClick={handleJoinAsHost}
                    disabled={isJoiningAsHost}
                    className="bg-black text-white font-medium py-2 px-4 rounded-md disabled:opacity-60"
                  >
                    {isJoiningAsHost ? 'Joining…' : 'Join'}
                  </button>
                </div>
              </div>
            )}
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

            {data.session.state === 'lobby' && (
              <>
                {isHost && (
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <p className="text-sm font-semibold mb-2">Room filters (pool)</p>
                    <p className="text-xs text-gray-500 mb-2">These define which restaurants can appear. Only host can edit.</p>
                    <div className="flex flex-col gap-3">
                      <Multiselect
                        label="Category"
                        options={categoryOptions}
                        selected={hostFilters.categories}
                        onChange={cats => setHostFilters(prev => ({ ...prev, categories: cats }))}
                        placeholder="Any category"
                      />
                      <div>
                        <label className="text-sm font-medium block mb-2">Price</label>
                        <select
                          value={hostFilters.price || ''}
                          onChange={e => setHostFilters(prev => ({ ...prev, price: e.target.value || null }))}
                          className="w-full min-h-[40px] px-3 py-2 rounded-md border border-gray-200 bg-white/90"
                        >
                          <option value="">All Prices</option>
                          <option value="$">$</option>
                          <option value="$$">$$</option>
                          <option value="$$$">$$$</option>
                          <option value="$$$$">$$$$</option>
                        </select>
                      </div>
                      <Multiselect
                        label="City"
                        options={cityOptions}
                        selected={hostFilters.locations}
                        onChange={locs => setHostFilters(prev => ({ ...prev, locations: locs }))}
                        placeholder="Any city"
                      />
                      <button
                        onClick={handleSaveHostFilters}
                        disabled={isSavingHostFilters}
                        className="w-full bg-white border border-gray-300 hover:border-gray-400 text-gray-800 font-medium py-2 px-4 rounded-lg"
                      >
                        {isSavingHostFilters ? 'Saving…' : 'Save room filters'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="border-t border-gray-200 pt-4 mt-4">
                  <p className="text-sm font-semibold mb-2">Your preferences (weight the pool)</p>
                  <p className="text-xs text-gray-500 mb-2">Restaurants matching your preferences are more likely to be picked.</p>
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
                      <select
                        value={filters.price || ''}
                        onChange={e => setFilters(prev => ({ ...prev, price: e.target.value || null }))}
                        className="w-full min-h-[40px] px-3 py-2 rounded-md border border-gray-200 bg-white/90"
                      >
                        <option value="">All Prices</option>
                        <option value="$">$</option>
                        <option value="$$">$$</option>
                        <option value="$$$">$$$</option>
                        <option value="$$$$">$$$$</option>
                      </select>
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
                      disabled={isSavingFilters || !participantId}
                      className="mt-1 w-full bg-white border border-gray-300 hover:border-gray-400 text-gray-800 font-medium py-2 px-4 rounded-lg"
                    >
                      {isSavingFilters ? 'Saving…' : 'Save preferences'}
                    </button>
                  </div>
                </div>

                {isHost && (
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <button
                      onClick={handleGenerate}
                      disabled={isGenerating}
                      className="w-full bg-black hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg"
                    >
                      {isGenerating ? 'Generating…' : 'Generate shortlist'}
                    </button>
                  </div>
                )}
              </>
            )}

            {data.session.state === 'shortlist' && (() => {
              const shortlistIds = data.session.shortlist_restaurant_ids || [];
              const shortlistRestaurants = shortlistIds
                .map(rid => allRestaurants.find(r => r.id === rid))
                .filter((r): r is Restaurant => Boolean(r));
              const likedSet = new Set(data.session.liked_restaurant_ids || []);
              return (
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <p className="text-sm font-semibold mb-3">Shortlist — like, veto, or finalize</p>
                  {shortlistRestaurants.length === 0 ? (
                    <p className="text-sm text-gray-500">No restaurants in shortlist.</p>
                  ) : (
                    <ul className="space-y-3">
                      {shortlistRestaurants.map(r => (
                        <li
                          key={r.id}
                          className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-black truncate">{r.name}</p>
                            <p className="text-xs text-gray-600 truncate">
                              {r.category} • {r.location} • <span className="font-medium">{r.price}</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              aria-label={likedSet.has(r.id) ? 'Unlike' : 'Like'}
                              onClick={() => handleLike(r.id, !likedSet.has(r.id))}
                              disabled={actionLoading === r.id}
                              className={`p-2 rounded-lg border transition-colors ${
                                likedSet.has(r.id)
                                  ? 'bg-red-50 border-red-200 text-red-600'
                                  : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                              }`}
                            >
                              ♥
                            </button>
                            <button
                              type="button"
                              aria-label="Veto"
                              onClick={() => handleVeto(r.id)}
                              disabled={actionLoading === r.id}
                              className="p-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                            >
                              ✕
                            </button>
                            {isHost && (
                              <button
                                type="button"
                                onClick={() => setFinalizePick(finalizePick === r.id ? null : r.id)}
                                disabled={isFinalizing}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                                  finalizePick === r.id
                                    ? 'bg-black text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                Pick
                              </button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  {isHost && finalizePick && (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => handleFinalize(finalizePick)}
                        disabled={isFinalizing}
                        className="flex-1 bg-black text-white font-semibold py-2 px-4 rounded-lg disabled:opacity-50"
                      >
                        {isFinalizing ? 'Finalizing…' : 'Finalize this pick'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setFinalizePick(null)}
                        className="px-4 py-2 border border-gray-300 rounded-lg"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}

            {data.session.state === 'result' && data.session.result_restaurant_id && (() => {
              const finalRestaurant = allRestaurants.find(r => r.id === data.session.result_restaurant_id);
              if (!finalRestaurant) return null;
              return (
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Final pick</p>
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-4">
                    <p className="font-bold text-lg text-black mb-1">{finalRestaurant.name}</p>
                    <p className="text-sm text-gray-600">
                      {finalRestaurant.category} • {finalRestaurant.location} •{' '}
                      <span className="font-semibold">{finalRestaurant.price}</span>
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
        <BottomNav />
      </div>
    </div>
  );
}

