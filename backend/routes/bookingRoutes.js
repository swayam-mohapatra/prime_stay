const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { listBookings, createBooking, updateBooking, cancelBooking, getBookingStats, updateBookingPayment, verifyBooking } = require('../database');

// POST /api/bookings
router.post('/', verifyToken, async (req, res) => {
  try {
    const { roomType, checkIn, checkOut } = req.body;

    if (!roomType || !checkIn || !checkOut) {
      return res.status(400).json({ message: 'roomType, checkIn, and checkOut are required.' });
    }

    const savedBooking = await createBooking(req.body);
    res.status(201).json(savedBooking);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ message: err.message || 'Server error creating booking', error: err.message });
  }
});

// GET /api/bookings
router.get('/', verifyToken, async (req, res) => {
  try {
    const { customerId } = req.query;
    const bookings = await listBookings(customerId);
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching bookings', error: err.message });
  }
});

// PUT /api/bookings/:id
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { checkIn, checkOut, guests } = req.body;
    const bookingId = req.params.id;
    const updated = await updateBooking(bookingId, { checkIn, checkOut, guests });
    res.json(updated);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ message: err.message || 'Server error modifying booking', error: err.message });
  }
});

// PATCH /api/bookings/:id/cancel
router.patch('/:id/cancel', verifyToken, async (req, res) => {
  try {
    const booking = await cancelBooking(req.params.id);
    res.json(booking);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ message: err.message || 'Server error cancelling booking', error: err.message });
  }
});

// GET /api/bookings/stats
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const stats = await getBookingStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching stats', error: err.message });
  }
});

// PATCH /api/bookings/:id/payment
router.patch('/:id/payment', verifyToken, async (req, res) => {
  try {
    const { paymentProof } = req.body;
    const booking = await updateBookingPayment(req.params.id, paymentProof);
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: 'Error updating payment proof', error: err.message });
  }
});

// PATCH /api/bookings/:id/verify
router.patch('/:id/verify', verifyToken, async (req, res) => {
  try {
    const { paymentStatus } = req.body;
    const booking = await verifyBooking(req.params.id, paymentStatus);
    res.json(booking);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ message: err.message || 'Error verifying payment', error: err.message });
  }
});

module.exports = router;
