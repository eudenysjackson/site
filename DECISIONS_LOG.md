# DECISIONS_LOG.md — Denys Jackson Site

> Registro de decisões arquiteturais. Antes de refatorar qualquer padrão, ler este doc primeiro.

---

### DEC-001 — Stack: HTML estático + Tailwind CDN
- **Data**: 2026-04-11
- **Decisão**: Site em HTML puro com Tailwind Play CDN, sem build step
- **Por quê**: GitHub Pages é hospedagem estática. Sem build = deploy simples (push e pronto). Tailwind CDN permite usar todas as classes sem configuração.
- **Consequências**: Tailwind compila no browser (pequeno overhead). Não é ideal para sites com tráfego altíssimo, mas perfeito para um site institucional/tributo.
- **Revisar quando**: Se o site precisar de performance extrema ou server-side rendering

### DEC-002 — CMS: Sveltia CMS (substituiu Decap CMS)
- **Data**: 2026-04-11 (atualizado 2026-04-12)
- **Decisão**: Usar Sveltia CMS com autenticação via Personal Access Token (PAT)
- **Por quê**: Decap CMS tinha problemas com OAuth proxy (404). Sveltia CMS é drop-in replacement, mais moderno, e suporta token auth sem servidor OAuth.
- **Consequências**: Usuário precisa gerar um PAT no GitHub e colar na tela de login. Token fica salvo no localStorage do browser.
- **Revisar quando**: Se GitHub liberar PKCE client-side (roadmap issue #1153), migrar para PKCE. Ou se precisar de login OAuth, usar Sveltia CMS Authenticator no Cloudflare Workers.

### DEC-003 — i18n: Sistema próprio em JS
- **Data**: 2026-04-11
- **Decisão**: Implementar tradução (PT/EN/ES) com sistema próprio usando data attributes
- **Por quê**: Leve, sem dependências, suficiente para o volume de texto. Traduções em um único arquivo JS.
- **Consequências**: Conteúdo dinâmico (JSON) precisa de campos separados por idioma (bio_pt, bio_en, bio_es)
- **Revisar quando**: Se o site crescer significativamente em páginas ou idiomas

### DEC-004 — Conteúdo: JSON files
- **Data**: 2026-04-11
- **Decisão**: Armazenar conteúdo em arquivos JSON em /content/
- **Por quê**: Compatível com Decap CMS, fácil de versionar, simples de consumir via fetch()
- **Consequências**: Sem busca/filtro no servidor. Tudo é client-side.
- **Revisar quando**: Se o volume de dados (shows, fotos) ficar muito grande (100+ itens)

### DEC-005 — Form: mailto fallback
- **Data**: 2026-04-11
- **Decisão**: Formulário de contato usa mailto: como solução inicial
- **Por quê**: GitHub Pages não suporta server-side. mailto é a solução mais simples sem dependências externas.
- **Consequências**: Depende do cliente de email do visitante. Não funciona se não tiver email configurado.
- **Revisar quando**: Substituir por Formspree ou similar quando quiser envio automático
