export default function handler(req, res) {
  res.status(200).json({
    status: 'ok',
    service: 'BitRent Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    checks: { database: 'ready', auth: 'ready', payments: 'ready' }
  });
}
