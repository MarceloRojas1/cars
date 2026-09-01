# Registro de decisiones

Una línea por decisión tomada, con su porqué. Esto sobrevive a cualquier sesión:
es lo primero que hay que leer al retomar el proyecto.

Formato: fecha · decisión · por qué · qué la revertiría.

---

## 2026-08-31 — Producto y stack

**SaaS multi-tenant, no una app para una sola automotora.**
Por qué: el objetivo es vender el producto a varias automotoras, como el VENPU original.
Consecuencia: todo cuelga de `organization_id` y la migración trae RLS desde el día uno.
Revertirlo después sería carísimo; hacerlo ahora costó ~20 líneas.

**Next.js 16 (App Router) + TypeScript + Supabase.**
Por qué: un solo repo, sin backend aparte, Postgres con RLS que resuelve el aislamiento
multi-tenant sin escribir middleware de permisos.
Qué lo revertiría: si el motor de routing de leads y los webhooks crecen mucho,
puede convenir sacar una API aparte (Fastify/NestJS).

**Tailwind 4 + shadcn/ui.**
Por qué: los componentes se copian al repo y se editan; tabla, kanban y formularios
ya resueltos sin pelear con una librería cerrada.

**Empezar por el esqueleto navegable, no por una pantalla completa.**
Por qué: ver las 19 rutas y el layout el primer día permite validar la estructura
antes de invertir en profundidad.

## 2026-08-31 — Arquitectura de datos

**La capa de acceso (`src/lib/data/index.ts`) es async desde el principio, aunque hoy
devuelva datos semilla.**
Por qué: cambiar a Supabase se vuelve mecánico — se reemplaza el cuerpo de cada
función por su query y ninguna pantalla se toca.

**`lead.vehicle_id` es nullable a propósito.**
Por qué: en las capturas del producto real, un tercio de los leads aparece como
"Sin vehículo" (consignación, compra o consulta general). Hacerlo obligatorio
rompería el modelo.

**`client` y `lead` son tablas distintas.**
Por qué: el lead quiere comprar; el cliente es la contraparte que vende o consigna,
deduplicada por RUT. Son dos flujos con datos distintos.

**Un solo modelo `operation` para venta, compra, consignación y nota de venta,
discriminado por `kind`.**
Por qué: comparten casi todos los campos. Qué lo revertiría: si las notas de venta
acumulan lógica contable propia (pagos parciales, documentos), separarlas.

**Los tokens semánticos (`ok` / `warn` / `crit`) son distintos del acento amarillo.**
Por qué: en el original el amarillo es a la vez marca y estado "disponible", y eso
hace que un badge y un botón primario compitan visualmente.

## 2026-08-31 — Contenedores

**Dockerfile multi-stage con dos targets: `dev` y `runner`.**
Por qué: la imagen de desarrollo necesita el código montado y hot reload; la de
producción necesita lo contrario — nada de fuentes, usuario sin privilegios y el
mínimo de dependencias. Un solo archivo, dos usos, sin duplicar configuración.

**`output: "standalone"` en next.config.ts.**
Por qué: Next empaqueta el server con solo las dependencias que realmente usa.
La imagen de producción quedó en 235MB en lugar de ~1GB.

**Postgres local en el compose, con la migración aplicada al arrancar.**
Por qué: permite probar el esquema real sin crear cuenta en Supabase, y calza con
la decisión de seguir con datos semilla mientras el modelo se asienta.

**Un shim de `auth` para que la misma migración corra local y en Supabase.**
`docker/initdb/00-auth-shim.sql` crea el esquema `auth`, la tabla `auth.users` y la
función `auth.uid()` que Supabase trae de fábrica y Postgres a secas no.
Por qué: mantener UNA sola migración. La alternativa era tener dos esquemas que se
desincronizan. En Supabase el shim no se aplica.

**El Postgres del compose se expone en el 5433, no en el 5432.**
Por qué: la máquina ya tiene un Postgres propio escuchando en el 5432. Configurable
con `DB_PORT` y `APP_PORT`.

## 2026-08-31 — Despliegue de prueba en Render

**Render como entorno de prueba temporal; Vercel es el destino final.**
Por qué: solo se necesita un link para compartir ahora. Render corre la misma imagen
Docker que ya tenemos, así que no hay que adaptar nada.
Qué lo revertiría: nada — es deliberadamente provisorio. Vercel no usa el Dockerfile,
así que ese cambio será otra decisión.

**`render.yaml` en el repo en vez de configurar por la web.**
Por qué: la configuración queda versionada y reproducible. Si el servicio se borra o
se recrea, se levanta igual sin recordar qué se marcó en cada casilla.

**El healthcheck del Dockerfile lee `process.env.PORT`.**
Por qué: Render (y Fly, y Railway) inyectan su propio puerto. Estaba fijo en 3000 y
el contenedor habría quedado marcado como no saludable.

**`healthCheckPath: /dashboard`, no `/`.**
Por qué: la raíz responde 307 redirigiendo al dashboard.

**Sin base de datos en el despliegue de prueba.**
Por qué: la app corre con datos semilla. El Postgres del compose es solo para
desarrollo local. Agregar una base a Render sería trabajo sin uso hoy.

## Decisiones pendientes

- [ ] **¿Conectar Supabase antes de la Fase 2 o seguir con semilla?**
      Recomendación: seguir con semilla — el esquema aún se moverá al definir gastos
      y comisiones, y migrar datos semilla es gratis.
- [ ] Qué entra exactamente en `gastos` (define el cálculo de utilidad, hoy en $0).
- [ ] Modelo de comisión de consignación.
- [ ] Proveedor de datos para Consultar patente.
- [ ] Permisos del rol vendedor (¿ve precios de compra y utilidad?).
