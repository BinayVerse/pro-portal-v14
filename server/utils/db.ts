import pkg from "pg";
const { Pool } = pkg;

const config = useRuntimeConfig();

const pool = new Pool({
  host: config.dbHost,
  port: parseInt(config.dbPort || "5432"),
  database: config.dbName,
  user: config.dbUser,
  password: config.dbPassword,
  // Enhanced pool configuration for better concurrency handling
  max: 30, // Increased maximum number of clients in the pool
  min: 5, // Increased minimum number of clients in the pool
  idleTimeoutMillis: 60000, // Keep idle clients longer (60 seconds)
  connectionTimeoutMillis: 15000, // Increased timeout to 15 seconds
  acquireTimeoutMillis: 20000, // Time to wait for a connection
  createTimeoutMillis: 10000, // Time to wait when creating a new client
  createRetryIntervalMillis: 200, // Retry interval for creating connections
  reapIntervalMillis: 1000, // How often to check for idle connections
  allowExitOnIdle: false, // Don't exit process when pool is idle
  statement_timeout: 30000, // Statement timeout (30 seconds)
  query_timeout: 25000, // Query timeout (25 seconds)
  application_name: 'provento_app', // Application name for monitoring
});

// Handle pool errors
pool.on('error', (err) => {
  process.exit(-1)
})

export async function query(text: string, params: any) {
  let client
  try {
    client = await pool.connect()
    const result = await client.query(text, params);
    return result;
  } catch (error: any) {
    // Provide more specific error messages
    if (error.code === 'ECONNREFUSED') {
      throw new Error("Database connection refused - check if database is running");
    } else if (error.code === 'ENOTFOUND') {
      throw new Error("Database host not found - check database configuration");
    } else if (error.code === '28P01') {
      throw new Error("Database authentication failed - check credentials");
    } else if (error.code === '3D000') {
      throw new Error("Database does not exist - check database name");
    } else {
      throw new Error("Database query failed");
    }
  } finally {
    // Release the client back to the pool
    if (client) {
      client.release()
    }
  }
}

export async function getClient() {
  try {
    const client = await pool.connect();
    return client;
  } catch (error) {
    throw new Error('Database client connection failed');
  }
}

// Test database connection
export async function testConnection() {
  try {
    const result = await query('SELECT 1 as test', [])
    return true
  } catch (error: any) {
    return false
  }
}
