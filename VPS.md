# Lav-Flex na VPS

> **25/11/2026:** o plano agora é `vetor/infra/vps/MIGRACAO-2026-11.md` (VPS Hostinger com Docker e Caddy, sem Coolify). Manifesto: `vetor/infra/vps/deploy/apps/lavflex-marilia.json`; bloco do Caddy: `vetor/infra/vps/caddy/sites/lavflex-marilia.caddy`; env: `vetor/.segredos/vps-env/lavflex-marilia.env`. Domínio: `lavflex.vetoragencia.com.br` (o `build.cjs` passou a usar esse endereço no canonical e no sitemap). `compose.yml` nesta pasta; dados em `/srv/vetor/data/lavflex-marilia`. As etiquetas já impressas com `lavflex-marilia.vercel.app/r/...` não abrem mais (a Vercel está fora). O resto deste arquivo é de 21/10 (Coolify) e fica só como referência.

Contrato: `vetor/infra/vps/TECNICO.md` (4.6). Na Vercel nada muda: `ARMAZEM` não existe lá e o site segue no Blob.

- **Domínio alvo:** `lavflex.vetoragencia.com.br` (ensaio em `lavflex.vps.vetoragencia.com.br`). Os links e QR de rastreio usam `location.origin`; etiquetas já impressas com `lavflex-marilia.vercel.app/r/...` dependem do redirecionamento na Vercel (TECNICO P5).
- **Variáveis (runtime):** `PAINEL_SENHA`, `PAINEL_SEGREDO`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`. Com `ARMAZEM=disco` o `BLOB_READ_WRITE_TOKEN` não é usado.
- **Build args:** `SITE_URL` (vazio = lavflex-marilia.vercel.app), `ARMAZEM` (padrão `disco`), `VETOR_FUNCS`.
- **Volume:** nomeado, montado em `/data`. Guarda `dados/estado.json`.
- **Na troca:** copiar o store `lavflex-dados` (hoje vazio), cadastrar no Stripe o endpoint `https://<domínio>/api/stripe-webhook` (endpoint novo = `whsec_` novo) e mandar um evento de teste.

## Coolify

- Build pack **Dockerfile** (na raiz). Porta **3000**. Healthcheck já vem na imagem (`GET /`).
- A imagem começa com `FROM vetor-funcs:1` (`vetor/infra/vps/vetor-funcs`). Ela precisa existir no Docker da VPS ou num registry (build arg `VETOR_FUNCS`).
- **Uma réplica só** (o controle de escrita do `armazem.js` é do processo).
