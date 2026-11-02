const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Room = require('./models/Room');
const Booking = require('./models/Booking');

function overlap(startA, endA, startB, endB) {
  return new Date(startA) < new Date(endB) && new Date(endA) > new Date(startB);
}

function normalizeEmail(email) {
  return (email || '').trim().toLowerCase();
}

function normalizeRole(role) {
  const value = (role || 'customer').toString().trim().toLowerCase();
  return value === 'admin' ? 'admin' : 'customer';
}

async function connectDatabase() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hotel_managment';
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
    autoIndex: true
  });
  console.log(`✅ Connected to MongoDB at ${uri}`);
  return mongoose.connection;
}

async function seedDatabase() {
  const adminEmail = normalizeEmail(process.env.ADMIN_EMAIL || 'admin@johnvilla.com');
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const adminUser = await User.findOne({ email: adminEmail });
  if (!adminUser) {
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    await User.create({
      name: 'Hotel Admin',
      email: adminEmail,
      password: hashedPassword,
      role: 'admin',
      memberSince: '2026'
    });
    console.log(`✅ Admin user created (${adminEmail} / ${adminPassword})`);
  }

  const roomCount = await Room.countDocuments();
  if (roomCount === 0) {
    const roomTypes = [
      { type: 'Single', price: 1500, capacity: 1, icon: '🛏️', desc: 'Cozy single room with all essential amenities.' },
      { type: 'Double', price: 2500, capacity: 2, icon: '🛎️', desc: 'Spacious double room with premium furnishings.' },
      { type: 'Deluxe', price: 3500, capacity: 3, icon: '✨', desc: 'Enhanced comfort with premium features.' },
      { type: 'Suite', price: 5000, capacity: 4, icon: '👑', desc: 'Grand suite with luxury lounge and city views.' }
    ];

    const generatedRooms = [];
    for (let i = 1; i <= 30; i++) {
      const floor = Math.floor((i - 1) / 10) + 1;
      const roomNumInFloor = (i - 1) % 10 + 1;
      const roomNumber = `${floor}${roomNumInFloor < 10 ? '0' : ''}${roomNumInFloor}`;
      const typeInfo = roomTypes[(i - 1) % roomTypes.length];

      generatedRooms.push({
        roomNumber,
        type: typeInfo.type,
        price: typeInfo.price,
        capacity: typeInfo.capacity,
        description: typeInfo.desc,
        status: 'Available',
        icon: typeInfo.icon,
        featured: i % 7 === 0,
        features: ['Free Wi-Fi', 'Air Conditioning', 'Flat Screen TV', 'Room Service'],
        image: ''
      });
    }

    await Room.insertMany(generatedRooms);
    console.log('✅ 30 hotel rooms seeded');
  }

  console.log('✅ Booking collection ready');
}

