const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.Mixed, required: true },
  roomId: { type: mongoose.Schema.Types.Mixed, required: true },
  checkIn: { type: Date, required: true },
  checkOut: { type: Date, required: true },
  totalPrice: { type: Number, required: true },
  guests: { type: Number, required: true },
  status: {
    type: String,
    enum: ['Confirmed', 'Cancelled', 'Pending Payment', 'Completed'],
    default: 'Confirmed'
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Verified', 'Declined', 'Paid'],
    default: 'Paid'
  },
  paymentProof: { type: String, default: '' },
  nights: { type: Number },
  roomType: { type: String },
  roomIcon: { type: String },
  bookedOn: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', bookingSchema);
