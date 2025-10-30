// Quick test script to verify backend routes
const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function testBackend() {
  console.log('🧪 Testing Backend Routes\n');
  
  try {
    // Test 1: Health check
    console.log('1. Testing health endpoint...');
    const health = await axios.get(`${BASE_URL}/health`);
    console.log('✓ Health check passed:', health.data.message);
    
    // Test 2: Login endpoint exists (will fail auth, but shouldn't 404)
    console.log('\n2. Testing login endpoint...');
    try {
      await axios.post(`${BASE_URL}/auth/login`, {
        email: 'wrong@example.com',
        password: 'wrong'
      });
    } catch (err) {
      if (err.response && err.response.status === 401) {
        console.log('✓ Login endpoint exists (got expected 401 auth error)');
      } else if (err.response && err.response.status === 404) {
        console.log('❌ Login endpoint NOT FOUND (404)');
      } else {
        console.log('✓ Login endpoint exists (got error:', err.response?.status || 'unknown', ')');
      }
    }
    
    // Test 3: Register endpoint exists
    console.log('\n3. Testing register endpoint...');
    try {
      await axios.post(`${BASE_URL}/auth/register`, {
        email: 'test@test.com',
        password: 'test'
      });
      console.log('✓ Register endpoint exists');
    } catch (err) {
      if (err.response && err.response.status === 404) {
        console.log('❌ Register endpoint NOT FOUND (404)');
      } else {
        console.log('✓ Register endpoint exists (got error:', err.response?.status || 'unknown', ')');
      }
    }
    
    console.log('\n✅ Backend test complete!');
    
  } catch (error) {
    console.error('\n❌ Backend test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\n⚠️  Backend is not running! Start it with: npm start');
    }
  }
}

testBackend();