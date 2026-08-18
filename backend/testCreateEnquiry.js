(async () => {
  // 1️⃣ Login and obtain auth cookie
  const loginRes = await fetch('http://localhost:53211/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@quickr.com', password: 'admin123' })
  });
  console.log('Login status →', loginRes.status);
  const setCookie = loginRes.headers.get('set-cookie');
  if (!setCookie) {
    console.error('❌ No auth cookie returned – abort');
    return;
  }
  const cookie = setCookie.split(';')[0]; // "token=..."

  // 2️⃣ Create an enquiry that should trigger a follow‑up for today
  const enquiryPayload = {
    customerId: 'CUST-000124',
    productId: 'PROD-1',
    size: 'XL',
    color: 'Black',
    quantity: 1,
    interest: 'Very Interested',           // Valid enum: 'Just Enquiring', 'Interested', 'Very Interested'
    purchaseStatus: "Didn't Purchase",
    notes: ''
  };
  const createRes = await fetch('http://localhost:53211/api/enquiries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify(enquiryPayload)
  });
  console.log('Create enquiry status →', createRes.status);
  const createBody = await createRes.json();
  console.log('Create response →', createBody);

  const enquiryId = createBody.enquiry?.id;
  const followUpId = createBody.followUp?.id;
  console.log('Enquiry ID:', enquiryId);
  console.log('Follow‑up ID (if any):', followUpId);

  // 3️⃣ Verify follow‑ups via the two API endpoints
  const allFwRes = await fetch('http://localhost:53211/api/followups', {
    headers: { 'Cookie': cookie }
  });
  console.log('GET /api/followups status →', allFwRes.status);
  console.log('All follow‑ups →', await allFwRes.json());

  const todayFwRes = await fetch('http://localhost:53211/api/followups/today', {
    headers: { 'Cookie': cookie }
  });
  console.log('GET /api/followups/today status →', todayFwRes.status);
  console.log('Today follow‑ups →', await todayFwRes.json());
})();
