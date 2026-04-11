# ARCHITECTURE_MAP.md — Denys Jackson Site

> Última atualização: 2026-04-11

## Membros (UI Components)

| Componente | O que faz | Onde aparece |
|---|---|---|
| Navbar | Navegação fixa com logo (imagens), links, i18n switcher, menu mobile. Logo branca no hero, logo preta ao rolar. | Todas as páginas (topo) |
| Hero | Seção de abertura com título, CTA, background | index.html #home |
| Social Proof | Grid de logos de mídia (Globo, Multishow, etc.) | index.html #social-proof |
| About Section | Bio, foto, cards Missão/Objetivo/Comunidade | index.html #sobre |
| Tribute Section | Cards de features do show | index.html #tributo |
| Agenda Section | Lista de shows (carregada do JSON) | index.html #agenda |
| Media Section | Tabs Fotos/Vídeos, grid de galeria, vídeos embed | index.html #midias |
| Lightbox | Modal fullscreen para fotos | index.html (overlay) |
| Contact Section | Formulário + info de contato + redes sociais | index.html #contato |
| Footer | Links, copyright, logo | index.html (rodapé) |
| Back to Top | Botão flutuante para voltar ao topo | index.html (fixo) |

## Neurônios (Helpers)

| Nome | Função | Quem usa |
|---|---|---|
| `escapeHTML()` | Sanitiza strings para prevenir XSS | renderShows, loadGallery, loadVideos |
| `fetchJSON(url)` | Busca e parseia JSON com tratamento de erro | Todos os loaders de conteúdo |
| `t(key)` | Retorna tradução para o idioma atual | Qualquer lugar que precise de texto traduzido |

## Reflexos (Hooks/State)

| Nome | Estado | Uso |
|---|---|---|
| `currentLang` | Idioma ativo (pt/en/es) | i18n.js — controla traduções |
| `showsData` | Array de shows carregados | main.js — renderShows() |
| `localStorage.dj_lang` | Idioma salvo do usuário | i18n.js — persistência |

## DNA (Data Schemas)

### site.json
```json
{ "site_name": "string", "tagline": "string", "email": "string",
  "phone": "string", "cnpj": "string", "hero_image": "string",
  "social": { "instagram": "url", "facebook": "url", "youtube": "url",
              "tiktok": "url", "threads": "url", "sandwiche": "url" } }
```

### shows.json
```json
{ "shows": [{ "date": "YYYY-MM-DD", "time": "HH:MM", "venue": "string",
              "city": "string", "ticket_url": "url", "status": "confirmado|esgotado|cancelado" }] }
```

### gallery.json
```json
{ "photos": [{ "image": "path", "caption": "string" }] }
```

### videos.json
```json
{ "videos": [{ "title": "string", "youtube_id": "string", "description": "string" }] }
```

### about.json
```json
{ "main_photo": "path", "bio_pt": "text", "bio_en": "text", "bio_es": "text",
  "mission_pt": "text", "mission_en": "text", "mission_es": "text",
  "objective_pt": "text", "objective_en": "text", "objective_es": "text",
  "community_pt": "text", "community_en": "text", "community_es": "text" }
```

## Caminhos (Routing)

| Rota | Componente | URL |
|---|---|---|
| / | index.html (SPA com âncoras) | denysjackson.com.br |
| /admin/ | Decap CMS | denysjackson.com.br/admin/ |
| /#home | Hero section | âncora |
| /#sobre | About section | âncora |
| /#agenda | Schedule section | âncora |
| /#midias | Media section | âncora |
| /#contato | Contact section | âncora |

## Órgãos (Services)

| Serviço | Conexão | Uso |
|---|---|---|
| Google Fonts CDN | fonts.googleapis.com | Fonte Inter |
| Tailwind CDN | cdn.tailwindcss.com | Framework CSS |
| Font Awesome CDN | cdnjs.cloudflare.com | Ícones |
| Decap CMS CDN | unpkg.com/decap-cms | Painel admin |
| YouTube embed | youtube.com/embed/ | Vídeos |
| GitHub API | Via Decap CMS | Salvar conteúdo |

## Mapa de Conexões

```
[Usuário] → index.html → JS (main.js + i18n.js)
                            ├── fetch → content/*.json → Render HTML
                            └── i18n → translations → Update DOM

[Admin]  → admin/index.html → Decap CMS
                                ├── GitHub API → content/*.json (CRUD)
                                └── GitHub API → images/uploads/ (upload)
```

## Changelog de Integridade

| Data | Alteração |
|---|---|
| 2026-04-11 | Criação inicial do projeto: index.html, css/style.css, js/main.js, js/i18n.js, content/*.json, admin/ |
