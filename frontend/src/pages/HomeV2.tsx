import '../styles/App.css';
import { useState, useEffect, useMemo, useRef } from 'react';
import { FaCog, FaFilter, FaRedoAlt } from 'react-icons/fa';
import { Restaurant } from '../types/Restaurant';
import { apiUrl } from '../lib/api';
import { useToast } from '../components/Toast';
import Multiselect from '../components/Multiselect';
import { GroupSessionHomePanel } from './GroupSessionPage';
import { passesPreferOpenNow } from '../lib/openNow';
import GearMenuContent from '../components/GearMenuContent';

export default function HomeV2() {
  const { showToast } = useToast();
  const gearRef = useRef<HTMLDivElement>(null);
  const prefsRef = useRef<HTMLDivElement>(null);
  const [gearOpen, setGearOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);

  const [allRestaurants, setAllRestaurants] = useState<Restaurant[]>([]);
  const [randomRestaurant, setRandomRestaurant] = useState<Restaurant | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedPrice, setSelectedPrice] = useState('');
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [preferOpenNow, setPreferOpenNow] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(apiUrl('/api/restaurants'));
        if (res.ok) {
          const data = (await res.json()) as Restaurant[];
          setAllRestaurants(
            data.map(r => ({
              ...r,
              hours_of_operation: r.hours_of_operation ?? null,
              weekly_hours: r.weekly_hours ?? null,
            })),
          );
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

  useEffect(() => {
    if (!prefsOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (prefsRef.current && !prefsRef.current.contains(e.target as Node)) {
        setPrefsOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [prefsOpen]);

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

    if (preferOpenNow) {
      filtered = filtered.filter(r => passesPreferOpenNow(r.weekly_hours));
    }

    return filtered;
  }, [allRestaurants, selectedCategories, selectedPrice, selectedLocations, preferOpenNow]);

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
    setPreferOpenNow(false);
    setRandomRestaurant(null);
  };

  const filteredCount = filteredRestaurants.length;
  const hasActiveFilters =
    selectedCategories.length > 0 || !!selectedPrice || selectedLocations.length > 0;
  const activeFilterTypes =
    (selectedCategories.length > 0 ? 1 : 0) +
    (selectedLocations.length > 0 ? 1 : 0) +
    (selectedPrice ? 1 : 0) +
    (preferOpenNow ? 1 : 0);

  const clearFiltersRow = hasActiveFilters && (
    <div className="mb-2 flex justify-end lg:mb-3">
      <button
        type="button"
        onClick={clearFilters}
        className="text-xs underline"
        style={{ color: 'var(--bp-muted)' }}
      >
        Clear all
      </button>
    </div>
  );

  const filterFields = (
    <div className="flex flex-col gap-2 text-left lg:gap-2.5">
      <Multiselect
        label="Category"
        options={categoryOptions}
        selected={selectedCategories}
        onChange={setSelectedCategories}
        placeholder="Choose categories..."
      />
      <div>
        <label className="mb-1 block text-sm font-medium lg:mb-2">Price</label>
        <select
          value={selectedPrice}
          onChange={e => setSelectedPrice(e.target.value)}
          className="w-full min-h-[42px] rounded-md border px-2.5 py-1.5 lg:min-h-[42px] lg:px-3 lg:py-2"
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
        placeholder="Choose cities..."
      />
      <label className="flex cursor-pointer items-start gap-2 rounded-lg border px-2.5 py-2 lg:gap-3 lg:px-3 lg:py-2.5">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 shrink-0 rounded"
          style={{ borderColor: 'var(--bp-secondary)' }}
          checked={preferOpenNow}
          onChange={e => setPreferOpenNow(e.target.checked)}
        />
        <span className="text-left text-sm" style={{ color: 'var(--bp-text)' }}>
          <span className="font-medium">Prefer open now</span>
          <span className="mt-0.5 block text-xs leading-snug" style={{ color: 'var(--bp-muted)' }}>
            Toronto time.
          </span>
        </span>
      </label>
    </div>
  );

  return (
    <div className="page home-page">
      <div className="page-content">
        <div className="bp-shell px-4 pt-6 pb-6 relative h-full">

          <div ref={gearRef} className="fixed top-4 right-4 z-30">
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
                className="absolute right-0 mt-2 min-w-[11rem] overflow-hidden rounded-xl border shadow-lg"
                style={{
                  background: 'var(--bp-card)',
                  borderColor: 'var(--bp-secondary)',
                  color: 'var(--bp-text)',
                }}
                role="menu"
              >
                <GearMenuContent onClose={() => setGearOpen(false)} />
              </div>
            )}
          </div>

          <div className="relative z-10 flex flex-col items-center text-center pt-24 sm:pt-32 lg:pt-36">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div
                  className="h-9 w-9 animate-spin rounded-full border-2 border-b-transparent"
                  style={{ borderColor: 'var(--bp-secondary)', borderBottomColor: 'var(--bp-accent)' }}
                />
              </div>
            ) : (
              <>
                <h1
                  className="bp-title-outline text-[48px] font-black tracking-tight"
                  style={{ fontFamily: "'Nunito', sans-serif", color: '#FFF4E6' }}
                >
                  <span className="relative inline-block bite-letter">
                    B
                  </span>
                  <span className="relative inline-block icon">
                    🍦
                  </span>
                  tePick
                </h1>
                <p className="mt-2 text-base sm:text-lg max-w-md" style={{ color: 'var(--bp-muted)' }}>
                  Can&apos;t Decide Where to Eat
                </p>

                <div
                  className="mx-auto mt-6 flex flex-col gap-2 px-2 sm:mt-8 sm:gap-3 sm:px-1 lg:mt-10"
                  style={{
                    width: 'min(100%, clamp(16.5rem, calc(12rem + 18vw), 22rem))',
                  }}
                >
                  <div className="flex min-w-0 items-stretch gap-1.5 sm:gap-2">
                    <button
                      type="button"
                      onClick={pickRandom}
                      disabled={filteredCount === 0}
                      className="min-h-[44px] min-w-0 flex-1 rounded-xl px-3.5 py-2.5 text-[0.9375rem] font-semibold shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-[48px] sm:px-4 sm:text-base"
                      style={{
                        background: filteredCount === 0 ? '#9CA3AF' : 'var(--bp-accent)',
                        color: '#111827',
                      }}
                    >
                      {filteredCount === 0 ? 'No matches' : 'Pick for Me'}
                    </button>
                    <div ref={prefsRef} className="relative hidden shrink-0 sm:block">
                      <button
                        type="button"
                        onClick={() => setPrefsOpen(prev => !prev)}
                        className="flex h-[44px] w-[42px] shrink-0 items-center justify-center rounded-xl border transition hover:bg-black/[0.03] max-[380px]:w-10 max-[380px]:min-w-[2.5rem] sm:h-12 sm:w-12 sm:min-w-12"
                        style={{
                          borderColor: 'var(--bp-secondary)',
                          background: 'var(--bp-card)',
                          color: 'var(--bp-text)',
                        }}
                        aria-label="Open filters panel"
                        aria-expanded={prefsOpen}
                      >
                        <FaFilter className="text-sm opacity-80" />
                      </button>

                      {prefsOpen && (
                        <div
                          className="absolute top-full right-0 z-50 mt-1.5 w-[min(19rem,calc(100vw-1.25rem))] max-w-[calc(100vw-1.25rem)] rounded-2xl border p-3 text-left shadow-xl lg:left-full lg:right-auto lg:top-1/2 lg:mt-0 lg:ml-2 lg:w-[19rem] lg:max-w-none lg:-translate-y-1/2 lg:p-4"
                          style={{
                            background: 'var(--bp-card)',
                            borderColor: 'var(--bp-secondary)',
                          }}
                        >
                          <div className="mb-2 flex items-center justify-between lg:mb-3">
                            <h2 className="text-sm font-bold lg:text-base">Filters</h2>
                            <button
                              type="button"
                              onClick={() => setPrefsOpen(false)}
                              className="rounded-lg px-2 py-1 text-xs font-medium lg:text-sm"
                              style={{ color: 'var(--bp-muted)' }}
                            >
                              Done
                            </button>
                          </div>
                          {clearFiltersRow}
                          {filterFields}
                        </div>
                      )}
                    </div>
                  </div>

                  <details className="group sm:hidden [&_summary::-webkit-details-marker]:hidden">
                    <summary
                      className="flex min-h-[44px] list-none cursor-pointer items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition hover:bg-black/[0.03]"
                      style={{
                        borderColor: 'var(--bp-secondary)',
                        background: 'var(--bp-card)',
                        color: 'var(--bp-text)',
                      }}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <FaFilter className="shrink-0 text-sm opacity-80" aria-hidden />
                        Filters
                        {activeFilterTypes > 0 && (
                          <span
                            className="rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none"
                            style={{
                              background: 'var(--bp-accent)',
                              color: '#111827',
                            }}
                          >
                            {activeFilterTypes}
                          </span>
                        )}
                      </span>
                      <span
                        className="shrink-0 text-xs opacity-60 transition group-open:rotate-180"
                        style={{ color: 'var(--bp-muted)' }}
                        aria-hidden
                      >
                        ▼
                      </span>
                    </summary>
                    <div
                      className="mt-2 rounded-xl border p-3"
                      style={{
                        background: 'var(--bp-card)',
                        borderColor: 'var(--bp-secondary)',
                      }}
                    >
                      {clearFiltersRow}
                      {filterFields}
                    </div>
                  </details>

                  <button
                    type="button"
                    onClick={() => setGroupOpen(prev => !prev)}
                    className="mt-1 w-full min-h-[46px] rounded-xl border px-3.5 py-2.5 text-[0.9375rem] font-semibold transition hover:bg-black/[0.03] sm:mt-2 sm:min-h-[48px] sm:px-4 sm:text-base"
                    style={{
                      borderColor: 'var(--bp-secondary)',
                      background: 'var(--bp-card)',
                      color: 'var(--bp-text)',
                    }}
                  >
                    Decide with friends
                  </button>
                </div>

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
                    {randomRestaurant.hours_of_operation?.trim() ? (
                      <div
                        className="rounded-lg border p-3"
                        style={{ background: 'var(--bp-card)', borderColor: 'var(--bp-secondary)' }}
                      >
                        <p className="mb-1 text-xs" style={{ color: 'var(--bp-muted)' }}>
                          Hours
                        </p>
                        <p className="whitespace-pre-wrap" style={{ color: 'var(--bp-text)' }}>
                          {randomRestaurant.hours_of_operation.trim()}
                        </p>
                      </div>
                    ) : null}
                    <p className="pt-1">
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          `${randomRestaurant.name} ${randomRestaurant.location}`,
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-semibold underline underline-offset-2"
                        style={{ color: 'var(--bp-text)' }}
                      >
                        Open in Maps 🗺️
                      </a>
                    </p>
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
            <div
              className="fixed inset-0 z-40 flex items-center justify-center p-4"
              style={{ background: 'rgba(15, 23, 42, 0.55)' }}
              onClick={() => setGroupOpen(false)}
            >
              <div
                className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border p-4 shadow-xl"
                style={{
                  background: 'var(--bp-card)',
                  borderColor: 'var(--bp-secondary)',
                }}
                onClick={e => e.stopPropagation()}
              >
                <div className="mb-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setGroupOpen(false)}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium"
                    style={{ color: 'var(--bp-muted)' }}
                  >
                    Close
                  </button>
                </div>
                <GroupSessionHomePanel />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
