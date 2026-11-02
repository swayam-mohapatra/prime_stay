import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Filter, X, Search, ChevronDown, Star, Wifi, Wind, 
  Tv, Coffee, Waves, Monitor, ArrowRight 
} from "lucide-react";
import BookingModal from "./BookingModal";
import LoginModal from "./LoginModal";
import "./RoomsPage.css";

const API = "http://localhost:5000";

const AMENITIES = [
  { id: "Wifi", icon: <Wifi size={14}/>, label: "Free WiFi" },
  { id: "AC", icon: <Wind size={14}/>, label: "Air Conditioning" },
  { id: "Pool", icon: <Waves size={14}/>, label: "Pool Access" },
  { id: "Spa", icon: <Coffee size={14}/>, label: "Spa & Wellness" },
  { id: "TV", icon: <Monitor size={14}/>, label: "Smart TV" },
];

// Room types will be derived dynamically from the API data

function RoomsPage() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [priceRange, setPriceRange] = useState(15000);
  const [selectedType, setSelectedType] = useState("All");
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [sortBy, setSortBy] = useState("Recommended");
  const [roomTypes, setRoomTypes] = useState(["All"]);
  
  // Modals & Auth
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => localStorage.getItem("jv_logged_in") === "true"
  );
  const [showLogin, setShowLogin] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showBooking, setShowBooking] = useState(false);

  const handleLoginSuccess = () => {
    localStorage.setItem("jv_logged_in", "true");
    setIsLoggedIn(true);
    setShowLogin(false);
    // Automatically open booking modal if a room was selected before login
    if (selectedRoom) setShowBooking(true);
  };

  const handleBookClick = (room) => {
    setSelectedRoom(room);
    if (isLoggedIn) {
      setShowBooking(true);
    } else {
      setShowLogin(true);
    }
  };

  useEffect(() => {
    fetch(`${API}/api/rooms`)
      .then(r => r.json())
      .then(data => {
        // Calculate dynamic room types
        const types = ["All", ...new Set(data.map(room => room.type))];
        setRoomTypes(types);

        // Ensure rooms have default amenities if they are missing
        const enriched = data.map(room => ({
          ...room,
          amenities: room.amenities && room.amenities.length > 0 
            ? room.amenities 
            : ["Wifi", "AC", "TV"] // Default set
        }));
        setRooms(enriched);
        setFilteredRooms(enriched);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    let result = rooms.filter(room => {
      const matchType = selectedType === "All" || room.type === selectedType;
      const matchPrice = room.price <= priceRange;
      
      // If no amenities selected, all match. Otherwise, must match all selected.
      const matchAmenities = selectedAmenities.length === 0 || 
        selectedAmenities.every(a => (room.amenities || []).includes(a));
        
      return matchType && matchPrice && matchAmenities;
    });

    if (sortBy === "Price low-high") result.sort((a, b) => a.price - b.price);
    if (sortBy === "Price high-low") result.sort((a, b) => b.price - a.price);
    if (sortBy === "Top Rated") result.sort((a, b) => (b.rating || 0) - (a.rating || 0));

    setFilteredRooms(result);
  }, [selectedType, priceRange, selectedAmenities, sortBy, rooms]);

  const toggleAmenity = (id) => {
    setSelectedAmenities(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const clearFilters = () => {
    setPriceRange(15000);
    setSelectedType("All");
    setSelectedAmenities([]);
    setSortBy("Recommended");
  };

  const isFilterActive = selectedType !== "All" || priceRange < 15000 || selectedAmenities.length > 0;

  return (
    <div className="rooms-page">
      {/* ── Header ── */}
      <header className="rp-header">
        <div className="rp-header-top">
          <button type="button" className="back-home-btn" onClick={() => navigate("/")}>
            ← Back to Home
          </button>
        </div>
        <div className="rp-header-content">
          <h1>Discover Your <span className="gold">Perfect Stay</span></h1>
          <p>Handpicked luxury rooms for an unforgettable experience</p>
        </div>
      </header>

      <div className="rp-container">
        {/* ── Sidebar Filters ── */}
        <aside className="rp-sidebar">
          <div className="sidebar-header">
            <div className="flex-center gap-2">
              <Filter size={18} />
              <h3>Filters</h3>
            </div>
            {isFilterActive && (
              <button className="clear-btn" onClick={clearFilters}>Clear All</button>
            )}
          </div>

          <div className="filter-group">
            <label className="filter-label">Max Price: ₹{priceRange.toLocaleString()}</label>
            <input 
              type="range" 
              min="2000" 
              max="20000" 
              step="500"
              value={priceRange} 
              onChange={(e) => setPriceRange(Number(e.target.value))}
              className="price-slider"
            />
          </div>

          <div className="filter-group">
            <label className="filter-label">Room Type</label>
            <div className="radio-group">
              {roomTypes.map(type => (
                <label key={type} className={`radio-item ${selectedType === type ? "active" : ""}`}>
                  <input 
                    type="radio" 
                    name="type" 
                    checked={selectedType === type}
                    onChange={() => setSelectedType(type)} 
                  />
                  {type}
                </label>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <label className="filter-label">Amenities</label>
            <div className="amenity-grid">
              {AMENITIES.map(a => (
                <button 
                  key={a.id} 
                  className={`amenity-toggle ${selectedAmenities.includes(a.id) ? "active" : ""}`}
                  onClick={() => toggleAmenity(a.id)}
                >
                  {a.icon}
                  <span>{a.label}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <main className="rp-main">
          <div className="rp-toolbar">
            <p className="results-count">Showing <strong>{filteredRooms.length}</strong> available rooms</p>
            <div className="sort-wrapper">
              <span>Sort by:</span>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option>Recommended</option>
                <option>Price low-high</option>
                <option>Price high-low</option>
                <option>Top Rated</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="rp-loading">Loading luxury rooms...</div>
          ) : (
            <motion.div 
              className="rp-grid"
              layout
            >
              <AnimatePresence>
                {filteredRooms.map((room, idx) => (
                  <motion.div 
                    key={room._id}
                    className="room-card"
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3, delay: idx * 0.05 }}
                  >
                    <div className="rc-image-wrap">
                      <img src={room.image || `https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=800`} alt={room.type} />
                      <div className="rc-badge">{room.type}</div>
                      {idx === 0 && <div className="rc-tag">Most Popular</div>}
                      {idx === 1 && <div className="rc-tag gold">Hot Deal</div>}
                    </div>

                    <div className="rc-content">
                      <div className="rc-header">
                        <h3>{room.type} Exclusive</h3>
                        <div className="rc-rating">
                          <Star size={14} fill="var(--accent)" color="var(--accent)"/>
                          <span>4.8 (120 reviews)</span>
                        </div>
                      </div>

                      <div className="rc-amenities">
                        {(room.amenities || ["Wifi", "AC", "TV"]).map(a => (
                          <span key={a} className="rc-amenity-pill">
                            {AMENITIES.find(am => am.id === a)?.icon || <Wifi size={12}/>}
                            {a}
                          </span>
                        ))}
                      </div>

                      <div className="rc-footer">
                        <div className="rc-price">
                          <span className="price">₹{room.price.toLocaleString()}</span>
                          <span className="unit">/night</span>
                        </div>
                        <button 
                          className="rc-book-btn"
                          onClick={() => handleBookClick(room)}
                        >
                          Book Now <ArrowRight size={16}/>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}

          {!loading && filteredRooms.length === 0 && (
            <div className="rp-empty">
              <Search size={48} />
              <h2>No rooms match your filters</h2>
              <p>Try adjusting your price range or removing some amenities.</p>
              <button className="primary-btn" onClick={clearFilters}>Reset All Filters</button>
            </div>
          )}
        </main>
      </div>

      {showLogin && (
        <LoginModal 
          onClose={() => setShowLogin(false)} 
          onLoginSuccess={handleLoginSuccess} 
        />
      )}

      {showBooking && (
        <BookingModal 
          room={selectedRoom} 
          onClose={() => setShowBooking(false)} 
        />
      )}
    </div>
  );
}

export default RoomsPage;
