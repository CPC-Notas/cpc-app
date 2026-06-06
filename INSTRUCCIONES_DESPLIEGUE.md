# 🏥 Caribbean Psychology Wellness Center
## Guía de Instalación y Despliegue — Nota de Progreso Clínico

---

## PASO 1: Crear la base de datos en Supabase (5 minutos)

1. Ve a **https://supabase.com** → "Start your project" → Crea cuenta gratis
2. Crea un nuevo proyecto:
   - **Name:** cpc-notas
   - **Database Password:** (guárdala)
   - **Region:** US East (N. Virginia) — más cercana a Puerto Rico
3. Espera ~2 minutos a que el proyecto se inicialice
4. Ve a **SQL Editor** (menú izquierdo) → **New Query**
5. Copia todo el contenido del archivo `supabase_schema.sql` y pégalo → **Run**
6. Ve a **Project Settings → API** y copia:
   - **Project URL** (ej: `https://abcxyz.supabase.co`)
   - **anon public key** (la clave larga que comienza con `eyJ...`)

---

## PASO 2: Configurar las credenciales en el código

Abre el archivo `src/supabaseClient.js` y reemplaza:

```javascript
const SUPABASE_URL = 'https://TU_PROYECTO.supabase.co'  // ← tu Project URL
const SUPABASE_ANON_KEY = 'TU_ANON_KEY_AQUI'           // ← tu anon key
```

También en `package.json`, reemplaza:
```json
"homepage": "https://TU_USUARIO.github.io/cpc-app"
```
Con tu usuario de GitHub real.

---

## PASO 3: Instalar Git y Node.js (si no los tienes)

- **Node.js:** https://nodejs.org → descargar versión LTS
- **Git:** https://git-scm.com/downloads

---

## PASO 4: Crear repositorio en GitHub

1. Ve a **https://github.com** → crea cuenta si no tienes
2. Clic en **"New repository"**
   - Repository name: `cpc-app`
   - Visibility: **Private** (recomendado para datos clínicos)
   - ✓ Add README
3. Clic en **Create repository**

---

## PASO 5: Subir el código y publicar

Abre una terminal (Command Prompt en Windows, Terminal en Mac) en la carpeta `cpc-app`:

```bash
# 1. Instalar dependencias
npm install

# 2. Probar localmente (abre en tu navegador)
npm start

# 3. Inicializar Git
git init
git add .
git commit -m "Initial commit — CPC Nota de Progreso"

# 4. Conectar con GitHub (reemplaza TU_USUARIO con tu usuario de GitHub)
git remote add origin https://github.com/TU_USUARIO/cpc-app.git
git branch -M main
git push -u origin main

# 5. Publicar en GitHub Pages
npm run deploy
```

Después de unos minutos, tu app estará disponible en:
**https://TU_USUARIO.github.io/cpc-app**

---

## PASO 6: Agregar usuarios (clínicos)

En **Supabase → Authentication → Users**:
1. Clic en **"Invite user"**
2. Ingresa el email de cada clínico
3. El clínico recibirá un email con enlace para crear su contraseña

O en la app, clic en **"Crear cuenta nueva"** con el email del clínico.

---

## PASO 7: Instalar como app en celular/tablet

### iPhone/iPad:
1. Abre Safari → ve a la URL de la app
2. Toca el botón de compartir (📤)
3. Selecciona **"Añadir a pantalla de inicio"**
4. La app aparecerá como ícono en el escritorio

### Android:
1. Abre Chrome → ve a la URL de la app
2. Toca el menú (⋮) → **"Añadir a pantalla principal"**

---

## COSTO TOTAL

| Servicio | Plan | Costo |
|----------|------|-------|
| GitHub Pages | Free | $0/mes |
| Supabase | Free (hasta 500MB, 50k usuarios) | $0/mes |
| **TOTAL** | | **$0/mes** |

Si la clínica crece y necesitan más storage o usuarios activos:
- Supabase Pro: $25/mes (8GB, usuarios ilimitados)

---

## ACTUALIZAR LA APP EN EL FUTURO

Cada vez que hagas cambios al código:
```bash
git add .
git commit -m "descripción del cambio"
git push
npm run deploy
```

Los cambios se reflejan en todos los dispositivos automáticamente.

---

## SEGURIDAD Y CUMPLIMIENTO

- ✅ Datos cifrados en tránsito (HTTPS)
- ✅ Datos cifrados en reposo (Supabase AES-256)
- ✅ Autenticación por email/contraseña
- ✅ Row Level Security — cada clínico solo accede a datos de la clínica
- ✅ Supabase está certificado SOC 2 Type II
- ⚠️ Para cumplimiento estricto de HIPAA, considera el plan Supabase Pro ($25/mo)
  con Business Associate Agreement (BAA)

---

## SOPORTE

Ante cualquier duda, contacta al equipo de desarrollo.
Dr. José Antonio García, PsyD — Caribbean Psychology Wellness Center
