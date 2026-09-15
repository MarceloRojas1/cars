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

## 2026-09-02 — Consulta de patente con Boostr

**Proveedor elegido: Boostr** (`api.boostr.cl`), una de las preguntas de negocio
que estaban abiertas. Endpoint `GET /vehicle/{patente}.json`, autenticación por
cabecera `X-API-KEY`, límite de 5 consultas cada 10 segundos.

**Sin `BOOSTR_API_KEY` se usa `/vehicle/fake/`**, que devuelve datos de ejemplo con
la misma estructura. Así el flujo completo se puede probar sin contratar el
servicio, y activarlo después es una variable de entorno.

**Boostr entrega modelo y versión en un solo campo** (`"NEW WRX S AWD CVT 2.0T"`).
Se separan buscando un modelo conocido de esa marca dentro del texto; lo que sobra
queda como versión. Con datos limpios sale perfecto (`HILUX 2.4 DX 4X4` → Hilux +
2.4 DX 4X4); con datos sucios queda aproximado y el vendedor lo corrige. La
alternativa —meter todo en `modelo`— ensuciaría el catálogo que se autocompleta
desde el inventario.

**`type` = AUTOMOVIL no se mapea a carrocería a propósito**: no distingue sedán de
hatchback, y una carrocería incorrecta es peor que una vacía. Sí se mapean
CAMIONETA, JEEP→SUV, STATION WAGON, FURGON y MINIBUS.

**El número de motor llega pero no se guarda**: no tenemos columna. Es un dato que
va en la transferencia, así que probablemente valga la pena agregarlo.

**Caché de 24 h en `plate_lookup`.** La consulta se paga por uso; repetir la misma
patente el mismo día es dinero tirado. La tabla no lleva `organization_id` ni RLS a
propósito: el dato del Registro Civil no es de nadie en particular.

**`BOOSTR_BASE_URL` es configurable** para poder apuntar a un doble en las pruebas.

**No se pudo llamar la API desde este entorno**: Cloudflare bloquea la IP del
sandbox con un 403 en todas las rutas, con clave o sin ella. La integración se
construyó contra el OpenAPI oficial y se verificó con un servidor que devuelve sus
respuestas exactas. Falta probarla contra el servicio real.

## 2026-09-02 — Preparado para el plan extendido de patentes

**El mapeo lee los campos del plan extendido si vienen, y los ignora si no.**
Todos son opcionales, así que el mismo código sirve para el plan gratuito y para
el de pago: activar el extendido es poner `BOOSTR_API_KEY` del plan Pro, sin
tocar ni una línea. Verificado con las dos respuestas: el gratuito llena 5 campos,
el extendido llena 12.

**Se agregaron `vin`, `numero_motor` y `cilindrada`** (migración 0006). El número
de motor ya llegaba con el plan gratuito y se estaba descartando; va en la
transferencia, así que ahora se guarda.

**Con el plan extendido la versión llega aparte**, así que se deja de adivinar el
corte de modelo/versión. La heurística solo actúa cuando no viene.

**Los valores del Registro Civil se normalizan pero no se descartan.**
DIESEL→Diésel, MECANICA→Manual, etc. Si aparece un valor desconocido se deja pasar
con mayúscula inicial en vez de perderlo: un dato raro es mejor que ninguno.

**La caché puede servir datos pobres tras cambiar de plan.** Si se consultó una
patente con el plan gratuito y después se contrata el extendido, durante 24 h se
seguiría devolviendo la respuesta guardada. Por eso `consultarPatente` acepta
`forzar`, y la pantalla ofrece "consultar de nuevo" cuando el dato salió de caché.

**Techo conocido:** el plan Pro da 100 consultas al día para toda la cuenta, no por
automotora. Alcanza de sobra para una, pero con veinte clientes se agota temprano.
A esa escala hay que pasar a la modalidad de créditos. Está anotado en
`docs/escalar-a-200-clientes.md` como límite externo.

## 2026-09-02 — Proveedor de patente desacoplado

**Diagnóstico cerrado:** el 403 de Boostr es una página de Cloudflare
("Attention Required", Ray ID a34a1c246fe0df53), no una respuesta de su
aplicación. Descartado por evidencia: la misma IP, mismo cliente y mismo segundo
obtiene **200 en `/rut/generate.json` y 403 en `/vehicle/*`**. No es la IP, ni el
país, ni el tipo de cliente, ni rate limit: es una regla de firewall sobre esa
ruta que alcanza también a su endpoint público de pruebas, documentado con
`security: []`. Es un error de configuración de ellos.

**AutoRiesgo tampoco es gratis**: su consulta programática responde
`{"detail":"Not allowed on this endpoint... X-Api-Key... credits from $5.000"}`.

**Por eso el proveedor pasó a ser intercambiable.** `src/lib/patente/` define un
contrato (`Proveedor`) y tres adaptadores: `fixtures` (datos de ejemplo locales),
`boostr` y `autoriesgo`. Se elige con `PROVEEDOR_PATENTE`; sin esa variable se usa
el primero que tenga clave y, si ninguno la tiene, los datos de ejemplo.

Por qué: **el proyecto no puede quedar detenido porque un tercero tenga mal
configurado su firewall.** No es sobre-ingeniería — son tres archivos chicos y
sacan la integración del camino crítico.

**Los datos de ejemplo traen ficha completa a propósito**, para poder ejercitar el
mapeo del plan extendido sin haberlo contratado. Están marcados como ficticios y
la pantalla lo advierte.

**La caché ahora guarda el proveedor** (migración 0007, clave primaria
`(patente, proveedor)`). Sin eso, cambiar de proveedor seguiría sirviendo 24 h la
respuesta del anterior.

**El adaptador de AutoRiesgo no está verificado** contra una respuesta real: se
escribió contra la forma esperada de `vehicle_data`. Al contratar créditos hay que
confirmar los nombres de los campos antes de confiar en él. Está anotado en el
propio archivo.

## 2026-09-14 — Cuarto proveedor de patente: GetAPI

**Se agregó `getapi` (`chile.getapi.cl`)** como cuarto adaptador, a partir de una
colección Postman que subió el cliente (`get-api-key.json`, sin clave cargada) y
la documentación pública en `getapi.cl/docs`. A diferencia de Boostr y AutoRiesgo,
no tiene un bloqueo conocido (Cloudflare mal configurado el uno, créditos pagos
obligatorios el otro), así que en `proveedorActivo()` va primero en el orden de
fallback cuando no se fija `PROVEEDOR_PATENTE` explícitamente.

**Su plan base ya trae VIN, color y kilometraje** — no hace falta contratar un
plan extendido para eso, a diferencia de Boostr. Solo `plantaRevisora` (detalle
de la planta de revisión técnica) queda para el plan PRO, y no se mapea.

**Verificado contra la API real** el mismo día, con clave del cliente
(`GETAPI_API_KEY`, renombrada desde `API_CARS` como venía en `.env.local` para
seguir la convención `<PROVEEDOR>_API_KEY`). Consultas de prueba: `SGXR43`
(Changan Uni T 2023), `KLZS96` (MG 3 2018, con km e imagen). Confirmado:

- `model.name` viene con la versión pegada ("UNI T TURBO 1.5 AUT") y el campo
  `version` aparte trae otra cosa (más bien el detalle de la ficha técnica, tipo
  "1.5 LUXURY AT 5P") — no son redundantes, pero tampoco se puede separar limpio
  uno del otro. Se dejan ambos tal cual vienen.
- La API devuelve `null` (no omite la clave) en los campos que no tiene, así
  que el mapeo necesita `?? undefined` explícito en vin/motor/dv — si no, el
  `null` se filtraba hasta la UI en vez de tratarse como ausente.
- El límite de tasa del plan gratuito es bajo: a la sexta consulta seguida ya
  respondía 429. Para probar hay que espaciar las consultas.
- El campo que cruza con `CARROCERIA_POR_TIPO` es `model.typeVehicle.name`
  ("STATION WAGON" para `SGXR43`, en el vocabulario del Registro Civil), NO
  `typeVehicle.category` como se había escrito antes de probar contra datos
  reales — `category` es una clase más ancha ("LIVIANO"/"PESADO") que nunca
  iba a calzar contra esa tabla. Confirmado con el endpoint de tasación (ver
  abajo), que devuelve el mismo objeto `vehicle` con más detalle.

