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
# Activa `output: standalone` en next.config.ts. Vercel construye sin esta
# variable porque arma sus propias funciones y esa salida no le sirve.
ENV DOCKER_BUILD=1
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


# --- demostración -----------------------------------------------------------
# Un solo contenedor autocontenido: aplicación + Postgres + migraciones + datos
# de ejemplo. Pensado para levantar una prueba en Render sin depender de una
# base externa.
#
# NO USAR EN PRODUCCIÓN. La base vive dentro del contenedor, así que los datos
# se pierden cada vez que se reinicia — y en el plan gratuito de Render eso pasa
# tras cada rato sin visitas. Para algo real: `--target runner` + DATABASE_URL
# apuntando a un Postgres gestionado.
#
# Es la ÚLTIMA etapa a propósito: Render construye la última cuando no se le
# indica un target, y hoy Render es el entorno de prueba.
FROM base AS demo
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV PGDATA=/var/lib/postgresql/data
ENV PATH=$PATH:/usr/libexec/postgresql17:/usr/lib/postgresql17/bin

RUN apk add --no-cache postgresql17 postgresql17-client su-exec

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

COPY supabase/migrations ./db/migrations
COPY supabase/seed.sql ./db/seed.sql
COPY docker/initdb/00-auth-shim.sql ./db/00-auth-shim.sql
COPY docker/initdb/06-rol-app.sql ./db/06-rol-app.sql
COPY docker/entrypoint-demo.sh /entrypoint.sh

# Postgres se niega a correr como root, y la app escribe las fotos subidas.
RUN adduser -D -u 70 -h /var/lib/postgresql postgres 2>/dev/null || true \
 && mkdir -p /var/lib/postgresql/data /app/public/uploads/vehiculos /run/postgresql \
 && chown -R postgres:postgres /var/lib/postgresql /app /run/postgresql \
 && chmod 700 /var/lib/postgresql/data

USER postgres
EXPOSE 3000
CMD ["/entrypoint.sh"]
