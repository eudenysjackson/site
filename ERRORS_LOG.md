# ERRORS_LOG.md — Denys Jackson Site

> Memória de cura. Antes de resolver um bug, verificar se já foi resolvido aqui.

| ID | Descrição | Causa Raiz | Solução | Prevenção |
|---|---|---|---|---|
| ERR-001 | CMS: "configuration error" ao acessar /admin/ | `auth_type: pkce` e `app_id` no config.yml — GitHub NÃO suporta PKCE client-side (nem Sveltia CMS implementou) | Removidas as linhas `auth_type: pkce` e `app_id`. Usando autenticação via Personal Access Token (PAT) | Antes de configurar auth, consultar docs oficiais do backend (sveltiacms.app/en/docs/backends/github) |
| ERR-003 | Imagens quebradas (?) após upload no CMS | Repo errado (`site` vs `sitedenysjackson`) + URLs com espaços/acentos sem encode | `mediaUrl()` com encode + repo corrigido + cache-buster em todas mídias CMS | Nomes de arquivo sem espaços; JPG/WebP nos tamanhos recomendados no config |
| ERR-004 | CMS local: "Unexpected Error" no Sveltia | Sveltia usa File System Access API (seletor de pasta) — falha em alguns browsers/ambientes | Localhost usa Decap CMS + decap-server (8081); online continua Sveltia | Rodar `iniciar-local.ps1`; no admin local clicar **Entrar** (não "Repositório Local") |
| ERR-005 | Site oficial mudou sem `git push` local | (1) CMS publicou direto no GitHub (`Update 📸 Galeria`); (2) `main.js` lia `raw.githubusercontent.com/main/` antes do deploy; (3) fallback de upload usava token GitHub no localhost | Removido `GITHUB_RAW`; upload local não usa GitHub; guard bloqueia Save/Publish se decap-server (8081) estiver offline; banner laranja no admin local | Local: sempre `iniciar-local.bat`; site oficial só muda após `git push`; revert no GitHub se publicou por engano |
