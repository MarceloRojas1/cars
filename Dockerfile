# syntax=docker/dockerfile:1

# Multi-stage: `dev` para desarrollar con hot reload, `runner` para desplegar.
# Elige con `--target dev` o `--target runner`.

FROM node:22-alpine AS base
WORKDIR /app
# Next lo recomienda en Alpine para compatibilidad de librerías nativas.
RUN apk add --no-cache libc6-compat


# --- dependencias -----------------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci


# --- desarrollo -------------------------------------------------------------
# El código se monta como volumen desde compose; node_modules queda en la imagen.
FROM base AS dev
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0"]


# --- build ------------------------------------------------------------------
FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build


# --- producción -------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Render, Fly y similares inyectan su propio PORT: este es solo el valor por defecto.
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Nunca como root.
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
# `standalone` trae el server y solo las dependencias que realmente se usan.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/dashboard').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
