/**
 * CORS Helper for Vercel API Routes
 * Handles CORS headers for all API routes
 */

export async function handleCors(req, res) {
  const corsOrigin = process.env.CORS_ORIGIN || 'https://bitrent.vercel.app,http://localhost:3000';
  const allowedOrigins = corsOrigin.split(',').map(o => o.trim());

  const origin = req.headers.origin || '';
  const isAllowedOrigin = allowedOrigins.includes(origin) || allowedOrigins.includes('*');

  if (isAllowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }

  return false;
}

export default { handleCors };
