# PROJECT_RULES.md — Denys Jackson Site

## Stack e Versões
- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **CSS Framework**: Tailwind CSS v3 (Play CDN)
- **Fonte**: Inter (Google Fonts) — pesos 400-900
- **Ícones**: Font Awesome 6.5 (CDN)
- **CMS**: Decap CMS v3 (CDN)
- **Hospedagem**: GitHub Pages
- **Domínio**: denysjackson.com.br (Registro.br)

## Estrutura de Pastas
```
/               → Raiz (index.html, CNAME)
/css/           → Estilos customizados
/js/            → JavaScript (main.js, i18n.js)
/content/       → Dados em JSON (editáveis pelo CMS)
/admin/         → Painel Decap CMS
/images/logos/  → Logos estáticos (mídia)
/images/uploads/→ Imagens enviadas pelo CMS
```

## Convenções de Código
- **Idioma do código**: Inglês (variáveis, funções, classes CSS)
- **Idioma do conteúdo**: Português principal, com EN/ES via i18n
- **Naming CSS**: kebab-case (glass-card, nav-link)
- **Naming JS**: camelCase (loadShows, initNavigation)
- **i18n**: Elementos com `data-i18n="chave"`, traduções em i18n.js
- **Conteúdo dinâmico**: JSON em `/content/`, carregado via fetch()

## Regras de UI/UX
- **Paleta escura**: bg #0a0a1a, navy #0f172a, purple #1a1040
- **Accent**: indigo #4338ca, gold #c9a96e
- **Seção clara**: cream #f5f0eb
- **Glassmorphism**: backdrop-blur + bg semi-transparente + borda sutil
- **Bordas**: rounded-lg a rounded-2xl
- **Responsividade**: Mobile-first, breakpoints md: e lg:
- **Animações**: fade-in via IntersectionObserver, transitions 0.2-0.3s

## Proibições
- NÃO usar ES modules (import/export) — site abre via file:// e GitHub Pages
- NÃO incluir dependências npm/node_modules
- NÃO usar frameworks JS (React, Vue, etc.)
- NÃO commitar credenciais, tokens ou secrets
- NÃO usar inline JavaScript nos elementos HTML (exceto onerror em imgs)
- NÃO criar arquivos sem atualizar ARCHITECTURE_MAP.md
