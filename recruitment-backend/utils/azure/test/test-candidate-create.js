// test-candidate-postgres.js
require('dotenv').config();
process.env.USE_POSTGRES = 'true'; // Force PostgreSQL

const database = require('../../../utils/database-selector');

async function testCreateCandidate() {
  try {
    // Connect
    await database.connect();
    console.log('Connected to PostgreSQL');
    
    // Create test candidate
    const testCandidate = {
      name: 'Test Candidate PostgreSQL',
      email: `test_${Date.now()}@example.com`,
      phone: '123-456-7890',
      skills: ['Java', 'Spring', 'PostgreSQL'],
      visa_status: 'H1B',
      created_by: 'test_script'
    };
    
    const result = await database.createCandidate(testCandidate);
    console.log('✅ Candidate created with ID:', result.id);
    
    // Check if it exists
    const candidate = await database.getCandidateById(result.id);
    console.log('✅ Candidate retrieved:', candidate.name);
    
    console.log('\n🎯 PostgreSQL is working! Now check Azure Search...');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await database.close();
  }
}

testCreateCandidate();