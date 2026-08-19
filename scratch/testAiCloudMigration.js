import http from 'http';
import { connectDB } from '../backend/config/database.js';
import { seedAdmin } from '../backend/scripts/seedAdmin.js';
import { User } from '../backend/models/User.js';
import { Customer } from '../backend/models/Customer.js';

function makeRequest(options, body = null, cookieHeader = null) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (cookieHeader) headers['Cookie'] = cookieHeader;

    const req = http.request({ ...options, headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const cookies = res.headers['set-cookie'] || [];
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, cookies, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, cookies, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testAiCloudEndpoints() {
  console.log('\n====================================================');
  console.log('🧪 QuickR — Qwen Cloud AI Endpoints Audit & Test');
  console.log('====================================================\n');

  const port = process.env.PORT || 53211;
  await connectDB();
  await seedAdmin();

  // Get admin cookie
  const loginRes = await makeRequest({
    hostname: '127.0.0.1', port, path: '/api/auth/login', method: 'POST'
  }, { email: 'admin@quickr.com', password: 'admin123' });

  if (loginRes.status !== 200) {
    console.error('❌ Admin login failed');
    process.exit(1);
  }

  const rawCookies = loginRes.cookies || [];
  const setCookieHeader = rawCookies.find(c => c.startsWith('token='));
  const cookieValue = setCookieHeader ? setCookieHeader.split(';')[0] : '';
  const token = cookieValue.split('=')[1] || '';

  console.log('1. Testing missing QWEN_API_KEY error handling...');
  delete process.env.QWEN_API_KEY;

  const followupRes = await makeRequest({
    hostname: '127.0.0.1', port, path: '/api/ai/followup-message', method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  }, { customerName: 'Test Vendor', productName: 'Denim Jacket' }, cookieValue);

  console.log(`   - Status: ${followupRes.status} (Expected: 503)`);
  console.log(`   - Response error: "${followupRes.body.error}"`);
  if (followupRes.status === 503 && followupRes.body.error?.includes('QWEN_API_KEY')) {
    console.log('   ✅ Correctly returned 503 Service Unavailable when API key is missing!\n');
  } else {
    console.error('   ❌ Failed missing API key test:', followupRes.body);
    process.exit(1);
  }

  console.log('2. Testing Mock Qwen Cloud API key...');
  process.env.QWEN_API_KEY = 'sk-mock-test-key';

  const trendsRes = await makeRequest({
    hostname: '127.0.0.1', port, path: '/api/ai/trends', method: 'POST'
  }, {}, cookieValue);

  console.log(`   - Status: ${trendsRes.status} (Expected: 503 for invalid mock key call)`);
  console.log(`   - Response error: "${trendsRes.body.error}"`);
  if (trendsRes.status === 503 && (trendsRes.body.error?.includes('Qwen Cloud AI service returned an error') || trendsRes.body.error?.includes('unavailable'))) {
    console.log('   ✅ Correctly handles Qwen Cloud API connection/status errors without crashing!\n');
  } else {
    console.error('   ❌ Unexpected response for mock key:', trendsRes.body);
    process.exit(1);
  }

  console.log('✨ All Qwen Cloud AI Backend Migration Checks Passed Successfully!\n');
  process.exit(0);
}

testAiCloudEndpoints().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
