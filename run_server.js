const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const HOST = '127.0.0.1';
const ROOT_DIR = __dirname;

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.txt': 'text/plain; charset=utf-8',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    try {
        let cleanUrl = decodeURIComponent(req.url.split('?')[0]);
        if (cleanUrl === '/' || cleanUrl === '') {
            cleanUrl = '/test_grid.html';
        }

        // Prevent directory traversal
        let safePath = path.normalize(cleanUrl).replace(/^(\.\.[\/\\])+/, '');
        let filePath = path.join(ROOT_DIR, safePath);

        // Security check: ensure filePath is within ROOT_DIR
        if (!filePath.startsWith(ROOT_DIR)) {
            res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('403 Forbidden');
            return;
        }

        fs.stat(filePath, (err, stats) => {
            if (err || !stats.isFile()) {
                res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('404 Not Found: ' + cleanUrl);
                return;
            }

            let ext = path.extname(filePath).toLowerCase();
            let contentType = MIME_TYPES[ext] || 'application/octet-stream';

            res.writeHead(200, {
                'Content-Type': contentType,
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            });

            const stream = fs.createReadStream(filePath);
            stream.pipe(res);
        });
    } catch (e) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('500 Internal Server Error: ' + e.message);
    }
});

server.listen(PORT, HOST, () => {
    console.log(`Grid Engine static webserver running at:`);
    console.log(`  http://${HOST}:${PORT}/`);
    console.log(`  http://localhost:${PORT}/`);
});
