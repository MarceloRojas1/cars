# Escalar a 200 automotoras

Qué significa en números, dónde está la carga real y qué construir en qué orden.
Derivado de los datos reales de la cuenta demo (31 vehículos, 775 leads,
640 leads/mes, 914 conversaciones IA/mes, 2 usuarios).

---

## 1. La escala real

| | Por automotora | × 200 |
|---|---|---|
| Usuarios | 3 – 5 | ~800 |
| Vehículos activos | 30 – 60 | ~8.000 |
| Leads nuevos / mes | ~640 | ~128.000 |
| Leads / año | | ~1,5 millones |
| Conversaciones IA / mes | ~900 | ~180.000 |
| Mensajes WhatsApp / mes | ~18.000 | **~3,6 millones** |
| Fotos | 40 × 20 | ~160.000 (~80 GB) |
| Tamaño de la base | | ~10–15 GB al año |

**Esto es una base de datos chica.** Un solo Postgres de tamaño mediano lo mueve
sin transpirar. No hay que shardear, ni replicar, ni particionar. La intuición de
que "200 clientes" es mucho no aplica en B2B: son 800 personas, no 800.000.

## 2. Dónde está la carga de verdad

El tráfico humano es lo de menos: ~800 usuarios, quizás 150 concurrentes en horario
laboral. Eso no mueve la aguja.

Lo que sí pesa, y es continuo:

| Trabajo de fondo | Volumen a 200 clientes |
|---|---|
| Sync de campañas Meta (cada hora) | ~4.800 / día |
| Republicación en marketplaces | ~1.600 / día |
| **Mensajes entrantes de WhatsApp** | **~120.000 / día (~1,4/s, con picos de 20/s)** |

**El agente de IA es la pieza más cargada y más cara del sistema.** Cada mensaje
puede gatillar una llamada a un modelo. A 3,6 millones de mensajes al mes, eso
domina la factura y define la arquitectura — no las pantallas del CRM.

Conclusión: la inversión de ingeniería va en **colas y workers**, no en más
servidores web.

## 3. Qué construir, en orden

### Bloquea al primer cliente que paga

1. **Autenticación con contexto de organización.** Hoy la app usa un
   `ORG_UUID` constante. La sesión tiene que resolver a qué organización pertenece
   el usuario y alimentar RLS.
2. **Aislamiento entre automotoras, probado con tests.** RLS está desde la
   migración 0001, pero *no está verificado*. Un test que afirme que la
   organización A no puede leer nada de la B. Una filtración acá no es un bug: es
   el fin del producto.
3. **Fotos en almacenamiento de objetos.** Ver `src/lib/storage.ts`.
4. **Conexión por pooler**, no directa. Ver `src/lib/db.ts`.
5. **Respaldos con restauración probada.** No basta con contratarlos: hay que
   haber restaurado uno.

### Bloquea alrededor del cliente 20

6. **Cola de trabajos con reintentos.** Las APIs de Meta, MercadoLibre y Yapo
   fallan y limitan por tasa. Sin reintentos con espera creciente, cada caída de
   un tercero se convierte en datos perdidos.
7. **Idempotencia en los webhooks.** WhatsApp y Meta entregan el mismo evento más
   de una vez. Sin deduplicación se crean leads duplicados — un problema de
   calidad de datos que el cliente ve de inmediato.
8. **Cuotas del plan aplicadas en el servidor.** Los límites (vehículos, usuarios,
   conversaciones IA) hoy son decorativos.
9. **Observabilidad.** Errores, consultas lentas y métricas *por organización*.
   Cuando una automotora diga "está lento" hay que poder saber si es ella o son
   todas.

### Bloquea alrededor del cliente 200

10. **Paginación en las tablas.** Hoy se traen todos los registros. Con 200 leads
    por pantalla funciona; con 5.000 no.
11. **Índices revisados con datos reales**, no con la semilla.
12. **Migraciones sin caída.** Con clientes pagando no se apaga la app: cambios
    aditivos, desplegar código primero, rellenar datos después.

## 4. Lo que NO hay que construir

A esta escala, cada una de estas agrega modos de falla sin resolver un problema
que exista:

- Sharding o multi-región
- Microservicios
- Kubernetes
- Réplicas de lectura
- Capas de caché distribuida

Un solo Postgres + pooler + Vercel + una cola aguanta bastante más allá de 200.
Cuando alguna de estas haga falta, se va a notar en las métricas — no antes.

## 5. Lo que ya está bien resuelto

Las decisiones caras ya se tomaron y se tomaron bien:

- **Multi-tenant desde la primera migración**, con `organization_id` en todo y RLS.
  Esto es lo que resulta carísimo de agregar después.
- **Capa de datos con una sola puerta** (`src/lib/data/index.ts`): cambiar de
  origen no toca las pantallas.
- **Mismo Postgres en desarrollo y producción**, con una sola migración que corre
  en ambos (ver el shim de `auth` en `docker/initdb/`).
- **Índices encabezados por `organization_id`**, que es como se van a consultar.
