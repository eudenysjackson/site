/**
 * Servidor estático local — porta 8080 (sem npx).
 * Uso: node scripts/serve-static.js
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PORT = 8080;

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.yml': 'text/yaml; charset=utf-8',
    '.yaml': 'text/yaml; charset=utf-8'
};

function send(res, status, body, type) {
    res.writeHead(status, { 'Content-Type': type || 'text/plain; charset=utf-8' });
    res.end(body);
}

function serveFile(res, filePath) {
    fs.readFile(filePath, function (e, data) {
        if (e) { send(res, 500, 'Error'); return; }
        send(res, 200, data, MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream');
    });
}

function resolvePath(urlPath, cb) {
    var filePath = path.join(ROOT, urlPath.replace(/\//g, path.sep));

    if (!filePath.startsWith(ROOT)) {
        cb(new Error('forbidden'));
        return;
    }

    fs.stat(filePath, function (err, stat) {
        if (!err && stat.isDirectory()) {
            resolvePath(urlPath.replace(/\/?$/, '/') + 'index.html', cb);
            return;
        }
        if (err || !stat.isFile()) {
            if (!path.extname(filePath)) {
                var htmlPath = filePath + '.html';
                fs.stat(htmlPath, function (err2, stat2) {
                    if (err2 || !stat2.isFile()) {
                        cb(new Error('not found'));
                        return;
                    }
                    cb(null, htmlPath);
                });
                return;
            }
            cb(new Error('not found'));
            return;
        }
        cb(null, filePath);
    });
}

const server = http.createServer(function (req, res) {
    var urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    if (urlPath === '/') urlPath = '/index.html';

    resolvePath(urlPath, function (err, filePath) {
        if (err) {
            send(res, err.message === 'forbidden' ? 403 : 404, err.message === 'forbidden' ? 'Forbidden' : 'Not found');
            return;
        }
        serveFile(res, filePath);
    });
});

server.listen(PORT, function () {
    console.log('Site local: http://localhost:' + PORT + '/');
    console.log('Admin:      http://localhost:' + PORT + '/admin/');
});
