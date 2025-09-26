// recruitment-backend/utils/azurePostgres.js
const { Pool } = require('pg');
require('dotenv').config();

class AzurePostgresDB {
  constructor() {
    this.pool = null;
  }

  async connect() {
    if (this.pool) {
      return this.pool; // Already connected
    }

    this.pool = new Pool({
      host: process.env.POSTGRES_HOST || 'developement-storage-q360.postgres.database.azure.com',
      port: process.env.POSTGRES_PORT || 5432,
      database: process.env.POSTGRES_DATABASE || 'dev',
      user: process.env.POSTGRES_USER || 'devteam',
      password: process.env.POSTGRES_PASSWORD,
      ssl: {
        rejectUnauthorized: false
      },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    // Test connection
    try {
      const client = await this.pool.connect();
      console.log('✅ Connected to Azure PostgreSQL (dev database)');
      client.release();
      return this.pool;
    } catch (error) {
      console.error('❌ Connection failed:', error.message);
      throw error;
    }
  }

  // Query wrapper with logging
  async query(text, params) {
    try {
      const result = await this.pool.query(text, params);
      return result;
    } catch (error) {
      console.error('Query failed:', text);
      console.error('Error:', error.message);
      throw error;
    }
  }

  // Your helper methods
  async get(query, params = []) {
    const result = await this.query(query, params);
    return result.rows[0];
  }

  async all(query, params = []) {
    const result = await this.query(query, params);
    return result.rows;
  }

  async run(query, params = []) {
    const result = await this.query(query, params);
    return {
      id: result.rows[0]?.id,
      changes: result.rowCount
    };
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      console.log('Connection pool closed');
    }
  }
}

module.exports = new AzurePostgresDB();