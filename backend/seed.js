require('dotenv').config();
const { connectDatabase, seedDatabase } = require('./database');

async function runSeed() {
  try {
    await connectDatabase();
    await seedDatabase();
    console.log('🎉 Database Seeding Complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

runSeed();
