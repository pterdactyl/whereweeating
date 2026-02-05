import '../styles/App.css'
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { Restaurant } from '../types/Restaurant';
import { API_BASE } from "../lib/api";

function App() {
  const [randomRestaurant, setRandomRestaurant] = useState<Restaurant | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPrice, setSelectedPrice] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');

  const pickRandom = async () => {
    const params = new URLSearchParams();

    if (selectedCategory) params.append('category', selectedCategory);
    if (selectedPrice) params.append('price', selectedPrice);
    if (selectedLocation) params.append('location', selectedLocation);

    try {
      const res = await fetch(`${API_BASE}/api/restaurants/random?${params.toString()}`);
      if (!res.ok) {
        setRandomRestaurant(null);
        return;
      }
      const data = await res.json();
      setRandomRestaurant(data);
    } catch (error) {
      console.error('Error fetching random restaurant:', error);
    }
  };

  return (
    <div className="flat-background" 
      style={{ backgroundImage: "url('/images/main_background.jpg')" }}>
      <Navbar />
      <div className="content" style={{position:"absolute", top: '200px'}}>
        <h1 className="text-3xl font-bold mb-4">Where We Eating</h1>
        
        <div className="flex flex-col gap-2 my-1">
          <input
            type="text"
            placeholder="Category"
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="p-2 rounded"
          />

          <select onChange={e => setSelectedPrice(e.target.value)} className="p-2 rounded">
            <option value="">All Prices</option>
            <option value="$">$</option>
            <option value="$$">$$</option>
            <option value="$$$">$$$</option>
            <option value="$$$$">$$$$</option>
          </select>

          <input
            type="text"
            placeholder="Location"
            value={selectedLocation}
            onChange={e => setSelectedLocation(e.target.value)}
            className="p-2 rounded"
          />
        </div>


        <button
          onClick={pickRandom}
          className="bg-black hover:bg-purple-300 text-white button">
          Random
        </button>
      </div>

      {randomRestaurant && (
        <div className="content" style={{marginTop:"350px"}}>
          You should eat at: 
            <p><strong>Name: </strong>{randomRestaurant.name}</p>
            <p><strong>Category: </strong>{randomRestaurant.category}</p>
            <p><strong>Location: </strong>{randomRestaurant.location}</p>
            <p><strong>Price: </strong>{randomRestaurant.price}</p>
        </div>
      )}

    </div>
  );
}

export default App;
