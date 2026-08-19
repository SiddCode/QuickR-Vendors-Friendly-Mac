import { generateAI } from '../backend/routes/ai.js';

async function testUnitGenerateAI() {
  console.log('\n====================================================');
  console.log('🧪 QuickR — generateAI Unit Test Suite');
  console.log('====================================================\n');

  // Test 1: Missing API key
  delete process.env.QWEN_API_KEY;
  try {
    await generateAI('Hello');
    console.error('❌ Failed: Should throw error when API key is missing');
    process.exit(1);
  } catch (err) {
    if (err.status === 503 && err.userMessage.includes('missing')) {
      console.log('✅ Test 1 Passed: Missing API key throws 503 with clean user message');
    } else {
      console.error('❌ Test 1 Failed:', err);
      process.exit(1);
    }
  }

  // Test 2: Mock API key connection failure handling
  process.env.QWEN_API_KEY = 'sk-mock-key-12345';
  process.env.QWEN_API_URL = 'http://127.0.0.1:59999/invalid-endpoint'; // non-existent local port

  try {
    await generateAI('Hello', { timeoutMs: 2000 });
    console.error('❌ Failed: Should fail network connection');
    process.exit(1);
  } catch (err) {
    if (err.status === 503 || err.status === 504 || err.message.includes('fetch failed') || err.message.includes('ECONNREFUSED')) {
      console.log('✅ Test 2 Passed: Handled network failure/timeout gracefully');
    } else {
      console.error('❌ Test 2 Failed with unexpected error:', err);
      process.exit(1);
    }
  }

  console.log('\n✨ All generateAI Unit Tests Passed Successfully!\n');
}

testUnitGenerateAI().catch(console.error);
