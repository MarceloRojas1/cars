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

## 2026-08-31 — Rediseño de identidad visual

**Se abandona el negro + amarillo y se pasa a monocromo hueso.**
Por qué: el par negro/amarillo saturado era la firma visual del producto original y
lo que lo hacía reconocible al instante. Es el cambio que más pesa de todos.

**El acento es el color del texto (`#F2F0EC`), no un color de marca.**
Consecuencia: el color queda libre para significar algo. `ok` / `warn` / `crit` /
`hot` son los únicos que aportan color, y están desaturados para que se lean como
estado y no como decoración. Un rol o un canal ya no llevan cápsula de color.

**Aristas nítidas: radio 3px, filetes de 1px, sin sombras.**
Por qué: el ritmo de tarjetas redondeadas de 8px sobre negro era el tercer rasgo
más identificable. Las tablas perdieron su contenedor y se separan con líneas.

**Serif editorial (Newsreader) en títulos y cifras grandes.**
Por qué: ningún CRM usa serif; es el cambio que más altera la percepción después
del color. Dosificada: solo `.display`, nunca en texto corrido ni en tablas.

**El item activo del menú pasó de píldora amarilla rellena a filete lateral.**
Por qué: ese gesto era directamente reconocible del original.

**Lo que NO se cambió: la estructura.**
Sidebar de tres grupos, tabla con filtros, kanban por etapa. Es cómo funciona
cualquier CRM y no hay nada que disimular ahí. Cambiar la estructura por cambiarla
habría empeorado el producto sin ganar diferenciación.

## 2026-08-31 — Publicación de vehículo (primer flujo de escritura)

**Se conecta Postgres de verdad; los vehículos dejan de salir de la semilla.**
Por qué: un formulario de creación que no persiste es teatro. Además, una función
de escritura es justamente lo que prueba si el modelo de datos está bien.
La app sigue funcionando sin base: si no hay `DATABASE_URL`, cae a la semilla.

**Solo los vehículos vienen de la base; el resto sigue en semilla.**
Consecuencia: los ids no calzan (semilla usa `suc_001`, Postgres usa uuid), así que
`src/lib/data/ids.ts` traduce en ambos sentidos con una función determinista.
Es andamiaje: se borra cuando todas las entidades vivan en la base.

**Los modelos se autocompletan desde el inventario, no de un catálogo mantenido.**
Por qué: las marcas son finitas y estables; los modelos son cientos y cambian cada
año. Un catálogo fijo envejece mal. Hay una semilla corta de los más vendidos en
Chile para que el desplegable no arranque vacío, y lo que escribas queda disponible
para la próxima carga.

**Tags con vocabulario cerrado + opción de crear uno.**
Por qué: con tags libres terminas con "familiar", "Familiar" y "fam." y no puedes
filtrar por nada.

**Mínimo para guardar: marca, modelo, año y precio.**
Por qué: el vendedor carga rápido y no pierde el auto por no tener a mano la fecha
de la revisión técnica. El resto se completa después y alimenta la completitud.

**El título se autogenera hasta que lo editas; ahí se congela.**
Con un enlace para volver al automático. Si escribiste un título propio, cambiar el
año no debería pisártelo.

**Único dueño es un switch; si dices que no, aparece "cuántos dueños".**
En la base es una sola columna `cantidad_duenos` — 1 equivale a único dueño.

**El pie de financiamiento es monto en CLP, no porcentaje.**
Por qué: es como se publica en Chile ("pie desde $3.000.000").

**`calcularCompletitud()` es PROVISORIO y está aislado en un archivo.**
No sabemos qué campos pondera el producto original ni con qué peso. Hoy todos los
campos valen igual. Cuando el cliente lo defina, se cambia una sola función.

**La búsqueda por patente queda en la interfaz pero desconectada.**
El botón está deshabilitado y dice explícitamente que falta contratar el proveedor.
Se prefirió eso a esconder la funcionalidad o a fingir que responde.

## 2026-08-31 — Descripción, ubicación y fotos

**`descripcion` y `equipamiento` son campos distintos.**
Descripción es el relato de venta; equipamiento es la lista de lo que trae. Separarlos
permite después mostrarlos distinto en el aviso y en los portales.

**Región y comuna viven en el vehículo, no solo en la sucursal.**
Se prellenan al elegir sucursal pero quedan editables: un auto puede estar en otro
lado (en consignación, en taller, en otra ciudad). El catálogo completo de las 16
regiones con sus comunas está en `src/lib/geo-chile.ts`.

**Sucursal y vendedor salen de la base, no de una lista fija.**
Hoy hay una sola sucursal (Los Trapenses) y dos usuarios, pero el desplegable se
puebla con lo que haya en `branch` y `app_user`. Cuando se cree una sucursal nueva
aparece sola, sin tocar el formulario.

