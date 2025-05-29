import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

function Admin() {
  const [restaurants, setRestaurants] = useState([]);
  const [newData, setNewData] = useState({ name: '', category: '', location: '', price: '$' });
  const [editing, setEditing] = useState(null); 
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

  const handleEditSubmit = async () => {
    const res = await fetch(`http://localhost:5000/restaurants/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing)
    });
    const updated = await res.json();
    setRestaurants(prev => prev.map(r => r.id === editing.id ? updated : r));
    setEditing(null); 
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Manage Restaurants</h2>

      <div className="mb-4">
        <input placeholder="Name" value={newData.name} onChange={e => setNewData({ ...newData, name: e.target.value })} />
        <input placeholder="Category" value={newData.category} onChange={e => setNewData({ ...newData, category: e.target.value })} />
        <input placeholder="Location" value={newData.location} onChange={e => setNewData({ ...newData, location: e.target.value })} />
        <select value={newData.price} onChange={e => setNewData({ ...newData, price: e.target.value })}>
          <option>$</option><option>$$</option><option>$$$</option><option>$$$$</option><option>N/A</option>
        </select>
        <button onClick={handleAdd}>Add</button>

        <Link to="/">
          <button className="px-2 py-1 rounded">Back</button>
        </Link>
      </div>

      <ul>
        {restaurants.map(r => (
          <li key={r.id} className="mb-2">
            <strong>{r.name}</strong> - {r.category}, {r.location}, {r.price}
            <button onClick={() => setEditing(r)} className="ml-2 text-blue-500">Edit</button>
            <button onClick={() => handleDelete(r.id)} className="ml-2 text-red-500">Delete</button>
          </li>
        ))}
      </ul>

      {editing && (
        <div className="mt-6 p-4 border rounded">
          <h3 className="font-semibold mb-2">Edit Restaurant</h3>
          <input placeholder="Name" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
          <input placeholder="Category" value={editing.category} onChange={e => setEditing({ ...editing, category: e.target.value })} />
          <input placeholder="Location" value={editing.location} onChange={e => setEditing({ ...editing, location: e.target.value })} />
          <select value={editing.price} onChange={e => setEditing({ ...editing, price: e.target.value })}>
            <option>$</option><option>$$</option><option>$$$</option><option>$$$$</option><option>N/A</option>
          </select>
          <div className="mt-2">
            <button onClick={handleEditSubmit} className="mr-2 bg-green-500 text-white px-2 py-1 rounded">Save</button>
            <button onClick={() => setEditing(null)} className="bg-gray-300 px-2 py-1 rounded">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Admin;
