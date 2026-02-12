import { useEffect, useRef, useState } from 'react';
import Navbar from '../components/Navbar';
import type { Restaurant } from '../types/Restaurant';
import { apiUrl } from "../lib/api";

function ManageRestaurants() {

  const ADMIN_EMAILS = ["admin@test.com"];
  const token = localStorage.getItem("token");
  const userEmail = localStorage.getItem("email");

  const isLoggedIn = !!token;
  const isAdmin = !!userEmail && ADMIN_EMAILS.includes(userEmail);

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [editing, setEditing] = useState<Restaurant | null>(null);
  const itemRefs = useRef<Record<string, HTMLLIElement | null>>({});
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [newData, setNewData] = useState<{
    name: string;
    category: string;
    location: string;
    price: string;
  }>({
    name: '',
    category: '',
    location: '',
    price: ''
  });

  useEffect(() => {
    fetch(apiUrl(`/api/restaurants`))
      .then(res => res.json())
      .then(setRestaurants);
  }, []);


  const handleAdd = async () => {
    try {
      setErrorMsg("");

      const token = localStorage.getItem("token");

      const res = await fetch(apiUrl(`/api/restaurants`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newData),
      });

      const text = await res.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = { message: text };
      }

      if (!res.ok) {
        if (res.status === 409) {
          setErrorMsg(data?.message || "Restaurant already exists.");
        } else if (res.status === 400) {
          setErrorMsg(data?.message || "Missing required fields.");
        } else {
          setErrorMsg(data?.message || "Failed to add restaurant.");
        }
        return;
      }

      setRestaurants(prev => [...prev, data]);
      setNewData({ name: "", category: "", location: "", price: "$" });
    } catch (e) {
      setErrorMsg("Network error. Try again.");
    }
  };

  const handleDelete = async (id: Restaurant["id"]) => {
    const token = localStorage.getItem('token');
    await fetch(apiUrl(`/api/restaurants/${id}`), {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    setRestaurants(prev => prev.filter(r => r.id !== id));
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const token = localStorage.getItem('token');
    const res = await fetch(apiUrl(`/api/restaurants/${editing.id}`), {
      method: "PATCH",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(editing)
    });

    if (!res.ok) {
      console.error("Failed to update restaurant");
      return;
    }

    const updated = await res.json();

    setRestaurants(prev => prev.map(r => r.id === editing.id ? updated : r));
    setEditing(null); 
  }; 

  const handleEditClick = (r: Restaurant) => {
    console.log("Editing ID:", r.id);
    setEditing(r);
  };

  return (
    <div className="p-4">
      <Navbar />
      <h2 className="text-2xl font-bold mb-4">Manage Restaurants</h2>
      <ul>
        {restaurants.map(r => (
          <li key={r.id} 
          ref={(el) => {
            itemRefs.current[r.id] = el;
          }}

          className="mb-2">
            {editing?.id === r.id ? (
              <div className="space-x-2">
                <input
                  className="border p-1 rounded"
                  value={editing.name}
                  onChange={e => setEditing({ ...editing, name: e.target.value })}
                />
                <input
                  className="border p-1 rounded"
                  value={editing.category}
                  onChange={e => setEditing({ ...editing, category: e.target.value })}
                />
                <input
                  className="border p-1 rounded"
                  value={editing.location}
                  onChange={e => setEditing({ ...editing, location: e.target.value })}
                />
                <select
                  className="border p-1 rounded"
                  value={editing.price}
                  onChange={e => setEditing({ ...editing, price: e.target.value })}
                >
                  <option>$</option>
                  <option>$$</option>
                  <option>$$$</option>
                  <option>$$$$</option>
                  <option>N/A</option>
                </select>
                <button
                  type="button"
                  onClick={handleEditSubmit}
                  className="bg-green-500 text-white px-2 py-1 button ml-2"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditing(null)}
                  className="bg-gray-300 px-2 py-1 rounded"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div>
                <strong>{r.name}</strong> - {r.category}, {r.location}, {r.price}
                {isAdmin && (
                  <>
                    <button
                      onClick={() => handleEditClick(r)}
                      className="bg-blue-200 hover:bg-blue-300 button ml-2"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(r.id)}
                      className="bg-red-200 hover:bg-red-300 button"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>

      {isLoggedIn ? (
        <div className="mb-4">
          <input placeholder="Name" className="border border-gray-400 p-1 rounded" 
        value={newData.name} onChange={e => setNewData({ ...newData, name: e.target.value })} />
        <input placeholder="Category" className="border border-gray-400 p-1 rounded"
        value={newData.category} onChange={e => 
        setNewData({ ...newData, category: e.target.value })} />
        <input placeholder="Location" className="border border-gray-400 p-1 rounded"
        value={newData.location} onChange={e => 
        setNewData({ ...newData, location: e.target.value })} />
        <select className="border border-gray-400 p-1 rounded h-[34px]" 
        value={newData.price} onChange={e => 
        setNewData({ ...newData, price: e.target.value })}>
          <option value="">Select Price</option>
          <option value="$">$</option>
          <option value="$$">$$</option>
          <option value="$$$">$$$</option>
          <option value="$$$$">$$$$</option>
          <option value="N/A">N/A</option>
        </select>

        {errorMsg && (
          <div className="border border-red-400 bg-red-50 text-red-600 px-3 py-2 rounded text-sm">
            {errorMsg}
          </div>
        )}
        
        <button className="bg-purple-200 hover:bg-purple-300 button"
        type="button"
        onClick={handleAdd}>Add</button>
        </div>
      ) : (
        <div className="text-sm text-gray-600 mt-4">
          Log in to add restaurants.
        </div>
      )}

    </div>
  );
}

export default ManageRestaurants;