**Las fotos se suben por `/api/fotos`, NO dentro del Server Action.**
Por qué: los Server Actions tienen un límite de 1 MB de cuerpo y 50 fotos no caben
ni cerca. El formulario sube primero y envía solo las URL resultantes. Además es la
misma forma que tendrá con almacenamiento en la nube.

**El almacenamiento está detrás de un adaptador (`src/lib/storage.ts`).**
⚠ La implementación actual escribe en disco local y SOLO SIRVE EN DESARROLLO: en
Vercel el sistema de archivos es efímero y de solo lectura, así que las fotos se
perderían en cada despliegue. Antes de desplegar hay que cambiar `guardarImagen`
por Supabase Storage o Vercel Blob — es lo único que cambia, el resto de la app
solo conoce la URL.

**Una sola foto principal, garantizado por la base.**
Índice único parcial sobre `vehicle_photo (vehicle_id) where es_principal`. La regla
no depende de que la interfaz se porte bien.

**El vehículo y sus fotos se insertan en una transacción.**
Si falla una foto no queda un vehículo a medias.

## 2026-08-31 — Acciones sobre la ficha (editar, archivar, eliminar, estado)

**Archivar, eliminar y cambiar estado son tres cosas distintas.**
- *Archivar*: sale del listado activo, conserva historial, se revierte. Columna
  `archivado_at`, no un valor del enum de estado — un auto archivado puede haberse
  vendido o no, son ejes independientes.
- *Eliminar*: se cargó por error y no debería existir. Borrado real, con diálogo de
  confirmación que ofrece archivar como alternativa.
- *Cambiar estado*: sigue en inventario, cambia su situación comercial.

**Editar no toca el estado ni la fecha de publicación.**
Por qué: "días en salón" es un KPI del negocio; si editar reiniciara `publicado_at`
se podría maquillar el envejecimiento del stock corrigiendo una coma.

**Al editar, las fotos se reemplazan completas.**
La interfaz manda el set final y el servidor borra e inserta dentro de una
transacción. Es más simple que calcular diferencias y no deja estados a medias.

**Un mismo formulario crea y edita.**
`VehiculoForm` recibe `vehiculo?` opcional y decide la acción. Evita que dos
formularios se desincronicen al agregar un campo.

**`getVehiculo` valida el formato del id antes de consultar.**
Un id mal formado hacía que Postgres tirara error y la página respondiera 500.
Ahora devuelve 404, que es lo correcto.

**El listado por defecto excluye archivados**, con pestaña propia y su contador.

## 2026-08-31 — El aislamiento entre automotoras no existía

**Hallazgo:** las políticas RLS estaban desde la migración 0001 pero **no filtraban
nada**. Se comprobó creando una segunda organización: una sola consulta devolvía
vehículos de ambas. Dos causas encadenadas:

1. `enable row level security` **no aplica al dueño de la tabla**, y la app
   conectaba con el rol que creó las tablas.
2. Aun forzándolo, ese rol es **superusuario**, y los superusuarios se saltan RLS
   siempre, sin excepción.

**Arreglo en tres partes:**

- `force row level security` en las 15 tablas con datos de cliente (migración 0005).
- Un rol de aplicación sin privilegios, `velie_app` (`docker/initdb/06-rol-app.sql`):
  no es superusuario y no puede saltarse RLS. Es el equivalente local del rol
  `authenticated` de Supabase, así que el comportamiento es igual en ambos lados.
- **Cada consulta declara su organización dentro de su transacción**, vía
  `consultar()` / `enTransaccion()` en `src/lib/db.ts`.

**`set_config(..., true)` — el `true` no es opcional.** Fija la variable solo
dentro de la transacción. Con un pool las conexiones se reutilizan entre
peticiones: fijarla a nivel de conexión haría que una petición heredara la
organización de otra, que es exactamente la filtración que se está evitando.

**El `organization_id` siempre viene del servidor tras autenticar.** Nunca de la
URL, de un formulario ni de una cabecera. Hoy es una constante porque no hay
autenticación; ese es el punto 1 de `docs/escalar-a-200-clientes.md`.

**8 tests en `tests/aislamiento.test.ts`** (`npm run test:aislamiento`): lectura,
lectura por id ajeno, update, delete, insert a nombre de otro, consulta sin
organización declarada, y que las 15 tablas tengan RLS forzado. Hay que correrlos
antes de cada despliegue.

## 2026-09-01 — Nombre definitivo: Velie

**El proyecto pasa de `cars` (provisorio) a `velie`**, según la guía de marca en
`pdf/Velie-Guia-de-Marca.pdf`. Alcance: paquete, proyecto de compose, base de datos,
roles de Postgres, imagen Docker, interfaz, docs y memoria.

