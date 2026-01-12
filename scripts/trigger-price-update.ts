import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const apiUrl = process.env.API_URL || 'http://localhost:3000/api';
  const email = process.env.ADMIN_EMAIL || 'admin@example.com';
  // Attempt to read password from env, otherwise fail or use a default if it was seeded with a default (risky assumption)
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    console.error('❌ ADMIN_PASSWORD environment variable is not set. Cannot login.');
    process.exit(1);
  }

  console.log(`🔌 Connecting to API at ${apiUrl}...`);
  console.log(`👤 Logging in as ${email}...`);

  try {
    // 1. Login
    const loginResponse = await axios.post(`${apiUrl}/auth/login`, {
      email,
      password,
    });

    const token = loginResponse.data.access_token;
    if (!token) {
      console.error('❌ Login failed: No access token received.');
      process.exit(1);
    }
    console.log('✅ Login successful!');

    // 2. Trigger Update
    console.log('🔄 Triggering daily price update...');
    const updateResponse = await axios.post(
      `${apiUrl}/security-prices/update-daily`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    console.log('✅ Update triggered successfully!');
    console.log('📄 Response:', updateResponse.data);

  } catch (error: any) {
    if (error.response) {
      console.error(`❌ Request failed with status ${error.response.status}:`);
      console.error(JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('❌ No response received from server. Is the API running?');
    } else {
      console.error('❌ Error:', error.message);
    }
    process.exit(1);
  }
}

main();
