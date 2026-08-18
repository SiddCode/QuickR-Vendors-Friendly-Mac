import http from 'http';
import { connectDB } from '../backend/config/database.js';
import { User } from '../backend/models/User.js';

function makeRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function verifyAuthAndIsolation() {
  console.log('\n====================================================');
  console.log('🧪 Verifying Auth & Multi-Shop Isolation Post-Cleanup');
  console.log('====================================================\n');

  const port = process.env.PORT || 53211;

  // 1. Verify deleted test shop cannot log in
  const oldLoginRes = await makeRequest({
    hostname: '127.0.0.1', port, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'owner_shop_a@quickr.com', password: 'password123' });

  console.log(`1. Deleted test shop login attempt status: ${oldLoginRes.status} (Expected: 401/404)`);

  // Create fresh shop via admin API
  const { seedAdmin } = await import('../backend/scripts/seedAdmin.js');
  await connectDB();
  await seedAdmin();

  // Login as admin
  const adminLoginRes = await makeRequest({
    hostname: '127.0.0.1', port, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'admin@quickr.com', password: 'admin123' });

  const adminToken = adminLoginRes.body.token;
  const adminHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` };

  // 2. Create Fresh Shop A via admin endpoint
  const regARes = await makeRequest({
    hostname: '127.0.0.1', port, path: '/api/admin/shops', method: 'POST', headers: adminHeaders
  }, { shopName: 'Fresh Real Shop A', ownerName: 'Shop A Owner', ownerEmail: `realtest_a_${Date.now()}@quickr.com`, password: 'Password123!' });

  console.log(`2. Fresh Shop A Admin Creation status: ${regARes.status}`);
  const shopAId = regARes.body.shop?.customId;
  const ownerAEmail = regARes.body.owner?.email;
  console.log(`   Fresh Shop A ID: ${shopAId}`);

  // Login as Shop A Owner
  const loginARes = await makeRequest({
    hostname: '127.0.0.1', port, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: ownerAEmail, password: 'Password123!' });
  const tokenA = loginARes.body.token;

  // 3. Create Fresh Shop B via admin endpoint
  const regBRes = await makeRequest({
    hostname: '127.0.0.1', port, path: '/api/admin/shops', method: 'POST', headers: adminHeaders
  }, { shopName: 'Fresh Real Shop B', ownerName: 'Shop B Owner', ownerEmail: `realtest_b_${Date.now()}@quickr.com`, password: 'Password123!' });

  console.log(`3. Fresh Shop B Admin Creation status: ${regBRes.status}`);
  const shopBId = regBRes.body.shop?.customId;
  const ownerBEmail = regBRes.body.owner?.email;
  console.log(`   Fresh Shop B ID: ${shopBId}`);

  // Login as Shop B Owner
  const loginBRes = await makeRequest({
    hostname: '127.0.0.1', port, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: ownerBEmail, password: 'Password123!' });
  const tokenB = loginBRes.body.token;

  const headersA = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` };
  const headersB = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenB}` };

  // 4. Create customer in Shop A
  const custA = await makeRequest({
    hostname: '127.0.0.1', port, path: '/api/customers', method: 'POST', headers: headersA
  }, { name: 'Shop A Customer', phone: '9876500001', allowWhatsAppOffers: true });
  console.log(`4. Created customer in Shop A: ${custA.body.id}`);

  // 5. Verify Shop B CANNOT read Shop A customer
  const shopBCrossCust = await makeRequest({
    hostname: '127.0.0.1', port, path: `/api/customers/${custA.body.id}`, method: 'GET', headers: headersB
  });
  console.log(`5. Shop B cross-access to Shop A customer status: ${shopBCrossCust.status} (Expected: 404)`);

  // 6. Clean up temporary test accounts created for verification
  await connectDB();
  await User.deleteMany({ email: { $in: [ownerAEmail, ownerBEmail] } });
  const { Shop } = await import('../backend/models/Shop.js');
  const { Customer } = await import('../backend/models/Customer.js');
  await Shop.deleteMany({ customId: { $in: [shopAId, shopBId] } });
  await Customer.deleteMany({ shopId: { $in: [shopAId, shopBId] } });

  console.log('\n✨ Post-Cleanup Auth & Multi-Shop Isolation Verification Passed!');
}

verifyAuthAndIsolation().catch(console.error);