async function findUserByEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  return User.findOne({
    $or: [
      { email: normalizedEmail },
      { email: { $regex: `^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } }
    ]
  });
}

async function createUser(userData) {
  const newUser = await User.create({
    ...userData,
    email: normalizeEmail(userData.email),
    role: normalizeRole(userData.role),
    memberSince: userData.memberSince || new Date().getFullYear().toString()
  });
  return newUser;
}

async function listUsers() {
  const users = await User.find({}).select('-password');
  return users;
}

async function listRooms() {
  return Room.find({}).sort({ roomNumber: 1 });
}

async function updateRoomStatus(roomNumber, status) {
  return Room.findOneAndUpdate({ roomNumber }, { status }, { new: true });
}

async function updateRoom(roomNumber, updates) {
  return Room.findOneAndUpdate({ roomNumber }, updates, { new: true });
}

async function listBookings(customerId) {
  const filter = customerId
    ? { $or: [{ customerId }, { userId: customerId }] }
    : {};
  return Booking.find(filter).sort({ bookedOn: -1 });
}

async function createBooking(payload) {
  const candidateRooms = await Room.find({ type: payload.roomType, status: 'Available' });
  if (candidateRooms.length === 0) {
    const error = new Error(`No ${payload.roomType} rooms are currently available.`);
    error.statusCode = 409;
    throw error;
  }

  let assignedRoom = null;
  for (const room of candidateRooms) {
    const conflict = await Booking.findOne({
      roomId: room.roomNumber,
      status: { $in: ['Confirmed', 'Pending Payment', 'Completed'] },
      checkIn: { $lt: new Date(payload.checkOut) },
      checkOut: { $gt: new Date(payload.checkIn) }
    });
    if (!conflict) {
      assignedRoom = room;
      break;
    }
  }

  if (!assignedRoom) {
    const error = new Error(`All ${payload.roomType} rooms are fully booked for these dates. Please try different dates.`);
    error.statusCode = 409;
    throw error;
  }

  const booking = await Booking.create({
    customerId: payload.customerId || '',
    roomId: assignedRoom.roomNumber,
    roomType: assignedRoom.type,
    roomIcon: assignedRoom.icon || payload.roomIcon || '',
    checkIn: payload.checkIn,
    checkOut: payload.checkOut,
    guests: Number(payload.guests || 1),
    totalPrice: Number(payload.totalPrice || 0),
    nights: Number(payload.nights || 1),
    status: 'Confirmed',
    paymentStatus: 'Paid',
    paymentProof: '',
    bookedOn: new Date()
  });

  await Room.findOneAndUpdate({ roomNumber: assignedRoom.roomNumber }, { status: 'Booked' });
  return booking;
}

async function updateBooking(bookingId, updates) {
  const existing = await Booking.findById(bookingId);
  if (!existing) {
    const error = new Error('Booking not found.');
    error.statusCode = 404;
    throw error;
  }

  const conflict = await Booking.findOne({
    _id: { $ne: bookingId },
    roomId: existing.roomId,
    status: { $in: ['Confirmed', 'Pending Payment', 'Completed'] },
    checkIn: { $lt: new Date(updates.checkOut) },
    checkOut: { $gt: new Date(updates.checkIn) }
  });

  if (conflict) {
    const error = new Error('Room is already booked for those dates. Please choose different dates.');
    error.statusCode = 409;
    throw error;
  }

  const nights = Math.max(1, Math.ceil((new Date(updates.checkOut) - new Date(updates.checkIn)) / (1000 * 60 * 60 * 24)));
  const totalPrice = Math.round((nights * existing.totalPrice) / (existing.nights || nights));

  return Booking.findByIdAndUpdate(
    bookingId,
    {
      checkIn: updates.checkIn,
      checkOut: updates.checkOut,
      guests: Number(updates.guests),
      nights,
      totalPrice,
      paymentStatus: 'Paid'
    },
    { new: true }
  );
}

async function cancelBooking(bookingId) {
  return Booking.findByIdAndUpdate(bookingId, { status: 'Cancelled', paymentStatus: 'Paid' }, { new: true });
}

async function getBookingStats() {
  const allBookings = await Booking.find({ status: { $ne: 'Cancelled' } });
  const allRooms = await Room.find();

  const totalRevenue = allBookings.reduce((sum, booking) => sum + (booking.totalPrice || 0), 0);
  const monthlyRevenue = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthLabel = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear();
    const month = date.getMonth();

    const rev = allBookings
      .filter((booking) => {
        const bookedOn = new Date(booking.bookedOn);
        return bookedOn.getMonth() === month && bookedOn.getFullYear() === year;
      })
      .reduce((sum, booking) => sum + (booking.totalPrice || 0), 0);

    monthlyRevenue.push({ name: monthLabel, revenue: rev });
  }

  const occupiedCount = allRooms.filter((room) => room.status === 'Booked').length;
  const maintenanceCount = allRooms.filter((room) => room.status === 'Maintenance').length;
  const availableCount = allRooms.length - occupiedCount - maintenanceCount;

  const roomTypeStats = {};
  allBookings.forEach((booking) => {
    roomTypeStats[booking.roomType] = (roomTypeStats[booking.roomType] || 0) + 1;
  });

  return {
    totalRevenue,
    monthlyRevenue,
    occupancy: [
      { name: 'Available', value: availableCount },
      { name: 'Occupied', value: occupiedCount },
      { name: 'Maintenance', value: maintenanceCount }
    ],
    popularity: Object.entries(roomTypeStats).map(([name, value]) => ({ name, value }))
  };
}

async function updateBookingPayment(bookingId, paymentProof) {
  return Booking.findByIdAndUpdate(
    bookingId,
    { paymentProof, paymentStatus: 'Paid', status: 'Confirmed' },
    { new: true }
  );
}

async function verifyBooking(bookingId, paymentStatus) {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    const error = new Error('Booking not found.');
    error.statusCode = 404;
    throw error;
  }

  const updated = await Booking.findByIdAndUpdate(
    bookingId,
    { paymentStatus: 'Paid', status: 'Confirmed' },
    { new: true }
  );

  await Room.findOneAndUpdate({ roomNumber: booking.roomId }, { status: 'Booked' });
  return updated;
}

module.exports = {
  connectDatabase,
  seedDatabase,
  findUserByEmail,
  createUser,
  listUsers,
  listRooms,
  updateRoomStatus,
  updateRoom,
  listBookings,
  createBooking,
  updateBooking,
  cancelBooking,
  getBookingStats,
  updateBookingPayment,
  verifyBooking
};