**La base se renombró en caliente, sin perder datos.** Las contraseñas usan
SCRAM-SHA-256, que no depende del nombre del rol, así que sobreviven al `alter role
rename` — con md5 se habrían roto. El rol de sesión no puede renombrarse a sí mismo:
hizo falta un superusuario temporal. Y como cambiar el nombre del proyecto de compose
apunta a otro volumen, hubo que copiar `cars_pgdata` a `velie_pgdata`.

**Solo se aplicó el wordmark, no el isotipo.** La guía describe un escudo de dos
formas en índigo y naranja, pero los `.svg` no están en el repo. Inventar la forma
del logo habría sido peor que dejarlo pendiente. El wordmark sí sigue la guía:
Sora ExtraBold 800, `letter-spacing -0.01em`, en hueso sobre fondo oscuro
(la guía contempla esa versión).

**La paleta de marca todavía NO está aplicada.** Índigo `#4F46E5` y naranja
`#F97316` sobre neutros cálidos contradicen el monocromo hueso que se decidió el
2026-08-31. Es una decisión pendiente, no un olvido: hay que resolver cuánto de la
identidad de marca entra en la interfaz del producto.

## 2026-09-01 — El logo salió del propio PDF, no de una foto

**Los vectores del isotipo se extrajeron del PDF de la guía de marca**, no se
redibujaron a ojo ni se trazaron desde una imagen. El PDF no traía imágenes
embebidas: el logo estaba dibujado con operadores de trazado, así que se leyeron
las curvas reales y se convirtieron a SVG. El resultado renderizado es idéntico
al original.

Quedaron dos archivos en `public/marca/`:
- `velie-isotipo-color.svg` — con los valores oficiales de la guía (#4F46E5 / #F97316).
  Los del PDF venían como #4E45E4 por conversión de color; manda la guía.
- `velie-isotipo-mono.svg` — `fill="currentColor"`, un solo archivo para blanco,
  hueso o negro.

**El isotipo va inline como componente React, no como `<img>`.**
Con `<img>` no funciona `currentColor` y harían falta tres archivos distintos para
tres fondos. Inline, hereda el color del contenedor y la versión de un solo color
—que la guía contempla— sale gratis.

**Favicon en `src/app/icon.svg`**, versión a color: se lee bien en pestaña clara
y oscura.

## 2026-09-02 — Imagen de demostración autocontenida

**Se agregó una etapa `demo` con Postgres dentro del mismo contenedor**, para
levantar una prueba en Render sin depender de una base externa. Arranca sola:
inicializa Postgres, aplica las 5 migraciones, crea el rol de aplicación y carga
la semilla. 335 MB, ~100 MB de RAM.

**⚠ Solo para pruebas.** La base vive dentro del contenedor: los datos se pierden
en cada reinicio, y en el plan gratuito de Render eso ocurre tras cada rato sin
visitas. Para algo real es `--target runner` + `DATABASE_URL` a un Postgres
gestionado — y ese cambio es solo la variable de entorno.

**`demo` es la última etapa del Dockerfile a propósito**, porque Render construye
la última cuando no se le indica un target. Cuando el destino sea Vercel esto deja
de importar: Vercel no usa el Dockerfile.

**La semilla se genera como SQL en tiempo de compilación** (`npm run db:seed-sql`).
La imagen de producción no lleva código fuente ni tsx, así que la semilla no puede
ser un script de TypeScript.

**El aislamiento sigue vivo dentro de la imagen**: sin declarar organización se ven
0 vehículos; declarándola, 24. Es el mismo camino que en desarrollo, no una versión
relajada para la demo.

## 2026-09-02 — Todo el panel es dinámico

`export const dynamic = "force-dynamic"` en `src/app/(app)/layout.tsx`.

Sin esto, Next prerenderizaba 9 páginas al construir la imagen y servía para siempre
los datos que existían en el build — el dashboard habría mostrado la semilla
congelada aunque hubiera una base conectada. En un CRM multi-tenant no hay nada
prerenderizable: todo depende de qué organización mira y del estado actual.

## Decisiones pendientes

- [ ] **¿Conectar Supabase antes de la Fase 2 o seguir con semilla?**
      Recomendación: seguir con semilla — el esquema aún se moverá al definir gastos
      y comisiones, y migrar datos semilla es gratis.
- [ ] Qué entra exactamente en `gastos` (define el cálculo de utilidad, hoy en $0).
- [ ] Modelo de comisión de consignación.
- [ ] Proveedor de datos para Consultar patente.
- [ ] Permisos del rol vendedor (¿ve precios de compra y utilidad?).
