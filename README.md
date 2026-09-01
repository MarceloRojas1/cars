# Cars

CRM e inventario para automotoras, reconstruido por ingeniería inversa a partir de
capturas del producto original. SaaS multi-tenant.

## Correr

```bash
npm run dev     # http://localhost:3000 → redirige a /dashboard
npm run build
```

No necesita base de datos para arrancar: mientras `.env.local` no tenga credenciales
de Supabase, la app se sirve de los datos semilla en `src/lib/data/seed.ts`
(extraídos de las capturas reales).

## Estructura

```
src/app/(app)/            19 rutas, una por ítem del menú
src/components/shell/     sidebar, topbar y botón del asistente
src/components/           piezas compartidas (PageHeader, StatCard, badges…)
src/lib/types.ts          modelo de dominio
src/lib/data/             capa de acceso: hoy semilla, mañana Supabase
src/lib/supabase/         clientes de navegador y servidor
supabase/migrations/      esquema SQL con RLS por organización
docs/                     el análisis del producto original
fotos/                    las capturas de referencia
```

## Docker

```bash
docker compose up -d --build     # app en :3000 + Postgres en :5433
docker compose logs -f app
docker compose down              # -v además borra la base
```

El compose levanta el target `dev`: el código va montado, así que el hot reload
funciona igual que en local. La migración se aplica sola la primera vez que se crea
el volumen; para re-aplicarla, `docker compose down -v && docker compose up`.

Imagen de producción (235MB, standalone, usuario sin privilegios):

```bash
docker build --target runner -t cars:prod .
docker run --rm -p 3000:3000 cars:prod
```

Si los puertos chocan con algo tuyo, `APP_PORT` y `DB_PORT` en `.env.local`.

## Conectar Supabase

1. Crea el proyecto en supabase.com.
2. `cp .env.example .env.local` y pega URL y anon key.
3. Corre `supabase/migrations/0001_init.sql` en el SQL editor.
4. Reemplaza los cuerpos de las funciones en `src/lib/data/index.ts` por queries.
   Ninguna pantalla cambia: todas ya consumen esas funciones async.

## Estado

Fase 1 lista: shell navegable, tema, modelo de datos y 19 rutas con contenido real.
Las rutas marcadas con un punto en el menú están pendientes y dicen de qué fase dependen.
El plan por fases está en `docs/00-analisis-venpu.md`.
