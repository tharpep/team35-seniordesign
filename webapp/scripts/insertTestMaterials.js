const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

// Create axios instance to preserve cookies
const client = axios.create({
  baseURL: API_BASE,
  withCredentials: true
});

let sessionCookie = null;

const testMaterials = [
  {
    session_id: 1,
    type: 'flashcard',
    title: 'Alkene Reactions',
    content: JSON.stringify({
      question: 'What is the major product of hydrobromination of 2-methylpropene?',
      answer: '2-bromo-2-methylpropane (Markovnikov addition)'
    })
  },
  {
    session_id: 1,
    type: 'summary',
    title: 'Stereochemistry Principles',
    content: 'Covers chirality, optical activity, and R/S nomenclature.'
  },
  {
    session_id: 1,
    type: 'flashcard',
    title: 'Elimination vs Substitution',
    content: JSON.stringify({
      question: 'When does E2 elimination occur preferentially over SN2?',
      answer: 'With bulky bases and secondary/tertiary substrates'
    })
  },
  {
    session_id: 2,
    type: 'equation',
    title: 'Integration by Parts',
    content: JSON.stringify({
      formula: '∫u dv = uv - ∫v du'
    })
  }
];

async function insertMaterials() {
  console.log('Inserting materials via API...\n');

  // Login to get session cookie
  try {
    const loginResponse = await client.post('/auth/login', {
      email: 'test@example.com',
      password: 'password'
    });
    
    // Extract session cookie from response
    const cookies = loginResponse.headers['set-cookie'];
    if (cookies) {
      sessionCookie = cookies[0].split(';')[0];
      console.log('✓ Logged in\n');
    } else {
      console.error('No session cookie received');
      return;
    }
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    return;
  }

  // Insert each material with session cookie
  for (const material of testMaterials) {
    try {
      const response = await client.post('/materials', material, {
        headers: {
          'Cookie': sessionCookie
        }
      });
      console.log(`✓ Created [${material.type}] ${material.title} (Session ${material.session_id})`);
    } catch (error) {
      console.error(`✗ Failed to create ${material.title}:`, error.response?.data?.message || error.message);
    }
  }

  console.log('\n✓ Done!');
}

insertMaterials();