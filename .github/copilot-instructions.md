# Copilot Instructions — Denys Jackson Site

## Seção 0: Documentos Obrigatórios

Antes de qualquer tarefa, consulte os documentos relevantes:

| Documento | Quando consultar |
|---|---|
| `PROJECT_RULES.md` | Antes de criar qualquer código novo |
| `ARCHITECTURE_MAP.md` | Antes de criar/modificar componentes, e ATUALIZAR após qualquer mudança |
| `DECISIONS_LOG.md` | Antes de refatorar padrões existentes |
| `ERRORS_LOG.md` | Antes de resolver qualquer bug |
| `ROADMAP.md` | Para ver o que está pronto, pendente e priorizado |

## Seção 1: Contexto do Projeto

- **Projeto**: Site institucional do tributo "Denys Jackson - Na Ponta dos Pés"
- **Tipo**: Site estático com CMS (Decap CMS)
- **Hospedagem**: GitHub Pages
- **Domínio**: denysjackson.com.br
- **Stack**: HTML + Tailwind CDN + JS vanilla + Decap CMS
- **Idiomas**: PT (principal), EN, ES

## Seção 2: Regras de Trabalho

1. Toda tarefa finalizada → Atualizar `ARCHITECTURE_MAP.md`
2. Todo erro encontrado → Registrar em `ERRORS_LOG.md`
3. Toda decisão não-óbvia → Registrar em `DECISIONS_LOG.md`
4. Conteúdo dinâmico SEMPRE em `/content/*.json`
5. Textos de UI traduzíveis SEMPRE com `data-i18n` + entrada em `i18n.js`
6. NÃO usar ES modules, NÃO usar npm, NÃO usar frameworks JS
