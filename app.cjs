// app.cjs - Hostinger Phusion Passenger CommonJS Startup File
(async () => {
  try {
    await import('./server.js');
  } catch (err) {
    console.error('[Hostinger Passenger] Error starting server.js:', err);
    const http = require('http');
    const fs = require('fs');
    const path = require('path');
    const port = process.env.PORT || 3000;
    http.createServer((req, res) => {
      const idx = path.join(__dirname, 'index.html');
      if (fs.existsSync(idx)) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        fs.createReadStream(idx).pipe(res);
      } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h1>The Century Academy</h1><p>Starting up...</p>');
      }
    }).listen(port);
  }
})();
