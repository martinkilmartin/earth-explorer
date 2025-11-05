import { createServer } from 'http';
import { existsSync, createReadStream, statSync } from 'fs';
import { extname, join, normalize, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const publicRoot = join(__dirname, '..');
const port = process.env.PORT ? Number(process.env.PORT) : 4173;
const host = '127.0.0.1';

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.geojson': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

function resolveFilePath(urlPath) {
  const decodedPath = decodeURIComponent(urlPath.split('?')[0]);
  if (decodedPath === '/' || decodedPath === '') {
    return join(publicRoot, 'index.html');
  }

  const safePath = normalize(decodedPath).replace(/^\.\.(\/|\\|$)/, '');
  return join(publicRoot, safePath);
}

const server = createServer((req, res) => {
  if (!req.url) {
    res.writeHead(400);
    res.end('Bad Request');
    return;
  }

  const filePath = resolveFilePath(req.url);

  if (!filePath.startsWith(publicRoot)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const ext = extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': 'no-cache'
  });

  const stream = createReadStream(filePath);
  stream.on('error', err => {
    console.error('Static server error:', err);
    if (!res.headersSent) {
      res.writeHead(500);
    }
    res.end('Internal server error');
  });
  stream.pipe(res);
});

server.listen(port, host, () => {
  console.log(`Static server running at http://${host}:${port}`);
});

const signals = ['SIGINT', 'SIGTERM'];
signals.forEach(signal => {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
});
