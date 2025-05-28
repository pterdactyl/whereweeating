import './App.css'
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

function App() {
  const [restaurants, setRestaurants] = useState([]);
  const [newRestaurant, setNewRestaurant] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [randomRestaurant, setRandomRestaurant] = useState(null);

  useEffect(() => {
    fetch("http://localhost:5000/restaurants")
      .then(res => res.json())
      .then(data => setRestaurants(data));
  }, []);

  const pickRandom = () => {
    if (restaurants.length > 0) {
      const random = restaurants[Math.floor(Math.random() * restaurants.length)];
      setRandomRestaurant(random);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Where We Eating</h1>
      <div className="mb-4">
        <input
          value={newRestaurant}
          onChange={(e) => setNewRestaurant(e.target.value)}
          className="border p-2 mr-2"
          placeholder="Restaurant"
        />
        <input
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          className="border p-2 mr-2"
          placeholder="Category"
        />
        <input
          value={newLocation}
          onChange={(e) => setNewLocation(e.target.value)}
          className="border p-2 mr-2"
          placeholder="Location"
        />
        <select
          value={newPrice}
          onChange={(e) => setNewPrice(e.target.value)}
          classname="border p-2 mr-2"
        >
          <option value="">Select price</option>
          <option value="$">$</option>
          <option value="$$">$$</option>
          <option value="$$$">$$$</option>
          <option value="$$$$">$$$$</option>
          <option value="N/A">N/A</option>
        </select>
        
        <button
          onClick={pickRandom}
          className="bg-purple-200 text-black px-2 py-1 rounded"
        >
          Random
        </button>

        <Link to="/admin">
        <button className="bg-purple-200 px-2 py-1 rounded">Go to Admin Page</button>
        </Link>
      </div>

      {randomRestaurant && (
        <div className="p-4 border rounded bg-purple-100">
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
