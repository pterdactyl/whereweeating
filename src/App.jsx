import './App.css'
import { useState } from 'react';

function App() {
  const restaurants = [
    "Sushi House",
    "Burger Place",
    "Noodle Heaven",
    "Taco Town",
    "Pasta Corner",
    "Curry Spot",
  ];

  const [picked, setPicked] = useState(null);

  const pickRestaurant = () => {
    const random = Math.floor(Math.random() * restaurants.length);
    setPicked(restaurants[random]);
  }

  return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white shadow-xl rounded-2xl p-6 w-full max-w-md">
        <h1 className="text-xl font-semibold text-gray-800 mb-4">WhereWeEating 🍽️</h1>

        <button onClick={pickRestaurant} className="w-full bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 transition">
          Pick a restaurant!
        </button>

        <div className="mt-4 text-gray-700 text-center">
          Selected restaurant: <strong>{picked || '---'}</strong>
        </div>
      </div>
    </div>
  )
}

export default App;
