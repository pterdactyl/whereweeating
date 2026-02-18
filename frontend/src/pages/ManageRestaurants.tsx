import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import type { Restaurant } from '../types/Restaurant';
import { apiUrl } from "../lib/api";
import { useToast } from '../components/Toast';

function ManageRestaurants() {
  const { showToast } = useToast();

  const ADMIN_EMAILS = ["admin@test.com"];
  const token = localStorage.getItem("token");
  const userEmail = localStorage.getItem("email");

  const isLoggedIn = !!token;
  const isAdmin = !!userEmail && ADMIN_EMAILS.includes(userEmail);

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [editing, setEditing] = useState<Restaurant | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Restaurant["id"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    setIsLoading(true);
    fetch(apiUrl(`/api/restaurants`))
      .then(res => res.json())
      .then(data => {
        setRestaurants(data);
        setIsLoading(false);
      })
      .catch(() => {
        showToast('error', 'Failed to load restaurants');
        setIsLoading(false);
      });
  }, []);


  const handleAdd = async () => {
    if (!newData.name.trim() || !newData.category.trim() || !newData.location.trim()) {
      showToast('warning', 'Please fill in all required fields');
      return;
    }

    try {
      setIsSubmitting(true);
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
        console.log("Add restaurant error:", { status: res.status, data, text });
        
        const errorMessage = data?.message || text || "Failed to add restaurant.";
        
        if (res.status === 409) {
          showToast('error', errorMessage);
        } else if (res.status === 400) {
          showToast('error', errorMessage);
        } else if (res.status === 401 || res.status === 403) {
          if (errorMessage.toLowerCase().includes("token") || 
              errorMessage.toLowerCase().includes("session") ||
              errorMessage.toLowerCase().includes("admin only")) {
            showToast('error', "Your session has expired. Please log in again.");
            localStorage.removeItem("token");
            localStorage.removeItem("email");
          } else {
            showToast('error', errorMessage);
          }
        } else {
          showToast('error', errorMessage);
        }
        return;
      }

      setRestaurants(prev => [...prev, data]);
      setNewData({ name: "", category: "", location: "", price: "$" });
      showToast('success', 'Restaurant added successfully!');
    } catch (e) {
      showToast('error', "Network error. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: Restaurant["id"]) => {
    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('token');
      const res = await fetch(apiUrl(`/api/restaurants/${id}`), {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!res.ok) {
        showToast('error', 'Failed to delete restaurant');
        return;
      }

      setRestaurants(prev => prev.filter(r => r.id !== id));
      setDeleteConfirm(null);
      showToast('success', 'Restaurant deleted successfully');
    } catch (e) {
      showToast('error', "Network error. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async () => {
    if (!editing) return;
    
    if (!editing.name.trim() || !editing.category.trim() || !editing.location.trim()) {
      showToast('warning', 'Please fill in all required fields');
      return;
    }

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        showToast('error', "Please log in to edit restaurants.");
        return;
      }

      const res = await fetch(apiUrl(`/api/restaurants/${editing.id}`), {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(editing)
      });

      const text = await res.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = { message: text };
      }

      if (!res.ok) {
        console.log("Edit restaurant error:", { status: res.status, data, text });

        const errorMessage = data?.message || text || "Failed to update restaurant.";
        
        if (res.status === 409) {
          showToast('error', errorMessage);
        } else if (res.status === 400) {
          showToast('error', errorMessage);
        } else if (res.status === 401 || res.status === 403) {
          if (errorMessage.toLowerCase().includes("token") || 
              errorMessage.toLowerCase().includes("session") ||
              errorMessage.toLowerCase().includes("admin only")) {
            showToast('error', errorMessage.includes("admin") ? errorMessage : "Your session has expired. Please log in again.");
            if (errorMessage.toLowerCase().includes("token") || errorMessage.toLowerCase().includes("session")) {
              localStorage.removeItem("token");
              localStorage.removeItem("email");
            }
          } else {
            showToast('error', errorMessage);
          }
        } else {
          showToast('error', errorMessage);
        }
        return;
      }

      const updated = data || await res.json();
      setRestaurants(prev => prev.map(r => r.id === editing.id ? updated : r));
      setEditing(null);
      showToast('success', 'Restaurant updated successfully!');
    } catch (e) {
      showToast('error', "Network error. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  }; 

  const handleEditClick = (r: Restaurant) => {
    console.log("Editing ID:", r.id);
    setEditing(r);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold mb-6">Manage Restaurants</h2>

        {/* Loading state */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
          </div>
        ) : (
          <>
            {/* Add Restaurant Form */}
            {isLoggedIn && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                <h3 className="text-xl font-semibold mb-4">Add New Restaurant</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      placeholder="Restaurant name"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
                      value={newData.name}
                      onChange={e => setNewData({ ...newData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <input
                      placeholder="e.g., Italian, Mexican"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
                      value={newData.category}
                      onChange={e => setNewData({ ...newData, category: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location <span className="text-red-500">*</span>
                    </label>
                    <input
                      placeholder="Address, City"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
                      value={newData.location}
                      onChange={e => setNewData({ ...newData, location: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price
                    </label>
                    <select
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
                      value={newData.price}
                      onChange={e => setNewData({ ...newData, price: e.target.value })}
                    >
                      <option value="$">$</option>
                      <option value="$$">$$</option>
                      <option value="$$$">$$$</option>
                      <option value="$$$$">$$$$</option>
                      <option value="N/A">N/A</option>
                    </select>
                  </div>
                </div>
                <button
                  className="mt-4 bg-black hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                  type="button"
                  onClick={handleAdd}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Adding...' : 'Add Restaurant'}
                </button>
              </div>
            )}

            {!isLoggedIn && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-yellow-800">
                  <span className="font-semibold">Note:</span> Please log in to add restaurants.
                </p>
              </div>
            )}

            {/* Restaurants List */}
            {restaurants.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <p className="text-4xl mb-4">🍽️</p>
                <p className="text-xl font-semibold mb-2">No restaurants yet</p>
                <p className="text-gray-600">
                  {isLoggedIn ? 'Add your first restaurant using the form above!' : 'Log in to start adding restaurants.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {restaurants.map(r => (
                  <div
                    key={r.id}
                    className={`bg-white rounded-lg shadow-md p-6 transition-all ${
                      editing?.id === r.id ? 'ring-2 ring-blue-500' : 'hover:shadow-lg'
                    }`}
                  >
                    {editing?.id === r.id ? (
                      <div className="space-y-4">
                        <h4 className="text-lg font-semibold mb-4 text-blue-600">Editing Restaurant</h4>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={editing.name}
                            onChange={e => setEditing({ ...editing, name: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Category <span className="text-red-500">*</span>
                          </label>
                          <input
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={editing.category}
                            onChange={e => setEditing({ ...editing, category: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Location <span className="text-red-500">*</span>
                          </label>
                          <input
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={editing.location}
                            onChange={e => setEditing({ ...editing, location: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Price
                          </label>
                          <select
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={editing.price}
                            onChange={e => setEditing({ ...editing, price: e.target.value })}
                          >
                            <option>$</option>
                            <option>$$</option>
                            <option>$$$</option>
                            <option>$$$$</option>
                            <option>N/A</option>
                          </select>
                        </div>
                        <div className="flex gap-2 pt-2">
                          <button
                            type="button"
                            onClick={handleEditSubmit}
                            disabled={isSubmitting}
                            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                          >
                            {isSubmitting ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={() => setEditing(null)}
                            disabled={isSubmitting}
                            className="flex-1 bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="mb-4">
                          <h3 className="text-xl font-bold text-gray-900 mb-2">{r.name}</h3>
                          <div className="space-y-1 text-sm text-gray-600">
                            <p><span className="font-medium">Category:</span> {r.category}</p>
                            <p><span className="font-medium">Location:</span> {r.location}</p>
                            <p><span className="font-medium">Price:</span> <span className="font-semibold text-gray-900">{r.price}</span></p>
                          </div>
                        </div>
                        {isAdmin && (
                          <div className="flex gap-2 pt-4 border-t border-gray-200">
                            <button
                              onClick={() => handleEditClick(r)}
                              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirm(r.id)}
                              className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold mb-4">Confirm Delete</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this restaurant? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  disabled={isSubmitting}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  {isSubmitting ? 'Deleting...' : 'Delete'}
                </button>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  disabled={isSubmitting}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ManageRestaurants;