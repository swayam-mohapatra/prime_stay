import React, { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar as CalendarIcon, Users, CreditCard, CheckCircle, Upload } from "lucide-react";
import "./BookingModal.css";

const getToken = () => localStorage.getItem("jv_token") || "";
const API = "http://localhost:5000";

function BookingModal({ room, onClose, existingBooking, mode = "new", onBookingUpdated }) {
  const [step, setStep] = useState(1); // 1: Dates, 2: Payment
  const [dateRange, setDateRange] = useState(
    mode === "edit" && existingBooking 
      ? [new Date(existingBooking.checkIn), new Date(existingBooking.checkOut)]
      : [new Date(), new Date(new Date().setDate(new Date().getDate() + 1))]
  );
  
  const [guests, setGuests] = useState(mode === "edit" ? existingBooking?.guests || 1 : 1);
  const [paymentFile, setPaymentFile] = useState(null);
  const [paymentPreview, setPaymentPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [bookingId, setBookingId] = useState("");

  const activeRoom = mode === "edit"
    ? { 
        type: existingBooking?.roomType, 
        icon: existingBooking?.roomIcon, 
        roomNumber: existingBooking?.roomId, 
        price: existingBooking ? Math.round(existingBooking.totalPrice / existingBooking.nights / 1.12) : 0 
      }
    : room;

  const checkIn = dateRange[0];
  const checkOut = dateRange[1];
  const nights = checkIn && checkOut ? Math.max(1, Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24))) : 0;
  const totalPrice = nights * (activeRoom?.price || 0);
  const finalTotal = Math.round(totalPrice * 1.12);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPaymentFile(file);
      setPaymentPreview(URL.createObjectURL(file));
    }
  };

  const handleBooking = async () => {
    setLoading(true);
    setError("");
    try {
      const token = getToken();
      
      // 1. Create/Update the booking
      let response;
      if (mode === "edit") {
        response = await fetch(`${API}/api/bookings/${existingBooking._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({ checkIn, checkOut, guests })
        });
      } else {
        response = await fetch(`${API}/api/bookings`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({
            customerId: localStorage.getItem("jv_user_email"),
            roomType: activeRoom.type,
            roomIcon: activeRoom.icon,
            checkIn,
            checkOut,
            guests,
            totalPrice: finalTotal,
            nights
          })
        });
      }

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Operation failed");

      // 2. If it's a new booking, proceed to Upload Payment Proof if available
      if (mode === "new") {
        setBookingId(data._id);
        if (paymentFile) {
          await uploadPaymentProof(data._id);
        }
      }

      setSuccess(true);
      if (onBookingUpdated) onBookingUpdated(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const uploadPaymentProof = async (id) => {
    if (!paymentFile) return;
    const formData = new FormData();
    formData.append("roomImage", paymentFile); // Reusing the same multer field

    const uploadRes = await fetch(`${API}/api/upload`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${getToken()}` },
      body: formData
    });
    const uploadData = await uploadRes.json();
    if (!uploadRes.ok) throw new Error("Payment proof upload failed");

    await fetch(`${API}/api/bookings/${id}/payment`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}` },
      body: JSON.stringify({ paymentProof: uploadData.imageUrl })
    });
    setSuccess(true);
  };

  const formatDate = (d) => d ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

  return (
    <div className="bm-overlay" onClick={onClose}>
      <motion.div 
        className="bm-card" 
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.9 }}
      >
        {!success ? (
          <>
            <div className="bm-header">
              <div className="bm-room-info">
                <span className="bm-room-icon">{activeRoom?.icon}</span>
                <div>
                  <h2>{mode === "edit" ? "Modify Booking" : `Experience ${activeRoom?.type}`}</h2>
                  <p className="bm-price-label">₹{activeRoom?.price?.toLocaleString("en-IN")}<span>/night</span></p>
                </div>
              </div>
              <button className="bm-close" onClick={onClose}><X size={20}/></button>
            </div>

            <div className="bm-stepper">
              <div className={`step ${step >= 1 ? "active" : ""}`}>1. Details</div>
              <div className={`step ${step >= 2 ? "active" : ""}`}>2. Payment</div>
            </div>

            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.div 
                  key="step1" 
                  className="bm-step-content"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <div className="calendar-wrapper">
                    <label className="field-label"><CalendarIcon size={14}/> Select Stay Dates</label>
                    <Calendar
                      onChange={setDateRange}
                      value={dateRange}
                      selectRange={true}
                      minDate={new Date()}
                      className="premium-calendar"
                    />
                  </div>

                  <div className="bm-details-row">
                    <div className="bm-field">
                      <label><Users size={14}/> Guests</label>
                      <select value={guests} onChange={(e) => setGuests(Number(e.target.value))}>
                        {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n} Guest{n > 1 ? "s" : ""}</option>)}
                      </select>
                    </div>
                    <div className="bm-summary-preview">
                      <span>{nights} Night{nights > 1 ? "s" : ""}</span>
                      <strong>₹{finalTotal.toLocaleString("en-IN")}</strong>
                    </div>
                  </div>

                  {error && <div className="bm-error">{error}</div>}

                  <button className="bm-confirm-btn" onClick={mode === "edit" ? handleBooking : () => setStep(2)} disabled={loading || nights < 1}>
                    {mode === "edit" ? (loading ? "Updating..." : "Update Booking") : "Proceed to Payment →"}
                  </button>
                </motion.div>
              ) : (
                <motion.div 
                  key="step2" 
                  className="bm-step-content"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <div className="payment-qr-section">
                    <div className="qr-box">
                      <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=JohnVillaPayment" alt="QR Code" />
                      <p>Scan to pay <strong>₹{finalTotal.toLocaleString("en-IN")}</strong></p>
                    </div>
                    
                    <div className="upload-section">
                      <label className="field-label"><Upload size={14}/> Upload Payment Screenshot</label>
                      <div className="upload-dropzone">
                        {paymentPreview ? (
                          <img src={paymentPreview} alt="Proof" className="proof-preview" />
                        ) : (
                          <div className="dropzone-placeholder">
                            <CreditCard size={32}/>
                            <p>Click to upload proof</p>
                          </div>
                        )}
                        <input type="file" onChange={handleFileSelect} accept="image/*" />
                      </div>
                    </div>
                  </div>

                  <div className="payment-notice">
                    ✅ Your booking is marked as paid and confirmed. You can still upload proof later if needed.
                  </div>

                  {error && <div className="bm-error">{error}</div>}

                  <div className="bm-actions">
                    <button className="bm-back-btn" onClick={() => setStep(1)}>← Back</button>
                    <button className="bm-confirm-btn" onClick={handleBooking} disabled={loading}>
                      {loading ? "Processing..." : (paymentFile ? "Complete Booking ✓" : "Skip & Book ✓")}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          <motion.div 
            className="bm-success"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <CheckCircle size={64} color="var(--accent)"/>
            <h2>Booking Submitted!</h2>
            <div className="bm-success-details">
              <p>Booking ID: <strong>#{bookingId?.slice(-6).toUpperCase()}</strong></p>
              <p>Dates: <strong>{formatDate(checkIn)} - {formatDate(checkOut)}</strong></p>
              <p>Room: <strong>{activeRoom.type} Room</strong></p>
            </div>
            <p className="success-note">Your payment is being verified. You can track the status in your dashboard.</p>
            <button className="bm-confirm-btn" onClick={onClose}>Done</button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

export default BookingModal;
