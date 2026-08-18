import http from 'http';

function makeCorsPreflight(options, origin) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      ...options,
      headers: {
        'Origin': origin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type,authorization'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function testCorsPreflight() {
  console.log('\n====================================================');
  console.log('🧪 QuickR — Preflight OPTIONS & CORS Test Suite');
  console.log('====================================================\n');

  const port = process.env.PORT || 53211;
  const originsToTest = [
    { name: 'Production Render Frontend', url: 'https://quickr-vendors-friendly-mac.onrender.com', expectedStatus: 204 },
    { name: 'Localhost 5173', url: 'http://localhost:5173', expectedStatus: 204 },
    { name: 'Localhost 5174', url: 'http://localhost:5174', expectedStatus: 204 },
    { name: 'Disallowed Origin', url: 'https://evil-unauthorized-website.com', expectedStatus: 500 }
  ];

  for (const item of originsToTest) {
    const res = await makeCorsPreflight({
      hostname: '127.0.0.1',
      port,
      path: '/api/auth/login',
      method: 'OPTIONS'
    }, item.url);

    console.log(`Testing ${item.name} (${item.url}):`);
    console.log(`  - Status: ${res.status}`);
    console.log(`  - Access-Control-Allow-Origin: ${res.headers['access-control-allow-origin'] || 'NONE'}`);
    console.log(`  - Access-Control-Allow-Credentials: ${res.headers['access-control-allow-credentials'] || 'NONE'}`);
    console.log(`  - Access-Control-Allow-Methods: ${res.headers['access-control-allow-methods'] || 'NONE'}`);

    if (item.expectedStatus === 204) {
      if (res.status === 204 && res.headers['access-control-allow-origin'] === item.url && res.headers['access-control-allow-credentials'] === 'true') {
        console.log(`  ✅ PASSED preflight check\n`);
      } else {
        console.error(`  ❌ FAILED preflight check\n`);
        process.exit(1);
      }
    } else {
      if (res.status !== 204 && res.headers['access-control-allow-origin'] !== item.url) {
        console.log(`  ✅ PASSED security rejection check\n`);
      } else {
        console.error(`  ❌ FAILED security rejection check\n`);
        process.exit(1);
      }
    }
  }

  console.log('✨ All CORS preflight verification checks completed successfully!\n');
}

testCorsPreflight().catch(console.error);
