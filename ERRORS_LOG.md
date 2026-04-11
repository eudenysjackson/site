# ERRORS_LOG.md — Denys Jackson Site

> Memória de cura. Antes de resolver um bug, verificar se já foi resolvido aqui.

| ID | Descrição | Causa Raiz | Solução | Prevenção |
|---|---|---|---|---|
| ERR-001 | CMS: "configuration error" ao acessar /admin/ | `auth_type: pkce` e `app_id` no config.yml — GitHub NÃO suporta PKCE client-side (nem Sveltia CMS implementou) | Removidas as linhas `auth_type: pkce` e `app_id`. Usando autenticação via Personal Access Token (PAT) | Antes de configurar auth, consultar docs oficiais do backend (sveltiacms.app/en/docs/backends/github) |
| ERR-002 | CMS: Decap CMS OAuth proxy 404 (decap-oauth.netlify.app) | Proxy público do Netlify não está disponível/funcional para repos não-Netlify | Migrado de Decap CMS para Sveltia CMS + token auth | Não depender de proxies OAuth de terceiros sem garantia de uptime |
