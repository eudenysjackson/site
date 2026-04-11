/* ============================================
   Main JavaScript
   Denys Jackson - Na Ponta dos Pés
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    initLanguage();
    initNavigation();
    initMobileMenu();
    initScrollAnimations();
    initMediaTabs();
    initLightbox();
    initBackToTop();
    initCustomSelect();
    initContactForm();
    setCurrentYear();
    loadContent();
});

/* ===== CONTENT LOADING ===== */

// Fetch JSON direto do GitHub (atualiza instantâneo após commit do CMS)
var GITHUB_RAW = 'https://raw.githubusercontent.com/eudenysjackson/site/main/';

async function loadContent() {
    await Promise.all([
        loadSiteConfig(),
        loadShows(),
        loadGallery(),
        loadVideos(),
        loadAbout(),
        loadSocialProof()
    ]);
}

async function fetchJSON(path) {
    // Tenta buscar direto do GitHub (sem cache, atualização imediata)
    try {
        var res = await fetch(GITHUB_RAW + path + '?t=' + Date.now(), { cache: 'no-store' });
        if (res.ok) return await res.json();
    } catch (e) {}
    // Fallback: busca local (GitHub Pages)
    try {
        var res2 = await fetch(path, { cache: 'no-store' });
        if (res2.ok) return await res2.json();
    } catch (e) {}
    return null;
}

// Fix CMS absolute paths (/images/... → images/...)
function fixPath(p) {
    if (!p) return p;
    var clean = p.startsWith('/') ? p.substring(1) : p;
    return clean;
}

// Fix path for images that need instant update (bust cache)
function fixImagePath(p) {
    if (!p) return p;
    var clean = p.startsWith('/') ? p.substring(1) : p;
    // Add cache-buster to force reload after CMS update
    return clean + '?t=' + Date.now();
}

// Site config (social links, hero image)
async function loadSiteConfig() {
    const data = await fetchJSON('content/site.json');
    if (!data) return;

    // Set hero background image if available
    if (data.hero_image || data.hero_image_mobile) {
        const heroBg = document.getElementById('hero-bg');
        const isMobile = window.innerWidth <= 768;
        const img = (isMobile && data.hero_image_mobile) ? data.hero_image_mobile : (data.hero_image || data.hero_image_mobile);
        const pos = (isMobile && data.hero_position_mobile) ? data.hero_position_mobile : (data.hero_position || 'center center');
        heroBg.style.backgroundImage = `url('${fixImagePath(img)}')`;
        heroBg.style.backgroundPosition = pos;
        heroBg.classList.add('has-image');
    }

    // Set social links
    if (data.social) {
        document.querySelectorAll('[data-social]').forEach(el => {
            const platform = el.dataset.social;
            if (data.social[platform]) {
                el.href = data.social[platform];
            }
        });
    }
}

// Social Proof logos
async function loadSocialProof() {
    var data = await fetchJSON('content/social_proof.json');
    if (!data || !data.logos || !data.logos.length) return;

    var grid = document.getElementById('social-proof-grid');
    if (!grid) return;

    grid.innerHTML = data.logos.map(function(logo) {
        var name = escapeHTML(logo.name);
        if (logo.image) {
            return '<div class="glass media-logo-card p-6">' +
                '<img src="' + escapeHTML(fixPath(logo.image)) + '" alt="' + name + '" class="h-16 md:h-20 object-contain opacity-70 hover:opacity-100 transition-opacity">' +
                '</div>';
        }
        return '<div class="glass media-logo-card p-6">' +
            '<span class="text-slate-400 font-bold text-lg">' + name + '</span>' +
            '</div>';
    }).join('');
}

