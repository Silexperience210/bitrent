export default function handler(req, res) {
  if (req.method === 'POST') {
    return res.status(201).json({
      status: 'ok',
      data: {
        payment_id: `payment_${Date.now()}`,
        amount_sats: req.body?.amount_sats || 1000,
        invoice: `lnbc1000n1p0example`,
        payment_hash: 'abcd1234efgh5678',
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        status: 'pending'
      }
    });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
