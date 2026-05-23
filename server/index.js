const app = require('./app');
const env = require('./config/env');
const { connectMongoDB } = require('./config/db');

const startServer = async () => {
  try {
    // 1. Connect MongoDB Unstructured database
    await connectMongoDB();

    // 2. Bind HTTP Server listener
    app.listen(env.PORT, () => {
      console.log(`🚀 Campus Aggregator Engine active in [${env.NODE_ENV}] mode on http://localhost:${env.PORT}`);
    });
  } catch (error) {
    console.error('❌ Server startup critical failure:', error.message);
    process.exit(1);
  }
};

startServer();
