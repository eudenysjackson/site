/**
 * Galeria 4:5 no Sveltia CMS — upload, grade, posição, excluir.
 * Mantém estado local para evitar reset ao enviar foto.
 */
(function boot() {
    if (!window.CMS || !window.h || !window.createClass) {
        setTimeout(boot, 30);
        return;
    }

    var h = window.h;
    var createClass = window.createClass;
    var LOCAL_API = 'http://localhost:8082';
    var REPO = 'eudenysjackson/sitedenysjackson';
    var BRANCH = 'main';
    var _galleryPendingPhotos = null;
    var _galleryFlushFn = null;

    function flushGalleryWidget() {
        if (typeof _galleryFlushFn === 'function') _galleryFlushFn();
    }

    function saveGalleryToLocalApi(photos) {
        if (!isLocal() || !photos || !photos.length) return;
        fetch(LOCAL_API + '/api/gallery', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ photos: photos })
        }).catch(function () {});
    }

    function registerGallerySaveHooks() {
        ['preSave', 'prePublish'].forEach(function (eventName) {
            CMS.registerEventListener({
                name: eventName,
                handler: function () {
                    flushGalleryWidget();
                    if (_galleryPendingPhotos) saveGalleryToLocalApi(_galleryPendingPhotos);
                }
            });
        });
    }

    function registerLocalPublishGuard() {
        if (!isLocal()) return;
        ['preSave', 'prePublish'].forEach(function (eventName) {
            CMS.registerEventListener({
                name: eventName,
                handler: function () {
                    return fetch('http://localhost:8081/api/v1', { cache: 'no-store' })
                        .then(function (r) {
                            if (!r.ok) throw new Error('decap-server offline');
                        })
                        .catch(function () {
                            throw new Error(
                                'Publicação bloqueada no localhost: decap-server (porta 8081) não está rodando. ' +
                                'Execute iniciar-local.bat. Alterações locais não devem ir ao GitHub até git push.'
                            );
                        });
                }
            });
        });
    }

    function isLocal() {
        return location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    }

    function toPlain(val) {
        if (val == null) return null;
        if (typeof val.toJS === 'function') return val.toJS();
        if (typeof val.get === 'function') {
            return {
                image: val.get('image') || '',
                caption: val.get('caption') || '',
                position: val.get('position') || '50% 50%',
                position_mobile: val.get('position_mobile') || val.get('position') || '50% 50%'
            };
        }
        return val;
    }

    function normalizePhoto(val) {
        var p = toPlain(val) || {};
        if (p.photo && typeof p.photo === 'object') p = p.photo;
        return {
            image: String(p.image || ''),
            caption: String(p.caption || ''),
            position: p.position || '50% 50%',
            position_mobile: p.position_mobile || p.position || '50% 50%',
            scale: typeof p.scale === 'number' ? p.scale : (parseInt(p.scale, 10) || 100)
        };
    }

    function toPhotosArray(val) {
        if (val == null) return [];
        if (typeof val.toJS === 'function') {
            var js = val.toJS();
            if (Array.isArray(js)) return js.map(normalizePhoto);
            if (js && typeof js === 'object') {
                return Object.keys(js).sort().map(function (k) { return normalizePhoto(js[k]); });
            }
        }
        if (typeof val.toArray === 'function') {
            return val.toArray().map(function (item) { return normalizePhoto(item); });
        }
        if (Array.isArray(val)) return val.map(normalizePhoto);
        if (typeof val === 'object') {
            return Object.keys(val).sort().map(function (k) { return normalizePhoto(val[k]); });
        }
        return [];
    }

    function cleanPhotos(photos) {
        return photos.map(normalizePhoto).filter(function (p) {
            return p.image && !/^blob:/i.test(p.image);
        });
    }

    function parsePos(pos) {
        if (!pos) return [50, 50];
        var parts = String(pos).replace(/%/g, '').trim().split(/\s+/);
        var x = parseInt(parts[0], 10);
        var y = parseInt(parts[1], 10);
        return [isNaN(x) ? 50 : x, isNaN(y) ? 50 : y];
    }

    function mediaSrc(path) {
        if (!path) return '';
        if (/^https?:\/\//i.test(path) || path.startsWith('blob:')) return path;
        var clean = path.startsWith('/') ? path.substring(1) : path;
        return '/' + clean.split('/').map(function (seg) {
            if (!seg) return seg;
            try { return encodeURIComponent(decodeURIComponent(seg)); } catch (e) { return encodeURIComponent(seg); }
        }).join('/');
    }

    function thumbRelPath(imagePath) {
        if (!imagePath) return '';
        var dot = imagePath.lastIndexOf('.');
        if (dot === -1) return imagePath + '-thumb.jpg';
        return imagePath.slice(0, dot) + '-thumb.jpg';
    }

    function thumbSrc(path) {
        return mediaSrc(thumbRelPath(path));
    }

    function slugify(name) {
        return String(name).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'foto';
    }

    function readExifOrientation(buffer) {
        var view = new DataView(buffer);
        if (view.byteLength < 2 || view.getUint16(0, false) !== 0xFFD8) return 1;
        var offset = 2;
        while (offset < view.byteLength) {
            if (view.getUint16(offset, false) === 0xFFE1) {
                var exifOffset = offset + 4;
                if (view.getUint32(exifOffset, false) !== 0x45786966) return 1;
                var tiff = exifOffset + 6;
                var little = view.getUint16(tiff, false) === 0x4949;
                var ifd = tiff + view.getUint32(tiff + 4, little);
                var entries = view.getUint16(ifd, little);
                for (var i = 0; i < entries; i++) {
                    var entry = ifd + 2 + i * 12;
                    if (view.getUint16(entry, little) === 0x0112) {
                        return view.getUint16(entry + 8, little) || 1;
                    }
                }
                return 1;
            }
            offset += 2 + view.getUint16(offset + 2, false);
        }
        return 1;
    }

    function exifToDegrees(orientation) {
        switch (orientation) {
            case 3: return 180;
            case 6: return 90;
            case 8: return 270;
            default: return 0;
        }
    }

    function canvasToBlob(canvas, type, quality) {
        return new Promise(function (resolve, reject) {
            canvas.toBlob(function (blob) {
                if (blob) resolve(blob);
                else reject(new Error('Falha ao processar imagem'));
            }, type || 'image/jpeg', quality || 0.92);
        });
    }

    function drawImageWithRotation(src, degrees, type) {
        return new Promise(function (resolve, reject) {
            var img = new Image();
            img.onload = function () {
                var canvas = document.createElement('canvas');
                var ctx = canvas.getContext('2d');
                var w = img.naturalWidth || img.width;
                var h = img.naturalHeight || img.height;
                var rot = ((degrees % 360) + 360) % 360;
                if (rot === 90 || rot === 270) {
                    canvas.width = h;
                    canvas.height = w;
                } else {
                    canvas.width = w;
                    canvas.height = h;
                }
                ctx.translate(canvas.width / 2, canvas.height / 2);
                ctx.rotate(rot * Math.PI / 180);
                ctx.drawImage(img, -w / 2, -h / 2);
                canvasToBlob(canvas, type || 'image/jpeg').then(resolve).catch(reject);
            };
            img.onerror = function () { reject(new Error('Não foi possível carregar a imagem')); };
            img.src = src;
        });
    }

    function injectGalleryStyles() {
        if (document.getElementById('dj-gallery-styles')) return;
        var el = document.createElement('style');
        el.id = 'dj-gallery-styles';
        el.textContent = [
            '.gallery-manager-field{max-width:100%!important}',
            '.dj-feed-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:12px 0}',
            '@media(max-width:900px){.dj-feed-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}',
            '.dj-feed-item{position:relative;aspect-ratio:4/5;border-radius:8px;overflow:hidden;background:#1a1040;cursor:grab;border:2px solid transparent}',
            '.dj-feed-item.is-active{border-color:#4338ca}',
            '.dj-feed-item.is-dragging{opacity:.45}',
            '.dj-feed-item img{width:100%;height:100%;object-fit:cover;display:block}',
            '.dj-feed-badge{position:absolute;top:4px;left:4px;background:rgba(0,0,0,.55);color:#fff;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px}',
            '.dj-feed-del{position:absolute;top:4px;right:4px;border:none;background:rgba(220,38,38,.9);color:#fff;width:22px;height:22px;border-radius:4px;cursor:pointer;font-weight:700;line-height:1}',
            '.dj-editor-panel{border:1px solid #e2e8f0;border-radius:12px;padding:12px;background:#f8fafc;margin-top:8px}',
            '.dj-editor-frame{position:relative;width:100%;max-width:220px;aspect-ratio:4/5;border-radius:10px;overflow:hidden;background:#1a1040;margin-bottom:10px;touch-action:none}',
            '.dj-editor-frame img{width:100%;height:100%;object-fit:cover;display:block;will-change:object-position,transform}',
            '.dj-control{margin-bottom:6px;max-width:220px}',
            '.dj-control label{font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:2px}'
        ].join('');
        document.head.appendChild(el);
    }

    function resizeImageFile(file, maxSide) {
        maxSide = maxSide || 1400;
        return new Promise(function (resolve, reject) {
            var url = URL.createObjectURL(file);
            var img = new Image();
            img.onload = function () {
                URL.revokeObjectURL(url);
                var w = img.naturalWidth || img.width;
                var h = img.naturalHeight || img.height;
                if (Math.max(w, h) <= maxSide) { resolve(file); return; }
                var ratio = maxSide / Math.max(w, h);
                var canvas = document.createElement('canvas');
                canvas.width = Math.round(w * ratio);
                canvas.height = Math.round(h * ratio);
                canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                canvasToBlob(canvas, file.type || 'image/jpeg', 0.88).then(function (blob) {
                    resolve(new File([blob], file.name, { type: file.type || 'image/jpeg' }));
                }).catch(reject);
            };
            img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Erro ao otimizar imagem')); };
            img.src = url;
        });
    }

    async function normalizeUploadFile(file) {
        var orientation = 1;
        try {
            var head = await file.slice(0, 65536).arrayBuffer();
            orientation = readExifOrientation(head);
        } catch (e) {}
        var degrees = exifToDegrees(orientation);
        if (degrees) {
            var blob = await drawImageWithRotation(URL.createObjectURL(file), degrees, file.type || 'image/jpeg');
            file = new File([blob], file.name, { type: file.type || 'image/jpeg' });
        }
        return resizeImageFile(file, 1400);
    }

    async function rotatePhotoFile(imagePath) {
        var src = mediaSrc(imagePath);
        var blob = await drawImageWithRotation(src, 90, 'image/jpeg');
        return new File([blob], 'rotated-' + Date.now() + '.jpg', { type: 'image/jpeg' });
    }

    function readFileBase64(file) {
        return new Promise(function (resolve, reject) {
            var reader = new FileReader();
            reader.onload = function () { resolve(reader.result.split(',')[1]); };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    function getGithubToken() {
        try {
            var keys = Object.keys(localStorage);
            for (var i = 0; i < keys.length; i++) {
                var val = localStorage.getItem(keys[i]);
                if (val && (val.startsWith('ghp_') || val.startsWith('github_pat_'))) return val;
            }
        } catch (e) {}
        return null;
    }

    async function uploadImageFile(file) {
        var ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace('jpeg', 'jpg');
        var fname = 'gallery-' + slugify(file.name.replace(/\.[^.]+$/, '')) + '-' + Date.now() + '.' + ext;

        try {
            var b64 = await readFileBase64(file);
            var res = await fetch(LOCAL_API + '/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: fname, data: b64 })
            });
            if (res.ok) {
                var up = await res.json();
                return up.path;
            }
            var errBody = await res.text();
            throw new Error('API respondeu ' + res.status + (errBody ? ': ' + errBody.slice(0, 80) : ''));
        } catch (e) {
            if (e.message && e.message.indexOf('API respondeu') === 0) throw e;
        }

        if (isLocal()) {
            throw new Error('Upload local falhou. Rode iniciar-local.bat (API em localhost:8082). Não publica no site oficial.');
        }

        var token = getGithubToken();
        if (token) {
            var b64g = await readFileBase64(file);
            var gh = await fetch('https://api.github.com/repos/' + REPO + '/contents/images/uploads/' + fname, {
                method: 'PUT',
                headers: {
                    'Authorization': 'token ' + token,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: 'Upload galeria via CMS: ' + fname,
                    content: b64g,
                    branch: BRANCH
                })
            });
            if (gh.ok) return '/images/uploads/' + fname;
        }

        throw new Error('Upload falhou. Verifique conexão com GitHub ou rode iniciar-local.bat para testes locais.');
    }

    injectGalleryStyles();

    var GalleryManagerControl = createClass({
        getInitialState: function () {
            var photos = cleanPhotos(toPhotosArray(this.props.value));
            return {
                photos: photos,
                uploading: false,
                uploadPreview: '',
                error: '',
                activeIndex: photos.length ? 0 : -1,
                pan: null,
                dragIndex: -1
            };
        },

        getPhotos: function () {
            return this.state.photos || [];
        },

        flushCms: function () {
            clearTimeout(this._syncTimer);
            var clean = cleanPhotos(this.getPhotos());
            _galleryPendingPhotos = clean;
            try { this.props.onChange(clean); } catch (e) { console.warn('CMS onChange:', e); }
        },

        syncToCms: function (photos, immediate) {
            var clean = cleanPhotos(photos);
            var self = this;
            _galleryPendingPhotos = clean;
            self.setState({ photos: clean });
            clearTimeout(self._syncTimer);
            if (immediate) {
                try { self.props.onChange(clean); } catch (e) { console.warn('CMS onChange:', e); }
                return;
            }
            self._syncTimer = setTimeout(function () {
                try { self.props.onChange(clean); } catch (e) { console.warn('CMS onChange:', e); }
            }, 350);
        },

        updatePhotosLocal: function (photos) {
            this.setState({ photos: cleanPhotos(photos) });
        },

        patchPhoto: function (index, patch, immediate) {
            var photos = this.getPhotos().slice();
            if (!photos[index]) return;
            photos[index] = Object.assign({}, photos[index], patch);
            this.syncToCms(photos, immediate);
        },

        patchPhotoLocal: function (index, patch) {
            var photos = this.getPhotos().slice();
            if (!photos[index]) return;
            photos[index] = Object.assign({}, photos[index], patch);
            this.updatePhotosLocal(photos);
        },

        applyLivePreview: function (index) {
            var img = this.activeImgRef;
            var photo = this.getPhotos()[index];
            if (!img || !photo) return;
            var pos = parsePos(photo.position);
            var scale = photo.scale || 100;
            img.style.objectPosition = pos[0] + '% ' + pos[1] + '%';
            img.style.transform = scale === 100 ? '' : 'scale(' + (scale / 100) + ')';
        },

        isValid: function () { return true; },

        openFile: function () {
            if (this.fileInput) this.fileInput.click();
        },

        onFile: function (e) {
            var file = e.target.files && e.target.files[0];
            e.target.value = '';
            if (!file) return;
            if (!file.type.match(/^image\/(jpeg|png|webp)$/i)) {
                this.setState({ error: 'Use JPG, PNG ou WebP.' });
                return;
            }
            var self = this;
            var blob = URL.createObjectURL(file);
            if (self.state.uploadPreview) URL.revokeObjectURL(self.state.uploadPreview);
            self.setState({ uploading: true, error: '', uploadPreview: blob });

            normalizeUploadFile(file).then(function (normalized) {
                return uploadImageFile(normalized);
            }).then(function (path) {
                if (self.state.uploadPreview) URL.revokeObjectURL(self.state.uploadPreview);
                var photos = self.getPhotos().slice();
                photos.push({ image: path, caption: '', position: '50% 50%', position_mobile: '50% 50%', scale: 100 });
                self.syncToCms(photos, true);
                self.setState({ uploading: false, uploadPreview: '', error: '', activeIndex: photos.length - 1 });
            }).catch(function (err) {
                if (self.state.uploadPreview) URL.revokeObjectURL(self.state.uploadPreview);
                self.setState({ uploading: false, uploadPreview: '', error: err.message || String(err) });
            });
        },

        removePhoto: function (index) {
            var photos = this.getPhotos().slice();
            photos.splice(index, 1);
            var next = this.state.activeIndex;
            if (next >= photos.length) next = photos.length - 1;
            if (next < 0) next = -1;
            this.syncToCms(photos, true);
            this.setState({ activeIndex: next });
        },

        rotatePhoto: function (index) {
            var photo = this.getPhotos()[index];
            if (!photo || !photo.image) return;
            var self = this;
            self.setState({ uploading: true, error: '' });
            rotatePhotoFile(photo.image).then(function (file) {
                return uploadImageFile(file);
            }).then(function (newPath) {
                self.patchPhoto(index, { image: newPath, position: '50% 50%', position_mobile: '50% 50%', scale: 100 }, true);
                self.setState({ uploading: false, error: '' });
            }).catch(function (err) {
                self.setState({ uploading: false, error: err.message || String(err) });
            });
        },

        reorderPhoto: function (from, to) {
            if (from === to || from < 0 || to < 0) return;
            var photos = this.getPhotos().slice();
            if (from >= photos.length || to >= photos.length) return;
            var item = photos.splice(from, 1)[0];
            photos.splice(to, 0, item);
            var active = this.state.activeIndex;
            if (active === from) active = to;
            else if (from < active && to >= active) active--;
            else if (from > active && to <= active) active++;
            this.syncToCms(photos, true);
            this.setState({ activeIndex: active, dragIndex: -1 });
        },

        onPosChange: function (index, axis, n, commit) {
            var photo = this.getPhotos()[index];
            if (!photo) return;
            var pos = parsePos(photo.position);
            if (axis === 'x') pos[0] = n;
            else pos[1] = n;
            var str = pos[0] + '% ' + pos[1] + '%';
            if (commit) this.patchPhoto(index, { position: str, position_mobile: str }, false);
            else {
                this.patchPhotoLocal(index, { position: str, position_mobile: str });
                this.applyLivePreview(index);
            }
        },

        onScaleChange: function (index, n, commit) {
            if (commit) this.patchPhoto(index, { scale: n }, false);
            else {
                this.patchPhotoLocal(index, { scale: n });
                this.applyLivePreview(index);
            }
        },

        onPanStart: function (index, e) {
            if (e.target.closest && e.target.closest('.dj-feed-del')) return;
            var photos = this.getPhotos();
            if (!photos[index] || !photos[index].image) return;
            e.preventDefault();
            var pt = e.touches ? e.touches[0] : e;
            var pos = parsePos(photos[index].position);
            var frame = this.activeFrameRef;
            if (!frame) return;
            this.setState({
                activeIndex: index,
                pan: { index: index, sx: pt.clientX, sy: pt.clientY, px: pos[0], py: pos[1], w: frame.offsetWidth, h: frame.offsetHeight }
            });
        },

        onPanMove: function (e) {
            var pan = this.state.pan;
            if (!pan) return;
            e.preventDefault();
            var pt = e.touches ? e.touches[0] : e;
            var x = Math.max(0, Math.min(100, Math.round(pan.px - ((pt.clientX - pan.sx) / pan.w) * 100)));
            var y = Math.max(0, Math.min(100, Math.round(pan.py - ((pt.clientY - pan.sy) / pan.h) * 100)));
            this._draftPos = x + '% ' + y + '%';
            if (this.activeImgRef) this.activeImgRef.style.objectPosition = x + '% ' + y + '%';
        },

        onPanEnd: function () {
            if (!this.state.pan) return;
            var idx = this.state.pan.index;
            if (this._draftPos) {
                this.patchPhoto(idx, { position: this._draftPos, position_mobile: this._draftPos }, true);
                this._draftPos = null;
            }
            this.setState({ pan: null });
        },

        componentDidMount: function () {
            var self = this;
            _galleryFlushFn = function () { self.flushCms(); };
            _galleryPendingPhotos = cleanPhotos(self.getPhotos());
            this._move = function (e) { if (self.state.pan) self.onPanMove(e); };
            this._end = function () { self.onPanEnd(); };
            document.addEventListener('mousemove', this._move, { passive: false });
            document.addEventListener('mouseup', this._end);
            document.addEventListener('touchmove', this._move, { passive: false });
            document.addEventListener('touchend', this._end);
            self.syncFromGalleryFile();
        },

        syncFromGalleryFile: function () {
            var self = this;
            fetch('/content/gallery.json?t=' + Date.now(), { cache: 'no-store' })
                .then(function (r) { return r.ok ? r.json() : null; })
                .then(function (data) {
                    if (!data || !Array.isArray(data.photos)) return;
                    var fromFile = cleanPhotos(data.photos);
                    var current = self.getPhotos();
                    if (JSON.stringify(fromFile) === JSON.stringify(current)) return;
                    self.syncToCms(fromFile, true);
                    var idx = self.state.activeIndex;
                    if (idx >= fromFile.length) idx = fromFile.length - 1;
                    if (idx < 0 && fromFile.length) idx = 0;
                    self.setState({ photos: fromFile, activeIndex: idx });
                })
                .catch(function () {});
        },

        UNSAFE_componentWillReceiveProps: function (nextProps) {
            if (this.state.uploading || this.state.pan) return;
            if (nextProps.value === this.props.value) return;
            var incoming = cleanPhotos(toPhotosArray(nextProps.value));
            var current = this.getPhotos();
            if (JSON.stringify(incoming) !== JSON.stringify(current)) {
                _galleryPendingPhotos = incoming;
                var idx = this.state.activeIndex;
                if (idx >= incoming.length) idx = incoming.length - 1;
                if (idx < 0 && incoming.length) idx = 0;
                this.setState({ photos: incoming, activeIndex: idx });
            }
        },

        componentWillUnmount: function () {
            _galleryFlushFn = null;
            clearTimeout(this._syncTimer);
            this.flushCms();
            document.removeEventListener('mousemove', this._move);
            document.removeEventListener('mouseup', this._end);
            document.removeEventListener('touchmove', this._move);
            document.removeEventListener('touchend', this._end);
            if (this.state.uploadPreview) URL.revokeObjectURL(this.state.uploadPreview);
        },

        renderFeedGrid: function () {
            var self = this;
            var photos = this.getPhotos();
            if (!photos.length) return null;

            return h('div', { className: 'dj-feed-section' },
                h('p', { style: { fontSize: '12px', fontWeight: '700', color: '#64748b', margin: '0 0 6px' } }, 'Prévia do feed — arraste para reordenar'),
                h('div', { className: 'dj-feed-grid' },
                    photos.map(function (photo, index) {
                        var pos = parsePos(photo.position);
                        var scale = photo.scale || 100;
                        var active = self.state.activeIndex === index;
                        var dragging = self.state.dragIndex === index;
                        var thumbStyle = {
                            objectPosition: pos[0] + '% ' + pos[1] + '%'
                        };
                        if (scale !== 100) thumbStyle.transform = 'scale(' + (scale / 100) + ')';
                        return h('div', {
                            key: 'feed-' + index + '-' + photo.image,
                            className: 'dj-feed-item' + (active ? ' is-active' : '') + (dragging ? ' is-dragging' : ''),
                            draggable: true,
                            onDragStart: function (e) {
                                e.dataTransfer.effectAllowed = 'move';
                                e.dataTransfer.setData('text/plain', String(index));
                                self.setState({ dragIndex: index });
                            },
                            onDragEnd: function () { self.setState({ dragIndex: -1 }); },
                            onDragOver: function (e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; },
                            onDrop: function (e) {
                                e.preventDefault();
                                var from = parseInt(e.dataTransfer.getData('text/plain'), 10);
                                self.reorderPhoto(from, index);
                            },
                            onClick: function () { self.setState({ activeIndex: index }); }
                        },
                            h('span', { className: 'dj-feed-badge' }, String(index + 1)),
                            h('button', {
                                type: 'button', className: 'dj-feed-del', title: 'Excluir',
                                onClick: function (e) { e.stopPropagation(); self.removePhoto(index); }
                            }, '×'),
                            h('img', {
                                src: thumbSrc(photo.image),
                                alt: photo.caption || 'Foto ' + (index + 1),
                                loading: 'lazy', decoding: 'async',
                                draggable: false,
                                onError: function (e) {
                                    if (!e.target.dataset.fellback) {
                                        e.target.dataset.fellback = '1';
                                        e.target.src = mediaSrc(photo.image);
                                    }
                                },
                                style: thumbStyle
                            })
                        );
                    })
                )
            );
        },

        renderActiveEditor: function () {
            var self = this;
            var index = self.state.activeIndex;
            var photo = index >= 0 ? self.getPhotos()[index] : null;
            if (!photo) {
                return h('p', { style: { color: '#94a3b8', fontSize: '13px' } }, 'Selecione uma foto no feed acima para editar.');
            }
            var pos = parsePos(photo.position);
            var scale = photo.scale || 100;

            return h('div', { className: 'dj-editor-panel' },
                h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' } },
                    h('span', { style: { fontSize: '13px', fontWeight: '700', color: '#334155' } }, 'Editando foto ' + (index + 1)),
                    h('button', {
                        type: 'button', disabled: self.state.uploading,
                        onClick: function () { self.rotatePhoto(index); },
                        style: { padding: '5px 10px', background: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }
                    }, '↻ Girar 90°')
                ),
                h('div', {
                    className: 'dj-editor-frame',
                    ref: function (el) { self.activeFrameRef = el; },
                    onMouseDown: function (e) { self.onPanStart(index, e); },
                    onTouchStart: function (e) { self.onPanStart(index, e); }
                },
                    h('img', {
                        ref: function (el) { self.activeImgRef = el; },
                        src: thumbSrc(photo.image),
                        alt: photo.caption || 'Foto',
                        loading: 'lazy', decoding: 'async',
                        onError: function (e) {
                            if (!e.target.dataset.fellback) {
                                e.target.dataset.fellback = '1';
                                e.target.src = mediaSrc(photo.image);
                            } else {
                                e.target.style.opacity = '0.35';
                            }
                        },
                        style: { width: '100%', height: '100%', objectFit: 'cover', display: 'block', objectPosition: pos[0] + '% ' + pos[1] + '%', transform: scale === 100 ? 'none' : 'scale(' + (scale / 100) + ')' }
                    })
                ),
                h('div', { className: 'dj-control' },
                    h('label', null, 'Horizontal'),
                    h('input', {
                        type: 'range', min: 0, max: 100, value: pos[0], style: { width: '100%', accentColor: '#4338ca' },
                        onInput: function (e) { self.onPosChange(index, 'x', parseInt(e.target.value, 10), false); },
                        onMouseUp: function () { self.flushCms(); },
                        onTouchEnd: function () { self.flushCms(); }
                    })
                ),
                h('div', { className: 'dj-control' },
                    h('label', null, 'Vertical'),
                    h('input', {
                        type: 'range', min: 0, max: 100, value: pos[1], style: { width: '100%', accentColor: '#4338ca' },
                        onInput: function (e) { self.onPosChange(index, 'y', parseInt(e.target.value, 10), false); },
                        onMouseUp: function () { self.flushCms(); },
                        onTouchEnd: function () { self.flushCms(); }
                    })
                ),
                h('div', { className: 'dj-control' },
                    h('label', null, 'Zoom'),
                    h('input', {
                        type: 'range', min: 100, max: 200, value: scale, style: { width: '100%', accentColor: '#4338ca' },
                        onInput: function (e) { self.onScaleChange(index, parseInt(e.target.value, 10), false); },
                        onMouseUp: function () { self.flushCms(); },
                        onTouchEnd: function () { self.flushCms(); }
                    })
                ),
                h('div', { className: 'dj-control' },
                    h('label', null, 'Legenda'),
                    h('input', {
                        type: 'text', value: photo.caption || '', placeholder: 'Opcional',
                        onChange: function (e) { self.patchPhoto(index, { caption: e.target.value }, false); },
                        onBlur: function () { self.flushCms(); },
                        style: { width: '100%', maxWidth: '220px', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }
                    })
                )
            );
        },

        render: function () {
            var self = this;
            var uploading = self.state.uploading;
            var preview = self.state.uploadPreview;

            return h('div', { className: 'gallery-manager-field' },
                h('p', { style: { fontSize: '13px', color: '#64748b', margin: '0 0 8px' } },
                    'Formato 4:5. Feed leve abaixo; edite uma foto por vez. Depois Publicar.'
                ),
                h('button', {
                    type: 'button', disabled: uploading,
                    onClick: function () { self.openFile(); },
                    style: { padding: '10px 16px', background: '#4338ca', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', marginBottom: '8px' }
                }, uploading ? 'Enviando...' : '+ Enviar foto'),
                h('input', {
                    ref: function (el) { self.fileInput = el; },
                    type: 'file', accept: 'image/jpeg,image/png,image/webp',
                    style: { display: 'none' }, onChange: this.onFile
                }),
                uploading && preview && h('div', { style: { position: 'relative', width: '100%', maxWidth: '160px', aspectRatio: '4/5', borderRadius: '10px', overflow: 'hidden', background: '#1a1040', marginBottom: '8px', opacity: 0.85 } },
                    h('img', { src: preview, alt: 'Enviando', style: { width: '100%', height: '100%', objectFit: 'cover' } })
                ),
                self.renderFeedGrid(),
                self.renderActiveEditor(),
                self.state.error && h('p', { style: { color: '#dc2626', fontSize: '12px', marginTop: '6px', fontWeight: '600' } }, self.state.error)
            );
        }
    });

    if (typeof CMS.registerFieldType === 'function') {
        CMS.registerFieldType('galleryManager', GalleryManagerControl);
    }
    CMS.registerWidget('galleryManager', GalleryManagerControl);

    if (isLocal()) {
        registerGallerySaveHooks();
        registerLocalPublishGuard();
    }

    window.__DJ_GALLERY_MANAGER__ = true;

    if (window.CMS_MANUAL_INIT && typeof CMS.init === 'function') {
        CMS.init();
    }
})();
