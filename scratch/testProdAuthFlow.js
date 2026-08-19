import http from 'http';
import { connectDB } from '../backend/config/database.js';
import { seedAdmin } from '../backend/scripts/seedAdmin.js';
import { User } from '../backend/models/User.js';
import { Shop } from '../backend/models/Shop.js';
import { SubscriptionRequest } from '../backend/models/SubscriptionRequest.js';

function makeRequest(options, body = null, cookieHeader = null) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' };
    if (cookieHeader) headers['Cookie'] = cookieHeader;

    const req = http.request({ ...options, headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const cookies = res.headers['set-cookie'] || [];
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, cookies, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, cookies, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testAuthAndSubscriptionFlow() {
  console.log('\n====================================================');
  console.log('🧪 QuickR — Full Production Auth & Subscription Flow');
  console.log('====================================================\n');

  const port = process.env.PORT || 53211;
  await connectDB();
  await seedAdmin();

  const uniqueTimestamp = Date.now();
  const reqAccessBody = {
    name: 'Real Vendor',
    shopName: 'Quality Retail Store',
    phone: `98${String(uniqueTimestamp).slice(-8)}`,
    email: `vendor_${uniqueTimestamp}@example.com`,
    requestedPlan: 'Standard',
    message: 'We want to test QuickR for our retail store.'
  };

  const submitRes = await makeRequest({
    hostname: '127.0.0.1', port, path: '/api/subscription-requests', method: 'POST'
  }, reqAccessBody);

  console.log(`1. Request Access Submission status: ${submitRes.status} (Expected: 201)`);
  if (submitRes.status !== 201) {
    console.error('❌ Failed to submit access request:', submitRes.body);
    process.exit(1);
  }

  // Verify stored in MongoDB
  const storedReq = await SubscriptionRequest.findOne({ email: reqAccessBody.email });
  if (storedReq) {
    console.log(`   ✅ Successfully stored in MongoDB: ID=${storedReq.id}, Status=${storedReq.status}`);
  } else {
    console.error('   ❌ Request not found in MongoDB!');
    process.exit(1);
  }

  // 2. Admin Login
  const loginRes = await makeRequest({
    hostname: '127.0.0.1', port, path: '/api/auth/login', method: 'POST'
  }, { email: 'admin@quickr.com', password: 'admin123' });

  console.log(`\n2. Admin Login status: ${loginRes.status} (Expected: 200)`);
  if (loginRes.status !== 200) {
    console.error('❌ Admin login failed:', loginRes.body);
    process.exit(1);
  }

  const setCookieHeader = loginRes.cookies[0];
  console.log(`   Set-Cookie Header: ${setCookieHeader}`);
  if (!setCookieHeader || !setCookieHeader.includes('token=')) {
    console.error('❌ Set-Cookie header missing or invalid!');
    process.exit(1);
  }

  const cookieValue = setCookieHeader.split(';')[0];

  // 3. Test GET /api/auth/me using Cookie
  const meRes = await makeRequest({
    hostname: '127.0.0.1', port, path: '/api/auth/me', method: 'GET'
  }, null, cookieValue);

  console.log(`\n3. /api/auth/me via Cookie status: ${meRes.status} (Expected: 200)`);
  if (meRes.status === 200 && meRes.body.user?.role === 'admin') {
    console.log(`   ✅ Admin session verified: Name=${meRes.body.user.name}, Role=${meRes.body.user.role}`);
  } else {
    console.error('❌ /api/auth/me failed:', meRes.body);
    process.exit(1);
  }

  // 4. Test GET /api/admin/subscription-requests using Cookie
  const subReqsRes = await makeRequest({
    hostname: '127.0.0.1', port, path: '/api/admin/subscription-requests', method: 'GET'
  }, null, cookieValue);

  console.log(`\n4. /api/admin/subscription-requests via Cookie status: ${subReqsRes.status} (Expected: 200)`);
  const foundReq = Array.isArray(subReqsRes.body) && subReqsRes.body.find(r => r.email === reqAccessBody.email);
  if (subReqsRes.status === 200 && foundReq) {
    console.log(`   ✅ Stored request retrieved by Admin: ID=${foundReq.id}, Shop=${foundReq.shopName}`);
  } else {
    console.error('❌ Admin list failed to retrieve stored request:', subReqsRes.body);
    process.exit(1);
  }

  // 5. Test POST /api/admin/shops using Cookie (Creating fresh shop)
  const createShopRes = await makeRequest({
    hostname: '127.0.0.1', port, path: '/api/admin/shops', method: 'POST'
  }, {
    shopName: 'Approved Vendor Shop',
    ownerName: 'Vendor Owner',
    ownerEmail: `approved_owner_${Date.now()}@quickr.com`,
    password: 'VendorPassword123!'
  }, cookieValue);

  console.log(`\n5. POST /api/admin/shops via Cookie status: ${createShopRes.status} (Expected: 201)`);
  if (createShopRes.status === 201 && createShopRes.body.shop) {
    console.log(`   ✅ Fresh Shop Created by Admin: ID=${createShopRes.body.shop.customId}, Owner=${createShopRes.body.owner.name}`);
  } else {
    console.error('❌ POST /api/admin/shops failed:', createShopRes.body);
    process.exit(1);
  }

  // Cleanup test records
  await SubscriptionRequest.deleteOne({ email: reqAccessBody.email });
  if (createShopRes.body.shop?.customId) {
    await Shop.deleteOne({ customId: createShopRes.body.shop.customId });
    await User.deleteOne({ id: createShopRes.body.owner.id });
  }

  console.log('\n✨ All Production Authentication & Subscription Request Tests Passed!\n');
}

testAuthAndSubscriptionFlow().catch(console.error);
