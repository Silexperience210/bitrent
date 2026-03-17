export default function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      count: 5,
      data: []
    });
  }

  if (req.method === 'POST') {
    return res.status(201).json({
      status: 'ok',
      data: {
        id: `rental_${Date.now()}`,
        miner_id: req.body?.miner_id,
        client_id: 'user_123',
        status: 'active',
        start_time: new Date().toISOString()
      }
    });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
