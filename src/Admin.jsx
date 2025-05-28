import { useEffect, useState } from 'react';

function Admin() {
  const [restaurants, setRestaurants] = useState([]);
  const [newData, setNewData] = useState({ name: '', category: '', location: '', price: '$' });

  useEffect(() => {
    fetch("http://localhost:5000/restaurants")
      .then(res => res.json())
      .then(setRestaurants);
  }, []);

  const handleAdd = async () => {
    const res = await fetch("http://localhost:5000/restaurants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newData)
    });
    const data = await res.json();
    setRestaurants(prev => [...prev, data]);
    setNewData({ name: '', category: '', location: '', price: '$' });
  };

  const handleDelete = async (id) => {
    await fetch(`http://localhost:5000/restaurants/${id}`, {
      method: "DELETE"
    });
    setRestaurants(prev => prev.filter(r => r.id !== id));
  };


  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Manage Restaurants</h2>

      <div className="mb-4">
        <input placeholder="Name" value={newData.name} onChange={e => setNewData({...newData, name: e.target.value})} />
        <input placeholder="Category" value={newData.category} onChange={e => setNewData({...newData, category: e.target.value})} />
        <input placeholder="Location" value={newData.location} onChange={e => setNewData({...newData, location: e.target.value})} />
        <select value={newData.price} onChange={e => setNewData({...newData, price: e.target.value})}>
          <option>$</option><option>$$</option><option>$$$</option><option>$$$$</option><option>N/A</option>
        </select>
        <button onClick={handleAdd}>Add</button>
      </div>

      <ul>
        {restaurants.map(r => (
          <li key={r.id} className="mb-2">
            <strong>{r.name}</strong> - {r.category}, {r.location}, {r.price}
            <button onClick={() => handleDelete(r.id)} className="ml-2 text-red-500">Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Admin;
