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

Vercel no tiene base de datos propia: hay que crear una gestionada. Usa
**Supabase**, porque de todas formas la vas a necesitar para el login.

1. Crea un proyecto en <https://supabase.com>. Guarda la contraseña de la base
   cuando te la muestre — no se puede volver a ver.
2. Copia la cadena de conexión desde **Project Settings → Database**.
   **Usa la del pooler** (*Transaction pooler*, puerto **6543**), no la directa.
   Cada función de Vercel abre su propia conexión; sin pooler, Postgres se queda
   sin cupos con muy poco tráfico.
3. Aplica las migraciones desde tu máquina, con la cadena de la base nueva:

   ```bash
   DATABASE_URL="postgres://…" npm run migrar -- --listar   # qué falta
   DATABASE_URL="postgres://…" npm run migrar               # aplicarlo
   ```

   Cada archivo corre una vez y queda anotado en `_migracion`; volver a
   ejecutarlo no repite nada.

> Las migraciones necesitan el usuario **dueño** de las tablas, no el de la
> aplicación. En Supabase es `postgres`. `velie_app` no puede hacer `alter
> table` — a propósito.

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

Después crea la primera automotora y su cuenta de dueño:

```bash
npm run alta
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

## Lo que NO funciona en Vercel

**El recorte del Estudio IA.** Usa `python3` con `rembg` y el modelo U²-Net como
proceso hijo, y en una función de Vercel no hay intérprete de Python ni espacio
para el modelo. `recorteDisponible()` lo detecta por la variable `VERCEL` y la
pantalla del Estudio lo avisa antes de que alguien empiece una pieza.

Los fondos sí se generan (eso es una llamada a Gemini). Lo que no se puede es
montar un vehículo sobre un fondo.

Para recuperarlo hay tres caminos, de menor a mayor trabajo: una API externa de
recorte (se paga por imagen), mover la segmentación al navegador con WASM
(gratis, más lento), o desplegar el contenedor de este repo —que sí trae
Python— en otro lado y llamarlo desde Vercel.

## Después de desplegar, comprueba esto

1. `https://<dominio>/dashboard` sin sesión → te manda a `/login`.
2. `https://<dominio>/<slug>` → el catálogo se ve sin pedir nada.
3. Entra con la cuenta creada en el paso 2 y sube una foto a un vehículo: la URL
   de la foto tiene que empezar con `https://` y no con `/uploads/`.
