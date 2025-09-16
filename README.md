# Airbnb-lite (Proyecto extendido)

Este proyecto es un prototipo educativo, ahora con autenticación (registro/login), panel de anfitrión, Docker y opciones de despliegue.

**Importante:** no es para producción sin revisar seguridad, validaciones, almacenamiento de imágenes, pagos, etc.

## Estructura
- frontend/ : proyecto Vite + React (UI con registro/login y panel de anfitrión)
- backend/  : Flask API con SQLite (auth JWT)
- docker-compose.yml : levantar frontend + backend con Docker
- Procfile : ejemplo para Heroku


## Ejecutar localmente (sin Docker)

### Backend
1. Abrir terminal en `backend/`
2. Crear virtualenv y activarlo:
   ```
   python -m venv venv
   # Linux/macOS
   source venv/bin/activate
   # Windows (PowerShell)
   venv\Scripts\Activate.ps1
   ```
3. Instalar dependencias:
   ```
   pip install -r requirements.txt
   ```
4. Ejecutar:
   ```
   python app.py
   ```
5. API escuchando en `http://localhost:5000`

### Frontend
1. Abrir otra terminal en `frontend/`
2. Instalar dependencias:
   ```
   npm install
   ```
3. Ejecutar:
   ```
   npm run dev
   ```
4. Abrir el URL que muestre Vite (por defecto http://localhost:5173)

## Usar ngrok para URL pública rápida
1. Ejecutar backend `python app.py` (o con Docker)
2. En otra terminal: `ngrok http 5000` (descargar ngrok si no lo tenés)
3. Copiar la URL pública (https://abc123.ngrok.io) y ponerla en `frontend/.env` como `VITE_API_BASE=https://abc123.ngrok.io`
4. Reiniciar frontend.

## Levantar con Docker (recomendado si no querés configurar entornos locales)
1. Tener Docker y docker-compose instalado.
2. En la raíz del proyecto ejecutar:
   ```
   docker-compose up --build
   ```
3. Abrir:
   - Frontend: http://localhost:5173
   - Backend:  http://localhost:5000

## Despliegue sugerido
- **Railway / Render / Heroku / Railway**: subir backend y frontend por separado. Backend necesita `SECRET_KEY` en variables de entorno.
- **Notas**: sqlite no es ideal para producción; usar Postgres/MySQL. Configurar HTTPS, almacenamiento de imágenes, validación y control de acceso.

## Rutas principales (backend)
- `POST /auth/register` -> { email, password }
- `POST /auth/login` -> { email, password } -> returns { token }
- `GET /api/listings` -> lista pública de alojamientos
- `GET /api/my_listings` -> requires Bearer token
- `POST /api/create_listing` -> requires Bearer token, body: title, city, price, type, description, image
- `POST /api/book` -> body: listing_id (optional guest_name). If Authorization Bearer token provided, booking links to that user.

## Siguientes pasos que puedo hacer por vos
1. Preparar deploy directo a Railway/Heroku (puedo detallar pasos y generar archivos necesarios). 
2. Añadir pago simulado (Stripe sandbox) y validaciones.
3. Conectar dominio y guía paso a paso para que tengas un link público permanente (requiere que vos autorices despliegue o me des acceso a un repo en tu cuenta).

Si querés, ahora mismo:
- Puedo crear el archivo ZIP con todo y te lo dejo para descargar.
- O te doy instrucciones paso-a-paso para desplegar en Railway usando tu cuenta (te explico cada click).

Decime qué preferís: crear ZIP (listo para descargar) o que te deje la guía para desplegar en Railway paso a paso.
