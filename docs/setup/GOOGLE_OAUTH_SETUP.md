# 🔐 Configuración de Google OAuth

Guía paso a paso para activar el login con Google en Trading Calculator PRO.

---

## 1. Crear el OAuth Client ID en Google Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona o crea un proyecto
3. En el menú lateral: **APIs & Services → Credentials**
4. Haz clic en **Create Credentials → OAuth 2.0 Client ID**
5. Selecciona **Application type: Web application**
6. En **Authorized JavaScript origins**, añade la URL de tu frontend:
   ```
   https://missing-apis-impl.preview.emergentagent.com
   ```
   > ⚠️ NO añadas `/` al final. NO es necesario añadir Redirect URIs.
7. Haz clic en **Create** y copia el **Client ID** generado.
   Tiene el formato: `XXXXXXXX.apps.googleusercontent.com`

---

## 2. Configurar el Backend

Edita (o crea) el archivo `backend/.env`:

```env
GOOGLE_CLIENT_ID=TU_CLIENT_ID.apps.googleusercontent.com
```

---

## 3. Configurar el Frontend

Edita (o crea) el archivo `frontend/.env`:

```env
REACT_APP_GOOGLE_CLIENT_ID=TU_CLIENT_ID.apps.googleusercontent.com
```

> ⚠️ El Client ID debe ser **exactamente el mismo** en backend y frontend.

---

## 4. Reiniciar los servicios

```bash
# Backend
cd backend && uvicorn server:app --reload

# Frontend
cd frontend && npm start
```

---

## 5. Verificar que funciona

- Abre `/login` o `/register`
- Debe aparecer el botón **Continuar con Google**
- Al hacer clic, se abre el selector de cuentas de Google
- Tras seleccionar la cuenta, se redirige al `/dashboard`

---

## ❌ Errores comunes

| Error | Causa | Solución |
|-------|-------|----------|
| Botón no aparece | `REACT_APP_GOOGLE_CLIENT_ID` no definido | Añadir al `frontend/.env` |
| `Error 400: redirect_uri_mismatch` | URL del frontend no añadida en Google Console | Añadir la URL exacta en Authorized JavaScript origins |
| `Token de Google inválido` (backend 401) | `GOOGLE_CLIENT_ID` del backend no coincide | Verificar que ambas variables tienen el mismo Client ID |
| `Google OAuth no está configurado` (backend 500) | `GOOGLE_CLIENT_ID` no en el `.env` del backend | Añadir al `backend/.env` |
