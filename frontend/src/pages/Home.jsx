import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import LoginModal from "./LoginModal";
import BookingModal from "./BookingModal";
import "./Home.css";
import heroMain from "../assets/hotel_main.png";
import roomSingle from "../assets/room_single.png";
import roomDouble from "../assets/room_double.png";
import roomSuite from "../assets/room_suite.png";


const ROOM_IMAGES = {
  "Single": roomSingle,
  "Double": roomDouble,
  "Suite": roomSuite,
  "Deluxe": roomDouble, // Fallback
  "Penthouse": roomSuite // Fallback
};

function Home() {
  const navigate = useNavigate();
  const location = useLocation();

  // --- Data Fetching ---
  const [rooms, setRooms] = useState([]);
  
  useEffect(() => {
    fetch("http://localhost:5000/api/rooms")
      .then(res => res.json())
      .then(data => setRooms(data))
      .catch(err => console.error("Error fetching rooms:", err));
  }, []);

  // Read login state from localStorage
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => localStorage.getItem("jv_logged_in") === "true"
  );
  const [showLogin, setShowLogin] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);

  // --- Login handlers ---
  const openLogin = () => setShowLogin(true);
  const closeLogin = () => setShowLogin(false);

  const handleLoginSuccess = () => {
    // jv_token is saved by LoginModal — just sync the UI flag
    localStorage.setItem("jv_logged_in", "true");
    setIsLoggedIn(true);
    setShowLogin(false);
  };

  const handleSignOut = () => {
    ["jv_token","jv_logged_in","jv_user_name","jv_user_email","jv_user_role","jv_member_since"]
      .forEach(k => localStorage.removeItem(k));
    setIsLoggedIn(false);
  };

  // --- Booking handlers ---
  const handleBookNow = (room) => {
    if (!room) return;
    if (isLoggedIn) {
      setSelectedRoom(room);
      setShowBooking(true);
    } else {
      setShowLogin(true);
    }
  };

  const closeBooking = () => {
    setShowBooking(false);
    setSelectedRoom(null);
  };

  // --- Dashboard navigation ---
  const goToDashboard = () => {
    if (isLoggedIn) {
      navigate("/dashboard");
    } else {
      setShowLogin(true);
    }
  };

  const handleNavClick = (path, event) => {
    const isHomeRoute = path === "/" || path === "/home";
    const isCurrentHome = isHomeRoute && (location.pathname === "/" || location.pathname === "/home");
    const isCurrentRoute = path === location.pathname;

    if (isCurrentHome || isCurrentRoute) {
      event.preventDefault();
      if (isCurrentHome) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }

    event.preventDefault();
    navigate(path);
  };

  // --- Group Rooms by Category ---
  const getRoomCategories = () => {
    const categories = {};
    rooms.forEach(room => {
      const type = room.type;
      if (!categories[type]) {
        categories[type] = {
          ...room,
          total: 0,
          available: 0,
          originalRooms: []
        };
      }
      categories[type].total += 1;
      if (room.status === "Available") {
        categories[type].available += 1;
        categories[type].originalRooms.push(room);
      }
    });
    // Ensure all 4 categories exist even if data is missing
    const order = ["Single", "Double", "Deluxe", "Suite"];
    return order.map(type => {
      if (categories[type]) return categories[type];
      // Fallback for empty categories
      return {
        type,
        total: 0,
        available: 0,
        description: `Premium ${type} experience with world-class amenities.`,
        price: type === "Single" ? 1500 : type === "Double" ? 2500 : type === "Deluxe" ? 3500 : 5000,
        capacity: type === "Single" ? 1 : type === "Double" ? 2 : type === "Deluxe" ? 3 : 4,
        featured: type === "Suite",
        originalRooms: []
      };
    });
  };

  const roomCategories = getRoomCategories();

  return (
    <div className="home">

      {/* Login Modal */}
      {showLogin && (
        <LoginModal onClose={closeLogin} onLoginSuccess={handleLoginSuccess} />
      )}

      {/* Booking Modal */}
      {showBooking && selectedRoom && (
        <BookingModal room={selectedRoom} onClose={closeBooking} />
      )}

      {/* Navbar */}
      <nav className="navbar">
        <div className="logo">
          <span style={{color: 'var(--accent)'}}>🏨</span> Prime Stay
        </div>
        <div className="nav-links">
          <a href="/" onClick={(e) => handleNavClick("/", e)}>Home</a>
          <a href="/rooms" onClick={(e) => handleNavClick("/rooms", e)}>Rooms</a>
          <a href="#amenities">Amenities</a>
          <a href="#reviews">Reviews</a>

          {isLoggedIn ? (
            <>
              {localStorage.getItem("jv_user_role") === "admin" && (
                <button className="my-account-btn" onClick={() => navigate("/admin")} style={{background:"var(--primary)", border: "1px solid var(--accent)"}}>Admin Panel</button>
              )}
              <button className="my-account-btn" onClick={goToDashboard}>My Account</button>
              <button className="signout-btn" onClick={handleSignOut}>Sign Out</button>
            </>
          ) : (
            <button onClick={openLogin}>Sign In</button>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="hero" id="home">
        <div className="hero-content">
          <span className="badge">✨ Experience the Pinnacle of Luxury</span>
          <h1>Your Sanctuary of <span className="highlight">Elegance</span> & Comfort</h1>
          <p>
            Immerse yourself in world-class hospitality where every detail is 
            crafted for your ultimate relaxation. Welcome to the city's finest escape.
          </p>
          <div className="hero-btns">
            <button className="primary-btn" onClick={() => navigate("/rooms")}>
              Explore Our Rooms <ArrowRight size={18} />
            </button>
          </div>
        </div>
        <div className="hero-image">
          <img src={heroMain} alt="Prime Stay Luxury Hotel" className="hotel-photo" />
        </div>
      </section>

      {/* Stats */}
      <section className="stats">
        <div className="container stats-grid">
          <div className="stat-item">
            <h3>500+</h3>
            <p>Elite Guests</p>
          </div>
          <div className="stat-item">
            <h3>30</h3>
            <p>Boutique Rooms</p>
          </div>
          <div className="stat-item">
            <h3>15+</h3>
            <p>Years of Service</p>
          </div>
          <div className="stat-item">
            <h3>4.9★</h3>
            <p>Guest Rating</p>
          </div>
        </div>
      </section>

      {/* Rooms */}
      <section className="rooms" id="rooms">
        <div className="container">
          <div className="section-header">
            <span className="section-badge">Our Rooms</span>
            <h2>Choose Your Perfect Room</h2>
            <p>Discover our range of luxury accommodations designed for your comfort.</p>
          </div>

          <div className="room-grid">
            {roomCategories.map((cat) => (
              <div className={`room-card${cat.featured ? " featured" : ""}`} key={cat.type}>
                {cat.featured && <div className="popular-tag">Most Popular</div>}
                <div className="room-image-container">
                  <div className="category-availability">
                    <span className={`status-dot ${cat.available > 0 ? "available" : "unavailable"}`}></span>
                    {cat.available} out of {cat.total} available
                  </div>
                  <img
                    src={cat.image && cat.image.trim() !== "" ? cat.image : (ROOM_IMAGES[cat.type] || roomSingle)}
                    alt={cat.type}
                    className="room-card-img"
                  />
                </div>
                <h3>{cat.type} Room</h3>
                <p>{cat.description}</p>
                <div className="room-capacity">👥 Capacity: {cat.capacity} Guest{cat.capacity > 1 ? "s" : ""}</div>
                
                <div className="room-footer">
                  <span className="price">
                    ₹{cat.price.toLocaleString("en-IN")}<small>/night</small>
                  </span>
                  <button 
                    onClick={() => handleBookNow(cat.originalRooms[0])}
                    disabled={cat.available === 0}
                    className={cat.available === 0 ? "sold-out-btn" : ""}
                  >
                    {cat.available > 0 ? "Book Now" : "Sold Out"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Amenities */}
      <section className="amenities" id="amenities">
        <div className="container">
          <div className="section-header">
            <span className="section-badge">Amenities</span>
            <h2>Everything You Need</h2>
            <p>We provide world-class facilities to make your stay unforgettable.</p>
          </div>
          <div className="amenity-grid">
            <div className="amenity-card">
              <span>🏊</span>
              <h4>Swimming Pool</h4>
              <p>Outdoor heated pool open 6am–10pm</p>
            </div>
            <div className="amenity-card">
              <span>🍽️</span>
              <h4>Restaurant</h4>
              <p>Multi-cuisine dining with live kitchen</p>
            </div>
            <div className="amenity-card">
              <span>💆</span>
              <h4>Spa & Wellness</h4>
              <p>Relaxing treatments and massages</p>
            </div>
            <div className="amenity-card">
              <span>🏋️</span>
              <h4>Fitness Center</h4>
              <p>24/7 equipped gym for guests</p>
            </div>
            <div className="amenity-card">
              <span>🚗</span>
              <h4>Free Parking</h4>
              <p>Secure underground parking facility</p>
            </div>
            <div className="amenity-card">
              <span>📶</span>
              <h4>High-Speed Wi-Fi</h4>
              <p>Complimentary internet throughout</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="reviews" id="reviews">
        <div className="container">
          <div className="section-header">
            <span className="section-badge">Guest Reviews</span>
            <h2>What Our Guests Say</h2>
          </div>
          <div className="review-grid">
            <div className="review-card">
              <div className="stars">★★★★★</div>
              <p>"Absolutely wonderful experience! The staff was incredibly warm and the rooms were spotless."</p>
              <div className="reviewer">
                <span className="avatar">👤</span>
                <div>
                  <strong>Rahul Sharma</strong>
                  <small>Mumbai</small>
                </div>
              </div>
            </div>
            <div className="review-card">
              <div className="stars">★★★★★</div>
              <p>"The Deluxe Room exceeded all expectations. The city view from the balcony was breathtaking!"</p>
              <div className="reviewer">
                <span className="avatar">👤</span>
                <div>
                  <strong>Priya Nair</strong>
                  <small>Bangalore</small>
                </div>
              </div>
            </div>
            <div className="review-card">
              <div className="stars">★★★★☆</div>
              <p>"Great location, amazing food at the restaurant, and very professional service throughout."</p>
              <div className="reviewer">
                <span className="avatar">👤</span>
                <div>
                  <strong>Arjun Patel</strong>
                  <small>Ahmedabad</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <div className="container cta-inner">
          <h2>Ready for an Unforgettable Stay?</h2>
          <p>Book today and enjoy exclusive member discounts on all room types.</p>
          <button className="primary-btn" style={{ margin: "0 auto" }} onClick={() => handleBookNow(rooms.find(r => r.status === "Available"))}>
            Book Now — Limited Availability
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container footer-grid">
          <div>
            <h4>🏨 Prime Stay</h4>
            <p>Luxury stays for every traveller. Your comfort is our priority.</p>
          </div>
          <div>
            <h4>Quick Links</h4>
            <a href="/">Home</a>
            <a href="/rooms" onClick={(e) => { e.preventDefault(); navigate("/rooms"); }}>Rooms</a>
            <a href="#amenities">Amenities</a>
            <a href="#reviews">Reviews</a>
          </div>
          <div>
            <h4>Prime Stay</h4>
            <p>📍 123 Villa Street, City</p>
            <p>📞 +91 98765 43210</p>
            <p>✉️ info@primestay.com</p>
          </div>
        </div>
        <div className="footer-bottom">
          © 2026 Prime Stay Hotel · All rights reserved · Privacy Policy
        </div>
      </footer>

    </div>
  );
}

export default Home;