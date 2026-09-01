# Ingeniería inversa — VENPU
CRM / DMS para automotoras (Chile). Multi-tenant, tema oscuro, acento amarillo.
Fuente: 26 capturas en `fotos/` (cuenta demo: automotora "Marketcar", usuario Owner Juan José Domínguez).

---

## 1. Shell de la aplicación

| Zona | Contenido |
|---|---|
| Topbar (h≈40px) | Logo VENPU · iconos: conversaciones, notificaciones (badge `9+`), pantalla · **banner de estado global** rojo "No estás recibiendo leads nuevos" + botón `Activar` |
| Sidebar fija (w≈224px) | 3 grupos: **GESTIÓN** (Dashboard, Vehículos, Consultar patente, Control de Ventas, Clientes, Leads, Embudo, Recordatorios) · **MARKETING** (Campañas, Rendimiento, Estudio IA) · **ADMINISTRACIÓN** (Mi Plan, Sucursales, Equipo, Mi sitio web, Asistente IA, Automatización, Asignación de leads, Integraciones) |
| Footer sidebar | Avatar + nombre + email del usuario activo |
| Contenido | Título H1 + subtítulo + acción primaria arriba a la derecha; luego tabs / filtros / tabla o cards |
| FAB | Botón flotante amarillo "Asistente" (abajo derecha, en todas las vistas) |

Patrón repetido en casi toda pantalla: **título → subtítulo → contador de cuota ("31/100 vehículos publicados · 69 disponibles") → banner de insight accionable → tabs → filtros + búsqueda + exportar → tabla**.

## 2. Mapa de pantallas y qué datos consume cada una

| Ruta (inferida) | Pantalla | Lee | Escribe |
|---|---|---|---|
| `/dashboard` | Hola, {nombre} | KPIs mes, alertas, actividad | archivar leads |
| `/vehiculos` | Inventario | vehicles + publicaciones | CRUD vehículo |
| `/consultar-patente` | Lookup patente | API Registro Civil + tasación + encargo por robo (cache 24h) | — |
| `/control-de-ventas` | Dashboard / Compras / Consignaciones / Notas de Venta | sales, expenses, cierres | cerrar mes |
| `/clientes` | Contrapartes | clients (dedup por RUT) | CRUD cliente |
| `/leads` | Tabla de leads | leads + stages + sources | cambiar etapa, asignar |
| `/embudo` | Kanban por etapa | leads agrupados por stage | drag&drop de etapa, editar embudo |
| `/recordatorios` | *(sin captura)* | reminders | — |
| `/campanas` | Meta Ads | campaigns + métricas sync | crear/pausar campaña |
| `/rendimiento` | Analítica de equipo | agregados de leads/ventas/stock | configurar routing |
| `/estudio-ia` | Showrooms / Creativos / Contenido | showroom presets + generaciones | generar imagen |
| `/mi-plan` | Resumen / Facturación / Método de pago / Addons / Cancelar | subscription + usage | contratar addon |
| `/sucursales` | Sucursales | branches | CRUD sucursal |
| `/equipo` | Miembros | users + roles | invitar / editar |
| `/mi-sitio-web` | Catálogo público | site_config + hero_slides | branding, slides |
| `/asistente-ia` | Config del agente | assistant_config + knowledge | toggles, prompts, FAQ |
| `/automatizacion` | Automatización del embudo | stages + stage_automation | activar Agente IA por etapa |
| `/asignacion-de-leads` | Routing | routing_config + rules + estado vendedores | estrategia, reglas, SLA |
| `/integraciones` | Conectores | integrations | conectar/desconectar |

## 3. Modelo de datos observado

### Núcleo multi-tenant
```
organization ──1:N── branch ──1:N── vehicle
     │                  │
     ├──1:N── user ─────┘ (user.branch_id opcional)
     ├──1:1── subscription / plan_usage
     ├──1:1── site_config ──1:N── hero_slide
     ├──1:1── assistant_config ──1:N── knowledge_item
     ├──1:1── routing_config ──1:N── routing_rule
     ├──1:N── stage
     └──1:N── integration
```

