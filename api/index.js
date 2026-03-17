export default function handler(req, res) {
  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>BitRent - Redirecting...</title>
      <meta http-equiv="refresh" content="0; url=/index.html">
    </head>
    <body>
      <p>Redirecting to <a href="/index.html">BitRent</a>...</p>
    </body>
    </html>
  `);
}
