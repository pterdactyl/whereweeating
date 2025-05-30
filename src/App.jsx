import './App.css'
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

function App() {
  const [restaurants, setRestaurants] = useState([]);
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
    <div className="min-h-screen w-full bg-cover bg-center overflow-hidden 
    flex items-center justify-center" 
    style={{ backgroundImage: "url('/images/main_background.jpg')" }}>
      
      <div className="content">
        <h1 className="text-3xl font-bold mb-4">Where We Eating</h1>
        
        <button
          onClick={pickRandom}
          className="bg-purple-200 hover:bg-purple-300 px-2 py-1 round 
          cursor-pointer transition-colors">
          Random
        </button>

        <Link to="/admin">
        <button className="bg-purple-200 hover:bg-purple-300 px-2 py-1 
        round cursor-pointer transition-colors">
          Admin Page
        </button>
        </Link>
      </div>

      {randomRestaurant && (
        <div className="p-4 border rounded">
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
