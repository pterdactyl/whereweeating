import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import { ThemeProvider, createTheme, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { FaCog } from 'react-icons/fa';
import type { Restaurant } from '../types/Restaurant';
import { type ApiRestaurantRow, mapRestaurantFromApi } from '../lib/formatRestaurantRating';
import { apiUrl } from "../lib/api";
import { useToast } from '../components/Toast';
import GearMenuContent from '../components/GearMenuContent';
import { clearAuth, getAuthEmail, getAuthToken } from '../lib/auth';
import {
  HoursEditor,
  emptyWeeklyHours,
  validateWeeklyHours,
  dbWeeklyHoursToNamed,
  namedToDbWeeklyHours,
  weeklyHoursHasIntervals,
  weeklyNamedToDisplayLines,
  WEEKDAYS,
  type WeeklyHoursNamed,
} from '../openingHours';

const manageMuiTheme = createTheme();
const EDITOR_TZ = 'America/Toronto';

function hasWeeklySchedule(named: WeeklyHoursNamed): boolean {
  return WEEKDAYS.some(d => (named[d]?.length ?? 0) > 0);
}

function ManageScheduleDialogs({
  addOpen,
  editOpen,
  onCloseAdd,
  onCloseEdit,
  newWeeklyNamed,
  setNewWeeklyNamed,
  editWeeklyNamed,
  setEditWeeklyNamed,
  setNewData,
  setEditing,
}: {
  addOpen: boolean;
  editOpen: boolean;
  onCloseAdd: () => void;
  onCloseEdit: () => void;
  newWeeklyNamed: WeeklyHoursNamed;
  setNewWeeklyNamed: (v: WeeklyHoursNamed) => void;
  editWeeklyNamed: WeeklyHoursNamed;
  setEditWeeklyNamed: (v: WeeklyHoursNamed) => void;
  setNewData: Dispatch<
    SetStateAction<{
      name: string;
      category: string;
      location: string;
      price: string;
      hours_of_operation: string;
    }>
  >;
  setEditing: Dispatch<SetStateAction<Restaurant | null>>;
}) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <>
      <Dialog
        open={addOpen}
        onClose={onCloseAdd}
        fullScreen={fullScreen}
        fullWidth
        maxWidth="sm"
        scroll="paper"
        slotProps={{
          paper: {
            sx: {
              maxHeight: fullScreen ? '100%' : 'min(92dvh, 720px)',
              display: 'flex',
              flexDirection: 'column',
            },
          },
        }}
      >
        <DialogTitle sx={{ pr: 6, fontSize: { xs: '1.05rem', sm: '1.25rem' } }}>Weekly schedule</DialogTitle>
        <Typography variant="body2" color="text.secondary" sx={{ px: 3, pb: 1, pt: 0, lineHeight: 1.45 }}>
          Swipe the day tabs on a small screen. Used for “open now” in Toronto time.
        </Typography>
        <DialogContent
          dividers
          sx={{
            flex: '1 1 auto',
            overflow: 'auto',
            px: { xs: 1.25, sm: 2 },
            py: { xs: 1.5, sm: 2 },
          }}
        >
          <HoursEditor value={newWeeklyNamed} onChange={setNewWeeklyNamed} timeZone={EDITOR_TZ} />
        </DialogContent>
        <DialogActions
          sx={{
            px: 2,
            py: 1.5,
            flexDirection: { xs: 'column-reverse', sm: 'row' },
            alignItems: 'stretch',
            gap: 1,
          }}
        >
          <Button fullWidth={fullScreen} variant="outlined" onClick={onCloseAdd}>
            Cancel
          </Button>
          <Button
            fullWidth={fullScreen}
            variant="text"
            size="small"
            onClick={() =>
              setNewData(prev => ({
                ...prev,
                hours_of_operation: weeklyNamedToDisplayLines(newWeeklyNamed),
              }))
            }
          >
            Copy lines to customer hours
          </Button>
          <Button fullWidth={fullScreen} variant="contained" onClick={onCloseAdd}>
            Done
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={editOpen}
        onClose={onCloseEdit}
        fullScreen={fullScreen}
        fullWidth
        maxWidth="sm"
        scroll="paper"
        slotProps={{
          paper: {
            sx: {
              maxHeight: fullScreen ? '100%' : 'min(92dvh, 720px)',
              display: 'flex',
              flexDirection: 'column',
            },
          },
        }}
      >
        <DialogTitle sx={{ pr: 6, fontSize: { xs: '1.05rem', sm: '1.25rem' } }}>Edit weekly schedule</DialogTitle>
        <Typography variant="body2" color="text.secondary" sx={{ px: 3, pb: 1, pt: 0, lineHeight: 1.45 }}>
          Changes apply when you tap Save on the restaurant card.
        </Typography>
        <DialogContent
          dividers
          sx={{
            flex: '1 1 auto',
            overflow: 'auto',
            px: { xs: 1.25, sm: 2 },
            py: { xs: 1.5, sm: 2 },
          }}
        >
          <HoursEditor value={editWeeklyNamed} onChange={setEditWeeklyNamed} timeZone={EDITOR_TZ} />
        </DialogContent>
        <DialogActions
          sx={{
            px: 2,
            py: 1.5,
            flexDirection: { xs: 'column-reverse', sm: 'row' },
            alignItems: 'stretch',
            gap: 1,
          }}
        >
          <Button fullWidth={fullScreen} variant="outlined" onClick={onCloseEdit}>
            Close
          </Button>
          <Button
            fullWidth={fullScreen}
            variant="text"
            size="small"
            onClick={() =>
              setEditing(prev =>
                prev ? { ...prev, hours_of_operation: weeklyNamedToDisplayLines(editWeeklyNamed) } : prev,
              )
            }
          >
            Copy lines to customer hours
          </Button>
          <Button fullWidth={fullScreen} variant="contained" onClick={onCloseEdit}>
            Done
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function ManageRestaurants() {
  const { showToast } = useToast();

  const ADMIN_EMAILS = ["admin@test.com"];
  const token = getAuthToken();
  const userEmail = getAuthEmail();

  const isLoggedIn = !!token;
  const isAdmin = !!userEmail && ADMIN_EMAILS.includes(userEmail);

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [editing, setEditing] = useState<Restaurant | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Restaurant["id"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gearOpen, setGearOpen] = useState(false);
  const [listSearch, setListSearch] = useState('');
  const [newData, setNewData] = useState<{
    name: string;
    category: string;
    location: string;
    price: string;
    hours_of_operation: string;
  }>({
    name: '',
    category: '',
    location: '',
    price: '$',
    hours_of_operation: '',
  });
  const [newWeeklyNamed, setNewWeeklyNamed] = useState<WeeklyHoursNamed>(() => emptyWeeklyHours());
  const [editWeeklyNamed, setEditWeeklyNamed] = useState<WeeklyHoursNamed>(() => emptyWeeklyHours());
  const [addScheduleOpen, setAddScheduleOpen] = useState(false);
  const [editScheduleOpen, setEditScheduleOpen] = useState(false);

  useEffect(() => {
    if (!editing) setEditScheduleOpen(false);
  }, [editing]);

  useEffect(() => {
    setIsLoading(true);
    fetch(apiUrl(`/api/restaurants`))
      .then(res => res.json())
      .then((data: ApiRestaurantRow[]) => {
        setRestaurants((data ?? []).map(mapRestaurantFromApi));
        setIsLoading(false);
      })
      .catch(() => {
        showToast('error', 'Failed to load restaurants');
        setIsLoading(false);
      });
  }, []);

  const visibleRestaurants = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    if (!q) return restaurants;
    return restaurants.filter(r => {
      const blob = `${r.name} ${r.category} ${r.location} ${r.price ?? ''}`.toLowerCase();
      return blob.includes(q);
    });
  }, [restaurants, listSearch]);

  const handleAdd = async () => {
    if (!newData.name.trim() || !newData.category.trim() || !newData.location.trim()) {
      showToast('warning', 'Please fill in all required fields');
      return;
    }

    const schedErr = validateWeeklyHours(newWeeklyNamed);
    if (schedErr) {
      showToast('error', schedErr);
      return;
    }

    const wh = namedToDbWeeklyHours(newWeeklyNamed);

    try {
      setIsSubmitting(true);
      const token = getAuthToken();

      const res = await fetch(apiUrl(`/api/restaurants`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newData.name.trim(),
          category: newData.category.trim(),
          location: newData.location.trim(),
          price: newData.price,
          hours_of_operation: newData.hours_of_operation.trim() || null,
          weekly_hours: wh,
        }),
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
            clearAuth('all');
          } else {
            showToast('error', errorMessage);
          }
        } else {
          showToast('error', errorMessage);
        }
        return;
      }

      setRestaurants(prev => [...prev, data]);
      setNewData({
        name: '',
        category: '',
        location: '',
        price: '$',
        hours_of_operation: '',
      });
      setNewWeeklyNamed(emptyWeeklyHours());
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
      const token = getAuthToken();
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

    const schedErr = validateWeeklyHours(editWeeklyNamed);
    if (schedErr) {
      showToast('error', schedErr);
      return;
    }

    const wh = namedToDbWeeklyHours(editWeeklyNamed);

    try {
      setIsSubmitting(true);
      const token = getAuthToken();
      
      if (!token) {
        showToast('error', "Please log in to edit restaurants.");
        return;
      }

      const hoursText = (editing.hours_of_operation ?? '').trim();

      const res = await fetch(apiUrl(`/api/restaurants/${editing.id}`), {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editing.name.trim(),
          category: editing.category.trim(),
          location: editing.location.trim(),
          price: editing.price,
          hours_of_operation: hoursText || null,
          weekly_hours: wh,
        }),
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
              clearAuth('all');
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
      setEditWeeklyNamed(emptyWeeklyHours());
      setEditing(null);
      showToast('success', 'Restaurant updated successfully!');
    } catch (e) {
      showToast('error', "Network error. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  }; 

  const handleEditClick = (r: Restaurant) => {
    setEditing({
      ...r,
      hours_of_operation: r.hours_of_operation,
      weekly_hours: r.weekly_hours,
    });
    setEditWeeklyNamed(dbWeeklyHoursToNamed(r.weekly_hours));
  };

  return (
    <ThemeProvider theme={manageMuiTheme}>
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold mb-4">Manage Restaurants</h2>

        <div className="sticky top-0 z-20 -mx-4 px-4 py-3 mb-6 flex flex-col gap-2 border-b border-gray-200 bg-gray-50/95 backdrop-blur-sm sm:flex-row sm:items-center sm:gap-3">
          <label htmlFor="manage-restaurant-search" className="sr-only">
            Search restaurants
          </label>
          <input
            id="manage-restaurant-search"
            type="search"
            value={listSearch}
            onChange={e => setListSearch(e.target.value)}
            placeholder="Search by name, category, or location…"
            disabled={restaurants.length === 0}
            className="min-h-[44px] w-full flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10 disabled:cursor-not-allowed disabled:bg-gray-100 sm:min-w-0"
          />
          <div className="relative flex shrink-0 justify-end sm:justify-start">
            <button
              type="button"
              onClick={() => setGearOpen(o => !o)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-300 bg-white shadow-sm transition hover:shadow-md"
              aria-expanded={gearOpen}
              aria-haspopup="menu"
              aria-label="Menu"
            >
              <FaCog className="text-lg" />
            </button>
            {gearOpen && (
              <div
                className="absolute right-0 top-full z-30 mt-2 min-w-[11rem] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg text-gray-900"
                role="menu"
              >
                <GearMenuContent onClose={() => setGearOpen(false)} />
              </div>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
          </div>
        ) : (
          <>
            {isLoggedIn && (
              <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6 sm:mb-8">
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
                  <div className="md:col-span-2 lg:col-span-4 space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Customer-facing hours (optional)</label>
                    <p className="text-xs text-gray-500">
                      Shown on picks and group shortlist. You can type free text or generate a draft from the weekly
                      schedule below.
                    </p>
                    <textarea
                      placeholder={'e.g. Mon–Fri 11:30–22:00'}
                      rows={2}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
                      value={newData.hours_of_operation}
                      onChange={e => setNewData({ ...newData, hours_of_operation: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2 lg:col-span-4">
                    <div className="rounded-lg border border-gray-200 bg-gray-50/70 p-3 sm:p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900">Weekly schedule (optional)</p>
                          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                            Tap to edit in a focused window—full-screen on phones so it doesn’t stretch the page.
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          {hasWeeklySchedule(newWeeklyNamed) ? (
                            <span className="text-xs font-medium text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full">
                              Schedule saved in form
                            </span>
                          ) : (
                            <span className="text-xs text-gray-500 px-2.5 py-1">None yet</span>
                          )}
                          <Button variant="contained" size="small" onClick={() => setAddScheduleOpen(true)}>
                            Edit schedule
                          </Button>
                        </div>
                      </div>
                    </div>
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

            {restaurants.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <p className="text-4xl mb-4">🍽️</p>
                <p className="text-xl font-semibold mb-2">No restaurants yet</p>
                <p className="text-gray-600">
                  {isLoggedIn ? 'Add your first restaurant using the form above!' : 'Log in to start adding restaurants.'}
                </p>
              </div>
            ) : visibleRestaurants.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <p className="text-xl font-semibold mb-2 text-gray-900">No matches</p>
                <p className="text-gray-600">
                  Nothing matches &quot;{listSearch.trim()}&quot;. Try a different search.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {visibleRestaurants.map(r => (
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
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Customer-facing hours (optional)
                          </label>
                          <p className="text-xs text-gray-500 mb-1">
                            Shown to diners in the app. Edit freely or generate from the schedule below.
                          </p>
                          <textarea
                            rows={2}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={editing.hours_of_operation ?? ''}
                            onChange={e =>
                              setEditing({
                                ...editing,
                                hours_of_operation: e.target.value.length ? e.target.value : null,
                              })
                            }
                          />
                          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                            <button
                              type="button"
                              className="text-sm font-medium text-blue-600 hover:text-blue-800 text-left"
                              onClick={() =>
                                setEditing({
                                  ...editing,
                                  hours_of_operation: weeklyNamedToDisplayLines(editWeeklyNamed),
                                })
                              }
                            >
                              Fill customer hours from schedule
                            </button>
                            <span className="hidden sm:inline text-gray-300">|</span>
                            <button
                              type="button"
                              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50"
                              onClick={() => setEditScheduleOpen(true)}
                            >
                              Edit weekly schedule…
                            </button>
                            {hasWeeklySchedule(editWeeklyNamed) ? (
                              <span className="text-xs font-medium text-emerald-700">Schedule configured</span>
                            ) : (
                              <span className="text-xs text-gray-500">No schedule</span>
                            )}
                          </div>
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
                            type="button"
                            onClick={() => {
                              setEditing(null);
                              setEditWeeklyNamed(emptyWeeklyHours());
                            }}
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
                            {r.hours_of_operation?.trim() ? (
                              <p className="text-gray-700 whitespace-pre-wrap">
                                <span className="font-medium">Hours:</span> {r.hours_of_operation.trim()}
                              </p>
                            ) : null}
                            <p className="text-xs text-gray-500">
                              {weeklyHoursHasIntervals(r.weekly_hours)
                                ? 'Weekly schedule saved (used for open-now).'
                                : 'No weekly schedule — open-now uses “unknown hours” fallback.'}
                            </p>
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

        <ManageScheduleDialogs
          addOpen={addScheduleOpen}
          editOpen={editScheduleOpen}
          onCloseAdd={() => setAddScheduleOpen(false)}
          onCloseEdit={() => setEditScheduleOpen(false)}
          newWeeklyNamed={newWeeklyNamed}
          setNewWeeklyNamed={setNewWeeklyNamed}
          editWeeklyNamed={editWeeklyNamed}
          setEditWeeklyNamed={setEditWeeklyNamed}
          setNewData={setNewData}
          setEditing={setEditing}
        />

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
    </ThemeProvider>
  );
}

export default ManageRestaurants;