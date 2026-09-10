# PENDIENTE URGENTE — rotar credenciales expuestas

**Fecha de la exposición: 2026-09-09.** El contenido completo de `.env.local`
quedó escrito en el historial de una sesión de trabajo con el asistente. No fue
un volcado deliberado: `vercel env pull` reescribió el archivo y la herramienta
mostró el contenido nuevo.

**No hay indicio de uso indebido.** El riesgo es que ese historial se comparta o
se filtre, no que alguien ya esté dentro. Y al momento de la exposición la base
no tenía datos de ningún cliente real.

## La regla que decide cuándo deja de poder esperar

**Antes de que entre información de una automotora de verdad** —sus leads, los
teléfonos de sus clientes, sus precios de compra— hay que haber rotado al menos
las tres primeras. Después de eso, el costo de una filtración deja de ser
nuestro y pasa a ser de un tercero que confió en nosotros.

## Qué rotar, en orden

### 1. Acceso total a la base — lo más grave

- [ ] `SUPABASE_SERVICE_ROLE_KEY` y `SUPABASE_SECRET_KEY`
      → Supabase → Project Settings → API Keys → *Rotate*
      Se saltan TODAS las políticas de aislamiento: con una de estas se leen y
      escriben los datos de cualquier automotora.
- [ ] Contraseña del usuario `postgres`
      → Supabase → Project Settings → Database → *Reset database password*
      Da lo mismo por conexión directa. Ojo: cambia también las cadenas que usa
      la integración de Vercel.
- [ ] `SUPABASE_JWT_SECRET`
      → Supabase → Project Settings → API
      Con esto se firman sesiones válidas de cualquier usuario, sin contraseña.

### 2. Gasto y suplantación

- [ ] `ANTHROPIC_API_KEY` → console.anthropic.com → API keys
- [ ] `GEMINI_API_KEY` → aistudio.google.com/apikey
- [ ] `WHATSAPP_APP_SECRET` → Meta → Configuración básica → *Restablecer*
      Es lo que firma cada webhook: con ella se pueden inventar leads y
      conversaciones que la aplicación aceptaría como reales.
- [ ] `APP_ENCRYPTION_KEY` → generar otra con
      `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
      **Ojo:** descifra las credenciales que las automotoras guardaron en
      Integraciones. Al cambiarla hay que volver a conectarlas.

### 3. Menores

- [ ] `VENPU_PASSWORD` — la cuenta del producto de referencia.
- [ ] `WHATSAPP_VERIFY_TOKEN` — inventar otro; hay que volver a verificar el
      webhook en Meta.
- [ ] Contraseña del rol `velie_app` — ver `supabase/rol-app.sql`.
- [ ] La contraseña de la cuenta del panel, si sigue siendo la del alta.

## Después de rotar

```bash
npm run vercel:sync -- --aplicar   # sube los valores nuevos
```

Y redesplegar: Vercel no aplica variables a un despliegue que ya existe.

## Para que no vuelva a pasar

`vercel env pull` reescribe `.env.local` entero. Si se necesita mirar lo que hay
en Vercel, bájalo a otro archivo (`vercel env pull .env.vercel`) y no lo abras
en una herramienta que pueda mostrar su contenido.