**De paso se probó el endpoint de tasación** (`GET /v1/vehicles/appraisal/{patente}`,
también en la colección Postman). Devuelve `precioUsado` (precio + banda
mín/máx) y `precioRetoma` (valor de toma en parte), además de la misma ficha
del vehículo. Para `SGXR43`: precio usado $13.600.000 (banda $13.124.000 –
$14.076.000), retoma $10.277.520. `informacionFiscal.tasacion` vino en 0 —
ese campo depende de si el SII tiene tasación fiscal cargada para esa patente,
no siempre está. **No se integró todavía**: no hay pantalla ni tipo para esto
en el proyecto, y toca una de las preguntas abiertas de `AGENTS.md` ("qué
entra en `gastos` para calcular utilidad"). Queda para cuando se decida si
`precioRetoma` sirve de referencia para armar una oferta de consignación.

**De paso se encontró un bug en `aTitulo` que afecta a los tres proveedores
reales, no solo a GetAPI**: siglas como `BMW` o `MG` quedaban `Bmw` y `Mg`
porque `aTitulo` solo capitaliza la primera letra de cada palabra y no sabe
qué marcas son acrónimos. Se agregó `marcaCanonica()` en
`src/lib/patente/normalizar.ts`, que compara contra `MARCAS` (el catálogo
cerrado de `src/lib/catalogos.ts`) y usa esa forma si calza. Por ahora solo se
aplicó en `getapi.ts` — Boostr y AutoRiesgo tienen el mismo problema latente,
pendiente de aplicarles el mismo cambio cuando se puedan probar contra datos
reales de nuevo.

## 2026-09-14 — "Consultar patente" → "Nuevo vehículo" en un clic

**El link "Crear una publicación con estos datos →" no llevaba nada.** Iba a
`/vehiculos/nuevo` sin parámetros: la búsqueda que ya se había hecho en
`/consultar-patente` se perdía y había que escribir la misma patente otra vez
en el formulario. Ahora el link manda `?patente=XXX`.

**La búsqueda de esa patente se resuelve en el servidor**, en
`NuevoVehiculoPage`, junto con el resto de los datos de la página
(`getBranches`, `getCatalogoModelos`, `getUsers`) — no en un `useEffect` en
`VehiculoForm`. Se probó primero con un efecto en el cliente (buscar sola al
montar si venía `patenteInicial`) y **el linter de React lo rechazó**:
`react-hooks/set-state-in-effect`, porque `buscarPorPatente` hace
`setBuscando(true)` de forma síncrona dentro del efecto. Resolverlo con
`queueMicrotask` o similar era un parche; hacer el fetch en el Server
Component donde ya se resuelven los otros datos de la página es la forma en
que el resto del proyecto ya trae datos, y de paso evita el parpadeo de un
formulario vacío que se rellena un instante después.

**Se sirve de la caché de 24 h** (`plate_lookup`, migración 0007): si se buscó
hace un minuto en `/consultar-patente`, esta segunda consulta no gasta cupo
del proveedor.

`camposDesdeResultado()` (en `vehiculo-form.tsx`) es la única función que
traduce un `ResultadoPatente` a estado del formulario — la usan tanto el
estado inicial (`resultadoPatenteInicial`, resuelto en el servidor) como
`buscarPorPatente()` (la búsqueda manual con el botón). Antes eran dos copias
del mismo mapeo que se podían desalinear.

## 2026-09-14 — Tasación como referencia junto al precio, no como dato

**Se agregó `consultarTasacion()`** (`GET /v1/vehicles/appraisal/{patente}`,
GetAPI) y se muestra al lado de "Precio de venta" en el formulario: precio
usado con su banda, y precio de retoma. **A propósito, no rellena el campo**
—el precio de venta lo sigue escribiendo el vendedor a mano—: es contexto
para decidir, no un dato de la ficha del auto. Esto responde en parte la
pregunta abierta de `AGENTS.md` sobre tasación, pero no la cierra: sigue sin
resolverse si `precioRetoma` debería usarse para algo más, como una oferta de
consignación.

**No es parte de `Proveedor`** (`src/lib/patente/tipos.ts`): Boostr y
AutoRiesgo no tienen tasación, así que forzarla al contrato que cumplen los
cuatro adaptadores de identificación de patente hubiera sido una abstracción
sin otro caso de uso. `consultarTasacion()` vive aparte, gateada solo por
`GETAPI_API_KEY`.

**No tiene caché**, a diferencia de `consultarPatente()` (que sí usa
`plate_lookup`, 24 h). Es una decisión consciente por ahora: agregar una
tabla nueva solo para esto era desproporcionado para un dato que se pidió
como "información extra". El costo real es que recargar `/vehiculos/nuevo
?patente=X` varias veces gasta una consulta de tasación cada vez, además de
la de identificación — con el límite de tasa bajo de GetAPI (ver la entrada
del proveedor, arriba), unas pocas recargas seguidas alcanzan el 429. Si esto
molesta en la práctica, la caché es el primer lugar por dónde mirar.

**Si la tasación falla, no rompe nada**: `consultarTasacion()` se llama en
paralelo con `consultarPatente()` (`Promise.all`) y si no hay dato o da
error, el bloque de referencia simplemente no se muestra — no hay mensaje de
error para esto, porque no es información que el vendedor esté esperando
activamente.

## 2026-09-14 — Pie de financiamiento: pesos o porcentaje, pero se guarda en pesos

**El campo siempre guarda un monto en pesos** (`pieFinanciamiento`, columna
`pie_financiamiento`) — así lo esperan el catálogo público y el simulador de
crédito (`src/lib/catalogo/financiamiento.ts`, `simulador.tsx`), que ya hacen
la conversión inversa (monto → % más cercano entre 10/20/30/40) para armar su
propio desplegable. Cambiar el tipo de dato hubiera significado tocar esos
dos consumidores para nada: el problema real era que escribirlo a mano
siempre en pesos es incómodo cuando lo que uno sabe es "pide 20% de pie".

**La conversión pasa por el precio de venta actual del formulario**, no por
uno guardado ni por el de la tasación de GetAPI — cambiar de $ a % y de
vuelta hace ida y vuelta exacta mientras el precio no cambie mientras tanto.
Por eso "Precio de venta" pasó de `defaultValue` (no controlado) a estado:
sin eso, no había forma de leer su valor actual para convertir.

**El input visible nunca es el que se envía.** Lleva el número en la unidad
que se esté mostrando (pesos o %) pero sin `name`; un `<input type="hidden"
name="pieFinanciamiento">` aparte lleva siempre el monto ya convertido a
pesos. Así el servidor (`crearVehiculoAction`/`actualizarVehiculoAction`) no
se entera de que existe un modo porcentaje — recibe lo mismo de siempre.

## 2026-09-14 — Los `<select>` nativos con el popup casi ilegible

**`color-scheme: dark` (ya declarado en `.dark`, en `globals.css`) no le
alcanza a todos los navegadores** para pintar oscuro el popup nativo de un
`<select>`: en algunos
salía con fondo claro y encima el gris apagado del tema oscuro
(`--muted-foreground`), casi ilegible. No pasaba en "Color exterior/interior"
porque esos usan `<Combo>`, que no es un `<select>` — lo pinta nuestro CSS,
no el navegador.

**Se fuerza `background-color`/`color` en `option`** (`globals.css`) como
respaldo. Son de las pocas propiedades que los navegadores sí aplican dentro
del popup nativo aunque el resto del `<option>` no se pueda estilar — por
eso alcanza con dos líneas y no hace falta reemplazar los `<select>` por
componentes propios.

## 2026-09-14 — Borrador local de "Nuevo vehículo"

**Vive solo en `localStorage`, no en la base.** Se evaluó una tabla de
borradores en Supabase y se descartó: multiplicaba el trabajo (migración,
RLS, pantalla para listarlos y retomarlos, decidir qué pasa si dos personas
abren el mismo borrador) para resolver un problema que es de una sola
persona en un solo navegador — "no perder lo que estaba escribiendo si se
recarga o cierra por accidente", no "reanudar el trabajo en otro equipo".
Si en el futuro hace falta lo segundo, ahí sí se justifica el viaje a la base.

**Solo aplica creando, nunca editando.** Un vehículo que ya existe tiene su
propia verdad en la base — mezclar un borrador local encima sería una
segunda fuente de verdad compitiendo con la primera, y el bug que eso genera
(¿cuál gana, el borrador de hace tres días o lo que hay guardado?) es peor
que el problema que se quiere resolver.

**El autoguardado lee el DOM (`new FormData(form)`), no el estado de React
campo por campo.** La mitad de los campos del formulario son inputs no
controlados (`equipamiento`, `descripción`, las fechas, el vendedor) que
viven fuera de cualquier `useState`; leerlos desde `FormData` cubre a todos
por igual, controlados o no, sin tener que mantener una lista aparte que se
desactualiza cada vez que se agrega un campo nuevo al formulario.

**Restaurar sí necesita distinguir uno por uno.** Los campos controlados se
restauran con su `setX`; los que no, escribiendo directo en el elemento del
DOM vía `form.elements.namedItem(nombre)` — ahí sí hace falta la lista,
porque cada tipo de campo necesita una forma distinta de que el cambio se
note (React para unos, el DOM para otros).

**No se restaura si viene `patenteInicial`.** Si se llegó desde "Consultar
patente" hay un dato recién resuelto en el servidor, más nuevo que
cualquier borrador guardado — pisarlo con algo viejo sería peor que no
ofrecer nada.

**El borrador se descarta al tocar "Publicar", no al confirmar que se guardó
bien.** `crearVehiculoAction` redirige en éxito (`redirect()`), y eso corta
la ejecución del lado del cliente antes de que el componente pueda enterarse
del resultado y limpiar algo después — no hay un "if success" al que
engancharse. La alternativa (una bandera en `sessionStorage` que se revisa
al montar `/vehiculos`) es más precisa pero también más piezas moviéndose.
**El costo real de la simplificación**: si falla una validación y cierras o
recargas sin tocar nada más, se pierde esa versión exacta del formulario —
pero solo esa; volver a escribir algo dispara el autoguardado de nuevo. Se
aceptó el trade-off por ser un caso angosto (falla + cierre inmediato sin
ningún otro cambio) para no sumar una segunda señal.

**El `useEffect` de restaurar defiere el `setState` con `queueMicrotask`**,
mismo motivo que en la búsqueda de patente (ver la entrada de "Consultar
patente → Nuevo vehículo en un clic"): el linter de React
(`react-hooks/set-state-in-effect`) rechaza un `setState` síncrono dentro
del cuerpo del efecto. Acá sí tenía que ser un efecto —`localStorage` no
existe en el servidor, así que no hay SSR al que mudar el fetch como se hizo
allá.

## 2026-09-02 — Filtros y paginación del inventario

**Se filtra y pagina en SQL, no en memoria.** Con 8.000 vehículos, traerlos todos
para filtrarlos en JavaScript es el problema de escala que ya estaba anotado en
`docs/escalar-a-200-clientes.md`. `buscarVehiculos()` arma el WHERE dinámicamente
y usa `count(*) over()` para devolver el total en la misma consulta, sin una
segunda ida a la base solo para saber cuántas páginas hay.

**Los filtros viven en la URL, no en estado local.** Así el listado se comparte,
el botón atrás funciona y el filtrado ocurre en el servidor. Cambiar cualquier
filtro vuelve a la página 1: quedarse en la 3 con un resultado de 2 páginas es un
clásico de listados mal hechos.

**10 filas por página** (`POR_PAGINA`). La barra muestra primera, última, actual
y vecinas, con elipsis cuando hay muchas.

**Las marcas del desplegable salen del inventario**, no de un catálogo fijo: solo
se ofrece filtrar por lo que existe.

**El estado vacío distingue dos casos**: "todavía no cargas ningún vehículo" y
"ningún vehículo coincide con los filtros". Son problemas distintos y la salida
también.

**Bug encontrado al probar:** el helper que numera los parámetros usaba `replace`,
que solo sustituye la primera ocurrencia. La búsqueda por texto compara contra
código, título y patente con el mismo parámetro, así que quedaban dos `$n`
literales y Postgres respondía "syntax error at or near $". Corregido con
`replaceAll`. Lo encontró la prueba de los 13 filtros, no el compilador.

## 2026-09-02 — El embudo: tubería de eventos, no 9 columnas

**El flujo real del negocio**, confirmado con el cliente: un anuncio de Instagram
abre un chat de WhatsApp (CTWA), el bot atiende y califica, y cuando detecta
interés lo entrega a una persona. Las columnas son la vista de esa tubería.

**`stage.responsable` ('ia' | 'humano') — el cambio de modelo que ordena todo.**
Antes solo existía `ai_agent_enabled` (sí/no), que no alcanza: hace falta saber
*quién conduce* cada etapa. Nuevo, Calificando y Sin Respuesta las lleva el bot
(esta última porque persigue a los que dejaron de contestar); desde Calificado en
adelante, personas.

**El traspaso bot→humano es el evento central.** Al mover un lead desde una etapa
del bot a una de personas, recién ahí se asigna vendedor y se registra
`traspasado_at`. Asignar antes ensuciaría la métrica de rapidez de contacto, que
mide desde que el humano se hace cargo.

**Las 9 etapas no son una fila.** Camino principal Nuevo → Calificando →
Calificado → Contactado → Visita → Ganado; *Sin Respuesta* y *Descartado* son
salidas desde cualquier punto; y **Consigna/Compra es otra vía completa** — ese
lead quiere venderte su auto, no comprarte uno.

**Punto de entrada único: `registrarLeadEntrante()`.** WhatsApp, Meta, Zernio y el
sitio propio mandan payloads distintos; cada adaptador solo traduce, y la
deduplicación, la asignación y la bitácora ocurren en un solo lugar. Conectar un
canal es escribir una traducción y verificar su firma, sin tocar el embudo.
Ninguno está conectado: faltan credenciales y verificación de firma.

**Idempotencia desde el día uno.** Índice único sobre
`(organization_id, source, external_id)`. WhatsApp y Meta reentregan eventos —
verificado en la prueba: la segunda entrega del mismo evento devuelve
`duplicado` y no crea otro lead. Retrofitear esto obliga a limpiar datos sucios.

**El adaptador de WhatsApp distingue CTWA de un mensaje normal** por el campo
`referral` que Meta adjunta cuando el chat nació de un anuncio: eso define si el
lead es de campaña o espontáneo.

**Ganado marca el vehículo como vendido** y avisa para registrar la venta en
Control de Ventas. No la crea solo: arrastrar por error no debe generar una venta
fantasma.

**El motor de asignación ya es una interfaz** con el contexto completo (origen,
tipo, sucursal), aunque hoy solo implemente la rotación. Los otros tres pasos de
la jerarquía documentada son un `if` adentro, no un cambio de llamadas.

**Bug encontrado al probar:** el listado mostraba 56 leads existiendo 34. El
`left join conversation` multiplicaba filas porque la semilla, corrida dos veces,
había creado conversaciones repetidas — el `on conflict do nothing` no tenía
destino y no hacía nada. Tres arreglos: `left join lateral … limit 1` en la
consulta, índice único `(lead_id, canal)` (migración 0009), y destino explícito
en la semilla.

**Segundo bug:** el script de semilla contaba los leads *después* del commit, en
una conexión sin organización declarada, y RLS —correctamente— devolvía cero.
El dato estaba bien; la pregunta estaba mal hecha.

## 2026-09-02 — Panel de detalle del lead

Reconstruido desde la captura en `hola/`: panel lateral con el detalle a la
izquierda y la conversación de WhatsApp a la derecha.

**Todo lo que se puede conectar, está conectado a datos reales:** el vehículo de
interés sale del inventario, el vendedor del equipo, las etapas del embudo. Nada
de listas inventadas dentro del panel.

**Las notas son una tabla, no un campo.** En el original son varias, cada una con
fecha y autor. `lead_note` con RLS forzado como el resto (migración 0010);
`lead.notas` queda solo para la nota inicial del alta manual.

**La bitácora sale de `lead_activity`**, que ya se venía llenando con cada
movimiento. Marca en otro color los eventos de traspaso bot→humano.

**Lo que falta se muestra, no se esconde.** "Registrar llamada", "Registrar venta"
y "Recordatorio" aparecen en su lugar, deshabilitados y con el motivo en el
tooltip. Es más honesto que ocultarlos: quien usa la pantalla sabe que la función
existe y por qué todavía no.

**La conversación de WhatsApp distingue dos casos**, como el original: el lead no
llegó por WhatsApp, o llegó y el historial aún no se puede mostrar porque falta la
integración.

**El panel se remonta con cada lead** (`key={leadId}`) en vez de reiniciar estado
dentro de un efecto — que además es lo que pedía el lint de React.

## 2026-09-02 — Claude: cada automotora usa su propia cuenta

**Modelo BYOK (bring your own key), no una clave compartida.** Cada organización
guarda su clave de Anthropic; el consumo se factura a ella y ninguna gasta la
cuota de otra. Por eso el cliente de Claude se construye por organización y no
una sola vez para toda la aplicación.

**Las credenciales se guardan cifradas con AES-256-GCM** (`src/lib/cripto.ts`).
Guardarlas en texto plano significaría que cualquiera con lectura sobre la base
—un respaldo filtrado, un volcado de depuración, un usuario con permisos de más—
se lleva las claves de todos los clientes. GCM además autentica: alterar el dato
guardado hace fallar el descifrado en vez de devolver basura. Verificado.

**La clave maestra vive en `APP_ENCRYPTION_KEY`, fuera de la base.** Quien tenga
solo la base no puede descifrar nada. Sin esa variable la aplicación se niega a
guardar credenciales en vez de degradar a texto plano.

**La clave nunca vuelve al navegador.** Solo viaja una pista con los últimos
caracteres (`sk-ant-…7890`) para que el usuario reconozca cuál dejó puesta.

**Se prueba antes de guardar**, con una llamada real a Anthropic. Guardar sin
probar deja el problema para el día en que llegue un lead de verdad, que es el
peor momento para descubrir que la clave estaba mal pegada. Los errores se
traducen: clave inválida, sin permiso para el modelo, cuenta sin acceso, límite
alcanzado.

**Modelo por defecto: `claude-opus-5`**, con Sonnet 5 y Haiku 4.5 disponibles por
si alguien prefiere bajar costo. Es decisión del cliente, no nuestra.

**El catálogo de modelos vive aparte del cliente** (`ia/modelos.ts` vs
`ia/claude.ts`): el segundo importa el SDK y toca la base, así que es solo de
servidor, y el diálogo de configuración corre en el navegador.

**Las integraciones ahora salen de la base**, pero el catálogo sigue siendo fijo
en código: la base solo aporta el estado de cada una. Así agregar una integración
nueva no requiere insertar filas.

## 2026-09-02 — Dónde desplegar: la decisión se reabre

**Estaba decidido Vercel. Vale la pena revisarlo**, porque esa decisión se tomó
antes de que quedara claro que el agente de IA es la carga dominante del sistema
(~120.000 mensajes diarios a 200 automotoras, más sincronizaciones horarias).

La diferencia de fondo: **Vercel corre funciones sin servidor y Render corre
contenedores.** De ahí sale todo lo demás.

| | Vercel | Render |
|---|---|---|
| El Dockerfile que ya tenemos | se descarta | funciona hoy |
| Workers, colas y cron | plataforma aparte | nativo |
| Postgres | servicio externo | en la misma plataforma |
| Costo | escala con tráfico | fijo por servicio |
| CDN global para el catálogo | excelente | correcto |

**Inclinación actual: Render para el panel y los workers.** Una plataforma, el
contenedor probado, la base al lado. Para un equipo de una persona, la
simplicidad operativa pesa más que la ventaja marginal.

**Vercel gana cuando exista el catálogo público**, y por una razón técnica
concreta: las páginas de vehículo se pueden generar una vez y servir guardadas
(ver abajo). En Vercel esa copia vive en su red global compartida; en Render vive
en el disco de cada contenedor, así que con más de una instancia se
desincronizan — un visitante ve el precio nuevo y otro el viejo. Se arregla con un
caché compartido, pero es trabajo que en Vercel no existe.

**Desenlace probable: repartido.** Panel y workers en Render, catálogo público en
Vercel. Decisión para cuando exista el catálogo, no antes.

**Con cualquiera de los dos, las fotos igual tienen que ir a almacenamiento de
objetos.** El disco de Render también es efímero.

## 2026-09-02 — Generación estática del catálogo público (pendiente, ya preparada)

Las páginas de vehículo del catálogo público son iguales para todos los
visitantes, así que se arman una vez y se sirven guardadas: 200 automotoras × 40
autos son ~8.000 páginas que el tráfico de compradores nunca haría tocar Postgres.

**El mecanismo ya está a medio implementar sin haberlo buscado:** hay 11
`revalidatePath` repartidos en las acciones. Cada vez que se guarda un vehículo o
se mueve un lead ya se avisa qué páginas quedaron obsoletas. Hoy solo refrescan el
panel; el día que exista el catálogo, esas mismas llamadas lo mantienen al día.

**El panel es lo contrario y por eso lleva `force-dynamic`:** lo que ve una
automotora no es lo que ve otra, así que guardar una copia sería servirle a alguien
los datos de otro.

## 2026-09-05 — Estudio IA: la biblioteca de fondos

El Estudio monta el vehículo recortado sobre un fondo generado. Esta entrada
cubre los fondos; el recorte y el montaje siguen abiertos.

**La biblioteca compartida vive en código, no en la base** (`ia/imagenes/escenas.ts`).
Es la misma decisión que en integraciones: son ocho escenas iguales para todas
las automotoras, así que replicarlas por organización sería copiar la misma fila
doscientas veces y tener que migrarlas cada vez que se agrega una. La tabla
`showroom` guarda solo los fondos *propios*, que sí son de quien los pidió.
Se revierte el día que la biblioteca deba editarse desde la interfaz o variar
por plataforma.

**Una escena catalogada sin imagen aparece como "sin generar"**, no desaparece
de la grilla. La pantalla dice qué falta y cómo generarlo (`npm run showrooms`)
en vez de mostrar una biblioteca más chica y dejar creer que eso es todo.

**El usuario describe el lugar; el encuadre lo pone el sistema.** `promptDe()`
agrega siempre `CAMARA` — perspectiva de un punto, cámara a ras de suelo y piso
despejado en primer plano. Sin eso salen fondos bonitos e inservibles: si el
horizonte queda a media altura, el auto no se puede apoyar en ninguna parte. Es
también la razón de que el prompt y la descripción estén separados en el
catálogo, y no concatenados a mano en cada escena.

**La línea de piso se anota, no se detecta.** Cada escena declara dónde está el
suelo (0-1 desde arriba) y la grilla la dibuja punteada sobre la miniatura. La
detección automática se probó y no funciona con reflejos ni con piso mojado.
Anotarla cuesta un número por escena y es exacta.

**Quién paga la generación: mixto.** Si la automotora conectó su propia cuenta
del proveedor, paga ella; si no, se usa la clave de la plataforma, que es la que
costea la biblioteca compartida. `claveDeImagenes()` devuelve también quién paga,
para poder registrarlo y limitarlo cuando exista cuota.

**La generación corre dentro de la acción de servidor, sin cola.** FLUX es
asíncrono y puede demorar más de un minuto, así que el usuario espera con el
diálogo abierto. Es aceptable mientras sea una acción manual y ocasional; el día
que se generen fondos en lote o desde el agente, esto tiene que pasar a la cola
junto con las sincronizaciones (ver la decisión de despliegue: es otro argumento
para Render).

**`showroom` es la única tabla con política mixta de RLS**: las filas sin
`organization_id` son la biblioteca compartida y las ve todo el mundo. Como eso
debilita la regla general, el test de aislamiento cubre el caso explícitamente —
nadie ve un fondo ajeno y nadie puede crear un fondo compartido desde la app.

## 2026-09-05 — Gemini como proveedor de imágenes, FLUX como alternativa

**Gemini (Nano Banana) queda por defecto**, `gemini-3.1-flash-image`. Entrega la
imagen en una sola llamada — FLUX es asíncrono y hay que sondearlo hasta que
esté lista — y sale más barato: ~US$0.10 por imagen en 2K contra el precio por
imagen de FLUX. Ocho fondos son menos de un dólar.

**FLUX no se borra.** Sigue disponible con `PROVEEDOR_IMAGEN=flux` y es la razón
de que exista `ProveedorImagen`: cambiar de proveedor no toca la pantalla, la
acción ni el script. Se elige en una variable de entorno, no en el código.

**Lo que se pierde con Gemini: la semilla.** Su API no la expone, así que
regenerar una escena da otra imagen y un fondo no se puede reproducir. Por eso el
proveedor declara `reproducible: false`, la columna `semilla` queda en null y el
script lo avisa al terminar. Si algún día importa poder repetir un fondo exacto
—por ejemplo para regenerar la biblioteca completa sin que cambie el catálogo—
eso solo lo da FLUX, y ese es el motivo para volver.

**El formato pasó de 832×1408 a 864×1536.** Gemini no recibe píxeles sino una
proporción de una lista fija, y 3:5 no está en ella. Pidiendo 9:16 exacto, la
imagen sale con la forma que la miniatura ya dibuja: si no calzaran, la línea de
piso quedaría corrida respecto del suelo real, que es justo el dato que la
tarjeta existe para mostrar. Los dos lados son múltiplos de 32, que es lo que
además exige FLUX.

**La clave de plataforma ahora la nombra el proveedor** (`envClave`), no una
constante: `GEMINI_API_KEY` o `BFL_API_KEY` según cuál esté puesto. Agregar un
tercer proveedor no obliga a tocar `claveDeImagenes()`.

**Toda imagen de Gemini lleva marca de agua SynthID** (invisible). No afecta el
uso, pero conviene saberlo antes de prometerle a una automotora que el fondo es
"suyo" sin más.

## 2026-09-05 — El Estudio arma piezas con un editor, no con IA

**Lo único que genera la IA es el fondo.** El vehículo sale recortado de su
propia foto y todo lo demás —qué dice, dónde, con qué fuente y color— lo decide
quien arma la pieza. La alternativa era pedirle a un modelo que compusiera la
escena completa, y se descartó por dos razones: un generador **redibuja** el
auto, y acá se publica el auto de un cliente real; y la ubicación del precio
sobre el fondo es una decisión de diseño que cambia con cada foto, no algo que
convenga sortear en cada generación.

**El recorte es segmentación local (`rembg` / U2-Net), no una API.** ~6 s de CPU
por foto, costo cero, y los píxeles son los del vehículo real. Se guarda con el
hash de la foto de origen, así que una foto se recorta una sola vez para
siempre. Gemini además no serviría: su API entrega JPEG, sin transparencia.
**Costo:** agrega python3 + rembg como dependencia de la máquina; en el
contenedor de producción hay que instalarlo o mover el recorte a un servicio
aparte. Si falta, el editor lo dice y deja seguir.

**La vista previa y el archivo final son el mismo dibujo.** `dibujar()` es la
única función que pinta: el editor la llama sobre un canvas de 864×1536 que se
muestra escalado por CSS, y descargar es ese mismo canvas a JPEG. No hay dos
renderizadores que se puedan desalinear, y lo que se ve arrastrando es
exactamente lo que se baja.

**Esto cambia una decisión que yo mismo había recomendado al revés.** Con textos
de fuente, color y tamaño editables, rearmar la pieza en el servidor con sharp
obliga a tener las tipografías en el servidor y a que rendericen igual que en el
navegador. El navegador ya tiene las fuentes cargadas por `next/font`, así que
dibujar ahí es más fiel y más simple. Se revierte si algún día hay que
regenerar piezas sin abrir el editor —por ejemplo en lote para el catálogo—;
ahí sí conviene el servidor, y el modelo de la pieza ya está guardado en
proporciones para permitirlo.

**Las medidas son proporciones (0-1), no píxeles.** Una pieza guardada así se
puede volver a dibujar en cualquier tamaño: la misma disposición sirve para la
historia de Instagram y para la ficha del catálogo. Es también lo que permite
que la vista previa chica y el archivo grande coincidan.

**Los textos salen de la ficha, no se tipean.** Marca, modelo, año, kilómetros y
precio vienen del vehículo guardado. Es donde se cuelan los errores de precio en
una publicación, y el editor deja corregir el texto pero parte del dato real.

## 2026-09-05 — El Estudio ofrece dos acciones, no tres pestañas

**La pantalla dice lo que se puede hacer: crear una pieza o crear un fondo.**
Antes eran pestañas —Showrooms, Creativos, Contenido— que describen secciones y
no acciones: había que entender la estructura del producto antes de poder usarlo.

**Elegir el auto y el fondo es un paso previo, con imágenes.** Se ve la foto real
del vehículo y el fondo, en vez de escogerlos de una lista de texto: son las dos
decisiones que definen la pieza y ambas son visuales. Los vehículos sin foto
aparecen, pero no se pueden elegir — sin foto no hay recorte que montar, y
esconderlos haría parecer que el inventario está incompleto.

**El auto se cambia dentro del editor conservando la disposición.**
`cambiarVehiculo()` reemplaza el recorte y el contenido de los textos que salen
de la ficha, y respeta posición, fuente, tamaño y color. Es lo que permite armar
un diseño una vez y pasarle varios autos por encima; rehacerlo en cada cambio
obligaría a rearmar la pieza por vehículo, que es el trabajo que el editor
existe para evitar. Los datos que el auto anterior no tenía se agregan como
capas nuevas en vez de perderse.

## 2026-09-05 — La sombra sigue el contorno inferior, no el borde de la imagen

**Una sola mancha bajo el recorte siempre se ve despegada.** El borde inferior
de la silueta es la rueda que quedó más adelante; en una foto de tres cuartos
—que es como se fotografía un auto— las otras ruedas tocan el piso bastante más
arriba. Una sombra centrada en ese borde queda por debajo del auto entero.

**Se calcula el contorno: por columna, el píxel opaco más bajo.** La sombra es
la unión de manchas apoyadas en ese contorno, difuminadas después de dibujarlas
para que se fundan en una sola. Así abraza cada rueda a su altura real. El
contorno se calcula una vez por recorte y se guarda; recorrer los píxeles en
cada repintado haría inusable el arrastre.

**Aplastar la silueta no sirve, por dos razones que costó ver.** Aplastar la
franja baja da una barra: la mitad inferior de un auto es casi un rectángulo de
neumático a neumático. Y aplastar la silueta completa da un velo parejo de punta
a punta. Las dos se probaron y las dos se ven como una mancha rectangular sobre
el piso.

**El negro va sólido y la intensidad se aplica al dibujar la capa.** Si la
intensidad se aplica al rellenar, el desenfoque se la come y subir el control no
cambia casi nada — se verificó que entre 30% y 100% no había diferencia visible.

## 2026-09-05 — El recorte se ajusta al vehículo

**`rembg` devuelve un PNG del tamaño de la foto original**, con el auto flotando
entre márgenes transparentes. Quien lo monta después apoya el **borde de la
imagen** en el suelo, no las ruedas: en la foto de prueba sobraban 400 px bajo el
vehículo, así que el auto levitaba y el reflejo aparecía muy por debajo, separado
por una franja de piso limpio.

Se recorta a la caja del contenido en `scripts/recortar.py`, apenas sale del
modelo. Se corrige en el origen y no en cada lugar que lo dibuja, porque el
recorte lo van a consumir el editor, el catálogo y lo que venga después, y todos
heredarían el mismo error.

**Los recortes ya generados quedaron inválidos**, así que el nombre del archivo
incluye una versión (`v2`) además del hash de la foto. Sin eso, las cachés
viejas seguirían sirviendo el recorte con margen y el arreglo no se vería.

**Antes de esto se intentó compensar moviendo el reflejo hacia arriba.** No era
la causa: el solape ayuda a que el reflejo no se despegue, pero el hueco venía
del margen del recorte. Vale como recordatorio de que la posición de una capa
casi nunca es el problema cuando lo que falla es de dónde salen sus medidas.

## 2026-09-05 — El reflejo se espeja por columna, no sobre un eje

**Espejar la imagen entera sobre un solo eje supone que todo el vehículo apoya a
la misma altura**, y no es así: en una foto de tres cuartos —que es como se
fotografía un auto— la rueda trasera toca el piso mucho más arriba que la
delantera. En la foto de prueba la diferencia es de 313 px sobre 673 de alto.
Con un eje único, solo la rueda más cercana queda pegada a su reflejo y el resto
del auto flota sobre el suyo.

**Cada columna se refleja sobre su propio punto de apoyo**, tomado del mismo
contorno inferior que usa la sombra. El desvanecido también se mide desde ese
punto: uno global apagaría antes lo que nace más arriba.

**Sombra y reflejo se guardan en caché por recorte, tamaño e intensidad.**
Armarlos recorre 400 columnas y no cambian mientras se arrastra —solo se mueve
el resultado—, así que recalcularlos en cada movimiento haría el editor
inusable. Se descartan las más viejas para que mover un deslizador no llene la
memoria de variantes intermedias.

## 2026-09-05 — Armonizar con IA: el montaje lo decidimos, la integración la hace el modelo

**El reflejo y la sombra correctos son un problema de geometría 3D que no se
resuelve con recortes 2D.** Se intentaron cuatro fórmulas —elipse, silueta
aplastada, franja baja, espejado por columna— y cada una arregló algo dejando
otra cosa mal. Un modelo de imagen lo resuelve de una vez: entiende el plano del
piso, el material y de dónde viene la luz.

**Se le manda el montaje YA ARMADO, no el recorte y el fondo por separado.** Con
dos imágenes sueltas el modelo recompone la escena a su gusto: en la prueba dio
vuelta el auto, lo achicó y lo redibujó. Editando una imagen existente conserva
pose, tamaño y vehículo — se comparó la entrada contra la salida y mantuvo
carrocería, llantas, insignias y hasta el reflejo de los árboles en el
parabrisas. **La posición y el tamaño los sigue decidiendo quien edita**; al
modelo se le pide una sola cosa.

**Los textos nunca se le mandan.** Se dibujan encima del resultado, en local:
un modelo de imagen deforma el texto, y además el precio tiene que poder
seguir editándose después de armonizar.

**Es opcional, y por buenas razones.** Repinta cada píxel del vehículo, así que
un detalle fino —la patente, un rayón— puede derivar: publicar el auto de un
cliente con una foto repintada es una decisión del negocio, no técnica. Además
cuesta ~US$0.10 por pieza, tarda ~18 s y no es reproducible. El montaje manual
sigue siendo el modo por defecto y es gratis.

**La versión armonizada se descarta al mover el vehículo o cambiar el fondo**,
porque dejaría de corresponder al montaje. Mover un texto no la invalida.

## 2026-09-06 — Arrastrar limita el centro del elemento, no su ancla

Se podía arrastrar un texto fuera del lienzo y perderlo. La posición se limitaba
al rango 0-1, pero eso limita el **ancla**: un texto centrado se ancla en su
medio y el vehículo en su línea de apoyo, así que con el ancla en el borde el
elemento entero ya estaba afuera.

**Ahora se limita la caja visible, y la regla es que su centro no salga del
lienzo.** Sacar medio auto por el borde es una decisión de diseño válida; que
quede reducido a una esquina, no. Se probó primero dejar salir hasta un 80% y
con dos bordes a la vez el elemento desaparecía de hecho.

**Este bug apareció recién al poder interactuar con la pantalla.** Compilaba,
pasaba lint y la captura estática se veía bien: solo se ve arrastrando.

## 2026-09-07 — Panel de control del bot en Asistente IA

Primer paso hacia que el bot atienda Nuevo, Calificando y Sin Respuesta
(ver [[stage.responsable]] en la sección "El embudo"): una pantalla real en
`/asistente-ia` para configurar su comportamiento, en vez del placeholder
"Pendiente" que había.

**No hubo que construir "conectar con Claude": ya existía.** La integración en
`/integraciones` (`IntegracionClaude`) ya prueba la clave contra Anthropic antes
de guardarla y la cifra con AES-256-GCM — es exactamente el flujo BYOK que se
pidió. Lo que faltaba era la otra mitad: qué hacer con esa conexión.

**`assistant_config` y `knowledge_item` ya estaban en el esquema desde
`0001_init.sql`, sin ninguna pantalla que los tocara.** Se agregó la capa de
datos (`getAssistantConfig`/`guardarAssistantConfig`, con upsert por ser una
fila única por organización; `getKnowledgeItems`/`crearKnowledgeItem`/
`eliminarKnowledgeItem`) y el formulario. Probado contra la base real, no solo
compilado.

**El panel guarda comportamiento; todavía no hay quién lo ejecute.** Guardar
`instrucciones`, `tono` o una FAQ no hace responder al bot: falta el webhook de
WhatsApp (ninguno conectado, ver la sección "El embudo") y el código que arme el
prompt con `assistant_config` + `knowledge_item` y llame a `clienteClaude()` por
cada mensaje entrante. Ese es el siguiente paso, no este.

**La descripción de la integración de Claude cambió** de "Pregúntale a tus datos
en lenguaje natural" (una función que no existe) a explicar que es el motor del
bot de WhatsApp, que es para lo que de verdad se está usando.

## 2026-09-07 — Webhook de WhatsApp: recibir y guardar, todavía no responder

El cliente ya paga por WhatsApp Business, pero el número de su empresa está
conectado a otro software (que lo usa para bot propio y derivación a una
página). Un número solo puede estar suscrito a un webhook a la vez, así que se
construyó el receptor **antes** de tener número real, para probarlo con el
número de prueba gratis que da Meta sin arriesgar el canal que ya funciona.

**Un lead por conversación, no por mensaje.** `registrarLeadEntrante()`
deduplica por `external_id`, que es el id del evento — en WhatsApp, el `wamid`
de cada mensaje es distinto siempre. Sin un chequeo aparte, el segundo mensaje
de un chat en curso abriría un lead nuevo cada vez. `procesarMensajeWhatsapp()`
(`src/lib/leads/canales/whatsapp.ts`) primero busca un lead con ese teléfono;
si existe, solo agrega a la bitácora. Probado con dos mensajes seguidos del
mismo número contra la base real: un lead, dos entradas en `lead_activity`.

**Los mensajes se guardan en `lead_activity` (tipo `mensaje`), no en una tabla
nueva.** No existe todavía una tabla de mensajes con el texto indexado para
mostrar un chat completo — sigue pendiente (ver "El embudo: tubería de
eventos"). `lead_activity.payload` ya es jsonb y ya se lee en el panel del
lead, así que por ahora alcanza para no perder el contenido, aunque la UI del
panel todavía no distingue `tipo = 'mensaje'` al dibujar la bitácora.

**Credenciales por variable de entorno, no por `integration` como Claude.**
Sería inconsistente hoy: `ORG_UUID` está hardcodeado en toda la capa de datos
(`src/lib/data/ids.ts`) porque la app entera corre para una sola organización
todavía — no hay resolución de organización por sesión. Meta ya manda
`phone_number_id` en cada webhook, que es la llave para resolver la
organización el día que haya más de un cliente real; ese día esto migra al
mismo patrón BYOK cifrado, y el env var se reemplaza por una fila en
`integration`.

**Verificación de firma (`X-Hub-Signature-256`) sobre el cuerpo crudo, nunca
sobre el JSON re-serializado.** `JSON.stringify(JSON.parse(x))` no reproduce
los mismos bytes que mandó Meta — la comparación fallaría siempre. El handler
lee `request.text()` antes de parsear.

**200 ante cualquier error de procesamiento, después de validar la firma.**
Meta reintenta agresivamente si no recibe 200 rápido. Un error nuestro
procesando un mensaje no debería convertirse en una tormenta de reintentos;
queda solo un `console.error` con el `wamid` para poder rastrearlo.

**El envío saliente (`enviarTextoWhatsapp`) existe pero nadie lo llama
todavía.** El webhook solo recibe. Conectarlo a una respuesta automática
espera a la lógica del agente (Fase 7, ver la sección anterior).

## 2026-09-07 — Sucursales y Equipo dejan de ser maquetas

Las dos pantallas ya calcaban al original en columnas y datos, pero **ningún
botón hacía nada**: crear, editar, filtrar y el menú de acciones estaban puestos
y muertos. Ahora escriben en la base.

**No se borra, se desactiva.** Una sucursal tiene vehículos, ventas y leads
colgando, y un vendedor tiene leads a su nombre: borrarlos dejaría el historial
sin dónde apoyarse. Dos reglas más, que la base no puede expresar sola y viven
en la capa de datos: **la sucursal principal no se puede desactivar** —es la que
hereda lo que no tiene sucursal asignada— y **tiene que quedar al menos un dueño
activo**.

**Los límites del plan se validan en el servidor, no solo en pantalla.** El
encabezado muestra "2/10 usuarios"; si esa fuera la única barrera, bastaría una
segunda pestaña para saltarla.

**El código de sucursal (SUC-001) se calcula, no se pide.** La base tiene
`unique (organization_id, codigo)` y el error de restricción no le dice nada a
quien está creando una sucursal.

**Los filtros de Equipo viven en la URL.** Se puede compartir el enlace, el botón
de atrás funciona y recargar no pierde el filtro.

### Tres bugs que solo aparecieron al hacerlo funcionar

**`getUsers()` filtraba `and activo`.** Al desactivar a alguien desaparecía de la
tabla y no se podía reactivar nunca — con una columna "Estado" y una acción
"Desactivar" en pantalla. Ahora acepta `incluirInactivos`, que solo usa Equipo:
el resto —asignar un lead, elegir vendedor— debe seguir viendo solo a los
activos, porque ofrecer a alguien que ya no trabaja ahí es un error silencioso.

**Los ids de la interfaz no siempre son uuid.** Al leer se traducen a los
legibles de la semilla (`usr_juan`), así que un formulario puede devolver
cualquiera de los dos. Se agregó `aUuid()`, con guardia: `uuidDe` aplicado a un
uuid lo convertiría en otro distinto.

**El menú de fila congelaba la página.** Su capa de clics a pantalla completa
quedaba encima al abrir el diálogo de edición. Y al cerrarlo se llevaba el
diálogo, porque estaba dentro del bloque condicional del menú: ahora el diálogo
vive fuera y el menú solo lo abre.

## 2026-09-07 — El menú de acciones se monta en un portal

El menú que había escrito a mano vivía **dentro** del contenedor con
`overflow-x-auto` de la tabla. Al desplegarlo, el contenedor le hacía scroll:
aparecían barras y el menú quedaba recortado y difícil de clickear.

Se reemplazó por el `DropdownMenu` del proyecto, que se monta en un portal
fuera de la tabla — el mismo que ya usaba `vehiculo-acciones.tsx`. De paso trae
teclado, Escape y cierre al hacer clic fuera, que el menú a mano no tenía.

**Las tablas de Sucursales y Equipo se paginan** con el `Paginacion` que ya
existía, de a 10 como el inventario. El corte se hace en memoria a propósito: el
plan más grande son decenas de usuarios, no miles; si algún día lo son, se mueve
a la consulta.

**Los cupos del plan no muestran negativos.** Si una organización baja de plan
puede quedar con más usuarios que cupos: dice "sin cupos disponibles" y marca el
contador en ámbar, en vez de "-2 disponibles".

## 2026-09-07 — Rediseño: Grafito, y la navegación se va arriba

**El parecido con el producto original no era visual, era estructural.** Velie ya
era oscuro y monocromo contra un original claro con cápsulas de color; lo que se
reconocía al segundo vistazo era la silueta —barra lateral con los mismos tres
grupos, los mismos ítems y en el mismo orden— y la composición de cada pantalla.
Por eso el cambio empieza por mover la navegación arriba, no por la paleta.

**Diecinueve destinos no caben en una fila.** Se repartieron por para qué se
entra: seis de trabajo diario visibles, cinco de consulta puntual en un menú
"Más", y ocho de configuración en un menú de cuenta. **Las URL no cambian.**

**El acento tuvo que irse al lado frío.** Se probó cobre y el validador de paleta
lo midió a **ΔE 3.3 del rojo de `crit`**: un botón de acción se veía igual que una
alerta. Verde, ámbar y rojo ocupan el lado cálido, así que el acento de marca es
azul y no hay alternativa cálida mientras los estados sean esos.

**Los colores de estado se re-escalonaron.** El par ámbar/rojo anterior estaba en
ΔE 11.9, bajo el piso de 15 para visión normal — se veían casi iguales pegados en
un gráfico. Los nuevos pasan separación CVD, piso de visión normal (18.5), croma y
contraste contra el fondo nuevo.

**Bug latente encontrado por el rediseño: `.overline` es una utilidad de
Tailwind.** Nuestra clase del mismo nombre convivía con `text-decoration:
overline`, y la utilidad gana: había una línea dibujada sobre cada etiqueta de
sección del panel desde el primer día. Renombrada a `.etiqueta`.

**El saludo del dashboard perdió el emoji.** No existe en la tipografía nueva y
salía como cuadrado vacío — y venía calcado del original.

**Lo que NO se tocó:** las funcionalidades, las rutas, la capa de datos y la regla
de que el color significa estado. El rediseño es de superficie a propósito.

## 2026-09-08 — El inventario se ve en grilla, y la tabla se queda

**La foto pasa a mandar.** Es el dato que más pesa al vender un auto y en una
fila de tabla cabía en 52 píxeles. En tarjetas de 4:3 se ve el vehículo, y la
**ausencia** de foto también: antes era un iconito gris fácil de pasar por alto,
ahora es una tarjeta vacía que dice "Sin fotos" — y una publicación sin fotos no
la ve nadie.

**Las dos vistas conviven** (`?modo=tabla`). Con cien autos y una columna de
precios, una tabla sigue siendo más rápida de barrer que cualquier grilla:
comparar es su trabajo, mirar es el de la grilla. Borrar la tabla habría sido
perder algo que ya funcionaba.

**La grilla pagina de a 12 y la tabla de a 10**: doce llenan tres o cuatro
columnas sin dejar una fila coja.

## 2026-09-08 — WhatsApp: la clave de idempotencia es el mensaje, no el anuncio

Al conectar el número de prueba salió a la luz un bug que habría costado leads
en silencio. El canal usaba `referral.source_id` como `externalId` cuando el chat
nacía de un anuncio, y **ese id es el del ANUNCIO, no el del mensaje**: es el
mismo para todas las personas que hacen clic en él.

`registrarLeadEntrante` deduplica por `(source, external_id)`, así que **la
primera persona creaba el lead y todas las demás se descartaban como
duplicadas** — y sin registrar siquiera su mensaje, porque la bitácora solo se
escribía cuando el estado era `creado`. Un aviso que trae cincuenta leads dejaba
uno, sin ningún error visible.

Ahora la clave es siempre `mensaje.id`. La atribución de campaña no se pierde:
`referral` viaja completo en `payload` y `source` ya distingue `meta_ads`.

**Y los reintentos ya no duplican mensajes.** Meta reentrega el webhook si no
recibe 200 rápido; en un chat con lead existente eso insertaba la misma línea dos
veces en la bitácora y subía el contador de la conversación de a dos. Se
comprueba el `externalId` antes de insertar.

Verificado simulando el webhook con firma HMAC válida: dos personas desde el
mismo anuncio crean dos leads, el reintento del mismo mensaje no duplica, y una
firma inválida recibe 401.

## 2026-09-08 — El bot de WhatsApp: responde, califica y suelta el lead

La cadena completa quedó armada: clic en anuncio → lead → respuesta del bot →
conversación → traspaso a un vendedor. Dos piezas ya existían y se respetaron: el
lead entra sin vendedor asignado porque la etapa de entrada la conduce el bot, y
`moverLead` asigna solo al cruzar a una etapa humana.

**De qué auto habla se resuelve por tres caminos, en orden de confianza**: el
código de la publicación en el texto, la patente, o marca y modelo por texto
libre. **Si ninguno calza, el bot pregunta en vez de adivinar** — cotizar el auto
equivocado es peor que preguntar una vez.

Eso impone una regla de configuración: **los anuncios de clic-a-WhatsApp deben
llevar el código en el mensaje prellenado** ("Hola, quiero consultar por el
COD920871"). Es lo que hace que el primer mensaje llegue con el auto identificado.

**La respuesta y la clasificación salen de una sola llamada al modelo.**
Separarlas duplica el costo y abre la puerta a que el mensaje diga una cosa y la
clasificación otra.

**El modelo no escribe en la base.** Devuelve `{respuesta, interes, motivo}` y
quien lo llama actúa. Un modelo que mueve etapas por su cuenta es imposible de
auditar cuando se equivoca — y equivocarse acá es despertar a un vendedor por
nada, o dejar dormido un lead caliente. El `motivo` queda registrado.

**El bot se calla apenas el lead pasa a una etapa de personas.** Un vendedor y un
bot escribiéndole a la misma persona es la peor versión de esto.

**Sin pensamiento extendido**: es una conversación de dos frases y cada segundo
lo espera alguien mirando el chat. A 120.000 mensajes diarios el costo tampoco es
menor.

**Claude pasa al modelo mixto**, como las imágenes: si la automotora conectó su
cuenta paga ella, si no se usa la clave de la plataforma. El asistente es el
corazón del producto y no puede depender de que cada cliente abra una cuenta en
Anthropic — en el original figura como "incluido" en el plan.

## 2026-09-08 — Cuentas: la organización deja de estar escrita en el código

**Es la pieza de seguridad que faltaba.** El aislamiento por RLS funcionaba y
sus nueve tests pasaban, pero la organización venía de `ORG_UUID`, una constante
— Postgres servía fielmente los datos de la organización que le pidiéramos. Si
esa constante hubiera estado mal, el aislamiento habría sido perfecto y los datos
igualmente equivocados.

**Ahora sale de la sesión**: `orgActual()` la resuelve desde `membership`, que es
lo que ya leía `current_org_ids()`. Se reemplazó en las 105 consultas de la capa
de datos; hoy no queda ninguna referencia a la constante ahí.

**El esquema ya estaba preparado** — quien escribió `0001_init.sql` dejó
`membership` y una `current_org_ids()` que acepta las dos vías: `auth.uid()` de
la sesión de Supabase, o la variable de transacción que fija nuestro servidor.
Como el servidor habla con Postgres por `pg` y no por PostgREST, no hay JWT en
esa conexión: seguimos fijando la variable, pero su valor ahora viene de quién
inició sesión y no de una constante.

**`membership` y `app_user` se mantienen separadas.** La primera responde "¿a qué
organización pertenece esta cuenta?" y es lo que exige Postgres; la segunda,
"¿quién es esta persona en la automotora?" — nombre, teléfono, sucursal. Un
invitado que aún no acepta existe en `app_user` sin cuenta, por eso
`auth_user_id` acepta nulos.

**Queda un respaldo peligroso a propósito y hay que sacarlo antes de producción**:
sin sesión, `orgActual()` cae a la organización de la semilla para que el
desarrollo local siga andando sin login. Con la aplicación pública, eso
significaría que cualquiera ve esos datos. El salto es cambiar ese respaldo por
un error.

## 2026-09-08 — Catálogo público: la única parte abierta a internet

La automotora publica su inventario en `{dominio}/{slug}`: listado en `/{slug}`
y ficha en `/{slug}/vehiculos/{codigo}`. Se identifica por código y no por id
porque el código es lo que la automotora dice por teléfono, lo que va en el
anuncio y lo que el comprador copia — un uuid en la URL no le sirve a nadie.

**La organización sale del slug de la URL, y esto contradice a propósito la
regla de `db.ts`.** Ahí dice, con razón, que el orgId nunca viene de la URL: en
el panel eso sería suplantación. Acá no hay sesión que consultar — el visitante
es un comprador anónimo — así que el camino es otro y vive aparte, en
`data/catalogo.ts`, para que la excepción sea visible en vez de estar escondida
entre las consultas del panel. Es aceptable porque ese archivo solo puede leer
lo que una publicación muestra igual: disponible, sin archivar, con al menos una
foto, y únicamente los campos de `VehiculoPublico`. Es la misma técnica que
`FichaPublica` usa con el bot: una lista blanca sostenida por el tipo.

**Un auto sin fotos no sale, y eso se avisa en el panel.** La regla es del
producto, no técnica: una publicación sin fotos no la mira nadie. Pero
silenciarla sería peor, así que `/mi-sitio-web` dice cuántos vehículos
disponibles quedaron fuera por eso y enlaza al inventario. En la base de
desarrollo son 23 de 28.

**`generateStaticParams` no es opcional aunque exista `revalidate`.** Sin él,
Next trata la ruta dinámica como dinámica de verdad y la vuelve a renderizar en
cada visita. Se descubrió midiéndolo contra el build de producción: se cambió el
precio en la base y la ficha lo mostró al instante, mientras el listado —que sí
es estático— seguía sirviendo el anterior. Se hornean las 50 fichas más
recientes por automotora; el resto igual se guarda, pero al primer visitante,
gracias a `dynamicParams`. El tope existe para que el despliegue no crezca con
el inventario acumulado de todos los clientes.

**El ciclo de actualización se probó completo, no solo compilado**: editar el
precio en el panel de producción caducó la ficha y el listado públicos, y ambos
mostraron el precio nuevo en la siguiente visita (`revalidarCatalogo()`, que
traduce el id del vehículo a su código porque la ficha se dirige por código).

**El número de WhatsApp va en `organization`, no en una variable de entorno.**
Es distinto para cada automotora, y el teléfono de la sucursal no sirve: puede
ser un fijo y el botón abre un chat. El mensaje precargado lleva el código del
vehículo, que es exactamente lo que `identificarVehiculo()` busca primero: el
comprador toca el botón y el bot ya sabe de qué auto se habla. El botón de
copiar el código de la ficha cierra el mismo círculo por la vía manual.

**El simulador de crédito muestra un rango y lo declara referencial.** No
conocemos la tasa que le darán a esa persona. Una cuota exacta que después no se
cumple es peor que no mostrar nada, así que se publica una banda de 1,7 %–1,9 %
mensual con la advertencia de que no es una oferta de crédito.

**La ficha usa una grilla de dos columnas y dos filas en vez de dos columnas
sueltas.** En móvil el orden del DOM manda, y el botón de consultar tiene que ir
antes de la ficha técnica. El primer intento duplicaba el encabezado y escondía
uno con CSS: dejaba dos `<h1>` en el documento y el botón enterrado bajo las
especificaciones.

## 2026-09-08 — Preparación para Vercel: el panel deja de estar abierto

Ver `docs/despliegue-vercel.md` para los pasos; acá va el porqué.

**El respaldo de `orgActual()` se cortó, y la condición es `NODE_ENV` y no
"¿está Supabase configurado?".** Con la segunda, olvidar una variable de entorno
en el despliegue habría abierto el panel entero en silencio — el peor tipo de
fallo, porque la pantalla se ve perfecta. Con esta, olvidarla rompe
ruidosamente: `proxy.ts` responde 503 y `orgActual()` lanza. Un fallo de
autenticación tiene que fallar cerrado.

**El proxy no consulta a Supabase en el catálogo público, y eso es aislamiento,
no rendimiento.** Si Supabase estuviera caído o lento, validar la sesión en cada
visita al catálogo se llevaría puesto el sitio público de todas las automotoras
por un problema del login que el comprador ni usa. Y cuando `getUser()` falla se
trata como "no hay usuario": ante la duda, al login, nunca adentro.

**La lista de rutas del panel vive en `lib/rutas.ts`, sola y sin importar
nada.** La comparten dos mundos que no pueden compartir código pesado:
`data/catalogo.ts`, que arrastra `pg`, y `proxy.ts`, que corre antes de
renderizar. Es un solo hecho —`/{slug}` es el catálogo de una automotora— del
que salen las dos reglas: qué nombres no puede tomar una automotora y qué
caminos exigen sesión. Una ruta nueva del panel nace protegida por estar en esa
lista, sin que nadie se acuerde de agregarle un chequeo.

**`getOrganization()` y `getCurrentUser()` devolvían la semilla siempre.** Con un
solo cliente no se notaba; con dos habrían mostrado el nombre equivocado —
incluido el que el bot usa para presentarse por WhatsApp. Ahora salen de la base
y de la sesión.

**El webhook de WhatsApp responde antes de llamar a la IA.** Esperaba a Claude
con `await`, lo que en una función de Vercel arriesga pasarse del tiempo límite;
y un webhook que se pasa del límite es peor que uno lento, porque Meta lo
reintenta y el reintento vuelve a llamar a la IA y manda la respuesta dos veces.
Ahora el procesamiento va en `after()`: medido, 200 en 0,34 s y la respuesta del
bot generada 5 s después.

**Las consultas del build fallan blando.** `generateStaticParams` consulta la
base al desplegar; si no contesta, ahora no se prerenderiza nada en vez de
caerse el despliegue. El sitio queda más lento la primera vez, no caído.

**`output: standalone` pasó a depender de `DOCKER_BUILD`.** Es para la imagen de
Docker; Vercel arma sus propias funciones y esa salida no le sirve. Las dos vías
siguen funcionando desde el mismo `next.config.ts`.

**Las funciones van a `gru1` (São Paulo).** Por defecto Vercel corre en
Washington, y con la base en Sudamérica cada consulta cruzaría el hemisferio dos
veces. Solo sirve si la base se crea en la misma región.

**El Estudio IA no funciona en Vercel y la pantalla lo dice.** El recorte es un
proceso hijo de `python3` con `rembg`, y en una función de Vercel no hay
intérprete de Python ni espacio para el modelo U²-Net. Se detecta por la
variable `VERCEL` y se avisa al entrar al Estudio, no a mitad del flujo. Se
eligió desactivarlo antes que retrasar el despliegue por él; las alternativas
—API externa, WASM en el navegador, o un contenedor aparte con Python— están en
la guía.

## 2026-09-08 — El recorte se va: ahora la IA mete el auto en el fondo

Se eliminó rembg (segmentación local con U²-Net y `scripts/recortar.py`). Era la
única dependencia de `python3` del proyecto y por ella el Estudio no podía
correr en Vercel. Ahora se pega la foto ORIGINAL —rectangular, con su
estacionamiento y sus árboles— sobre la escena y el modelo borra el rectángulo y
funde el auto.

**Lo que NO se hizo: mandar el fondo y el auto como dos imágenes sueltas y
pedirle que lo componga.** Eso ya se había probado y está anotado más arriba: el
modelo ubica el vehículo donde quiere. Lo que funciona es pegarlo primero, para
que el modelo EDITE en vez de componer.

**Tres formulaciones, cuatro fondos, y ninguna obvia.** Se midió en vez de
elegir:

| | mármol | adoquín de noche | carretera | duna |
|---|---|---|---|---|
| Solo el montaje | limpio | queda una franja | limpio | rectángulo intacto |
| Fondo limpio + montaje | auto encogido al fondo | limpio | auto más chico | limpio |
| + geometría en porcentajes | limpio | limpio | limpio | limpio |

La primera conserva el tamaño pero deja el rectángulo; la segunda lo borra pero
manda el auto al fondo de la escena. Decirle el ancho y el punto de apoyo en
porcentajes —"el auto mide el 86% del ancho y sus ruedas apoyan al 72% del
alto"— es lo que evita que interprete "mete el auto en la escena" como
"estacionalo al fondo".

**Mandar dos imágenes trae su propio riesgo y apareció en el quinto fondo:** el
modelo las apiló y devolvió la escena repetida, con un auto fantasma arriba. Por
eso el prompt declara el formato de salida antes que nada —una sola fotografía,
ni collage ni díptico— y ese fondo quedó en `scripts/probar-montaje-ia.ts` como
caso de regresión. Con esa línea, 5 de 5 salen limpios.

**Un acierto suelto no era evidencia.** El primer intento salió perfecto sobre
mármol y el segundo devolvió el rectángulo intacto sobre otro fondo. El modelo
no tiene semilla y falla distinto según la escena, así que la verificación son
varios fondos y no uno; por eso el script existe y no se borró.

**Lo que se pierde.** La vista previa antes de fundir muestra la foto entera,
rectangular, en vez de un recorte con transparencia — es más fea, y el resultado
final puede quedar de un tamaño algo distinto al del montaje. A cambio: el
Estudio corre en Vercel, no hay proceso hijo de Python, y desaparece la espera
de varios segundos del primer recorte de cada foto.

**Sombra y reflejo dibujados por nosotros quedaron en 0.** Se calculaban
recorriendo el contorno de un recorte con transparencia; sobre un rectángulo
opaco el contorno es su borde inferior y la sombra sale como una barra — el
mismo bug que costó arreglar en su momento. Los pone el modelo, que además los
adapta al material del piso. El renderizador (`dibujar.ts`) se dejó intacto: la
maquinaria está medida y funciona, solo dejó de usarse.

**De paso, `estudio/acciones.ts` dejó de usar `ORG_UUID`.** Quedaban dos
llamadas con la organización escrita en el código, de antes del sistema de
cuentas.

## 2026-09-09 — Despliegue real: tres bugs que solo aparecieron en producción

Los tres compilaban, pasaban lint y funcionaban en desarrollo.

**1. `sesionActual()` buscaba el perfil con la organización equivocada.** Resolvía
`membership` y `app_user` en un solo join, y para eso la transacción tenía que
declarar una organización ANTES de saber cuál era: usaba `ORG_UUID`. `app_user`
lleva RLS, así que con la organización equivocada la fila quedaba filtrada y la
sesión salía nula — "Sin sesión" después de un login correcto. En desarrollo la
organización de la semilla era la única que existía y el id coincidía por
casualidad. Ahora son dos consultas en orden: `membership` primero, que es la
única tabla legible sin saber la organización porque no lleva RLS.

**2. `pg` dejó de aceptar el TLS de Supabase.** Interpreta `sslmode=require` —lo
que trae la cadena de Supabase— como `verify-full`, y su cadena de certificados
no la pasa. La app no podía conectarse a la base en absoluto. El parámetro se
quita de la URL y el TLS se configura explícito.

**3. `getMetricas()` devolvía la semilla.** Una automotora recién creada veía un
panel que anunciaba 390 leads calientes sin atender, 21 autos sin movimiento y 34
notas con saldo por $147.950.000, con nombres de personas inventadas, mientras
los contadores reales decían 0. Datos falsos presentados como propios: en una
herramienta de trabajo eso es peor que un panel vacío. Ahora se calculan en SQL.
Las métricas cuya definición no está cerrada con el cliente —meta mensual,
rapidez mediana, conversaciones de IA— se devuelven en CERO, no inventadas.

**El patrón es el mismo en los tres y ya había aparecido antes** con
`getOrganization()` y `getCurrentUser()`: una función de datos que devuelve la
semilla en vez de consultar. Con un solo cliente y la organización de la semilla
no se distingue de lo correcto.

**Y una confirmación que no era teórica:** en Supabase el rol `postgres` tiene
`rolbypassrls = t`. Conectar la aplicación con él anula el aislamiento entre
automotoras aunque las políticas estén puestas y sin dar ningún error. Por eso
existe `supabase/rol-app.sql`. Comprobado: los 9 tests de aislamiento pasan
contra Supabase con `velie_app`.

## 2026-09-13 — Tres pantallas eran maquetas, y se veían terminadas

**El patrón de la semilla volvió a aparecer, y esta vez eran tres.**
`getClients()`, `getOperations()` y `getCampaigns()` devolvían `seed.*` sin
siquiera mirar `dbConfigurada()`. Es exactamente lo mismo que el 2026-09-09 con
`getMetricas()`, `getOrganization()` y `getCurrentUser()`; quedaron estas tres.

Lo que se veía con la base conectada: **Control de Ventas anunciaba 14 ventas por
$340M mientras el Dashboard, en la misma sesión, decía 0 ventas del mes.** Y
Clientes listaba seis personas inventadas con RUT y teléfono. Las tres tablas
—`client`, `operation`, `campaign`— existen desde `0001_init.sql`.

**Pero el problema de fondo no eran las consultas: las tres pantallas nunca se
terminaron.** Todos sus botones eran inertes —sin `onClick`, sin `href`, sin
formulario— y se veían iguales a los que funcionan. Además había datos escritos
a mano en el JSX, que es la forma más difícil de detectar este defecto porque no
pasa por la capa de datos:

- Los deltas «vs mes anterior» de Control de Ventas (75 %, 54 %, −12 %, 6 %) y
  los del Dashboard (−100 % en dos tarjetas). `StatCard` no calcula nada: pinta
  el número que le pasen.
- El bloque «Cierres mensuales» entero: un cierre de mayo de 2026 con 5 ventas y
  $94.700.000, con tabla `monthly_close` existiendo y vacía.
- La columna «Estado» de Campañas imprimía «Activa» en verde para TODAS las
  filas, sin mirar el dato. Una campaña pausada se veía corriendo.
- Los contadores «Pausadas (0)» y «Borradores (0)» de las pestañas.
- La línea «sincronización automática cada hora» de Campañas. **Esa
  sincronización no existe**: no hay cron en `vercel.json` ni ruta que la
  ejecute.

**Se decidió conectarlas y sacar lo muerto, no construir las acciones.** Las tres
quedan de solo lectura y honestas. Construir «Cerrar mes», «Nueva campaña» o las
pestañas de Compras/Consignaciones/Notas depende de decisiones que siguen
abiertas con el cliente —qué entra en `gastos`, comisión de consignación— así que
parte quedaría inventada igual. Qué lo revertiría: cerrar esas definiciones.

**Los buscadores de Clientes y Campañas sí se conectaron**, porque eran `Input`
sueltos sin formulario: se escribía y no pasaba nada. Filtran en memoria y no en
SQL a propósito — son decenas de filas, no miles, y así funcionan igual con la
semilla. El de Clientes compara el RUT sin puntos ni guion y el nombre sin
tildes, que es como la gente escribe en un buscador.

**Una división por cero esperaba escondida detrás de la semilla.** `ticket` y
`diasProm` eran `ingresos / operations.length`. Con las 14 operaciones de la
semilla el divisor nunca fue 0; con una automotora sin ventas, `clp(NaN)`
imprime **«$NaN»** en la cabecera. Es el riesgo general de arreglar estas
funciones: quitar la semilla no deja la pantalla en cero, la deja en `NaN`. Sin
dato se muestra una raya.

**`campaign_metric` y `campaign_vehicle` no llevan RLS** —no tienen
`organization_id`— así que se consultan siempre colgando de `campaign`, que sí la
lleva. Ninguna consulta puede entrar a esas dos tablas por su propio id. Lo mismo
vale para `lead_activity`, `vehicle_photo`, `vehicle_publication`, `site_config`,
`assistant_config`, `routing_config` y `plate_lookup`: hoy están protegidas solo
porque toda consulta pasa por su padre. **Es un aislamiento por convención, no
por política, y conviene cerrarlo antes de tener varias automotoras reales.**

**El CTR de una campaña se recalcula sobre los totales, no promediando los ctr
diarios.** Promediar tasas le da el mismo peso a un día de 10 impresiones que a
uno de 10.000.

**`compose.yaml` se había quedado en la migración 0012.** Faltaban 0013–0017: un
volumen nuevo nacía sin auth, sin catálogo público y sin sitio. El fallo no se
ve, porque la base levanta igual y solo le faltan tablas, y `npm run migrar` sí
las aplica todas — así que una base ya creada quedaba al día y el hueco solo
aparecía al recrear el volumen. La lista hay que mantenerla a mano; queda
advertido en el propio archivo.

## 2026-09-13 — Por qué `vercel env pull` mutilaba el `.env.local`

No se corrompía el archivo: se llenaba con un entorno casi vacío. En Vercel,
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DATABASE_URL` y
todos los secretos existen **solo en Production**. `vercel env pull` baja
**Development** por defecto, y ahí lo único que hay son las 16 variables que
inyecta la integración de Supabase.

Esas 16 vienen con el prefijo `sb_publishable_XpuoJO…`, que sale del campo
*prefix* de la integración: quedó con el valor de la publishable key en vez de
vacío. Por eso aparecían nombres como
`NEXT_PUBLIC_sb_publishable_…_SUPABASE_URL`, que ningún código lee.

Se arregla poblando Development, no bajando Production a mano: con `--environment
=production` el `DATABASE_URL` que llega apunta a la base de producción y el
desarrollo local pasaría a escribir ahí sin avisar.

## 2026-09-13 — Cuentas: varias por automotora, y una pantalla para la propia

**La estructura ya estaba; faltaba el flujo.** `membership(user_id,
organization_id, rol)` es muchos-a-uno desde `0001_init.sql`, y
`app_user.auth_user_id` une la cuenta con la ficha del equipo desde `0013`. No
hubo que migrar nada de eso.

**Lo que había era peor que una funcionalidad faltante: `/equipo` creaba
fantasmas.** `crearMiembro()` insertaba solo en `app_user`, con `auth_user_id`
en NULL y sin `membership`. La persona aparecía en la lista con su rol y su
sucursal, indistinguible de alguien con cuenta, y no podía entrar. La pantalla
de login incluso decía «las crea la automotora desde Equipo», que era falso.
Por eso la tabla ahora tiene una columna **Acceso** separada de **Estado**:
activo es si sigue trabajando acá, acceso es si puede entrar.

**Invitación por enlace, no por contraseña temporal ni por correo.**
Por qué: el enlace lo manda el admin por WhatsApp, que es el canal que estas
automotoras usan, y la persona elige su propia contraseña. Una contraseña
temporal viaja por el mismo chat pero además sigue sirviendo hasta que alguien
la cambie. El correo de invitación de Supabase quedó descartado por su SMTP por
defecto: unos pocos envíos por hora, inservible en producción sin contratar un
SMTP propio. Qué lo revertiría: tener SMTP propio y clientes que prefieran el
correo.

**Del token solo se guarda el sha256.** El token vive en la URL y en ningún
otro lado, así que un volcado de la base no permite canjear nada. La
consecuencia es de producto: el enlace se muestra UNA vez y si se pierde hay
que generar otro — el diálogo lo dice.

**`invitacion_por_token()` es `security definer` y salta RLS a propósito.** Es
el mismo problema que `organization` por slug en el catálogo público: quien abre
el enlace no tiene sesión, así que no hay organización que declarar. Se acota a
lo mínimo — busca por el hash de 32 bytes aleatorios, devuelve una fila y solo
los campos del canje, y no acepta nada enumerable. Todo lo que viene después ya
corre con la organización declarada.

**El rol vivía en dos tablas y solo una mandaba.** `sesionActual()` lee el rol
de `membership`; `/equipo` escribía solo `app_user.rol`. O sea que cambiar a
alguien de vendedor a admin se veía aplicado y no movía sus permisos: seguían
siendo los que le puso el alta. No se notaba porque el rol todavía no bloquea
nada. Ahora `actualizarMiembro()` escribe las dos, y el canje inserta
`membership` con el rol de la invitación.

**Invitar y cambiar roles quedó restringido a `owner` y `admin`.** Es el primer
permiso por rol que la aplicación aplica de verdad. Sin él, un vendedor podía
invitarse a sí mismo una segunda cuenta con rol owner y el rol dejaba de
significar nada.

**Mi cuenta edita nombre y teléfono, y la contraseña. No el correo ni el rol.**
El rol y la sucursal los administra el dueño desde Equipo — si cada quien
pudiera cambiarse el rol, el rol no serviría. El correo queda fuera porque es la
identidad con la que se entra, vive en Supabase además de en `app_user` y
cambiarlo dispara una confirmación: es su propio flujo. La contraseña se cambia
con la sesión de la persona (`supabase.auth.updateUser`), **no con la clave de
servicio**, así que funciona aunque el servidor no la tenga; se revalida la
actual antes, para que encontrar una sesión abierta no alcance para quedarse con
la cuenta.

### El error que costó una cuenta de verdad

Para que la creación de cuentas funcionara en producción se agregó
`claveDeServicio()`, que acepta también el nombre con prefijo que inyecta la
integración de Supabase (`sb_publishable_…_SUPABASE_SERVICE_ROLE_KEY`) — el
mismo respaldo que `db.ts` hace con `POSTGRES_URL`, y necesario porque
`SUPABASE_SERVICE_ROLE_KEY` no existe en Vercel con ese nombre.

Se hizo lo mismo con la URL, y **eso estuvo mal**. Como `.env.local` trae las
credenciales de PRODUCCIÓN bajo los nombres con prefijo, la primera prueba de
canje en localhost creó una cuenta real en el Supabase de producción
(`martin@marketcar.cl`). Se borró a mano.

La regla que queda: **un respaldo de nombres está bien para leer configuración
del entorno en que se corre; no está bien cuando el valor decide contra qué
sistema se escribe.** La URL se lee solo de `NEXT_PUBLIC_SUPABASE_URL`, sin
respaldo, así que el desarrollo local falla ruidoso en vez de alcanzar
producción por accidente.

**De paso quedó probado el camino de recuperación del canje.** La cuenta de
Supabase se crea antes de la transacción porque vive en otro sistema y no
participa del rollback. Cuando las escrituras locales fallaron, la invitación
quedó sin marcar y `auth_user_id` en NULL — comprobado. El enlace sigue
sirviendo y el segundo intento reutiliza la cuenta ya creada en vez de
duplicarla.

**Lo que no se puede probar en local:** el canje completo. `membership.user_id`
referencia `auth.users`, y en desarrollo eso es el shim de `docker/initdb/`,
mientras que las cuentas de Supabase viven en la nube. En producción son la
misma base y la clave foránea se satisface. Probar esto de punta a punta exige
un Supabase de pruebas aparte.

## 2026-09-13 — El panel entero caído por una migración sin aplicar

**Qué pasó.** Se desplegó el código de las invitaciones sin aplicar la
migración `0018`. `getUsers()` consulta la tabla `invitacion` y la usan casi
todas las pantallas: **las 15 rutas del panel devolvieron 500 durante unos
veinte minutos.** El sitio público no se vio afectado. No había clientes
reales; eso es lo único que evitó que fuera grave, y no es una defensa.

**Por qué no lo atrapó nada.** El código compilaba, el lint pasaba y la build
de Vercel fue verde. El fallo no estaba en el código ni en la configuración
sino en la RELACIÓN entre código nuevo y base vieja, que no era lo que miraba
ninguna herramienta. `docs/escalar-a-200-clientes.md` punto 12 ya lo advertía
—cambios aditivos, desplegar código primero— y este cambio no era aditivo:
era código que exige una tabla que no existía.

**La defensa que se puso: la build consulta la base antes de compilar.**
`npm run build` corre ahora `scripts/verificar-migraciones.ts`, que compara los
archivos de `supabase/migrations/` con la tabla `_migracion` de la base que va
a atender el despliegue.

La clave no es el aviso: es que **una build fallida no reemplaza lo que está
sirviendo.** Con esto, el despliegue de hoy habría fallado al construir y la
versión anterior habría seguido en pie. Es la diferencia entre "no se pudo
desplegar" y "el panel de todos los clientes devuelve 500".

**Solo bloquea cuando hay certeza**, y eso es deliberado: sin credenciales de
base no verifica nada, y si la base no responde avisa y deja pasar — un
problema de red no puede ser lo que impida desplegar un cambio de CSS. Bloquea
ante un único hecho: la base contestó y le faltan migraciones. Y es estricto
solo en Vercel (`process.env.VERCEL`), porque en local `npm run build` se usa
para ver si compila, no para publicar.

**Se consulta la conexión DIRECTA** (`POSTGRES_URL_NON_POOLING`), no el pooler
ni la `DATABASE_URL` local: verificar el docker de quien despliega no dice nada
sobre la base de los clientes.

**De paso, `revisar-despliegue` dejó de mentir.** Comprobaba `DATABASE_URL` y
las `NEXT_PUBLIC_SUPABASE_*` en `.env.local` — variables que viven SOLO en
Vercel y que `vercel:sync` no sube a propósito. Daba dos "✗" permanentes por
credenciales que en producción estaban perfectas. Ahora pregunta a Vercel por
los NOMBRES de las variables de producción (nunca los valores) y solo bloquea
si de verdad faltan allá. Una herramienta que grita en falso se vuelve ruido
que se aprende a ignorar, y entonces no sirve para el día que sí importa.

## 2026-09-13 — El bot decide tres cosas, no dos

**Lo que había.** El bot solo sabía empujar hacia arriba: `decidirRespuesta()`
devolvía `interes: boolean`, y con `true` movía el lead a la primera etapa
humana. Con `false` no hacía nada. Además **nadie movía un lead de «Nuevo» a
«Calificando»** — el único movimiento automático del sistema era ese salto a la
tercera etapa, así que «Calificando» nunca se usaba. Comprobado en producción:
2 leads en «Nuevo», 0 en «Calificando», y los dos ya habían conversado con el bot.

**La decisión: el bot hace triage, no progresión.** Detecta interés o rechazo y
mueve en consecuencia; no recorre las etapas una por una. «Calificando» queda
para que una persona la use a mano.

**Por qué `interes: boolean` no servía para agregar el «no».** Porque `false` no
significa «no le interesa» sino **«todavía no»**: es el estado de toda
conversación hasta que la persona muestre interés, y el primer mensaje de
cualquiera es `false`. Mover con esa señal descartaría a todo el mundo apenas
dice «hola», incluidos los que iban a comprar. Ahora son tres estados
—`conversando`, `interesado`, `descartado`— y el «todavía no» deja de
confundirse con un rechazo. El prompt insiste en que ante la duda es
`conversando`, y un estado no reconocido cae ahí en vez de fallar: el mensaje ya
está redactado y vale la pena mandarlo.

**El destino del descarte sale de `kind = 'exit_lost'`, no del nombre
«Descartado».** Cada automotora renombra sus etapas. Si el embudo no tiene salida
de pérdida, el lead **no se mueve**: se queda visible y molestando, en vez de
desaparecer a una etapa inventada.

**El silencio es el caso más común y no se podía detectar desde la
conversación**, porque el disparador es que NO llegue un mensaje. De ahí el cron
diario (`/api/cron/seguimiento`, 13:00 UTC = 10:00 en Chile, dentro del horario
laboral). Busca leads en etapas del bot cuyo último mensaje ENTRANTE sea viejo
—el entrante y no el último a secas, porque el saliente es del propio bot y
reiniciaría el reloj con su propia respuesta—, les escribe una vez y los mueve a
la etapa marcada `es_seguimiento`.

**UNA sola vez, y eso es lo importante.** `lead.seguimiento_at` marca que ya se
hizo. Sin esa marca, el cron le escribiría cada día al mismo silencio, que es la
forma más rápida de que a una automotora la bloqueen por spam en WhatsApp.

**Si el envío falla no se marca ni se mueve nada.** Mañana se reintenta. Mover a
«Sin Respuesta» a alguien a quien no se le pudo escribir diría algo falso sobre
él. Probado en local con el token de WhatsApp caído: 2 revisados, 0 contactados,
2 fallidos, cero cambios en la base.

**El mensaje de seguimiento es plantilla, no modelo.** Es un empujón de una
línea; una llamada de IA por cada lead dormido cuesta dinero y latencia para
redactar siempre lo mismo. Cuando la persona conteste vuelve a entrar el modelo
con todo el historial, porque la etapa de seguimiento lleva `responsable = ia`.

**`stage.es_seguimiento` es una marca, no un nombre.** Buscar «Sin Respuesta»
por texto rompe en silencio en cuanto alguien la renombra o le cambia una
tilde. Índice único parcial por organización: si hubiera dos, «a dónde va»
dejaría de tener respuesta.

**El cron se autentica con `CRON_SECRET`.** La ruta no es del panel, así que
`proxy.ts` la deja pasar —igual que `/api/fotos`, que ya se había quedado
abierta una vez— y no puede pedir sesión porque quien llama es Vercel. Sin la
variable configurada, en producción rechaza todo: es preferible que el
seguimiento no corra a que cualquiera en internet pueda gatillar mensajes de
WhatsApp a los clientes de una automotora.

**Nota:** el guardarraíl de migraciones atrapó su primer caso real acá. La
`0019` estaba aplicada solo en local y el chequeo bloqueó la build antes de
subirla.

## 2026-09-15 — Importar el inventario desde su planilla

Lo que se pidió primero fue **importar**; la exportación de la entrada de abajo
salió de una lectura equivocada de la misma frase. Se quedó porque ya estaba
hecha, funciona y comparte el formato — pero el trabajo de verdad es este.

**Dos pasos, y el primero no escribe nada.** Se lee el archivo, se muestra qué
va a pasar, y recién con el segundo clic se crea. Importar treinta autos es de
las pocas cosas del panel que no se deshacen con un clic —habría que
archivarlos uno por uno— así que la vista previa no es un lujo.

**Los repetidos se saltan, no se actualizan.** Si alguien editó ese auto en el
panel —le subió fotos, le corrigió el precio, le escribió la descripción— la
planilla no se lo pisa. Importar dos veces por error no destruye nada. Se
comparan patentes contra activos Y archivados: un auto archivado sigue ocupando
su patente, y recrearlo dejaría dos fichas del mismo vehículo. También se
detectan las repetidas dentro de la misma planilla.
**Qué lo revertiría:** querer mantener la planilla como fuente de verdad y
reimportarla para sincronizar precios.

**«Sin Patente» no es una patente**, es como su planilla escribe la ausencia.
Esas filas no se pueden deduplicar, así que siempre se crean.

**El título no viene en la planilla: se compone** como `Marca Modelo Version`,
que es la forma de los títulos que ya existen en el panel. Se recorta por
palabra a 100 caracteres, que es lo que acepta el formulario.

**Mínimo para entrar: marca, modelo, año y precio** — lo mismo que exige el
formulario. Del `Libro1.xlsx` real entraron 32 de 34 filas; las dos que no,
porque venían sin año ni precio. Se listan en la vista previa con su número de
fila y qué les falta, en vez de fallar en silencio o rechazar la planilla
entera.

**Se creó la carrocería «Moto».** Apareció importando su inventario real: venden
una BMW R1250 RT y nuestro catálogo no tenía dónde ponerla. Lo que no
reconocemos pasa tal cual —mejor guardar «Buggy» que perder el dato— pero esto
era una categoría de verdad.

**Se crean de a uno y sin transacción envolvente.** `crearVehiculo()` calcula el
correlativo `COD9xxxxx` leyendo el máximo actual, así que necesita ver lo que
insertó la fila anterior. Si una falla, las anteriores quedan creadas y se
informa cuál falló: es preferible a perder 31 autos por culpa del 32.

**El cupo del plan se revisa antes de escribir**, no a la mitad:
`crearVehiculo()` no lo mira, y una planilla de 300 filas podría pasarse del
límite sin que nada lo dijera.

**El lector de .xlsx también se escribió a mano** (`lib/importar/xlsx.ts`), por
las mismas razones que el escritor. Lee el zip por el DIRECTORIO CENTRAL y no
recorriendo cabeceras locales: las locales pueden traer el tamaño en cero cuando
el archivo se escribió en streaming. Y la posición de cada celda sale de su
referencia (`D4`), no del orden — una fila con huecos omite las celdas vacías, y
leerlas en orden correría todo a la izquierda hasta dejar el año en la columna
del modelo. Entiende cadenas compartidas (lo que usa Excel) y en línea (lo que
escribe nuestro exportador).

## 2026-09-15 — Exportar el inventario a Excel

**El formato no lo elegimos nosotros.** Sale del `Libro1.xlsx` que la automotora
ya usa, y por eso las columnas se llaman como se llaman —«Version» sin tilde,
«P. Publicación»— y los valores vienen abreviados. Copiar su planilla es lo que
permite pegar esto en lo que ya tienen sin reordenar nada:

    Patente · Marca · Tipo · Modelo · Version · Transmision · Año · Kilometraje · P. Publicación

**Su vocabulario no es el nuestro**, y la traducción vive en el export, no en el
catálogo: la interfaz sigue diciendo «Automática» y «Camioneta» porque es lo que
alguien elige en un formulario; la planilla dice `AT` y `Pick Up`. CVT y
Semiautomática caen en `AT`, porque para esa planilla lo que importa es si el
conductor embraga. Las carrocerías sin equivalente —Van, Furgón, Minibús— pasan
tal cual: una celda que diga «Furgón» es mejor que una vacía o que un «Otro» que
pierde el dato. Y la patente ausente se escribe «Sin Patente», como en su
original.

**Año, kilometraje y precio van como NÚMERO, no como texto.** Es lo que permite
ordenar y sumar en Excel: un «47.450.000» con puntos se ordena como texto y pone
9.000.000 arriba de 47.000.000.

**El .xlsx se escribe a mano, sin dependencia.** Un xlsx es un ZIP con unos
pocos XML; son ~120 líneas en `lib/exportar/xlsx.ts`. La alternativa era
`exceljs` (más de un mega para una sola pantalla) o `xlsx`, cuyo paquete en npm
quedó congelado cuando el proyecto se mudó a su propio CDN. Para una tabla de
texto y números, sin fórmulas ni formatos ni gráficos, no se justifica ninguna.
**Qué lo revertiría:** necesitar estilos, anchos de columna, varias hojas o
fechas — ahí sí conviene la librería.

Los textos van en línea (`inlineStr`) en vez de la tabla de cadenas
compartidas: Excel acepta las dos formas y así se ahorra un archivo entero y
toda la contabilidad de índices. Las celdas vacías se omiten, y cada celda lleva
su referencia (`D4`), así que una fila con huecos no se desalinea.

**La ruta vive en `/vehiculos/exportar`, no en `/api`.** `esRutaDelPanel()` mira
el primer segmento del camino, así que hereda la puerta del panel sin escribir
un solo chequeo. Colgada de `/api` habría quedado abierta —como le pasó a
`/api/fotos`— y con ella se llevaría el inventario completo con precios
cualquiera que adivinara la URL.

**Se exporta lo que se está viendo.** Los filtros viajan en la URL desde la
pantalla, así que filtrar por Peugeot y exportar da los Peugeot. Exportar
siempre el inventario entero sería una sorpresa para quien acaba de filtrar.
Quedan fuera `pagina` —se exporta el resultado completo del filtro, no la página
visible— y `modo`, que es cómo se mira y no qué se mira.

## Decisiones pendientes

- [ ] **El bot de WhatsApp está caído desde el 2026-09-09 21:00.** El token de
      Meta expiró: era temporal. Comprobado el 2026-09-13 contra la Graph API —
      `Error validating access token: Session has expired`. El webhook sigue
      recibiendo y guardando (eso no depende del token), así que **los leads
      entran al embudo pero nadie les contesta**, que es peor que no recibirlos:
      parece que funciona. Se arregla con un token de *System User* en Meta
      Business, que no vence; con otro temporal volvemos a lo mismo en semanas.
      Postergado a propósito hasta poder pagar el servicio de WhatsApp Business.
      Lo demás sí funciona: base, Claude, Gemini y Blob verificados ese día.

- [ ] Cambiar el correo de la propia cuenta: toca Supabase y `app_user`, y
      dispara una confirmación. Hoy no se puede desde ninguna parte.
- [ ] Que `SUPABASE_SERVICE_ROLE_KEY` exista en Vercel con su nombre, en vez de
      depender del respaldo por sufijo.
- [ ] Quitar una cuenta de verdad: hoy «Desactivar» corta el acceso —
      `sesionActual()` exige `activo`— pero la fila de `membership` queda. Para
      un despido conviene borrarla.
- [ ] **¿Conectar Supabase antes de la Fase 2 o seguir con semilla?**
      Recomendación: seguir con semilla — el esquema aún se moverá al definir gastos
      y comisiones, y migrar datos semilla es gratis.
- [ ] Qué entra exactamente en `gastos` (define el cálculo de utilidad, hoy en $0).
- [ ] Modelo de comisión de consignación.
- [ ] Proveedor de datos para Consultar patente.
- [ ] Permisos del rol vendedor (¿ve precios de compra y utilidad?). Ahora bloquea:
      con cuentas reales hay que decidir qué ve cada rol.
- [ ] Sacar el respaldo a la organización de la semilla en `orgActual()` antes de
      exponer la aplicación.
- [ ] Cómo se despliega el recorte: `rembg` es una dependencia de python que hoy
      no está en el Dockerfile. ¿Se agrega a la imagen o va como servicio aparte?
- [ ] Guardar la pieza armada por vehículo, para reabrirla y reeditarla.
- [ ] Si la línea de piso alcanza para montar el auto o hace falta ajustarla por
      foto: la altura de cámara del recorte no siempre calza con la del fondo.
- [ ] El webhook de WhatsApp ya recibe y guarda (`/api/webhooks/whatsapp`),
      probado con el número de prueba de Meta. Falta: conseguir el número real
      (el de la empresa está tomado por otro software) y escribir la lógica que
      arma el prompt con `assistant_config` + `knowledge_item` y llama a
      `clienteClaude()` por cada mensaje — sin eso el bot recibe pero no
      contesta, y el panel de Asistente IA guarda comportamiento que nadie
      ejecuta todavía.
- [ ] Tabla de mensajes de verdad (hoy viven como `lead_activity` tipo
      `mensaje`) para poder mostrar el historial completo del chat en el panel
      del lead — ver "Webhook de WhatsApp".