### Comercial
```
vehicle ──1:N── vehicle_channel_publication   (ML, ML propia, ChileAutos, Yapo)
vehicle ──1:N── lead                          (lead.vehicle_id NULLABLE → "Sin vehículo")
vehicle ──1:1── sale                          (o 1:N operation)
lead ────N:1── stage ─── N:1 ── user (vendedor)
lead ────1:N── message / activity
client ──1:N── operation (compra | consignación | nota de venta)
campaign ─N:M── vehicle
```

### Tablas y campos vistos en pantalla

**vehicle** — `codigo` (COD922142), `titulo` ("Mercedes Benz GLA 200 1.6 AT año 2016"), marca, modelo, versión, `anio`, `precio`, `km`, `combustible` (Bencina/Diesel/Híbrido), `sucursal`, `estado` (Disponible/Pendiente/Vendido), `vendedor_id`, `foto_principal`, `completitud_pct` (91%, 97% — verde = 100%), `dias_publicado` (112d), canales publicados.

**lead** — contacto (`nombre` puede venir sucio: "?????"), `telefono`, `email`, `vehicle_id?`, `stage_id`, `source` (meta_ads, whatsapp, mercadolibre, chileautos, manual, web_dealer, landing_ads, referral, social, instagram, phone, marketplace, chile_autos), `tipo` (venta | consigna/compra), `vendedor_id?` (50 sin asignar), `temperatura` HOT (icono llama), `msg_count`, `dias_en_etapa`, `is_lost`, `created_at`.

**stage** — `nombre`, `tipo` ∈ {`entry`, `progress`, `exit_won`, `exit_lost`}, `color`, `orden`, `ai_agent_enabled`.
Etapas actuales: Nuevo(entry) · Calificando · Calificado · Contactado/Seguimiento · Visita Agendada · Sin Respuesta · Ganado(exit_won) · Descartado(exit_lost) · Consigna/Compra. **Son configurables por organización** ("Las etapas se crean y ordenan desde el Embudo").

**client** — `nombre`, `rut` (clave de deduplicación), `telefono`, `comuna`, `operaciones_count`. Ojo: **client ≠ lead**. El cliente es la contraparte de compras/consignaciones; el lead es el interesado en comprar.

**sale / operation** — `vehicle_id`, `tipo`, `vendedor_id`, `precio_venta`, `gastos`, `utilidad`, `dias` (en stock, coloreado: >60d rojo), `fecha`, `financiera`, `saldo_pendiente`.

**monthly_close** — `periodo_inicio/fin`, `cerrado_at`, `ventas`, `ingresos`, `utilidad`. Acción `Cerrar mes` (bloquea el periodo).

**campaign** — `nombre` (CTWA · {vehículo}), `estado`, `canal` (WhatsApp), `vehiculos[]`, `regiones[]`, `presupuesto_diario`, `gasto`, `cpl`, `contactos`, `impresiones`, `alcance`, `clics`, `ctr`, `conv_whatsapp`. Estado local con **sync automático con Meta cada hora**.

**assistant_config** — triggers (`ctwa`, `contactos_nuevos`, `contactos_existentes`), servicios (`consignacion`, `compra_directa`, `financiamiento`), `modo_consultor`, `antiguedad_max_financiamiento` (10 años), personalidad (`nombre_agente`="Antonia", `saludo`, `tono`, `instrucciones`, `prohibiciones`), `knowledge_item[]` (FAQ: financiamiento, parte de pago, compra/consignación).

**routing_config** — `estrategia` ∈ {menos_ocupado, turno_rotativo, manual}, `reasignar_min` (5), `sla_enabled`. Prioridad de resolución documentada en la UI: **1) origen del lead → 2) sucursal del vehículo → 3) tipo de lead → 4) rotación general**.

**site_config** — `slug` público (`venpu.cl/market-car`), logo, portada 1600×600, OG 1200×630, color principal, hero (texto superior/título/subtítulo/2 botones con texto+enlace) y `hero_slide[]` (máx 10: imagen 1600×750 o video MP4 ≤10MB/15s, textos, botón, **posición del texto en grilla 3×3**).

