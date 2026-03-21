/**
 * hex-proxy.js — Local proxy for Hex Bitaxe
 * Strips Cloudflare headers before forwarding to 192.168.1.142:80
 * Usage: node hex-proxy.js
 * Then: cloudflared tunnel --url http://localhost:8142
 */
const http = require('http')

const TARGET_HOST = '192.168.1.142'
const TARGET_PORT = 80
const PROXY_PORT  = 8142

const CF_HEADERS = new Set([
  'cf-connecting-ip', 'cf-ipcountry', 'cf-ray', 'cf-visitor',
  'cf-ew-via', 'cf-warp-tag-id', 'cdn-loop',
  'x-forwarded-for', 'x-forwarded-proto', 'x-real-ip',
  'x-forwarded-host', 'x-original-url',
])

http.createServer((req, res) => {
  // Build clean headers (strip CF headers, keep essentials)
  const cleanHeaders = {}
  for (const [k, v] of Object.entries(req.headers)) {
    if (!CF_HEADERS.has(k.toLowerCase())) {
      cleanHeaders[k] = v
    }
  }
  cleanHeaders['host'] = `${TARGET_HOST}:${TARGET_PORT}`

  const options = {
    hostname: TARGET_HOST,
    port:     TARGET_PORT,
    path:     req.url,
    method:   req.method,
    headers:  cleanHeaders,
  }

  const proxy = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers)
    proxyRes.pipe(res, { end: true })
  })

  proxy.on('error', (err) => {
    console.error('[proxy] Error:', err.message)
    res.writeHead(502)
    res.end('Bad Gateway')
  })

  req.pipe(proxy, { end: true })
}).listen(PROXY_PORT, () => {
  console.log(`[hex-proxy] Listening on http://localhost:${PROXY_PORT}`)
  console.log(`[hex-proxy] Forwarding to http://${TARGET_HOST}:${TARGET_PORT}`)
})
