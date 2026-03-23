/**
 * serve.js — Quick local static server for the frontend
 * Run:  node serve.js
 * Then open: http://localhost:5500
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5500;
const MIME = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.ico':  'image/x-icon',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
};

http.createServer((req, res) => {
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);

  // strip query strings
  filePath = filePath.split('?')[0];

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log(`\n🌐 Frontend server running at http://localhost:${PORT}`);
  console.log('   Open: http://localhost:' + PORT + '/index.html');
  console.log('   Dashboard: http://localhost:' + PORT + '/dashboard.html\n');
});