// About content
async function loadAbout() {
    const data = await fetchJSON('content/about.json');
    if (!data) return;

    // Bio
    const lang = currentLang;
    if (data['bio_' + lang]) {
        const bioEl = document.getElementById('about-bio');
        if (bioEl) {
            const paragraphs = data['bio_' + lang].split('\n').filter(p => p.trim());
            bioEl.innerHTML = paragraphs.map(p => `<p>${p}</p>`).join('');
        }
    }

    // Mission
    const missionKey = 'mission_' + lang;
    if (data[missionKey]) {
        const el = document.getElementById('about-mission');
        if (el) el.textContent = data[missionKey];
    }

    // Objective
    const objectiveKey = 'objective_' + lang;
    if (data[objectiveKey]) {
        const el = document.getElementById('about-objective');
        if (el) el.textContent = data[objectiveKey];
    }

    // Community
    const communityKey = 'community_' + lang;
    if (data[communityKey]) {
        const el = document.getElementById('about-community');
        if (el) el.textContent = data[communityKey];
    }

    // Photo
    if (data.main_photo) {
        const photoEl = document.getElementById('about-photo');
        if (photoEl) {
            photoEl.innerHTML = `<img src="${fixPath(data.main_photo)}" alt="Denys Jackson" class="w-full h-full object-cover">`;
        }
    }
}

// Shows
let showsData = [];

async function loadShows() {
    const data = await fetchJSON('content/shows.json');
    if (!data || !data.shows) return;
    showsData = data.shows;
    renderShows();
}

function renderShows() {
    const container = document.getElementById('shows-list');
    const emptyState = document.getElementById('shows-empty');
    if (!container) return;

    // Filter future shows and sort by date
    const now = new Date();
    const futureShows = showsData
        .filter(s => new Date(s.date) >= now || s.status === 'confirmado')
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (futureShows.length === 0) {
        container.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');
    container.classList.remove('hidden');

    container.innerHTML = futureShows.map(show => {
        const date = new Date(show.date + 'T12:00:00');
        const day = date.getDate();
        const month = t('month.' + date.getMonth());

        const statusLabels = {
            confirmado: t('schedule.buy_ticket'),
            esgotado: 'Esgotado',
            cancelado: 'Cancelado'
        };

        const ticketBtn = show.status === 'confirmado' && show.ticket_url
            ? `<a href="${encodeURI(show.ticket_url)}" target="_blank" rel="noopener" class="btn-primary text-sm py-2 px-4">${statusLabels.confirmado}</a>`
            : `<span class="show-status ${show.status}">${statusLabels[show.status] || show.status}</span>`;

        return `
            <div class="show-card fade-in visible">
                <div class="show-date">
                    <span class="day">${day}</span>
                    <span class="month">${month}</span>
                </div>
                <div class="show-info">
                    <div class="venue">${escapeHTML(show.venue)}</div>
                    <div class="city">${escapeHTML(show.city)}</div>
                    ${show.time ? `<div class="time">🕐 ${escapeHTML(show.time)}</div>` : ''}
                </div>
                ${ticketBtn}
            </div>
        `;
    }).join('');
}

// Gallery
async function loadGallery() {
    const data = await fetchJSON('content/gallery.json');
    if (!data || !data.photos || data.photos.length === 0) return;

    const grid = document.getElementById('gallery-grid');
    const emptyState = document.getElementById('gallery-empty');
    if (!grid) return;

    emptyState.classList.add('hidden');

    grid.innerHTML = data.photos.map((photo, i) => `
        <div class="gallery-item" data-index="${i}" data-src="${fixPath(photo.image)}" data-caption="${escapeHTML(photo.caption || '')}">
            <img src="${fixPath(photo.image)}" alt="${escapeHTML(photo.caption || 'Foto')}" loading="lazy">
            <div class="overlay">
                <span>${escapeHTML(photo.caption || '')}</span>
            </div>
        </div>
    `).join('');
}

// Videos
async function loadVideos() {
    const data = await fetchJSON('content/videos.json');
    if (!data || !data.videos || data.videos.length === 0) return;

    const grid = document.getElementById('videos-grid');
    const emptyState = document.getElementById('videos-empty');
    if (!grid) return;

    emptyState.classList.add('hidden');

    grid.innerHTML = data.videos.map(video => {
        var vid = extractYouTubeId(video.youtube_id);
        if (!vid) return '';
        return `
        <div class="video-card">
            <div class="video-thumb" onclick="this.innerHTML='<iframe src=\\'https://www.youtube.com/embed/${vid}?autoplay=1\\' title=\\'${escapeHTML(video.title)}\\' allow=\\'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture\\' allowfullscreen></iframe>'">
                <img src="https://img.youtube.com/vi/${vid}/hqdefault.jpg" alt="${escapeHTML(video.title)}" loading="lazy">
                <div class="play-btn"><svg viewBox="0 0 68 48" width="68" height="48"><path d="M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55c-2.93.78-4.64 3.26-5.42 6.19C.06 13.05 0 24 0 24s.06 10.95 1.48 16.26c.78 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.64-3.26 5.42-6.19C67.94 34.95 68 24 68 24s-.06-10.95-1.48-16.26z" fill="red"/><path d="M45 24 27 14v20" fill="white"/></svg></div>
            </div>
            <div class="video-info">
                <h4>${escapeHTML(video.title)}</h4>
                ${video.description ? `<p>${escapeHTML(video.description)}</p>` : ''}
            </div>
        </div>
    `}).join('');
}

// Extract YouTube video ID from URL or raw ID
function extractYouTubeId(input) {
    if (!input) return null;
    input = input.trim();
    // Already a plain ID (no slashes, no dots)
    if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
    // Full URL: extract v= param or /embed/ or youtu.be/
    try {
        var url = new URL(input);
        if (url.searchParams.has('v')) return url.searchParams.get('v');
        if (url.pathname.startsWith('/embed/')) return url.pathname.split('/embed/')[1].split('/')[0];
        if (url.hostname === 'youtu.be') return url.pathname.substring(1).split('/')[0];
    } catch (e) {}
    // Last resort: return as-is
    return input;
}

/* ===== NAVIGATION ===== */

function initNavigation() {
    const navbar = document.getElementById('navbar');

    // Scroll effect
    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 50);
    }, { passive: true });

    // Active link on scroll
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.id;
                navLinks.forEach(link => {
                    const href = link.getAttribute('href');
                    link.classList.toggle('active', href === '#' + id || (id === 'home' && href === '#home'));
                });
            }
        });
    }, { threshold: 0.3, rootMargin: '-80px 0px 0px 0px' });

    sections.forEach(section => observer.observe(section));

    // Language buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => setLanguage(btn.dataset.lang));
    });
}

