import { db } from '../db';
import { apiUsageLog } from '../db/schema';
import { eq } from 'drizzle-orm';
import axios from 'axios';

const API_KEY = '45e6b59ebd4690607479e61a7eef3e37b3737939878c6049897f6d2e3a97392f';
const BASE_URL = 'http://localhost:3000';

async function testIpTracking() {
  const testIps = [
    '1.2.3.4',
    '192.168.1.1',
    '10.0.0.1'
  ];

  for (const ip of testIps) {
    console.log(`Testing with IP: ${ip}`);
    
    // Make request with IP header and API key in URL
    await axios.get(`${BASE_URL}/info/21?apiKey=${API_KEY}`, {
      headers: {
        'X-Forwarded-For': ip
      }
    });

    // Verify IP was logged
    const logs = await db.select()
      .from(apiUsageLog)
      .where(eq(apiUsageLog.clientIp, ip))
      .limit(1);

    if (logs.length > 0) {
      console.log(`✅ IP ${ip} logged successfully`);
    } else {
      console.log(`❌ IP ${ip} not logged`);
    }
  }
}

// Run the test
testIpTracking()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });