import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables - explicitly specify path
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

// Get connection parameters
const dbConfig = {
  host: process.env.DB_HOST || process.env.PGHOST || 'localhost',
  port: parseInt(process.env.DB_PORT || process.env.PGPORT || '5432'),
  user: process.env.DB_USER || process.env.PGUSER || 'postgres',
  password: process.env.DB_PASSWORD || process.env.PGPASSWORD || '',
  database: process.env.DB_NAME || process.env.PGDATABASE || 'ielts',
};

// Debug: Log connection parameters (without password)
console.log('Database connection config:', {
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user,
  database: dbConfig.database,
  password: dbConfig.password ? '***' : '(empty)',
  envFile: envPath,
});

// Create PostgreSQL connection pool
const pool = new Pool({
  ...dbConfig,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection could not be established
  // SSL configuration for cloud databases (required for Aiven, AWS RDS, etc.)
  ssl: process.env.DB_SSL === 'false' || process.env.DB_SSL === '0'
    ? false
    : {
        // Enable SSL for cloud databases (Aiven requires SSL)
        rejectUnauthorized: false,
      },
});

// Handle pool errors
pool.on('error', (err: Error) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Test the connection
pool.connect()
  .then((client) => {
    console.log('✅ Database connected successfully');
    client.release();
  })
  .catch((err: Error) => {
    console.error('❌ Database connection error:', err);
    console.error('\nTroubleshooting tips:');
    console.error('1. Check if PostgreSQL is running');
    console.error('2. Verify .env file exists at:', envPath);
    console.error('3. Check DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME in .env');
    console.error('4. Ensure database "' + dbConfig.database + '" exists');
    console.error('5. Check firewall/network settings');
    // Don't exit - let the app continue (connection will be retried on actual queries)
  });

export default pool;