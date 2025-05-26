import './App.css'
import { useEffect, useState } from 'react';

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

  const handleAdd = async () => {
    const res = await fetch("http://localhost:5000/restaurants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        name: newRestaurant,
        category: newCategory,
        location: newLocation,
        price: newPrice
      })
    });
    const data = await res.json();
    setRestaurants(prev => [...prev, data]);
    setNewRestaurant("");
    setNewCategory("");
    setNewLocation("");
    setNewPrice("");
  };

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
          onClick={handleAdd}
          className="bg-blue-500 text-white px-4 py-2 rounded mr-2"
        >
          Add
        </button>
        <button
          onClick={pickRandom}
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          Random
        </button>
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

      <ul className="list-disc pl-6">
        {restaurants.map((r) => (
          <li key={r.id}>{r.name}</li>
        ))}
      </ul>
    </div>
  );
}

export default App;
