// test-postgres-connection.js
const { Client } = require('pg');
require('dotenv').config();

async function testConnection() {
  const client = new Client({
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    database: process.env.POSTGRES_DATABASE,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    ssl: {
      rejectUnauthorized: false // Required for Azure PostgreSQL
    }
  });

  try {
    console.log('🔌 Connecting to Azure PostgreSQL...');
    console.log(`   Host: ${process.env.POSTGRES_HOST}`);
    console.log(`   Database: ${process.env.POSTGRES_DATABASE}`);
    console.log(`   User: ${process.env.POSTGRES_USER}`);
    
    await client.connect();
    console.log('✅ Connected successfully!\n');
    
    // Test query
    const result = await client.query('SELECT version()');
    console.log('PostgreSQL Version:', result.rows[0].version);
    
    // Check current database
    const dbResult = await client.query('SELECT current_database()');
    console.log('Current Database:', dbResult.rows[0].current_database);
    
    // List existing tables (if any)
    const tables = await client.query(`
      SELECT tablename 
      FROM pg_catalog.pg_tables 
      WHERE schemaname = 'public'
    `);
    
    if (tables.rows.length > 0) {
      console.log('\nExisting tables:');
      tables.rows.forEach(row => console.log(`  - ${row.tablename}`));
    } else {
      console.log('\n⚠️  No tables found - database is empty (ready for schema creation)');
    }
    
  } catch (error) {
    console.error('❌ Connection failed!');
    console.error('Error:', error.message);
    
    if (error.message.includes('password')) {
      console.error('\n💡 Check your password in .env file');
    } else if (error.message.includes('does not exist')) {
      console.error('\n💡 Database might not exist or user lacks permission');
    } else if (error.message.includes('ENOTFOUND')) {
      console.error('\n💡 Check your hostname - might be a typo');
    }
    
  } finally {
    await client.end();
    console.log('\n👋 Connection closed');
  }
}

testConnection();