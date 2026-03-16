export default function handler(req, res) {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'BitRent API',
    version: '1.0.0'
  });
}
