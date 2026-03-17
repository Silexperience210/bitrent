#!/usr/bin/env node

const https = require('https');

const VERCEL_TOKEN = process.env.VERCEL_TOKEN || 'your-token-here';
const PROJECT_ID = 'prj_Ra3nZDtQZoqOce50YLrPXni9KtjX';

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
  console.log('🚀 Redeploying project on Vercel...');
  console.log(`📍 Project ID: ${PROJECT_ID}`);

  try {
    // Get latest deployment
    const deploymentsRes = await makeRequest('GET', `/v6/deployments?projectId=${PROJECT_ID}&limit=1`);
    
    if (deploymentsRes.status !== 200) {
      console.error('❌ Failed to fetch deployments:', deploymentsRes.data);
      process.exit(1);
    }

    const latestDeployment = deploymentsRes.data.deployments?.[0];
    if (!latestDeployment) {
      console.error('❌ No deployments found');
      process.exit(1);
    }

    console.log(`📦 Latest deployment: ${latestDeployment.uid}`);

    // Trigger redeploy via rebuild
    const redeployRes = await makeRequest(
      'POST',
      `/v13/deployments?projectId=${PROJECT_ID}`,
      {
        gitSource: {
          ref: 'master',
          redeployPreviousCommit: true
        }
      }
    );

    if (redeployRes.status === 201 || redeployRes.status === 200) {
      console.log('✅ Redeploy triggered successfully!');
      console.log(`📝 New deployment: ${redeployRes.data.id || redeployRes.data.uid}`);
      console.log('\n🔗 Watch progress: https://vercel.com/dashboard');
      console.log('⏱️  Deployment should complete in ~2-5 minutes');
    } else {
      console.error('❌ Redeploy failed:', redeployRes.status);
      console.error('   Response:', redeployRes.data);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
