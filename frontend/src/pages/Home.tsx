import '../styles/App.css'
import { useState, useEffect } from 'react';
import BottomNav from '../components/BottomNav';
import { Restaurant } from '../types/Restaurant';
import { apiUrl } from "../lib/api";
import { useToast } from '../components/Toast';
import Multiselect from '../components/Multiselect';

function App() {
  const { showToast } = useToast();
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

  
  const categoryOptions = Array.from(
    new Set(
      allRestaurants.flatMap(r =>
        (r.category || '')
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
      )
    )
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
        .filter(Boolean)
    )
  ).sort();

  const priceOptions = Array.from(new Set(allRestaurants.map(r => r.price))).sort();

  const getRestaurantCategories = (categoryStr: string): string[] =>
    (categoryStr || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

  const getFilteredRestaurants = (): Restaurant[] => {
    let filtered = [...allRestaurants];

    if (selectedCategories.length > 0) {
      filtered = filtered.filter(r => {
        const restCats = getRestaurantCategories(r.category || '');
        return restCats.some(rc =>
          selectedCategories.some(sc => rc.toLowerCase() === sc.toLowerCase())
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
  };

  const pickRandom = () => {
    const filtered = getFilteredRestaurants();
    
    if (filtered.length === 0) {
      setRandomRestaurant(null);
      showToast('warning', 'No restaurants match your filters');
      return;
    }
  
    const randomIndex = Math.floor(Math.random() * filtered.length);
    setRandomRestaurant(filtered[randomIndex]);
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedPrice('');
    setSelectedLocations([]);
    setRandomRestaurant(null);
  };

  const hasActiveFilters = selectedCategories.length > 0 || selectedPrice || selectedLocations.length > 0;
  const filteredCount = getFilteredRestaurants().length;

  return (
    <div className="page" >
      <div className="page-content">
      <div className="bp-shell px-4 py-8 sm:py-12">
        <div className="bp-ambient" aria-hidden="true">
          <div className="bp-blob bp-blob--1" />
          <div className="bp-blob bp-blob--2" />
          <div className="bp-blob bp-blob--3" />
        </div>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 items-start gap-6 lg:gap-8 w-full">
        {isLoading ? (
          <div className="content lg:col-span-2" style={{ maxWidth: '26rem' }}>
            <div className="flex items-center justify-center py-8">
              <div
                className="animate-spin rounded-full h-8 w-8 border-b-2"
                style={{ borderBottomColor: 'var(--bp-accent)' }}
              />
            </div>
          </div>
        ) : (
          <>
            <div className="w-full">
              <div className="text-left">
                <h1 className="mt-4 text-4xl sm:text-5xl font-bold tracking-tight">
                  BitePick
                </h1>
                <p className="mt-3 text-base sm:text-lg max-w-xl" style={{ color: 'var(--bp-muted)' }}>
                  Filter your spots, then let the dice decide. A calmer way to answer “what should we eat?”
                </p>

                <div className="mt-6 grid grid-cols-3 gap-3 max-w-xl">
                  <div className="rounded-xl border p-3" style={{ borderColor: 'var(--bp-secondary)', background: 'rgba(255,255,255,0.7)' }}>
                    <p className="text-xs" style={{ color: 'var(--bp-muted)' }}>Restaurants</p>
                    <p className="text-lg font-bold" style={{ color: 'var(--bp-text)' }}>{allRestaurants.length}</p>
                  </div>
                  <div className="rounded-xl border p-3" style={{ borderColor: 'var(--bp-secondary)', background: 'rgba(255,255,255,0.7)' }}>
                    <p className="text-xs" style={{ color: 'var(--bp-muted)' }}>Categories</p>
                    <p className="text-lg font-bold" style={{ color: 'var(--bp-text)' }}>{categoryOptions.length}</p>
                  </div>
                  <div className="rounded-xl border p-3" style={{ borderColor: 'var(--bp-secondary)', background: 'rgba(255,255,255,0.7)' }}>
                    <p className="text-xs" style={{ color: 'var(--bp-muted)' }}>Cities</p>
                    <p className="text-lg font-bold" style={{ color: 'var(--bp-text)' }}>{cityOptions.length}</p>
                  </div>
                </div>

                {randomRestaurant ? (
                  <div className="mt-6">
                    <div 
                      className="content w-full max-w-xl animate-fade-in"
                      style={{
                        animation: 'fadeIn 0.5s ease-in',
                      }}
                    >
                      <div
                        className="rounded-xl p-6"
                        style={{
                          background: 'linear-gradient(135deg, rgba(255, 251, 235, 1) 0%, rgba(255, 255, 255, 1) 65%)',
                          border: '1px solid var(--bp-secondary)',
                        }}
                      >
                        <div className="flex items-center gap-2 mb-4">
                          <span className="text-2xl">🍽️</span>
                          <p className="font-bold text-lg" style={{ color: 'var(--bp-text)' }}>
                            You should eat at
                          </p>
                        </div>
                        <div className="space-y-3 text-left">
                          <div className="rounded-lg p-3 border" style={{ background: 'var(--bp-card)', borderColor: 'var(--bp-secondary)' }}>
                            <p className="text-xs mb-1" style={{ color: 'var(--bp-muted)' }}>Name</p>
                            <p className="font-bold text-lg" style={{ color: 'var(--bp-text)' }}>{randomRestaurant.name}</p>
                          </div>
                          <div className="rounded-lg p-3 border" style={{ background: 'var(--bp-card)', borderColor: 'var(--bp-secondary)' }}>
                            <p className="text-xs mb-1" style={{ color: 'var(--bp-muted)' }}>Category</p>
                            <p style={{ color: 'var(--bp-text)' }}>{randomRestaurant.category}</p>
                          </div>
                          <div className="rounded-lg p-3 border" style={{ background: 'var(--bp-card)', borderColor: 'var(--bp-secondary)' }}>
                            <p className="text-xs mb-1" style={{ color: 'var(--bp-muted)' }}>Location</p>
                            <p style={{ color: 'var(--bp-text)' }}>{randomRestaurant.location}</p>
                          </div>
                          <div className="rounded-lg p-3 border" style={{ background: 'var(--bp-card)', borderColor: 'var(--bp-secondary)' }}>
                            <p className="text-xs mb-1" style={{ color: 'var(--bp-muted)' }}>Price</p>
                            <p className="font-semibold" style={{ color: 'var(--bp-text)' }}>{randomRestaurant.price}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setRandomRestaurant(null)}
                          className="mt-4 text-sm underline"
                          style={{ color: 'var(--bp-muted)' }}
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
              
            <div className="content w-full max-w-md lg:justify-self-end">
              {hasActiveFilters && (
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm" style={{ color: 'var(--bp-muted)' }}>
                    <span className="font-semibold" style={{ color: 'var(--bp-text)' }}>
                      {filteredCount}
                    </span>{' '}
                    restaurant{filteredCount !== 1 ? 's' : ''} match{filteredCount !== 1 ? '' : 'es'} your filters
                  </span>
                  <button
                    onClick={clearFilters}
                    className="text-xs underline"
                    style={{ color: 'var(--bp-muted)' }}
                  >
                    Clear filters
                  </button>
                </div>
              )}
              
              <div className="flex flex-col gap-4 my-1 w-full text-left">
                <Multiselect
                  label="Category"
                  options={categoryOptions}
                  selected={selectedCategories}
                  onChange={setSelectedCategories}
                  placeholder="Choose categories…"
                />

                <div>
                  <label className="text-sm font-medium block mb-2">Price</label>
                  <div className="relative">
                    <select
                      value={selectedPrice}
                      onChange={e => setSelectedPrice(e.target.value)}
                      className="w-full min-h-[44px] px-3 py-2 rounded-md border transition-colors"
                      style={{
                        borderColor: 'var(--bp-secondary)',
                        background: 'var(--bp-card)',
                      }}
                    >
                      <option value="">All Prices</option>
                      {priceOptions.filter(Boolean).map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <Multiselect
                  label="City"
                  options={cityOptions}
                  selected={selectedLocations}
                  onChange={setSelectedLocations}
                  placeholder="Choose cities…"
                />

              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={pickRandom}
                  disabled={filteredCount === 0}
                  className="flex-1 disabled:cursor-not-allowed font-semibold py-3 px-6 rounded-lg transition-colors shadow-md hover:shadow-lg"
                  style={{
                    background: filteredCount === 0 ? '#9CA3AF' : 'var(--bp-accent)',
                    color: '#111827',
                  }}
                >
                  {filteredCount === 0 ? 'No Matches' : 'Pick Random'}
                </button>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="px-4 py-3 border font-medium rounded-lg transition-colors"
                    style={{
                      borderColor: 'var(--bp-secondary)',
                      background: 'var(--bp-card)',
                      color: 'var(--bp-text)',
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {hasActiveFilters && filteredCount === 0 && !randomRestaurant && (
              <div className="content w-full max-w-md lg:col-span-2">
                <div className="text-center py-8">
                  <p className="text-4xl mb-4">🔍</p>
                  <p className="font-semibold text-lg mb-2">No restaurants found</p>
                  <p className="text-sm mb-4" style={{ color: 'var(--bp-muted)' }}>
                    Try adjusting your filters to see more options
                  </p>
                  <button
                    onClick={clearFilters}
                    className="font-medium py-2 px-6 rounded-lg transition-colors"
                    style={{ background: 'var(--bp-accent)', color: '#111827' }}
                  >
                    Clear All Filters
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <BottomNav />
      </div>
      </div>
    </div>
  );
}

export default App;