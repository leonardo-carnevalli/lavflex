# Lav-Flex na VPS

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
