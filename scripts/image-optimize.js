/**
 * Otimização de imagens da galeria — full (~1200px) + thumb (~480px).
 */
const fs = require('fs');
const path = require('path');

let sharp;
try {
    sharp = require('sharp');
} catch (e) {
    sharp = null;
}

const ROOT = path.join(__dirname, '..');
const UPLOADS = path.join(ROOT, 'images', 'uploads');

function thumbRelPath(imagePath) {
    if (!imagePath) return '';
    var dot = imagePath.lastIndexOf('.');
    if (dot === -1) return imagePath + '-thumb';
    return imagePath.slice(0, dot) + '-thumb' + imagePath.slice(dot);
}

function absFromRel(rel) {
    var clean = String(rel || '').replace(/^\//, '');
    return path.join(ROOT, clean.split('/').join(path.sep));
}

async function optimizeImage(absPath, options) {
    if (!sharp) throw new Error('Instale sharp: npm install sharp');
    if (!fs.existsSync(absPath)) return null;

    var maxSide = (options && options.maxSide) || 1200;
    var quality = (options && options.quality) || 85;
    var ext = path.extname(absPath).toLowerCase();
    var outExt = ext === '.png' ? '.webp' : (ext === '.webp' ? '.webp' : '.jpg');
    var base = absPath.replace(/\.[^.]+$/, '');
    var outPath = base + outExt;

    var img = sharp(absPath, { failOn: 'none' }).rotate();
    var meta = await img.metadata();
    var resize = {};
    if (meta.width && meta.height && Math.max(meta.width, meta.height) > maxSide) {
        if (meta.width >= meta.height) resize.width = maxSide;
        else resize.height = maxSide;
    }

    var pipeline = Object.keys(resize).length ? img.resize(resize) : img;
    if (outExt === '.webp') {
        await pipeline.webp({ quality: quality }).toFile(outPath + '.tmp');
    } else {
        await pipeline.jpeg({ quality: quality, mozjpeg: true }).toFile(outPath + '.tmp');
    }

    fs.renameSync(outPath + '.tmp', outPath);
    if (outPath !== absPath && fs.existsSync(absPath)) {
        try { fs.unlinkSync(absPath); } catch (e) {}
    }

    var rel = '/images/uploads/' + path.basename(outPath);
    return rel;
}

async function createThumb(absPath, options) {
    if (!sharp) throw new Error('Instale sharp: npm install sharp');
    if (!fs.existsSync(absPath)) return null;

    var maxSide = (options && options.maxSide) || 480;
    var quality = (options && options.quality) || 78;
    var dot = absPath.lastIndexOf('.');
    var thumbPath = dot === -1 ? absPath + '-thumb.jpg' : absPath.slice(0, dot) + '-thumb.jpg';

    await sharp(absPath, { failOn: 'none' })
        .rotate()
        .resize({ width: maxSide, height: maxSide, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: quality, mozjpeg: true })
        .toFile(thumbPath + '.tmp');

    fs.renameSync(thumbPath + '.tmp', thumbPath);
    return '/images/uploads/' + path.basename(thumbPath);
}

async function processGalleryPhoto(imageRel) {
    var abs = absFromRel(imageRel);
    if (!fs.existsSync(abs)) return imageRel;

    var stat = fs.statSync(abs);
    var rel = imageRel;

    if (stat.size > 400 * 1024) {
        rel = await optimizeImage(abs, { maxSide: 1200, quality: 85 });
        abs = absFromRel(rel);
    }

    await createThumb(abs, { maxSide: 480, quality: 78 });
    return rel;
}

module.exports = {
    thumbRelPath: thumbRelPath,
    absFromRel: absFromRel,
    optimizeImage: optimizeImage,
    createThumb: createThumb,
    processGalleryPhoto: processGalleryPhoto,
    UPLOADS: UPLOADS,
    hasSharp: function () { return !!sharp; }
};
