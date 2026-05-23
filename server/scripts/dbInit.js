const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const env = require('../config/env');

const initMySQL = async () => {
  console.log('⏳ Connecting to MySQL to initialize schema...');
  
  // 1. Establish base connection to ensure the database itself exists
  const baseConnection = await mysql.createConnection({
    host: env.MYSQL_HOST,
    user: env.MYSQL_USER,
    password: env.MYSQL_PASSWORD,
    port: env.MYSQL_PORT,
  });

  console.log(`Creating database \`${env.MYSQL_DATABASE}\` if not exists...`);
  await baseConnection.query(`CREATE DATABASE IF NOT EXISTS \`${env.MYSQL_DATABASE}\`;`);
  await baseConnection.end();
  console.log('Database verification finished.');

  // 2. Establish connection with database target and multipleStatements parameter enabled
  const dbConnection = await mysql.createConnection({
    host: env.MYSQL_HOST,
    user: env.MYSQL_USER,
    password: env.MYSQL_PASSWORD,
    database: env.MYSQL_DATABASE,
    port: env.MYSQL_PORT,
    multipleStatements: true,
  });

  const schemaPath = path.join(__dirname, '../models/mysql/schemas.sql');
  const ddlSql = fs.readFileSync(schemaPath, 'utf8');

  console.log('Running schemas.sql DDL script blocks...');
  await dbConnection.query(ddlSql);
  console.log('✅ Relational schema initialization complete!');
  
  await dbConnection.end();
};

initMySQL().then(() => {
  console.log('🎉 MySQL database is ready.');
}).catch(err => {
  console.error('❌ Failed to initialize MySQL schema:', err.message);
  process.exit(1);
});
