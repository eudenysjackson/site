/**
 * API local para testar uploads sem GitHub.
 * Uso: node scripts/local-api.js
 * Porta: 8082
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const img = require('./image-optimize');

const ROOT = path.join(__dirname, '..');
const PORT = 8082;
const UPLOADS = path.join(ROOT, 'images', 'uploads');
const GALLERY = path.join(ROOT, 'content', 'gallery.json');

function cors(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function readBody(req) {
    return new Promise(function(resolve, reject) {
        var data = '';
        req.on('data', function(chunk) { data += chunk; });
        req.on('end', function() { resolve(data); });
        req.on('error', reject);
    });
}

function ensureUploadsDir() {
    if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS, { recursive: true });
}

function readGallery() {
    if (!fs.existsSync(GALLERY)) return { photos: [] };
    try {
        return JSON.parse(fs.readFileSync(GALLERY, 'utf8'));
    } catch (e) {
        return { photos: [] };
    }
}

const server = http.createServer(async function(req, res) {
    cors(res);

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.url === '/api/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
        return;
    }

    if (req.url === '/api/gallery' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(readGallery()));
        return;
    }

    if (req.url === '/api/gallery' && req.method === 'POST') {
        try {
            var body = await readBody(req);
            var parsed = JSON.parse(body);
            fs.writeFileSync(GALLERY, JSON.stringify(parsed, null, 2) + '\n', 'utf8');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true }));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e.message }));
        }
        return;
    }

    if (req.url === '/api/upload' && req.method === 'POST') {
        try {
            ensureUploadsDir();
            var payload = JSON.parse(await readBody(req));
            if (!payload.filename || !payload.data) throw new Error('Dados inválidos');
            var safeName = path.basename(payload.filename).replace(/[^a-zA-Z0-9._-]/g, '-');
            var filePath = path.join(UPLOADS, safeName);
            fs.writeFileSync(filePath, Buffer.from(payload.data, 'base64'));

            var rel = '/images/uploads/' + safeName;
            if (img.hasSharp()) {
                try {
                    rel = await img.processGalleryPhoto(rel);
                } catch (optErr) {
                    console.warn('Otimização falhou, arquivo original mantido:', optErr.message);
                }
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, path: rel, thumb: img.thumbRelPath(rel) }));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e.message }));
        }
        return;
    }

    if (req.url === '/api/compress-gallery' && req.method === 'POST') {
        try {
            if (!img.hasSharp()) throw new Error('sharp não instalado');
            var gallery = readGallery();
            var updated = false;
            for (var i = 0; i < (gallery.photos || []).length; i++) {
                var p = gallery.photos[i];
                if (!p.image) continue;
                var next = await img.processGalleryPhoto(p.image);
                if (next !== p.image) { p.image = next; updated = true; }
            }
            if (updated) {
                fs.writeFileSync(GALLERY, JSON.stringify(gallery, null, 2) + '\n', 'utf8');
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, updated: updated, count: (gallery.photos || []).length }));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e.message }));
        }
        return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
});

ensureUploadsDir();
server.listen(PORT, function() {
    console.log('Local API: http://localhost:' + PORT);
    console.log('Salva em content/gallery.json e images/uploads/ (sem GitHub)');
});
