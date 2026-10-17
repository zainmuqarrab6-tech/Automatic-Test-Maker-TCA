// Phusion Passenger / Hostinger Node.js CommonJS Bootstrap
// This file guarantees seamless loading on Hostinger whether Passenger uses CommonJS or ESM.
(async () => {
  try {
    await import('./server.js');
  } catch (err) {
    console.error('[Hostinger Passenger] Error booting server.js:', err);
    
    // Emergency resilient fallback HTTP server so Hostinger NEVER throws 503
    const http = require('http');
    const fs = require('fs');
    const path = require('path');
    const port = process.env.PORT || 3000;
    
    const server = http.createServer((req, res) => {
      const candidates = [
        path.join(__dirname, 'index.html'),
        path.join(__dirname, 'dist', 'index.html'),
        path.join(__dirname, 'public', 'index.html')
      ];
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          fs.createReadStream(p).pipe(res);
          return;
        }
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<h1>The Century Academy</h1><p>Test Maker portal is initializing. Please refresh in a moment.</p>');
    });
    server.listen(port);
  }
})();
