const mysql = require('mysql2/promise');
const mongoose = require('mongoose');
const env = require('./env');

console.log('🔌 Initializing Database Connections...');

// Create MySQL connection pool
const mysqlPool = mysql.createPool({
  host: env.MYSQL_HOST,
  user: env.MYSQL_USER,
  password: env.MYSQL_PASSWORD,
  database: env.MYSQL_DATABASE,
  port: env.MYSQL_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// MongoDB Connection logic
const connectMongoDB = async () => {
  try {
    await mongoose.connect(env.MONGO_URI);
    console.log('💚 Connected to MongoDB successfully.');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    throw error;
  }
};

module.exports = {
  mysqlPool,
  connectMongoDB,
  mongoose,
};
