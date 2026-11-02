import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from "recharts";
import "./AdminDashboard.css";

const STATUSES = ["Available", "Booked", "Maintenance"];
const COLORS = ["#10b981", "#3b82f6", "#f97316", "#a855f7"];
const getToken = () => localStorage.getItem("jv_token") || "";
const API = "http://localhost:5000";

function AdminDashboard() {
  const navigate  = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");

  // --- Data Fetching ---
  const [bookings, setBookings] = useState([]);
  const [users,    setUsers]    = useState([]);
  const [rooms,    setRooms]    = useState([]);
  const [stats,    setStats]    = useState(null);

  const fetchAllData = () => {
    const token = getToken();
    Promise.all([
      fetch(`${API}/api/bookings`,    { headers: { "Authorization": `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API}/api/auth/users`,  { headers: { "Authorization": `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API}/api/rooms`).then(r => r.json()),
      fetch(`${API}/api/bookings/stats`, { headers: { "Authorization": `Bearer ${token}` } }).then(r => r.json())
    ]).then(([bookingsData, usersData, roomsData, statsData]) => {
      setBookings(Array.isArray(bookingsData) ? bookingsData : []);
      setUsers(Array.isArray(usersData)        ? usersData    : []);
      setRooms(Array.isArray(roomsData)        ? roomsData    : []);
      setStats(statsData);
    }).catch(err => console.error("Error fetching admin data:", err));
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // --- Handlers ---
  const handleVerifyPayment = async (id, paymentStatus) => {
    try {
      const res = await fetch(`${API}/api/bookings/${id}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}` },
        body: JSON.stringify({ paymentStatus })
      });
      const data = await res.json();
      if (res.ok) {
        // Refetch ALL data so stats, pie chart, room statuses all update instantly
        fetchAllData();
      } else {
        console.error("Verify/Decline failed:", data);
        alert(`Action failed: ${data.message || 'Unknown error'}`);
      }
    } catch (err) { console.error("Error verifying payment:", err); }
  };

  // --- Booking filter ---
  const [bookingFilter, setBookingFilter] = useState("All");

  // --- Image upload state ---
  const [uploadingRoom,    setUploadingRoom]    = useState(null);   // roomNumber being edited
  const [uploadPreview,    setUploadPreview]    = useState(null);   // local preview URL
  const [uploadFile,       setUploadFile]       = useState(null);   // selected File
  const [uploadStatus,     setUploadStatus]     = useState("");     // "uploading" | "done" | "error"
  const fileInputRef = useRef();

  // --- Stats ---
  const confirmedBookings = bookings.filter(b => b.status === "Confirmed");
  const totalRevenue      = confirmedBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
  const availableRooms    = rooms.filter(r => r.status === "Available").length;

  // --- Handlers ---
  const handleRoomStatusChange = async (roomNumber, newStatus) => {
    setRooms(rooms.map(r => r.roomNumber === roomNumber ? { ...r, status: newStatus } : r));
    try {
      await fetch(`${API}/api/rooms/${roomNumber}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}` },
        body: JSON.stringify({ status: newStatus })
      });
    } catch (err) { console.error("Error updating room status:", err); }
  };

  const handleOpenImageUpload = (roomNumber) => {
    setUploadingRoom(roomNumber);
    setUploadPreview(null);
    setUploadFile(null);
    setUploadStatus("");
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadFile(file);
    setUploadPreview(URL.createObjectURL(file));
    setUploadStatus("");
  };

  const handleImageUpload = async () => {
    if (!uploadFile || !uploadingRoom) return;
    setUploadStatus("uploading");

    try {
      // 1. Upload image to /api/upload
      const formData = new FormData();
      formData.append("roomImage", uploadFile);

      const uploadRes = await fetch(`${API}/api/upload`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${getToken()}` },
        body: formData
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.message || "Upload failed");

      const imageUrl = uploadData.imageUrl; // e.g. "/uploads/room-123456789.jpg"

      // 2. Save imageUrl to the room record
      const updateRes = await fetch(`${API}/api/rooms/${uploadingRoom}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}` },
        body: JSON.stringify({ image: `${API}${imageUrl}` })
      });
      const updatedRoom = await updateRes.json();
      if (!updateRes.ok) throw new Error(updatedRoom.message || "Room update failed");

      // 3. Update local rooms state
      setRooms(prev => prev.map(r => r.roomNumber === uploadingRoom ? { ...r, image: `${API}${imageUrl}` } : r));
      setUploadStatus("done");
    } catch (err) {
      console.error("Image upload error:", err);
      setUploadStatus("error");
    }
  };

  const handleSignOut = () => {
    ["jv_token","jv_logged_in","jv_user_name","jv_user_email","jv_user_role","jv_member_since"]
      .forEach(k => localStorage.removeItem(k));
    navigate("/");
  };

  const formatDate = (d) => {
    if (!d) return "—";
    const dateObj = new Date(d);
    return isNaN(dateObj) ? "Invalid Date" : dateObj.toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
    });
  };

  const filteredBookings = bookingFilter === "All"
    ? bookings
    : bookings.filter(b => b.status === bookingFilter);

  const statusColor = (s) => {
    if (s === "Available")   return "status-green";
    if (s === "Booked")      return "status-blue";
    if (s === "Maintenance") return "status-orange";
    if (s === "Confirmed")   return "status-green";
    if (s === "Cancelled")   return "status-red";
    return "";
  };

  const tabs = [
    { key: "overview",  icon: "📊", label: "Overview"  },
    { key: "rooms",     icon: "🛏️", label: "Rooms"     },
    { key: "bookings",  icon: "📋", label: "Bookings"  },
    { key: "users",     icon: "👤", label: "Users"     },
  ];

  return (
    <div className="ad-layout">

      {/* ── Sidebar ── */}
      <aside className="ad-sidebar">
        <div className="ad-sidebar-brand">
          <div className="ad-sidebar-logo">🏨</div>
          <div>
            <h2>Prime Stay</h2>
          </div>
        </div>

        <nav className="ad-nav">
          {tabs.map(t => (
            <button
              key={t.key}
              className={`ad-nav-item${activeTab === t.key ? " active" : ""}`}
              onClick={() => setActiveTab(t.key)}
            >
              <span className="ad-nav-icon">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>

        <div className="ad-sidebar-footer">
          <button className="ad-visit-btn" onClick={() => navigate("/")}>
            🌐 Visit Website
          </button>
          <button className="ad-signout-btn" onClick={handleSignOut}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="ad-main">

        {/* Top bar */}
        <div className="ad-topbar">
          <div>
            <h1 className="modal-title">Prime Stay
              {tabs.find(t => t.key === activeTab)?.icon}{" "}
              {tabs.find(t => t.key === activeTab)?.label}
            </h1>
            <p className="ad-page-sub">Prime Stay Hotel Management</p>
          </div>
          <div className="ad-admin-pill">
            👤 {localStorage.getItem("jv_user_email")}
          </div>
        </div>

        {/* ═══════════ TAB 1 — OVERVIEW ═══════════ */}
        {activeTab === "overview" && (
          <div className="ad-content">
            <div className="ad-stats-grid">
              <div className="ad-stat-card blue">
              <div className="ad-stat-icon">🛏️</div>
                <div><h3>{rooms.filter(r => r.status === 'Available').length}/{rooms.length}</h3><p>Available Rooms</p></div>
              </div>
              <div className="ad-stat-card green">
                <div className="ad-stat-icon">📋</div>
                <div><h3>{bookings.filter(b => b.status === "Confirmed").length}</h3><p>Confirmed Bookings</p></div>
              </div>
              <div className="ad-stat-card purple">
                <div className="ad-stat-icon">💰</div>
                <div><h3>₹{stats?.totalRevenue.toLocaleString("en-IN")}</h3><p>Total Revenue</p></div>
              </div>
              <div className="ad-stat-card orange">
                <div className="ad-stat-icon">👥</div>
                <div><h3>{users.length}</h3><p>Registered Users</p></div>
              </div>
            </div>

            <div className="ad-charts-row">
              <div className="ad-section chart-card">
                <h2 className="ad-section-title">📈 Revenue Trend (Last 6 Months)</h2>
                <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer>
                    <BarChart data={stats?.monthlyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="revenue" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="ad-section chart-card">
                <h2 className="ad-section-title">🍩 Room Occupancy</h2>
                <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={stats?.occupancy}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {stats?.occupancy.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ═══════════ TAB 2 — ROOMS ═══════════ */}
        {activeTab === "rooms" && (
          <div className="ad-content">
            <div className="ad-section">
              <h2 className="ad-section-title">Manage Rooms</h2>
              <p className="ad-section-sub">Change room status or upload a photo for each room.</p>
              <div className="ad-table-wrap">
                <table className="ad-table">
                  <thead>
                    <tr>
                      <th>Room No.</th><th>Type</th><th>Price/Night</th>
                      <th>Capacity</th><th>Image</th><th>Current Booking</th><th>Status</th><th>Change Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rooms.map(r => (
                      <tr key={r.roomNumber}>
                        <td className="ad-mono">#{r.roomNumber}</td>
                        <td><strong>{r.type} Room</strong></td>
                        <td>₹{r.price.toLocaleString("en-IN")}</td>
                        <td>👥 {r.capacity} Guest{r.capacity > 1 ? "s" : ""}</td>
                        <td>
                          {r.image ? (
                            <img
                              src={r.image}
                              alt={r.type}
                              className="ad-room-thumb"
                              onError={(e) => { e.target.style.display = "none"; }}
                            />
                          ) : (
                            <span className="ad-no-image">No image</span>
                          )}
                          <button
                            className="ad-upload-btn"
                            onClick={() => handleOpenImageUpload(r.roomNumber)}
                          >
                            📷 {r.image ? "Change" : "Upload"}
                          </button>
                        </td>
                        <td>
                          {(() => {
                            const roomBookings = bookings.filter(b => b.roomId === r.roomNumber && (b.status === "Confirmed" || b.status === "Pending Payment"));
                            // Show active or latest booking
                            const activeBooking = roomBookings.find(b => new Date(b.checkOut) >= new Date()) || roomBookings[roomBookings.length - 1];
                            
                            if (activeBooking) {
                              return (
                                <div style={{ fontSize: '13px', lineHeight: '1.4' }}>
                                  <span style={{ fontWeight: '600', color: 'var(--primary)' }}>
                                    {formatDate(activeBooking.checkIn)} - {formatDate(activeBooking.checkOut)}
                                  </span>
                                  <div style={{ color: 'var(--secondary)', fontSize: '11px', marginTop: '2px' }}>
                                    {activeBooking.customerId}
                                  </div>
                                </div>
                              );
                            }
                            return <span className="ad-no-proof">None</span>;
                          })()}
                        </td>
                        <td>
                          <span className={`ad-badge ${statusColor(r.status)}`}>{r.status}</span>
                        </td>
                        <td>
                          <select
                            className="ad-status-select"
                            value={r.status}
                            onChange={(e) => handleRoomStatusChange(r.roomNumber, e.target.value)}
                          >
                            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Image Upload Panel ─────────────────────────────────── */}
            {uploadingRoom && (
              <div className="ad-upload-panel">
                <div className="ad-upload-panel-header">
                  <h3>📷 Upload Image for Room #{uploadingRoom}</h3>
                  <button className="ad-upload-close" onClick={() => setUploadingRoom(null)}>✕</button>
                </div>

                {uploadPreview && (
                  <img src={uploadPreview} alt="Preview" className="ad-upload-preview" />
                )}

                <div className="ad-upload-controls">
                  <label className="ad-file-label">
                    Choose Image
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={handleFileSelect}
                    />
                  </label>

                  {uploadFile && uploadStatus !== "done" && (
                    <button
                      className="ad-save-image-btn"
                      onClick={handleImageUpload}
                      disabled={uploadStatus === "uploading"}
                    >
                      {uploadStatus === "uploading" ? "Uploading…" : "Save Image"}
                    </button>
                  )}
                </div>

                {uploadStatus === "done" && (
                  <div className="ad-upload-success">✅ Image saved successfully!</div>
                )}
                {uploadStatus === "error" && (
                  <div className="ad-upload-error">❌ Upload failed. Please try again.</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══════════ TAB 3 — BOOKINGS ═══════════ */}
        {activeTab === "bookings" && (
          <div className="ad-content">
            <div className="ad-section">
              <div className="ad-section-head-row">
                <h2 className="ad-section-title">All Bookings ({bookings.length})</h2>
                <div className="ad-filter-row">
                  {["All", "Confirmed", "Cancelled", "Pending Payment"].map(f => (
                    <button
                      key={f}
                      className={`ad-filter-btn${bookingFilter === f ? " active" : ""}`}
                      onClick={() => setBookingFilter(f)}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {filteredBookings.length === 0 ? (
                <div className="ad-empty">No {bookingFilter.toLowerCase()} bookings found.</div>
              ) : (
                <div className="ad-table-wrap">
                  <table className="ad-table">
                    <thead>
                      <tr>
                        <th>Booking ID</th><th>Customer</th><th>Room</th>
                        <th>Dates</th><th>Booked On</th><th>Total</th><th>Status</th><th>Payment Proof</th><th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...filteredBookings].reverse().map(b => (
                        <tr key={b._id}>
                          <td className="ad-mono">#{b._id.slice(-6).toUpperCase()}</td>
                          <td className="ad-mono" style={{fontSize:'12px'}}>{b.customerId}</td>
                          <td>{b.roomType} · #{b.roomId}</td>
                          <td>{formatDate(b.checkIn)} - {formatDate(b.checkOut)}</td>
                          <td style={{fontSize:'12px', color:'var(--secondary)'}}>{formatDate(b.bookedOn)}</td>
                          <td>₹{(b.totalPrice || 0).toLocaleString("en-IN")}</td>
                          <td>
                            <span className={`ad-badge ${statusColor(b.status)}`}>{b.status}</span>
                          </td>
                          <td>
                            {b.paymentProof ? (
                              <a href={`${API}${b.paymentProof}`} target="_blank" rel="noreferrer" className="ad-proof-link">View Proof 📄</a>
                            ) : (
                              <span className="ad-no-proof">None</span>
                            )}
                          </td>
                          <td>
                            <div style={{display:'flex', gap:'5px'}}>
                              <button 
                                className="ad-action-btn verify" 
                                onClick={() => handleVerifyPayment(b._id, 'Verified')}
                                disabled={b.status === 'Cancelled' || b.paymentStatus === 'Verified'}
                              >
                                {b.paymentStatus === 'Verified' ? '✓ Verified' : 'Verify'}
                              </button>
                              <button 
                                className="ad-action-btn decline"
                                onClick={() => handleVerifyPayment(b._id, 'Declined')}
                                disabled={b.status === 'Cancelled' || b.paymentStatus === 'Verified'}
                              >
                                {b.status === 'Cancelled' ? 'Declined' : 'Decline'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════ TAB 4 — USERS ═══════════ */}
        {activeTab === "users" && (
          <div className="ad-content">
            <div className="ad-section">
              <h2 className="ad-section-title">Registered Users ({users.length})</h2>
              {users.length === 0 ? (
                <div className="ad-empty">No users have registered yet.</div>
              ) : (
                <div className="ad-table-wrap">
                  <table className="ad-table">
                    <thead>
                      <tr>
                        <th>#</th><th>Name</th><th>Email</th>
                        <th>Role</th><th>Member Since</th><th>Bookings</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u, i) => {
                        const userBookings = bookings.filter(b => b.customerId === u.email);
                        return (
                          <tr key={u.email + i}>
                            <td>{i + 1}</td>
                            <td><strong>{u.name}</strong></td>
                            <td>{u.email}</td>
                            <td>
                              <span className={`ad-badge ${u.role === "admin" ? "status-blue" : "status-green"}`}>
                                {u.role || "customer"}
                              </span>
                            </td>
                            <td>{u.memberSince || "2026"}</td>
                            <td>{userBookings.length}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default AdminDashboard;
