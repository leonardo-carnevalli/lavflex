# Site na VPS (Coolify): estático + api/ rodando no vetor-funcs (vetor/infra/vps/vetor-funcs).
# Na Vercel nada muda: este arquivo só é usado pelo docker build.
ARG VETOR_FUNCS=vetor-funcs:1
FROM ${VETOR_FUNCS}
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY . .
# ARMAZEM=disco: dados e fotos no volume /data em vez do Vercel Blob (o painel também muda o envio de arquivo)
ARG ARMAZEM=disco
ARG SITE_URL=
ENV ARMAZEM=${ARMAZEM}
RUN SITE_URL=${SITE_URL} node build.cjs
USER node
