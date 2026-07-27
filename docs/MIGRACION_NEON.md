# Migración de Cloud SQL → Neon (PostgreSQL gratis)

> Objetivo: eliminar el mayor coste fijo de Google Cloud (la base de datos Cloud SQL,
> encendida 24/7) moviéndola a **Neon**, un PostgreSQL serverless con plan gratuito
> que se apaga solo cuando no hay tráfico.
>
> **Por qué es de bajo riesgo aquí:** el backend YA soporta Neon. En `server.py`
> (`init_pool`) hay una rama de conexión por TCP+SSL —el comentario dice literalmente
> `TCP (Neon/Supabase/dev)`—. No hay que cambiar código de conexión: solo el secreto
> `DATABASE_URL` y una variable del repositorio.
>
> **Regla de oro:** no se apaga Cloud SQL hasta comprobar que Neon funciona. Si algo
> falla, se vuelve atrás en 1 minuto (paso 8).

---

## Antes de empezar necesitas

1. **La facturación de Google reactivada** (temporalmente, para poder sacar los datos).
2. **La cadena de conexión actual** (secreto `DATABASE_URL` en Secret Manager). Trae el
   usuario, la contraseña y el nombre de la base de datos de Cloud SQL.
3. ~15 minutos.

Todo se hace desde el navegador con **Google Cloud Shell** (no hay que instalar nada:
ya trae `gcloud`, `psql`, `pg_dump` y el proxy de Cloud SQL).

---

## Paso 1 — Crear la cuenta y el proyecto en Neon (5 min)

1. Entra en **https://neon.tech** → **Sign up** (puedes usar tu cuenta de Google/GitHub).
2. **Create project**:
   - **Name**: `tradingcalculator`
   - **Postgres version**: la más alta que ofrezca (16 o 17).
   - **Region**: **Europe (Frankfurt)** — importante, para que quede cerca de tu backend
     en `europe-west1` y no añada latencia.
3. Al crearlo, Neon te enseña la **Connection string**. Cópiala y guárdala. Tiene esta forma:
   ```
   postgresql://tradingcalculator_owner:AbCdEf123@ep-cool-name-123456.eu-central-1.aws.neon.tech/tradingcalculator?sslmode=require
   ```
   > Guarda la versión SIN el pooler (endpoint directo) para la migración. La de la app
   > puede ser cualquiera de las dos; ambas funcionan con nuestro código porque quita el
   > `?sslmode=require` y aplica SSL por su cuenta.

---

## Paso 2 — Abrir Cloud Shell y arrancar el proxy de Cloud SQL

1. En la consola de Google Cloud, arriba a la derecha, pulsa el icono **`>_`** (Activar Cloud Shell).
2. Arranca el proxy hacia tu base de datos (deja este comando corriendo):
   ```bash
   cloud-sql-proxy tradingcalculatorpro-502817:europe-west1:trading-db --port 5432 &
   ```
   Verás algo como `Listening on 127.0.0.1:5432`.

---

## Paso 3 — Sacar una copia de los datos de Cloud SQL

Sustituye `USUARIO`, `CONTRASEÑA` y `NOMBRE_BD` por los de tu `DATABASE_URL` de Cloud SQL:

```bash
pg_dump "postgresql://USUARIO:CONTRASEÑA@127.0.0.1:5432/NOMBRE_BD" \
  --no-owner --no-privileges -Fc -f backup.dump
```

- `--no-owner --no-privileges`: evita que intente recrear permisos propios de Cloud SQL.
- `-Fc`: formato comprimido.
- Al terminar, `ls -lh backup.dump` te muestra el tamaño (a tu escala serán pocos MB).

> **Atajo si tu base está prácticamente vacía** (solo datos de prueba): puedes saltarte
> los pasos 3 y 4. El backend recrea TODAS las tablas vacías solo al arrancar
> (`create_all_tables`). Pero perderías usuarios/registros existentes, así que solo hazlo
> si no te importa empezar de cero.

---

## Paso 4 — Restaurar los datos en Neon