**integration** — meta_business, whatsapp, claude, mercadolibre (incluido en plan), mercadolibre_propia, yapo, chileautos, zernio. Estado: conectado / no conectado / incluido.

## 4. Métricas derivadas (no se guardan, se calculan)

- **Dashboard**: stock disponible, ventas del mes, leads del mes, utilidad del mes (todos con Δ% vs mes anterior), "Requiere atención" = suma de leads HOT sin atender + autos sin movimiento +45d + notas con saldo pendiente, mejor auto del mes, leads por canal, días en salón (>30d publicados, "críticos"), actividad reciente.
- **Rendimiento**: total leads, sin asignar (% de últimos 30 días), stock, días en stock promedio, **rapidez en contactar** (mediana 30d, umbrales <15min óptimo / <1h aceptable / >24h lead frío), meta mensual de ventas, tabla de equipo (asignados, atendidos %, rapidez, sin abrir, hot/warm), vehículos que necesitan atención, **"dónde se atoran"** (leads por etapa + detenidos), origen de clientes (dona + tabla con % asignados).
- **Control de ventas**: unidades vendidas, ingresos, utilidad, ticket promedio, días promedio en stock, ventas/utilidad por vendedor, ventas por tipo (dona), tendencia 12 meses, próximos cumpleaños de clientes.

## 5. Reglas de negocio inferidas

1. Un lead **puede no tener vehículo** (consignación / compra / consulta general).
2. Los leads entran por webhook de canal (Meta CTWA, WhatsApp, portales) → routing automático → etapa `entry` → el Agente IA responde si la etapa lo tiene activo y se cumple un trigger.
3. Si el vendedor no responde en N minutos, el lead **se reasigna**.
4. El % de completitud de publicación penaliza visibilidad ("14 publicaciones incompletas — están perdiendo visibilidad").
5. Antigüedad del stock es el KPI central: 112d, "+45 días sin movimiento", ">30 días publicados = crítico".
6. El plan limita: usuarios (2/10), sucursales (1/3), conversaciones IA (914/2000), vehículos publicados (31/100). Facturación mensual con IVA 19% (CLP).
7. Cerrar mes congela el periodo (ventas/ingresos/utilidad).

## 6. Design system

```
bg app        #0A0A0B      bg card       #121214 / #17171A
borde         #232326      texto         #EDEDEF / muted #8A8A93
acento        #F2E35C (amarillo)  → activo sidebar, botones primarios, FAB
peligro       #E5484D  · banner global #3A0F12
éxito         #30A46C  · warning #F5A524 · info #3B82F6
radio         8px card / 6px control    ·   fuente sans (Inter-like)
tabla         header 12px uppercase muted, filas h≈45px, hover sutil
badges        pill 11px: Disponible, Activo, Owner, Vendedor, entry/progress/exit_won
```

## 7. Huecos (no hay captura)

- Recordatorios · detalle de vehículo · detalle/ficha de lead · bandeja de conversaciones (icono topbar) · sub-tabs de Control de Ventas (Compras / Consignaciones / Notas de Venta) · Estudio IA > Creativos y Contenido · Mi Plan > Facturación/Addons · catálogo público (`venpu.cl/{slug}`) · login/onboarding.

## 8. Plan de recreación sugerido

**Stack**: Next.js (App Router) + TypeScript + Tailwind + shadcn/ui · Postgres (Supabase) + Prisma · RLS por `organization_id` · colas para sync Meta/marketplaces.

1. **F1 — Esqueleto**: layout (topbar + sidebar + FAB), design tokens, auth, org/branch/user, seed.
2. **F2 — Inventario**: vehicles + fotos + canales + tabla con filtros/exportar.
3. **F3 — Leads y embudo**: stages configurables, tabla, kanban drag&drop, actividad.
4. **F4 — Ventas**: clientes, operaciones, cierres mensuales, dashboard de ventas.
5. **F5 — Dashboard + Rendimiento**: vistas materializadas / queries agregadas.
6. **F6 — Integraciones**: WhatsApp + Meta, webhooks de leads, routing engine.
7. **F7 — IA**: agente de WhatsApp, knowledge base, Estudio IA.
8. **F8 — Sitio público** y plan/facturación.
