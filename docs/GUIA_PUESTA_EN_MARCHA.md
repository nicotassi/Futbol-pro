# Guía de puesta en marcha (sin programar)

Con esta guía Futbolista Pro queda funcionando en tu celular. **No hace falta usar la terminal ni instalar nada.** Todo se hace desde el navegador, idealmente en una computadora, copiando y pegando.

Tiempo estimado: 20–30 minutos. Se hace **una sola vez**.

Vas a usar dos servicios gratuitos:

- **Supabase:** guarda los datos de forma privada, con usuarios y permisos.
- **Vercel:** publica la app en una dirección web propia para abrirla e instalarla en el celular.

> Si en algún paso algo no coincide o aparece un error, sacá una captura de pantalla y mandásela a Claude.

---

## Parte A — Supabase (la base de datos)

### A1. Crear la cuenta y el proyecto

1. Entrá a **https://supabase.com** y tocá **Start your project**.
2. Registrate con tu cuenta de GitHub, la misma donde está el código. Es lo más simple.
3. Si te pide crear una **organización**, poné cualquier nombre (por ejemplo, tu apellido) y elegí el plan **Free**.
4. Tocá **New project** y completá:
   - **Project name:** `futbolista-pro`
   - **Database password:** tocá **Generate a password** y **guardala** en un lugar seguro. Casi nunca la vas a necesitar, pero no se puede recuperar.
   - **Region:** **South America (São Paulo)**
5. Tocá **Create new project** y esperá 1–2 minutos a que termine de prepararse.

### A2. Crear la base de datos (copiar y pegar)

1. En el menú de la izquierda, entrá a **SQL Editor** (ícono de terminal `>_`).
2. Tocá **New query**: se abre un recuadro en blanco.
3. Abrí este archivo del proyecto en GitHub: **`supabase/instalacion/1-crear-base-de-datos.sql`**. En GitHub, el botón **Copy raw file** (ícono de dos hojas) copia todo de una vez.
4. Pegalo en el recuadro de Supabase y tocá **Run**, abajo a la derecha.
5. Al final tiene que aparecer: **"Listo: base de datos de Futbolista Pro creada."**

> Si Supabase muestra un aviso sobre "operaciones destructivas" o pide confirmar, aceptá: el archivo solo crea cosas nuevas.
> Este archivo se ejecuta **una sola vez**. Si lo corrés de nuevo va a decir que las cosas "ya existen" (_already exists_): no pasa nada, ya estaba hecho.

### A3. Cerrar el registro público

Para que nadie más pueda crearse una cuenta:

1. Menú izquierdo → **Authentication** → **Sign In / Providers**. En algunas versiones del panel está en **Authentication → Settings**.
2. Desactivá **Allow new users to sign up**.
3. Tocá **Save**.

### A4. Crear las dos cuentas

1. Menú izquierdo → **Authentication** → **Users** → **Add user** → **Create new user**.
2. **Tu cuenta:**
   - Email: tu email real.
   - Password: una contraseña segura.
   - Dejá marcado **Auto Confirm User**.
   - Tocá **Create user**.
3. Repetí con **la cuenta de Benja:**
   - Email: **`benja@jugador.futbolista-pro.app`**. No es un email real: es como la app guarda el usuario `benja`. Si preferís otro usuario, por ejemplo `benjamin`, usá `benjamin@jugador.futbolista-pro.app`.
   - Password: una contraseña que Benja pueda recordar, de **al menos 8 caracteres** (por ejemplo, `messi2026`).
   - Dejá marcado **Auto Confirm User**.

### A5. Vincular la familia (copiar y pegar)

1. **SQL Editor** → **New query**.
2. Copiá el archivo **`supabase/instalacion/2-vincular-familia.sql`** y pegalo.
3. Arriba de todo, en la parte que dice **COMPLETAR**, cambiá lo que está entre comillas simples `'...'`:
   - `email_papa`: tu email, el mismo del paso A4.
   - `nombre_papa`: cómo querés que te salude la app.
   - `usuario_jugador`: `benja`, o el que hayas elegido.
   - `nombre_jugador`: `Benja`.
4. Tocá **Run**. Abajo aparece una tablita con los dos usuarios: uno **Administrador** y otro **Jugador**. ✅

### A6. Copiar los dos datos de conexión

1. Arriba, tocá el botón **Connect**. Si no lo ves: **Project Settings → API Keys** y **Project Settings → Data API**.
2. Copiá y guardá en un bloc de notas:
   - **Project URL:** algo como `https://abcdefgh.supabase.co`
   - **Publishable key:** empieza con `sb_publishable_...`. En proyectos más viejos se llama **anon public**.

> ⚠️ La **secret key** (o _service_role_) **no** se usa acá ni se comparte con nadie, tampoco con Claude.

---

## Parte B — Vercel (publicar la app)

### B1. Crear la cuenta e importar el proyecto

1. Entrá a **https://vercel.com** → **Sign Up** → **Continue with GitHub**. Elegí el plan **Hobby**, que es gratis.
2. Tocá **Add New… → Project**.
3. En la lista aparece el repositorio **Futbol-pro**: tocá **Import**. Si no aparece, tocá **Adjust GitHub App Permissions** y dale acceso a ese repositorio.

### B2. Cargar los datos de conexión

Antes de tocar **Deploy**, abrí **Environment Variables** y agregá estas dos:

| Name (escribilo exactamente así) | Value                              |
| -------------------------------- | ---------------------------------- |
| `VITE_SUPABASE_URL`              | la **Project URL** del paso A6     |
| `VITE_SUPABASE_PUBLISHABLE_KEY`  | la **Publishable key** del paso A6 |

Tocá **Deploy** y esperá 1–2 minutos. Al terminar, Vercel te da una dirección como **`futbol-pro.vercel.app`**.

> Si te olvidaste las variables, la app muestra "Falta conectar la base de datos". Agregalas en **Settings → Environment Variables** y después andá a **Deployments → ⋯ → Redeploy**.

---

## Parte C — Probar e instalar en el celular

1. En el celular Android, abrí la dirección de Vercel en **Chrome**.
2. Ingresá con **tu email** y tu contraseña. Tenés que ver "Seguimiento de Benja" y la sección **Administración** (en **Perfil**).
3. En **Perfil → Editar**, cargá la fecha de nacimiento de Benja, el club y la categoría, y tocá **Guardar**.
4. **Instalar la app:** menú **⋮** de Chrome → **Agregar a pantalla principal** o **Instalar app**. Queda el ícono dorado "FP".
5. Probá la cuenta de Benja: **Perfil → Cerrar sesión**, e ingresá con usuario **`benja`** y su contraseña. No debería ver Administración.

✅ Si todo eso funciona, la Fase 2 está validada.

---

## Mantenimiento

- **Cambiar la contraseña de Benja:** Supabase → Authentication → Users → tocá su usuario → **Reset password** o **Update password**.
- **Actualizaciones de la app:** cada vez que Claude sube cambios a GitHub, Vercel publica la nueva versión sola.
- **Fases nuevas que cambian la base de datos:** Claude va a dejar un archivo nuevo en `supabase/instalacion/` con instrucciones. Es el mismo procedimiento: copiar, pegar y **Run**.