/* ===== MOBILE MENU ===== */

function initMobileMenu() {
    const toggle = document.getElementById('menu-toggle');
    const menu = document.getElementById('mobile-menu');
    const iconOpen = document.getElementById('menu-icon-open');
    const iconClose = document.getElementById('menu-icon-close');

    toggle.addEventListener('click', () => {
        const isOpen = !menu.classList.contains('hidden');
        menu.classList.toggle('hidden');
        iconOpen.classList.toggle('hidden', !isOpen);
        iconClose.classList.toggle('hidden', isOpen);
    });

    // Close on link click
    menu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            menu.classList.add('hidden');
            iconOpen.classList.remove('hidden');
            iconClose.classList.add('hidden');
        });
    });
}

/* ===== SCROLL ANIMATIONS ===== */

function initScrollAnimations() {
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    // Observe fade-in elements
    document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

    // Also observe glass cards and show cards
    document.querySelectorAll('.glass-card, .glass-card-light, .media-logo-card').forEach(el => {
        el.classList.add('fade-in');
        observer.observe(el);
    });
}

/* ===== MEDIA TABS ===== */

function initMediaTabs() {
    document.querySelectorAll('.media-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;

            // Update tab buttons
            document.querySelectorAll('.media-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Show/hide content
            document.querySelectorAll('.media-tab-content').forEach(content => {
                content.classList.add('hidden');
            });
            const targetContent = document.getElementById('tab-' + target);
            if (targetContent) targetContent.classList.remove('hidden');
        });
    });
}

/* ===== LIGHTBOX ===== */