Usa la **connection string de Neon** del Paso 1:

```bash
pg_restore --no-owner --no-privileges \
  -d "postgresql://USUARIO_NEON:CONTRASEÑA_NEON@ep-....eu-central-1.aws.neon.tech/NOMBRE_BD_NEON?sslmode=require" \
  backup.dump
```

Comprobación rápida de que llegaron los datos (debería listar tus tablas: `users`, `trades`, …):

```bash
psql "postgresql://USUARIO_NEON:...@ep-....neon.tech/NOMBRE_BD_NEON?sslmode=require" \
  -c "\dt"
psql "postgresql://USUARIO_NEON:...@ep-....neon.tech/NOMBRE_BD_NEON?sslmode=require" \
  -c "SELECT count(*) FROM users;"
```

---

## Paso 5 — Poner la cadena de Neon como `DATABASE_URL`

Actualiza el secreto (una versión nueva; la vieja de Cloud SQL queda guardada por si hay
que volver atrás):

```bash
echo -n "postgresql://USUARIO_NEON:CONTRASEÑA_NEON@ep-....eu-central-1.aws.neon.tech/NOMBRE_BD_NEON?sslmode=require" \
  | gcloud secrets versions add DATABASE_URL --data-file=-
```

> También puedes hacerlo desde la consola: **Secret Manager → DATABASE_URL → New version**.

---

## Paso 6 — Decirle al despliegue que use Neon (sin editar código)

En GitHub, en tu repositorio:

**Settings → Secrets and variables → Actions → pestaña _Variables_ → New repository variable**

- **Name**: `DB_PROVIDER`
- **Value**: `neon`

Esto hace que el próximo despliegue **no monte el socket de Cloud SQL** (ver
`deploy-cloud-run.yml`). Mientras esta variable no exista o valga `cloudsql`, todo sigue
como hasta ahora.

*(Opcional, mismo sitio, para ahorrar más: variable `MIN_INSTANCES` = `0`.)*

---

## Paso 7 — Redesplegar y verificar

1. GitHub → **Actions → “Deploy Backend a Cloud Run” → Run workflow** (rama `main`).
2. Cuando acabe, abre en el navegador: `https://TU-URL-DE-CLOUD-RUN/api/health`.
   Debe responder con la base de datos conectada (el endpoint reporta el estado de la BD).
3. Entra en tu web y haz login, abre el diario, guarda un cálculo. Si todo va, **estás en Neon**.

---

## Paso 8 — Si algo falla: volver atrás (1 minuto)

- Borra o pon a `cloudsql` la variable `DB_PROVIDER` en GitHub.
- Restaura el secreto anterior: **Secret Manager → DATABASE_URL** → reactiva (Enable) la
  versión antigua de Cloud SQL.
- Redespliega. Vuelves exactamente a como estabas.

---

## Paso 9 — Apagar Cloud SQL (SOLO cuando lleves días bien en Neon)

Una vez confirmes que Neon funciona sin problemas:

1. **Cloud SQL → `trading-db` → Stop** (para de facturar computación; conserva los datos
   unos días por si acaso).
2. Cuando estés totalmente seguro: **Delete** la instancia.
3. (Opcional) Quita la línea `--add-cloudsql-instances` del workflow: ya no hace falta,
   pero con `DB_PROVIDER=neon` tampoco se usa, así que no corre prisa.

---

## Notas y límites del plan gratuito de Neon

- **0,5 GB de datos**: sobra para años a tu escala (todo son filas JSONB pequeñas).
- **Se apaga sola** tras unos minutos de inactividad → la primera consulta después tarda
  ~1-2 s en “despertar”. Imperceptible con poco tráfico.
- Si algún día creces, Neon de pago (~19 $/mes) sigue siendo más barato que Cloud SQL
  dedicado + Cloud Run siempre encendido.
- **Ahorro esperado:** Cloud SQL (tu mayor línea) → 0 €. Con `MIN_INSTANCES=0` además,
  Cloud Run entra en el tramo gratuito para poco tráfico. Factura de Google ≈ **casi 0**.
