const express = require('express');
const router = express.Router();
const { listRooms, updateRoomStatus, updateRoom } = require('../database');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

// GET /api/rooms
router.get('/', async (req, res) => {
  try {
    const rooms = await listRooms();
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching rooms', error: err.message });
  }
});

// PATCH /api/rooms/:roomNumber/status
router.patch('/:roomNumber/status', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const room = await updateRoomStatus(req.params.roomNumber, status);
    if (!room) return res.status(404).json({ message: 'Room not found' });
    res.json(room);
  } catch (err) {
    res.status(500).json({ message: 'Server error updating room status', error: err.message });
  }
});

// PUT /api/rooms/:roomNumber
router.put('/:roomNumber', verifyToken, requireAdmin, async (req, res) => {
  try {
    const allowedFields = ['image', 'description', 'price', 'features', 'featured'];
    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const room = await updateRoom(req.params.roomNumber, updates);
    if (!room) return res.status(404).json({ message: 'Room not found' });
    res.json(room);
  } catch (err) {
    res.status(500).json({ message: 'Server error updating room', error: err.message });
  }
});

module.exports = router;
