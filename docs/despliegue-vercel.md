# Desplegar Velie en Vercel

Pasos en orden. Lo que hace falta de ti son cuentas y claves; el código ya está
preparado.

Antes de cada despliegue:

```bash
npm run revisar-despliegue
```

Revisa las variables y dice qué bloquea. Los tres bloqueos son siempre los
mismos: base de datos, autenticación y fotos.

---

## 1. La base de datos

Vercel no tiene base de datos propia. Usa la de **Supabase**, que ya necesitas
para el login.

Supabase te da DOS cadenas de conexión y **no son intercambiables**:

| | Cuál | Para qué |
|---|---|---|
| **Directa / sesión** (5432) | usuario `postgres` | correr las migraciones |
| **Pooler de transacciones** (6543) | el que use la app | que corra la aplicación |

Cada función de Vercel abre su propia conexión; sin pooler, Postgres se queda
sin cupos con muy poco tráfico. Y al revés: el pooler de transacciones no es el
lugar para correr DDL.

**1.1 · Aplica las migraciones**, desde tu máquina, con la cadena directa:

```bash
DATABASE_URL="postgres://postgres:…@db.<ref>.supabase.co:5432/postgres" npm run migrar -- --listar
DATABASE_URL="postgres://postgres:…@db.<ref>.supabase.co:5432/postgres" npm run migrar
```

Cada archivo corre una vez y queda anotado en `_migracion`; volver a ejecutarlo
no repite nada. Si adoptas una base que ya venía andando, `--marcar 0001-0012`
la da por aplicada sin ejecutarla.

**1.2 · Crea el rol de la aplicación.** Abre `supabase/rol-app.sql`, cámbiale la
contraseña y pégalo en el SQL Editor de Supabase.

> **Esto no es opcional y es lo más fácil de saltarse.** El aislamiento entre
> automotoras es row level security, y RLS **no se le aplica** al superusuario ni
> a un rol con `BYPASSRLS`. Si conectas la aplicación como `postgres`, una
> automotora ve los datos de otra — con todas las políticas puestas y sin ningún
> error a la vista. Ya pasó una vez en local: está en `0005_rls_forzado.sql`.

La última consulta del archivo es la comprobación: `rolsuper` y `rolbypassrls`
tienen que dar `f` para `velie_app`.

**1.3 · La cadena que va en Vercel** es la del pooler pero con `velie_app`. En el
pooler de Supabase el usuario lleva el identificador del proyecto pegado
(`velie_app.<ref>`); copia el formato exacto del panel de Supabase y cámbiale el
usuario.

**1.4 · Comprueba el aislamiento** contra la base real antes de seguir:

```bash
DATABASE_URL="<la del pooler, con velie_app>" npm run test:aislamiento
```

## 2. La autenticación

Sin esto el panel **no se sirve**: `proxy.ts` responde 503 en vez de dejarlo
abierto, y `orgActual()` lanza. Es deliberado — olvidar una variable tiene que
romper ruidosamente, no abrir el CRM en silencio.

En el mismo proyecto de Supabase, **Project Settings → API**:

| Variable | De dónde sale |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | *Project URL* |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *anon / public* |
| `SUPABASE_SERVICE_ROLE_KEY` | *service_role* — **nunca** en el cliente |

Después crea la primera automotora y su cuenta de dueño. Esto crea la
organización, su sucursal principal, las nueve etapas del embudo y el usuario,
todo en una transacción — y además la cuenta de acceso en Supabase:

```bash
npm run alta -- --nombre "Marketcar" --slug market-car \
  --email tu@correo.cl --duenio "Tu Nombre" --password "TU-CONTRASENA"
```

Sin `--password` crea la automotora pero no la cuenta de acceso, y lo dice.
Necesita `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` en tu
`.env.local`.

### ¿Y los datos de prueba?

`supabase/seed.sql` tiene el inventario de demostración (Marketcar con sus
vehículos, leads y etapas). Es útil para mostrarle algo a alguien, pero **no lo
cargues en la base de un cliente real**: son datos inventados con los que
después hay que convivir. Para una automotora de verdad, `npm run alta` y a
cargar sus autos.

```bash
# Solo si quieres la demo:
psql "postgres://postgres:…@db.<ref>.supabase.co:5432/postgres" -f supabase/seed.sql
```

## 3. Las fotos

En Vercel el disco es de **solo lectura y efímero**: sin esto, cada foto que
suba una automotora falla al guardarse.

En el panel de Vercel: **Storage → Create → Blob**, y conéctalo al proyecto.
`BLOB_READ_WRITE_TOKEN` se inyecta sola.

`src/lib/storage.ts` elige según haya token: con él sube a Blob, sin él escribe
en `public/uploads/`. El mismo código sirve para las dos cosas.

## 4. Importar el proyecto

1. En Vercel: **Add New → Project** e importa `MarceloRojas1/cars`.
2. Framework: Next.js. No cambies nada de la construcción.
3. Pega las variables de entorno. La lista completa está en `.env.example`;
   las obligatorias son las de los pasos 1 a 3 más `APP_ENCRYPTION_KEY`.

> `DATABASE_URL` también hace falta **al construir**: el catálogo público
> prerenderiza las fichas y para eso consulta la base. Si no contesta, el
> despliegue no se cae —se prerenderiza nada y las páginas se generan al primer
> visitante— pero el sitio arranca más lento.

## 5. La región

`vercel.json` fija las funciones en **`gru1` (São Paulo)**, que es la región de
Vercel más cercana a Chile. Importa más de lo que parece: por defecto Vercel
corre en Washington, y con la base en Sudamérica **cada consulta cruzaría el
hemisferio dos veces**. Una pantalla del panel hace varias consultas, así que se
notaría en todas.

**Crea el proyecto de Supabase en la misma región** (South America / São Paulo).
Región de las funciones y región de la base tienen que coincidir; si no, el
cambio no sirve de nada.

## 6. El webhook de WhatsApp

Cuando el proyecto tenga dominio, apunta el webhook de Meta a:

```
https://<tu-dominio>/api/webhooks/whatsapp
```

con el mismo `WHATSAPP_VERIFY_TOKEN` que pusiste en las variables. Deja de
hacer falta el túnel de desarrollo (`scripts/proxy-webhook.mjs`).

El webhook está fuera del proxy de sesión a propósito: lo autentica la firma
HMAC de Meta, no una cookie.

---

## El Estudio IA corre entero en Vercel

Antes no: el recorte del vehículo era `python3` con `rembg`, que no existe en
una función de Vercel. Se reemplazó por hacer que Gemini meta el auto dentro del
fondo, así que ya no hay dependencia de Python. Lo único que necesita es
`GEMINI_API_KEY`.

## Después de desplegar, comprueba esto

1. `https://<dominio>/dashboard` sin sesión → te manda a `/login`.
2. `https://<dominio>/<slug>` → el catálogo se ve sin pedir nada.
3. Entra con la cuenta creada en el paso 2 y sube una foto a un vehículo: la URL
   de la foto tiene que empezar con `https://` y no con `/uploads/`.