function initLightbox() {
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxCaption = document.getElementById('lightbox-caption');
    const lightboxClose = document.getElementById('lightbox-close');

    // Open lightbox on gallery item click (delegated)
    document.getElementById('gallery-grid')?.addEventListener('click', e => {
        const item = e.target.closest('.gallery-item');
        if (!item) return;

        lightboxImg.src = item.dataset.src;
        lightboxCaption.textContent = item.dataset.caption || '';
        lightbox.classList.remove('hidden');
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    });

    // Close lightbox
    function closeLightbox() {
        lightbox.classList.add('hidden');
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
        lightboxImg.src = '';
    }

    lightboxClose.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', e => {
        if (e.target === lightbox) closeLightbox();
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && lightbox.classList.contains('active')) closeLightbox();
    });
}

/* ===== BACK TO TOP ===== */

function initBackToTop() {
    const btn = document.getElementById('back-to-top');

    window.addEventListener('scroll', () => {
        btn.classList.toggle('visible', window.scrollY > 500);
    }, { passive: true });

    btn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

/* ===== CUSTOM SELECT ===== */

function initCustomSelect() {
    var trigger = document.getElementById('custom-select');
    var dropdown = document.getElementById('select-dropdown');
    var label = document.getElementById('select-label');
    var hiddenInput = document.getElementById('subject-value');
    var arrow = document.getElementById('select-arrow');
    if (!trigger || !dropdown) return;

    trigger.addEventListener('click', function() {
        var isOpen = !dropdown.classList.contains('hidden');
        if (isOpen) {
            dropdown.classList.add('hidden');
            trigger.classList.remove('open');
        } else {
            dropdown.classList.remove('hidden');
            trigger.classList.add('open');
        }
    });

    var options = dropdown.querySelectorAll('.select-option');
    options.forEach(function(opt) {
        opt.addEventListener('click', function() {
            options.forEach(function(o) { o.classList.remove('active'); });
            opt.classList.add('active');
            label.textContent = opt.textContent;
            hiddenInput.value = opt.dataset.value;
            dropdown.classList.add('hidden');
            trigger.classList.remove('open');
        });
    });

    document.addEventListener('click', function(e) {
        if (!trigger.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.add('hidden');
            trigger.classList.remove('open');
        }
    });
}

/* ===== CONTACT FORM ===== */

function initContactForm() {
    const form = document.getElementById('contact-form');
    const status = document.getElementById('form-status');

    form.addEventListener('submit', async e => {
        e.preventDefault();

        const formData = new FormData(form);

        // Basic validation
        if (!formData.get('name') || !formData.get('email') || !formData.get('message')) return;

        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Enviando...';

        try {
            const res = await fetch(form.action, {
                method: 'POST',
                body: formData,
                headers: { 'Accept': 'application/json' }
            });

            if (res.ok) {
                status.textContent = t('contact.success') || 'Mensagem enviada com sucesso!';
                status.className = 'text-center text-sm mt-4 text-green-600';
                status.classList.remove('hidden');
                form.reset();
            } else {
                throw new Error('Erro');
            }
        } catch {
            // Fallback: mailto
            const data = Object.fromEntries(formData);
            const subject = encodeURIComponent('[Site] ' + (data.subject || 'Contato') + ' - ' + data.name + ' ' + (data.lastname || ''));
            const body = encodeURIComponent('Nome: ' + data.name + ' ' + (data.lastname || '') + '\nEmail: ' + data.email + '\nAssunto: ' + (data.subject || 'N/A') + '\n\nMensagem:\n' + data.message);
            window.location.href = 'mailto:denysjackson@denysjackson.com.br?subject=' + subject + '&body=' + body;
        }

        btn.disabled = false;
        btn.textContent = t('contact.send') || 'Enviar mensagem';
        setTimeout(() => status.classList.add('hidden'), 5000);
    });
}

/* ===== UTILITIES ===== */

function setCurrentYear() {
    const el = document.getElementById('current-year');
    if (el) el.textContent = new Date().getFullYear();
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
