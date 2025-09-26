// recruitment-backend/data/database.js
const { Pool } = require('pg');
require('dotenv').config();

// Create connection pool
const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT,
  database: process.env.POSTGRES_DATABASE,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: {
    rejectUnauthorized: false
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

class Database {
  // Test connection
  async testConnection() {
    try {
      const result = await pool.query('SELECT NOW()');
      console.log('✅ Database connected:', result.rows[0].now);
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      return false;
    }
  }

  // Find one record
  async findOne(table, conditions = {}) {
    const keys = Object.keys(conditions);
    const values = Object.values(conditions);
    
    let query = `SELECT * FROM ${table}`;
    if (keys.length > 0) {
      const whereClause = keys.map((key, i) => `${key} = $${i + 1}`).join(' AND ');
      query += ` WHERE ${whereClause}`;
    }
    query += ' LIMIT 1';
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      console.error(`Error finding ${table}:`, error.message);
      return null;
    }
  }

  // Find multiple records
  async find(table, conditions = {}, options = {}) {
    const keys = Object.keys(conditions);
    const values = Object.values(conditions);
    
    let query = `SELECT * FROM ${table}`;
    if (keys.length > 0) {
      const whereClause = keys.map((key, i) => `${key} = $${i + 1}`).join(' AND ');
      query += ` WHERE ${whereClause}`;
    }
    
    if (options.orderBy) query += ` ORDER BY ${options.orderBy}`;
    if (options.limit) query += ` LIMIT ${options.limit}`;
    
    try {
      const result = await pool.query(query, values);
      return result.rows;
    } catch (error) {
      console.error(`Error finding ${table}:`, error.message);
      return [];
    }
  }

  // Insert record
  async insert(table, data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    
    const query = `
      INSERT INTO ${table} (${keys.join(', ')})
      VALUES (${placeholders})
      RETURNING id
    `;
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0].id;
    } catch (error) {
      console.error(`Error inserting into ${table}:`, error.message);
      throw error;
    }
  }

  // Update record
  async update(table, data, conditions) {
    const dataKeys = Object.keys(data);
    const dataValues = Object.values(data);
    const condKeys = Object.keys(conditions);
    const condValues = Object.values(conditions);
    
    const setClause = dataKeys.map((key, i) => `${key} = $${i + 1}`).join(', ');
    const whereClause = condKeys.map((key, i) => `${key} = $${dataKeys.length + i + 1}`).join(' AND ');
    
    const query = `
      UPDATE ${table}
      SET ${setClause}
      WHERE ${whereClause}
      RETURNING *
    `;
    
    try {
      const result = await pool.query(query, [...dataValues, ...condValues]);
      return result.rows[0];
    } catch (error) {
      console.error(`Error updating ${table}:`, error.message);
      throw error;
    }
  }

  // Delete record
  async delete(table, conditions) {
    const keys = Object.keys(conditions);
    const values = Object.values(conditions);
    const whereClause = keys.map((key, i) => `${key} = $${i + 1}`).join(' AND ');
    
    const query = `DELETE FROM ${table} WHERE ${whereClause} RETURNING id`;
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0]?.id;
    } catch (error) {
      console.error(`Error deleting from ${table}:`, error.message);
      throw error;
    }
  }

  // Count records
  async count(table, conditions = {}) {
    const keys = Object.keys(conditions);
    const values = Object.values(conditions);
    
    let query = `SELECT COUNT(*)::int as count FROM ${table}`;
    if (keys.length > 0) {
      const whereClause = keys.map((key, i) => `${key} = $${i + 1}`).join(' AND ');
      query += ` WHERE ${whereClause}`;
    }
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0].count;
    } catch (error) {
      console.error(`Error counting ${table}:`, error.message);
      return 0;
    }
  }

  // Check existence
  async exists(table, conditions) {
    const count = await this.count(table, conditions);
    return count > 0;
  }

  // Execute raw query
  async query(text, params = []) {
    try {
      const result = await pool.query(text, params);
      return result.rows;
    } catch (error) {
      console.error('Query error:', error.message);
      throw error;
    }
  }

  // Transaction support
  async transaction(callback) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Bulk insert
  async bulkInsert(table, rows) {
    if (!rows.length) return [];
    
    const keys = Object.keys(rows[0]);
    const values = [];
    const placeholders = [];
    
    rows.forEach((row, i) => {
      const rowPlaceholders = keys.map((_, j) => `$${i * keys.length + j + 1}`);
      placeholders.push(`(${rowPlaceholders.join(', ')})`);
      values.push(...Object.values(row));
    });
    
    const query = `
      INSERT INTO ${table} (${keys.join(', ')})
      VALUES ${placeholders.join(', ')}
      RETURNING id
    `;
    
    try {
      const result = await pool.query(query, values);
      return result.rows.map(r => r.id);
    } catch (error) {
      console.error(`Error bulk inserting into ${table}:`, error.message);
      throw error;
    }
  }

  // Close pool
  async close() {
    await pool.end();
  }
}

module.exports = new Database();