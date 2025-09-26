// recruitment-backend/tests/testDbConnection.js
const db = require('../recruitment-backend/data/database');

async function test() {
  console.log('\n🔍 Testing Database Connection\n');
  console.log('='.repeat(50));
  
  try {
    // Test 1: Connection
    console.log('Test 1: Connection');
    const connected = await db.testConnection();
    if (!connected) throw new Error('Connection failed');
    
    // Test 2: Find candidate
    console.log('\nTest 2: Find candidate');
    const candidate = await db.findOne('candidate', { email: 'john.doe@email.com' });
    console.log('Found:', candidate?.name || 'Not found');
    
    // Test 3: Count
    console.log('\nTest 3: Count candidates');
    const count = await db.count('candidate');
    console.log('Total candidates:', count);
    
    // Test 4: Raw query
    console.log('\nTest 4: Raw query');
    const result = await db.query(
      'SELECT COUNT(*) as count FROM candidate_activities WHERE candidate_id = $1',
      [candidate?.id || 1]
    );
    console.log('Activities:', result[0]?.count || 0);
    
    console.log('\n✅ All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await db.close();
  }
}

test();