# Enfered – TP Final Programación III

Marketplace de enfermería domiciliaria: conecta pacientes con enfermeros/as independientes **verificados**, con búsqueda por cercanía, solicitudes de servicio, chat y reseñas (NestJS + React + MongoDB + Docker).

## Integrantes
- Germán Tornello
- Leo
- Santiago
- Pablo

## Qué problema resuelve
Conseguir un enfermero/a a domicilio hoy es informal: "boca a boca", grupos de WhatsApp o agencias. Hay demoras, no hay garantía de que el profesional esté matriculado y es difícil resolver necesidades puntuales (una inyección, una curación, un control de signos vitales). Enfered permite buscar enfermeros cercanos y verificados, pedirles un servicio, coordinar por chat y calificarlos al final. Más detalle en [docs/DOCUMENTO.md](docs/DOCUMENTO.md) y en [GUIA_ENFERED.md](GUIA_ENFERED.md).

## Aclaración sobre el frontend
**El frontend parte del de Enfered de Práctica Profesionalizante 3 (PP3).** No se hizo de cero: se reutilizó esa base (mismas tecnologías: React + Vite + axios + react-router + react-leaflet) y se adaptó al contrato de este TP. Se reescribió la capa de API para los tres microservicios y se borró lo que no tiene backend en el TP (pagos, reprogramar, ubicación compartida, búsqueda con IA, notificaciones, auditoría, entre otros). El backend, en cambio, se escribió de cero en NestJS.

## Estructura
| Carpeta | Descripción |
|---|---|
| `backend/usuarios-service/` | Registro/login, perfiles, búsqueda geolocalizada y validación de matrículas (puerto 3001) |
| `backend/solicitudes-service/` | Catálogo de servicios, solicitudes y chat (puerto 3002) |
| `backend/resenas-service/` | Reseñas y reputación de los enfermeros (puerto 3003) |
| `frontend/` | Aplicación React (puerto 5173) |
| `docker/mongo-init/` | Scripts de inicialización de la base de datos |
| `docs/` | Documento de problemática, solución y arquitectura |

## Cómo levantarlo

### Con Docker (recomendado)
Requisitos: Docker y Docker Compose.
```bash
cp .env.example .env      # en Windows: copy .env.example .env
docker compose up --build
```
Front en http://localhost:5173 · Swagger de cada servicio en `http://localhost:3001/docs`, `:3002/docs` y `:3003/docs`.

### Sin Docker
Requisitos: Node 18 o superior y MongoDB corriendo en `localhost:27017`.
```bash
# Cada servicio, en una terminal distinta (MONGO_URI, JWT_SECRET y PORT en su .env)
cd backend/usuarios-service    && npm install && npm run start:dev
cd backend/solicitudes-service && npm install && npm run start:dev
cd backend/resenas-service     && npm install && npm run start:dev

# Frontend
cd frontend && npm install && cp .env.example .env && npm run dev
```

### Frontend solo, con datos de prueba
Sirve para trabajar las pantallas sin backend: en `frontend/.env` dejar `VITE_USE_MOCK=true` (valor por defecto del `.env.example`). Para usar el backend real, cambiarlo a `false`.

## Usuarios de prueba
| Email | Contraseña | Rol |
|---|---|---|
| admin@enfered.com | Admin123! | ADMIN |
| paciente@enfered.com | Paciente123! | PACIENTE |
| enfermera@enfered.com | Enfermera123! | ENFERMERO (aprobada) |
| enfermero1@enfered.com … enfermero4@enfered.com | Enfermero123! | ENFERMERO (aprobado) |

## Decisiones de diseño
- **Un servicio por responsabilidad:** usuarios, solicitudes y reseñas, cada uno con su propia base de datos (`usuarios_db`, `solicitudes_db`, `resenas_db`).
- **Autenticación única:** el JWT lo emite `usuarios-service` y los otros dos lo validan con el mismo `JWT_SECRET`.
- **REST y GraphQL:** REST para usuarios, solicitudes y chat; GraphQL para el catálogo de servicios y las reseñas.
- **Sin pagos:** los precios de los servicios son solo de referencia.
- **Frontend con datos de prueba intercambiables:** `frontend/src/datos/` tiene una implementación con datos de prueba (`mock.js`) y otra contra el backend (`real.js`); las pantallas no saben cuál usan.
- **Identidad visual y accesibilidad:** colores y textos según la sección 2.11 de [TAREAS_GRUPO.md](TAREAS_GRUPO.md), navegación inferior en celular, foco visible y los cuatro estados (carga, vacío, error con "Reintentar" y éxito) en cada pantalla.

## Documentación
- [GUIA_ENFERED.md](GUIA_ENFERED.md): qué es Enfered, en simple.
- [TAREAS_GRUPO.md](TAREAS_GRUPO.md): contrato técnico y división de tareas.
- [docs/DOCUMENTO.md](docs/DOCUMENTO.md): documento de la entrega.
