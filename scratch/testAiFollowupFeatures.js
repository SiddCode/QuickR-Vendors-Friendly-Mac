import http from 'http';

function makeRequest(options, postData, cookie = '') {
  return new Promise((resolve, reject) => {
    const req = http.request({
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(cookie ? { 'Cookie': cookie } : {}),
        ...(options.headers || {})
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data), headers: res.headers, cookies: res.headers['set-cookie'] || [] });
        } catch (e) {
          resolve({ status: res.statusCode, body: data, headers: res.headers, cookies: res.headers['set-cookie'] || [] });
        }
      });
    });
    req.on('error', reject);
    if (postData) req.write(JSON.stringify(postData));
    req.end();
  });
}

async function verifyFeatures() {
  console.log('\n====================================================');
  console.log('🧪 QuickR — AI Follow-Up Features Integration Test');
  console.log('====================================================\n');

  const port = 53211;

  // Login as admin
  const loginRes = await makeRequest({
    hostname: '127.0.0.1', port, path: '/api/auth/login', method: 'POST'
  }, { email: 'admin@quickr.com', password: 'admin123' });

  if (loginRes.status !== 200) {
    console.error('❌ Admin login failed:', loginRes.body);
    process.exit(1);
  }

  const rawCookies = loginRes.cookies || [];
  const setCookieHeader = rawCookies.find(c => c.startsWith('token='));
  const cookieValue = setCookieHeader ? setCookieHeader.split(';')[0] : '';
  const token = cookieValue.split('=')[1] || '';

  console.log('1. Testing POST /api/ai/followup-message...');
  delete process.env.QWEN_API_KEY;

  const msgRes = await makeRequest({
    hostname: '127.0.0.1', port, path: '/api/ai/followup-message', method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  }, {
    customerName: 'Sidd',
    productName: 'tshirt',
    interest: 'High',
    purchaseStatus: 'Pending',
    followUpReason: 'Customer interested in tshirt'
  }, cookieValue);

  console.log(`   - Status Code: ${msgRes.status} (Expected 503 for missing key)`);
  console.log(`   - Response Error: "${msgRes.body.error}"`);

  console.log('\n2. Testing POST /api/ai/followup-priorities...');
  const prioRes = await makeRequest({
    hostname: '127.0.0.1', port, path: '/api/ai/followup-priorities', method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  }, {}, cookieValue);

  console.log(`   - Status Code: ${prioRes.status} (Expected 503 for missing key)`);
  console.log(`   - Response Error: "${prioRes.body.error}"`);

  if (msgRes.status === 503 && prioRes.status === 503) {
    console.log('\n✨ Both AI Follow-Up endpoints successfully routed and verified!\n');
    process.exit(0);
  } else {
    console.error('\n❌ Endpoints returned unexpected status codes');
    process.exit(1);
  }
}

verifyFeatures().catch(err => {
  console.error('Verification Error:', err);
  process.exit(1);
});
