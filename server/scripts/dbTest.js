const { mysqlPool, connectMongoDB, mongoose } = require('../config/db');

const testConnections = async () => {
  console.log('🧪 Starting database connectivity tests...\n');
  
  let mysqlSuccess = false;
  let mongoSuccess = false;

  // 1. Test MySQL connection pool
  try {
    console.log('📡 Testing MySQL Connection Pool...');
    const [rows] = await mysqlPool.query('SELECT 1 + 1 AS result');
    if (rows && rows[0].result === 2) {
      console.log('🟢 [SUCCESS] MySQL connection verified. (SELECT 1+1 returned 2)');
      
      // Query created tables to verify schema
      const [tables] = await mysqlPool.query('SHOW TABLES');
      console.log(`📦 Found ${tables.length} tables in MySQL:`);
      tables.forEach(t => console.log(`   - ${Object.values(t)[0]}`));
      mysqlSuccess = true;
    }
  } catch (error) {
    console.error('🔴 [FAIL] MySQL connection test failed!');
    console.error(`   Error message: ${error.message}\n`);
  }

  // 2. Test MongoDB connection
  try {
    console.log('\n📡 Testing MongoDB Connection...');
    await connectMongoDB();
    if (mongoose.connection.readyState === 1) {
      console.log('🟢 [SUCCESS] MongoDB connection verified. (readyState = 1/Connected)');
      mongoSuccess = true;
    }
  } catch (error) {
    console.error('🔴 [FAIL] MongoDB connection test failed!');
    console.error(`   Error message: ${error.message}\n`);
  }

  console.log('\n=============================================');
  if (mysqlSuccess && mongoSuccess) {
    console.log('🎉 [PASS] All database connections are fully active and verified!');
    process.exit(0);
  } else {
    console.error('❌ [FAIL] Database verification failed! Check details above.');
    process.exit(1);
  }
};

testConnections();
