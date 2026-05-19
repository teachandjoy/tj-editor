# Backend — Estudio de Contenido Academico TJ

Backend ligero con Express + better-sqlite3 para persistencia de datos.

## Requisitos

- Node.js >= 18
- npm

## Instalacion

```bash
cd server
npm install
```

## Ejecucion

### Solo backend (puerto 3001)

```bash
npm start
# o en modo desarrollo con auto-reload:
npm run dev
```

### Frontend + Backend juntos

Desde la raiz del proyecto:

```bash
npm run dev:full
```

Esto inicia ambos servidores con `concurrently`:
- Frontend en http://localhost:5173
- Backend en http://localhost:3001

## Estructura

```
server/
  index.js          — Punto de entrada, configura Express
  database.js       — Inicializacion SQLite, esquema y datos semilla
  package.json      — Dependencias del backend
  data/             — Directorio de la base de datos (auto-creado)
    app.db          — Archivo SQLite
  routes/
    users.js        — CRUD de usuarios
    offers.js       — CRUD de ofertas educativas
    topics.js       — CRUD de temas
    templates.js    — CRUD de plantillas
    references.js   — CRUD de referencias bibliograficas
    media.js        — CRUD de multimedia
    folders.js      — CRUD de carpetas
    identities.js   — CRUD de identidades corporativas
    sessions.js     — Gestion de sesiones (login/logout/verify)
    backup.js       — Respaldo y restauracion de datos
```

## API Endpoints

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/api/health` | Verificar estado del servidor |
| GET/POST | `/api/users` | Listar / crear usuarios |
| GET/POST | `/api/offers` | Listar / crear ofertas |
| PUT/DELETE | `/api/offers/:id` | Actualizar / eliminar oferta |
| GET/POST | `/api/topics` | Listar / crear temas |
| PUT/DELETE | `/api/topics/:id` | Actualizar / eliminar tema |
| GET/POST | `/api/templates` | Listar / crear plantillas |
| PUT/DELETE | `/api/templates/:id` | Actualizar / eliminar plantilla |
| GET/POST | `/api/references` | Listar / crear referencias |
| PUT/DELETE | `/api/references/:id` | Actualizar / eliminar referencia |
| GET/POST | `/api/media` | Listar / crear multimedia |
| DELETE | `/api/media/:id` | Eliminar multimedia |
| GET/POST | `/api/folders` | Listar / crear carpetas |
| PUT/DELETE | `/api/folders/:id` | Actualizar / eliminar carpeta |
| GET/POST | `/api/identities` | Listar / crear identidades |
| PUT/DELETE | `/api/identities/:id` | Actualizar / eliminar identidad |
| POST | `/api/sessions/login` | Iniciar sesion |
| POST | `/api/sessions/logout` | Cerrar sesion |
| POST | `/api/sessions/verify` | Verificar token de sesion |
| GET | `/api/backup` | Exportar base de datos como JSON |
| POST | `/api/restore` | Restaurar base de datos desde JSON |

## Base de datos

SQLite almacenada en `server/data/app.db`. Se crea automaticamente al iniciar el servidor con:

- 10 tablas (users, offers, topics, templates, references, media, folders, identities, sessions, autosave_log)
- Datos semilla (usuarios, ofertas, temas, plantillas, referencias por defecto)
- Transacciones para operaciones multi-tabla
- Validacion de datos en cada endpoint

## Caracteristicas

- **Autoguardado**: Cada cambio se persiste automaticamente via la API
- **Reintentos**: 3 intentos con backoff exponencial (500ms, 1s, 2s)
- **Fallback localStorage**: Si el backend falla, los cambios se guardan localmente
- **Heartbeat**: Verificacion de conexion cada 30 segundos
- **Sesiones**: Persistentes por 7 dias con token en localStorage + SQLite
- **Respaldo**: Exportar/importar toda la base de datos como JSON
