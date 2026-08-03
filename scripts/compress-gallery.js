/**
 * Comprime fotos da galeria e gera thumbnails.
 * Uso: node scripts/compress-gallery.js
 */
const fs = require('fs');
const path = require('path');
const img = require('./image-optimize');

const GALLERY = path.join(__dirname, '..', 'content', 'gallery.json');

async function main() {
    if (!img.hasSharp()) {
        console.error('Erro: rode "npm install sharp" na raiz do projeto.');
        process.exit(1);
    }

    if (!fs.existsSync(GALLERY)) {
        console.log('gallery.json não encontrado.');
        return;
    }

    var data = JSON.parse(fs.readFileSync(GALLERY, 'utf8'));
    if (!data.photos || !data.photos.length) {
        console.log('Nenhuma foto na galeria.');
        return;
    }

    console.log('Otimizando', data.photos.length, 'fotos...');
    var changed = false;

    for (var i = 0; i < data.photos.length; i++) {
        var photo = data.photos[i];
        if (!photo.image) continue;
        var before = photo.image;
        try {
            var after = await img.processGalleryPhoto(before);
            if (after !== before) {
                photo.image = after;
                changed = true;
                console.log(' ', i + 1, path.basename(before), '->', path.basename(after));
            } else {
                console.log(' ', i + 1, path.basename(before), 'OK');
            }
        } catch (e) {
            console.warn(' ', i + 1, 'falhou:', e.message);
        }
    }

    if (changed) {
        fs.writeFileSync(GALLERY, JSON.stringify(data, null, 2) + '\n', 'utf8');
        console.log('gallery.json atualizado.');
    }
    console.log('Pronto.');
}

main().catch(function (e) {
    console.error(e);
    process.exit(1);
});
