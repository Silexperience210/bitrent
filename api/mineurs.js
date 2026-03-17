export default function handler(req, res) {
  res.status(200).json({
    status: 'ok',
    count: 12,
    data: [
      { id: '1', name: 'Bitaxe #1', status: 'online', hashrate: 100, price_per_minute: 500 },
      { id: '2', name: 'Bitaxe #2', status: 'online', hashrate: 95, price_per_minute: 450 },
      { id: '3', name: 'Bitaxe #3', status: 'offline', hashrate: 80, price_per_minute: 400 }
    ]
  });
}
