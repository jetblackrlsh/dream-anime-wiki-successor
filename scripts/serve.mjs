import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const port = Number(process.env.PORT || 4173);
const mime = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.webp': 'image/webp'
};

createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    let filename = path.resolve(root, `.${pathname}`);
    if (!filename.startsWith(root)) throw new Error('Invalid path');
    if ((await stat(filename)).isDirectory()) filename = path.join(filename, 'index.html');
    response.writeHead(200, { 'Content-Type': mime[path.extname(filename)] || 'application/octet-stream' });
    createReadStream(filename).pipe(response);
  } catch {
    const fallback = path.join(root, '404.html');
    response.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    createReadStream(fallback).pipe(response);
  }
}).listen(port, '127.0.0.1', () => console.log(`Previewing dist at http://127.0.0.1:${port}`));
