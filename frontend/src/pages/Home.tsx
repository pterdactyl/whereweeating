import '../styles/App.css'
import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
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
      <div className="page-bg" />
      <div className="page-content">
      <Navbar />

      <div className="flex flex-col items-center gap-6 w-full px-4 py-8 sm:py-12">
        {isLoading ? (
          <div className="content" style={{ maxWidth: '26rem' }}>
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
            </div>
          </div>
        ) : (
          <>
            <div className="content w-full max-w-md">
              <h1 className="text-3xl sm:text-4xl font-bold mb-6">Where We Eating</h1>
              
              {hasActiveFilters && (
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    <span className="font-semibold text-black">{filteredCount}</span> restaurant{filteredCount !== 1 ? 's' : ''} match{filteredCount !== 1 ? '' : 'es'} your filters
                  </span>
                  <button
                    onClick={clearFilters}
                    className="text-xs text-gray-600 hover:text-black underline"
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
                      className="w-full min-h-[44px] px-3 py-2 rounded-md border border-gray-200 bg-white/90 hover:border-gray-300 transition-colors"
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
                  className="flex-1 bg-black hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-md hover:shadow-lg"
                >
                  {filteredCount === 0 ? 'No Matches' : 'Pick Random'}
                </button>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="px-4 py-3 border-2 border-gray-300 hover:border-gray-400 text-gray-700 hover:text-black font-medium rounded-lg transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {randomRestaurant && (
              <div 
                className="content w-full max-w-md animate-fade-in"
                style={{
                  animation: 'fadeIn 0.5s ease-in',
                }}
              >
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-6 shadow-lg">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">🎲</span>
                    <p className="font-bold text-lg text-purple-900">You should eat at:</p>
                  </div>
                  <div className="space-y-3 text-left">
                    <div className="bg-white/80 rounded-lg p-3">
                      <p className="text-xs text-gray-600 mb-1">Name</p>
                      <p className="font-bold text-lg text-black">{randomRestaurant.name}</p>
                    </div>
                    <div className="bg-white/80 rounded-lg p-3">
                      <p className="text-xs text-gray-600 mb-1">Category</p>
                      <p className="text-black">{randomRestaurant.category}</p>
                    </div>
                    <div className="bg-white/80 rounded-lg p-3">
                      <p className="text-xs text-gray-600 mb-1">Location</p>
                      <p className="text-black">{randomRestaurant.location}</p>
                    </div>
                    <div className="bg-white/80 rounded-lg p-3">
                      <p className="text-xs text-gray-600 mb-1">Price</p>
                      <p className="text-black font-semibold">{randomRestaurant.price}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setRandomRestaurant(null)}
                    className="mt-4 text-sm text-gray-600 hover:text-black underline"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {hasActiveFilters && filteredCount === 0 && !randomRestaurant && (
              <div className="content w-full max-w-md">
                <div className="text-center py-8">
                  <p className="text-4xl mb-4">🔍</p>
                  <p className="font-semibold text-lg mb-2">No restaurants found</p>
                  <p className="text-sm text-gray-600 mb-4">
                    Try adjusting your filters to see more options
                  </p>
                  <button
                    onClick={clearFilters}
                    className="bg-black hover:bg-gray-800 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                  >
                    Clear All Filters
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      </div>
    </div>
  );
}

export default App;