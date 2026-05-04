import '../styles/App.css';
import { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FaCog, FaFilter, FaRedoAlt } from 'react-icons/fa';
import { Restaurant } from '../types/Restaurant';
import { apiUrl } from '../lib/api';
import { useToast } from '../components/Toast';
import Multiselect from '../components/Multiselect';
import { GroupSessionHomePanel } from './GroupSessionPage';

export default function HomeV2() {
  const { showToast } = useToast();
  const gearRef = useRef<HTMLDivElement>(null);
  const [gearOpen, setGearOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);

  const [allRestaurants, setAllRestaurants] = useState<Restaurant[]>([]);
  const [randomRestaurant, setRandomRestaurant] = useState<Restaurant | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedPrice, setSelectedPrice] = useState('');
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(apiUrl('/api/restaurants'));
        if (res.ok) {
          const data = await res.json();
          setAllRestaurants(data);
        } else {
          showToast('error', 'Could not load restaurants from backend');
        }
      } catch (error) {
        console.error('Error fetching restaurants:', error);
        showToast('error', 'Failed to load restaurants');
      } finally {
        setIsLoading(false);
      }
    };
    fetchRestaurants();
  }, []);

  useEffect(() => {
    if (!gearOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (gearRef.current && !gearRef.current.contains(e.target as Node)) {
        setGearOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [gearOpen]);

  const categoryOptions = useMemo(
    () =>
      Array.from(
        new Set(
          allRestaurants.flatMap(r =>
            (r.category || '')
              .split(',')
              .map(s => s.trim())
              .filter(Boolean),
          ),
        ),
      ).sort(),
    [allRestaurants],
  );

  const getCityFromLocation = (loc: string): string => {
    if (!loc) return '';
    const parts = loc.split(',');
    return parts[parts.length - 1].trim();
  };

  const cityOptions = useMemo(
    () =>
      Array.from(
        new Set(allRestaurants.map(r => getCityFromLocation(r.location || '')).filter(Boolean)),
      ).sort(),
    [allRestaurants],
  );

  const priceOptions = useMemo(
    () => Array.from(new Set(allRestaurants.map(r => r.price))).sort(),
    [allRestaurants],
  );

  const getRestaurantCategories = (categoryStr: string): string[] =>
    (categoryStr || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

  const filteredRestaurants = useMemo((): Restaurant[] => {
    let filtered = [...allRestaurants];

    if (selectedCategories.length > 0) {
      filtered = filtered.filter(r => {
        const restCats = getRestaurantCategories(r.category || '');
        return restCats.some(rc =>
          selectedCategories.some(sc => rc.toLowerCase() === sc.toLowerCase()),
        );
      });
    }

    if (selectedPrice) {
      filtered = filtered.filter(r => r.price === selectedPrice);
    }

    if (selectedLocations.length > 0) {
      filtered = filtered.filter(r => {
        const city = getCityFromLocation(r.location || '');
        return selectedLocations.some(sel => city.toLowerCase() === sel.toLowerCase());
      });
    }

    return filtered;
  }, [allRestaurants, selectedCategories, selectedPrice, selectedLocations]);

  const pickRandom = () => {
    if (filteredRestaurants.length === 0) {
      setRandomRestaurant(null);
      showToast('warning', 'No restaurants match your filters');
      return;
    }

    const randomIndex = Math.floor(Math.random() * filteredRestaurants.length);
    setRandomRestaurant(filteredRestaurants[randomIndex]);
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedPrice('');
    setSelectedLocations([]);
    setRandomRestaurant(null);
  };

  const filteredCount = filteredRestaurants.length;
  const hasActiveFilters =
    selectedCategories.length > 0 || !!selectedPrice || selectedLocations.length > 0;

  return (
    <div className="page">
      <div className="page-content">
        <div className="bp-shell px-4 pt-6 pb-10 relative min-h-screen">

          <div ref={gearRef} className="absolute top-4 right-4 z-20">
            <button
              type="button"
              onClick={() => setGearOpen(o => !o)}
              className="flex h-11 w-11 items-center justify-center rounded-full border shadow-sm transition hover:shadow-md"
              style={{
                borderColor: 'var(--bp-secondary)',
                background: 'var(--bp-card)',
                color: 'var(--bp-text)',
              }}
              aria-expanded={gearOpen}
              aria-haspopup="menu"
              aria-label="Menu"
            >
              <FaCog className="text-lg" />
            </button>
            {gearOpen && (
              <div
                className="absolute right-0 mt-2 min-w-[11rem] rounded-xl border py-1 shadow-lg"
                style={{
                  background: 'var(--bp-card)',
                  borderColor: 'var(--bp-secondary)',
                }}
                role="menu"
              >
                <Link
                  to="/"
                  role="menuitem"
                  className="block px-4 py-2.5 text-sm font-medium hover:bg-black/5"
                  onClick={() => setGearOpen(false)}
                >
                  Home
                </Link>
                <Link
                  to="/login"
                  role="menuitem"
                  className="block px-4 py-2.5 text-sm font-medium hover:bg-black/5"
                  onClick={() => setGearOpen(false)}
                >
                  Login
                </Link>
                <Link
                  to="/restaurants"
                  role="menuitem"
                  className="block px-4 py-2.5 text-sm font-medium hover:bg-black/5"
                  onClick={() => setGearOpen(false)}
                >
                  Manage restaurants
                </Link>
              </div>
            )}
          </div>

          <div className="relative z-10 flex flex-col items-center text-center pt-10 sm:pt-14">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div
                  className="h-9 w-9 animate-spin rounded-full border-2 border-b-transparent"
                  style={{ borderColor: 'var(--bp-secondary)', borderBottomColor: 'var(--bp-accent)' }}
                />
              </div>
            ) : (
              <>
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">BitePick</h1>
                <p className="mt-2 text-base sm:text-lg max-w-md" style={{ color: 'var(--bp-muted)' }}>
                  Can&apos;t Decide Where to Eat
                </p>

                <div className="mt-10 flex w-full max-w-sm items-stretch gap-2">
                  <button
                    type="button"
                    onClick={pickRandom}
                    disabled={filteredCount === 0}
                    className="flex-1 min-h-[48px] rounded-xl font-semibold shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                    style={{
                      background: filteredCount === 0 ? '#9CA3AF' : 'var(--bp-accent)',
                      color: '#111827',
                    }}
                  >
                    {filteredCount === 0 ? 'No matches' : 'Pick for Me'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrefsOpen(prev => !prev)}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border transition hover:bg-black/[0.03]"
                    style={{
                      borderColor: 'var(--bp-secondary)',
                      background: 'var(--bp-card)',
                      color: 'var(--bp-text)',
                    }}
                    aria-label="Preferences and filters"
                  >
                    <FaFilter className="text-sm opacity-80" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setGroupOpen(prev => !prev)}
                  className="mt-3 w-full max-w-sm min-h-[48px] rounded-xl border font-semibold transition hover:bg-black/[0.03]"
                  style={{
                    borderColor: 'var(--bp-secondary)',
                    background: 'var(--bp-card)',
                    color: 'var(--bp-text)',
                  }}
                >
                  Decide with friends
                </button>

                {hasActiveFilters && (
                  <p className="mt-4 text-xs" style={{ color: 'var(--bp-muted)' }}>
                    <span className="font-semibold" style={{ color: 'var(--bp-text)' }}>
                      {filteredCount}
                    </span>{' '}
                    restaurant{filteredCount !== 1 ? 's' : ''} match your filters
                  </p>
                )}
              </>
            )}
          </div>
          {prefsOpen && (
            <div
              className="mx-auto mt-4 w-full max-w-md rounded-2xl border p-5 shadow-sm"
              style={{
                background: 'var(--bp-card)',
                borderColor: 'var(--bp-secondary)',
              }}
            >
            <div className="flex items-center justify-between mb-4">
              <h2 id="prefs-title" className="text-lg font-bold">
                Preferences
              </h2>
              <button
                type="button"
                onClick={() => setPrefsOpen(false)}
                className="rounded-lg px-2 py-1 text-sm font-medium"
                style={{ color: 'var(--bp-muted)' }}
              >
                Done
              </button>
            </div>

            {hasActiveFilters && (
              <div className="mb-4 flex justify-end">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs underline"
                  style={{ color: 'var(--bp-muted)' }}
                >
                  Clear filters
                </button>
              </div>
            )}

            <div className="flex flex-col gap-4 text-left">
              <Multiselect
                label="Category"
                options={categoryOptions}
                selected={selectedCategories}
                onChange={setSelectedCategories}
                placeholder="Choose categories…"
              />
              <div>
                <label className="text-sm font-medium mb-2 block">Price</label>
                <select
                  value={selectedPrice}
                  onChange={e => setSelectedPrice(e.target.value)}
                  className="w-full min-h-[44px] rounded-md border px-3 py-2"
                  style={{
                    borderColor: 'var(--bp-secondary)',
                    background: 'var(--bp-card)',
                  }}
                >
                  <option value="">All Prices</option>
                  {priceOptions.filter(Boolean).map(p => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <Multiselect
                label="City"
                options={cityOptions}
                selected={selectedLocations}
                onChange={setSelectedLocations}
                placeholder="Choose cities…"
              />
            </div>
          </div>
          )}

          {randomRestaurant && (
            <div
              className="fixed inset-0 z-40 flex items-center justify-center p-4"
              style={{ background: 'rgba(15, 23, 42, 0.4)' }}
            >
              <div className="w-full max-w-md animate-[fadeIn_0.35s_ease-out]">
                <div
                  className="relative rounded-2xl p-6 shadow-xl"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255, 251, 235, 1) 0%, rgba(255, 255, 255, 1) 65%)',
                    border: '1px solid var(--bp-secondary)',
                  }}
                >
                  <button
                    type="button"
                    onClick={pickRandom}
                    className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full border hover:bg-black/[0.05]"
                    style={{ borderColor: 'var(--bp-secondary)', color: 'var(--bp-text)' }}
                    aria-label="Reroll"
                    title="Reroll"
                  >
                    <FaRedoAlt />
                  </button>
                  <p id="pick-result-title" className="sr-only">
                    Pick result
                  </p>
                  <div className="mb-4 flex items-center gap-2">
                    <span className="text-2xl">🍽️</span>
                    <p className="text-lg font-bold" style={{ color: 'var(--bp-text)' }}>
                      You should eat at
                    </p>
                  </div>
                  <div className="space-y-3 text-left">
                    <div
                      className="rounded-lg border p-3"
                      style={{ background: 'var(--bp-card)', borderColor: 'var(--bp-secondary)' }}
                    >
                      <p className="mb-1 text-xs" style={{ color: 'var(--bp-muted)' }}>
                        Name
                      </p>
                      <p className="text-lg font-bold" style={{ color: 'var(--bp-text)' }}>
                        {randomRestaurant.name}
                      </p>
                    </div>
                    <div
                      className="rounded-lg border p-3"
                      style={{ background: 'var(--bp-card)', borderColor: 'var(--bp-secondary)' }}
                    >
                      <p className="mb-1 text-xs" style={{ color: 'var(--bp-muted)' }}>
                        Category
                      </p>
                      <p style={{ color: 'var(--bp-text)' }}>{randomRestaurant.category}</p>
                    </div>
                    <div
                      className="rounded-lg border p-3"
                      style={{ background: 'var(--bp-card)', borderColor: 'var(--bp-secondary)' }}
                    >
                      <p className="mb-1 text-xs" style={{ color: 'var(--bp-muted)' }}>
                        Location
                      </p>
                      <p style={{ color: 'var(--bp-text)' }}>{randomRestaurant.location}</p>
                    </div>
                    <div
                      className="rounded-lg border p-3"
                      style={{ background: 'var(--bp-card)', borderColor: 'var(--bp-secondary)' }}
                    >
                      <p className="mb-1 text-xs" style={{ color: 'var(--bp-muted)' }}>
                        Price
                      </p>
                      <p className="font-semibold" style={{ color: 'var(--bp-text)' }}>
                        {randomRestaurant.price}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRandomRestaurant(null)}
                    className="mt-5 w-full rounded-lg py-2.5 text-sm font-semibold"
                    style={{ background: 'var(--bp-text)', color: 'var(--bp-card)' }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {groupOpen && (
            <div className="flex justify-center">
              <GroupSessionHomePanel />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
