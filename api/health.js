import { supabase } from './_lib/supabase.js'
import { setCors } from './_lib/cors.js'

export default async function handler(req, res) {
  if (setCors(req, res)) return

  const { error } = await supabase.from('challenges').select('id').limit(1)
  const dbOk = !error

  return res.status(dbOk ? 200 : 503).json({
    ok: dbOk,
    service: 'BitRent API',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    db: dbOk ? 'connected' : 'error',
  })
}
