#!/usr/bin/env node

const https = require('https');

const VERCEL_TOKEN = process.env.VERCEL_TOKEN || 'your-token-here';
const PROJECT_ID = 'prj_Ra3nZDtQZoqOce50YLrPXni9KtjX';

const ENV_VARS = {
  SUPABASE_URL: 'https://taxudennjzcmjqcsgesn.supabase.co',
  SUPABASE_SERVICE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRheHVkZW5uanpjbWpxY3NnZXNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzU5MTUyOCwiZXhwIjoyMDg5MTY3NTI4fQ._vKlnytiFh4JNhjxIr5iO8ponyDxSfrBhOzOL9yxPlE',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRheHVkZW5uanpjbWpxY3NnZXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1OTE1MjgsImV4cCI6MjA4OTE2NzUyOH0.5g5WiXIdoijjtaA36TMticz6OCh0z21tNrR8Y7peM0U',
  JWT_SECRET: 'bitrent-production-jwt-secret-2026-secure',
  NODE_ENV: 'production',
  PORT: '3000'
};

function makeRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.vercel.com',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

(async () => {
  console.log('🚀 Configuring Vercel environment variables...');
  console.log(`📍 Project ID: ${PROJECT_ID}`);
  console.log(`📦 Variables: ${Object.keys(ENV_VARS).length}`);

  for (const [key, value] of Object.entries(ENV_VARS)) {
    try {
      const response = await makeRequest(
        'POST',
        `/v10/projects/${PROJECT_ID}/env`,
        {
          key: key,
          value: value,
          type: 'plain',
          target: ['production', 'preview', 'development']
        }
      );

      if (response.status === 200 || response.status === 201) {
        console.log(`✅ ${key}`);
      } else {
        console.log(`❌ ${key}: ${response.status}`);
        console.log('   Response:', response.data);
      }
    } catch (error) {
      console.error(`❌ ${key}: ${error.message}`);
    }
  }

  console.log('\n✨ Done! Vercel will auto-redeploy with new environment variables.');
  console.log('🔗 Check deployment: https://vercel.com/dashboard');
})();
