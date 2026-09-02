<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:project -->

# Velie — contexto del proyecto

Recreación de un CRM para automotoras chilenas a partir de capturas (`fotos/`).
**Antes de tocar nada, lee `docs/decisiones.md`.** Tiene cada decisión tomada con su
porqué y qué la revertiría, además de las decisiones que siguen abiertas. El código
dice qué se hizo; ese archivo dice por qué, que es lo que no se puede deducir después.

El análisis del producto original está en `docs/00-analisis-venpu.md`: léelo antes
de agregar entidades o pantallas, tiene el modelo de datos y las reglas de negocio.
El esquema propuesto está en `supabase/migrations/0001_init.sql`.

Cuando tomemos una decisión que no sea obvia mirando el código, anótala en
`docs/decisiones.md` sin esperar a que te lo pidan.

## Convenciones

- **Idioma**: todo en español — UI, nombres de dominio, comentarios y commits.
  Los tipos y campos del dominio van en español (`vehiculoTitulo`, `diasEnEtapa`).
- **Datos**: las pantallas nunca importan `seed.ts` directamente. Siempre pasan por
  `src/lib/data/index.ts`, que es async para poder cambiarse a Supabase sin tocar la UI.
- **Plata**: CLP entero, sin decimales. Usa `clp()` de `src/lib/format.ts`.
  Toda columna de cifras lleva la clase `tabular`.
- **Monocromo**: la paleta es neutra y el acento (`primary`) es el hueso `#F2F0EC`,
  o sea el mismo color del texto. **El color solo aparece cuando significa algo**:
  `ok` / `warn` / `crit` / `hot` para estados reales. Un rol, un canal o una etiqueta
  se distinguen por peso o por un punto, nunca por una cápsula de color.
- **Formas**: radio 3px (`--radius`), filetes de 1px, sin sombras. Las tablas no van
  dentro de una tarjeta: se separan con líneas horizontales.
- **Tipografía**: serif (`.display`, Newsreader) solo para títulos y cifras grandes;
  IBM Plex Sans para la interfaz; IBM Plex Mono para cifras y códigos (clase `.tabular`).
  Las etiquetas de sección usan `.overline`.
- **Antigüedad de stock**: `severidadDias()` tiene los umbrales del producto
  (>30d advertencia, >60d crítico). No los redefinas en cada pantalla.
- **`vehicleId` en un lead es opcional a propósito.** Un lead puede no tener vehículo.

## Lo que falta definir con el cliente

Antes de construir estas pantallas hay que resolver:
proveedor de datos de patente · APIs reales de Yapo y ChileAutos · qué entra en
`gastos` para calcular utilidad · modelo de comisión de consignación · permisos
del rol vendedor · qué es la pestaña "Matches" · cómo se calcula el % de completitud
y la temperatura del lead.

<!-- END:project -->
