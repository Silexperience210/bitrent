#!/usr/bin/env node

const https = require('https');

const VERCEL_TOKEN = process.env.VERCEL_TOKEN || 'your-token-here';
const PROJECT_ID = 'prj_Ra3nZDtQZoqOce50YLrPXni9KtjX';

function makeRequest(method, path) {
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
    req.end();
  });
}

(async () => {
  console.log('🔍 Checking latest deployment status...\n');

  try {
    const res = await makeRequest('GET', `/v6/deployments?projectId=${PROJECT_ID}&limit=5`);
    
    if (res.status !== 200) {
      console.error('❌ Failed to fetch deployments');
      process.exit(1);
    }

    const deployments = res.data.deployments || [];
    
    if (deployments.length === 0) {
      console.error('❌ No deployments found');
      process.exit(1);
    }

    console.log('📋 Latest Deployments:\n');
    deployments.slice(0, 3).forEach((d, i) => {
      const status = d.state || 'unknown';
      const created = new Date(d.created).toLocaleString();
      const icon = status === 'READY' ? '✅' : status === 'ERROR' ? '❌' : status === 'BUILDING' ? '⏳' : '❓';
      
      console.log(`${icon} #${i + 1}: ${status}`);
      console.log(`   Created: ${created}`);
      console.log(`   Commit: ${d.meta?.githubCommitSha?.substring(0, 7) || 'N/A'}`);
      
      if (d.errorMessage) {
        console.log(`   Error: ${d.errorMessage}`);
      }
      console.log('');
    });

    const latest = deployments[0];
    if (latest.state === 'ERROR') {
      console.error('❌ Latest deployment failed!');
      console.error(`Error: ${latest.errorMessage}`);
      process.exit(1);
    } else if (latest.state === 'READY') {
      console.log('✅ Latest deployment is ready!');
      console.log(`🔗 URL: https://${latest.alias || latest.url}`);
    } else {
      console.log(`⏳ Deployment status: ${latest.state}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
