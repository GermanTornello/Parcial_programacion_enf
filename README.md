# Enfered – TP Final Programación III

Marketplace de enfermería domiciliaria en Mendoza: conecta pacientes con enfermeros/as independientes **verificados**, con búsqueda por cercanía, solicitudes de servicio, chat y reseñas.
**Stack:** NestJS (3 microservicios) + MongoDB + GraphQL + React + Docker.

## Integrantes
- Germán Tornello
- Leo Echevaria
- Pablo Mercado
- Santiago Mercado

## Qué problema resuelve
Conseguir un enfermero/a a domicilio hoy es informal: "boca a boca", grupos de WhatsApp o agencias. Hay demoras, no hay garantía de que el profesional esté matriculado y es difícil resolver necesidades puntuales (una inyección, una curación, un control de signos vitales). Enfered permite buscar enfermeros cercanos y verificados, pedirles un servicio, coordinar por chat y calificarlos al final.
Problemática, solución y arquitectura en detalle: [docs/DOCUMENTO.md](docs/DOCUMENTO.md). Explicación en simple: [GUIA_ENFERED.md](GUIA_ENFERED.md).

## Aclaración sobre el frontend
**El frontend parte del de Enfered de Práctica Profesionalizante 3 (PP3).** No se hizo de cero: se reutilizó esa base (React + Vite + axios + react-router + react-leaflet) y se adaptó al contrato de este TP. Las pantallas de PP3 se conservan y una capa de API nueva (`frontend/src/api/` y `frontend/src/services/`) les habla a los tres microservicios. Se borró lo que no tiene backend en el TP (pagos, reprogramar, ubicación compartida, búsqueda con IA, notificaciones, auditoría, denuncias de reseñas, entre otros). **El backend se escribió de cero en NestJS**: de PP3 (que era Flask) solo se tomaron las reglas de negocio.

## Estructura
| Carpeta | Descripción |
|---|---|
| `backend/usuarios-service/` | Registro/login (JWT), perfiles, búsqueda geolocalizada y validación de matrículas · REST · puerto 3001 |
| `backend/solicitudes-service/` | Catálogo de servicios (GraphQL), solicitudes con sus estados y chat (REST) · puerto 3002 |
| `backend/resenas-service/` | Reseñas y reputación de los enfermeros · GraphQL · puerto 3003 |
| `frontend/` | Aplicación React (puerto 5173) |
| `docker/mongo-init/` | Script de inicialización de la base (catálogo de servicios con ids fijos) |
| `docs/` | Documento de la entrega |

## Cómo levantarlo

### Con Docker (recomendado)
Requisitos: Docker Desktop (en Windows, con WSL2).
```bash
docker compose up --build
```
- Front: http://localhost:5173
- Swagger: http://localhost:3001/docs, http://localhost:3002/docs y http://localhost:3003/docs
- GraphQL (GraphiQL en el navegador): http://localhost:3002/graphql (servicios) y http://localhost:3003/graphql (reseñas)

Al arrancar por primera vez, MongoDB carga el catálogo de servicios (`docker/mongo-init/`) y `usuarios-service` crea los usuarios de prueba.

Notas:
- Las variables tienen valores por defecto; para cambiarlas, copiar `.env.example` a `.env` en la raíz.
- **Si ya tenés MongoDB instalado en tu compu** (puerto 27017 ocupado), agregá `MONGO_PORT=27018` al `.env` de la raíz.
- El script de la base solo corre la primera vez que se crea el volumen. Para empezar de cero: `docker compose down -v` y volver a levantar.

### Sin Docker
Requisitos: **Node 22 o superior** y MongoDB corriendo en `localhost:27017`.
```bash
# 1. Catálogo de servicios (una sola vez)
mongosh mongodb://localhost:27017 docker/mongo-init/01-catalogo-servicios.js

# 2. Cada servicio en una terminal distinta (copiar su .env.example a .env)
cd backend/usuarios-service    && cp .env.example .env && npm install && npm run start:dev
cd backend/solicitudes-service && cp .env.example .env && npm install && npm run start:dev
cd backend/resenas-service     && cp .env.example .env && npm install && npm run start:dev

# 3. Frontend
cd frontend && cp .env.example .env && npm install && npm run dev
```
(En Windows, `copy` en lugar de `cp`.)

## Usuarios de prueba
| Email | Contraseña | Rol |
|---|---|---|
| admin@enfered.com | Admin123! | ADMIN |
| paciente@enfered.com | Paciente123! | PACIENTE |
| enfermera@enfered.com | Enfermera123! | ENFERMERO (aprobada, Capital) |
| enfermero1@enfered.com … enfermero4@enfered.com | Enfermero123! | ENFERMERO (aprobados, Gran Mendoza) |

### Recorrido sugerido para probarlo
1. Entrar como **paciente** → *Buscar profesionales* → elegir a Laura Gómez → *Solicitar servicio*.
2. Entrar como **enfermera** (otra ventana o incógnito) → *Solicitudes* → *Aceptar solicitud*.
3. Desde el comprobante, paciente y enfermera se escriben por el **chat**.
4. *Marcar como realizada* aparece cuando ya pasó la hora del turno (para la demo, pedir un turno para dentro de 2 o 3 minutos).
5. El paciente **califica** el servicio y la reseña aparece en el perfil de la enfermera.
6. Como **admin**: aprobar o rechazar matrículas, gestionar usuarios y el catálogo de servicios.

El login permite 5 intentos por minuto por IP (límite contra fuerza bruta).

## Pruebas
```bash
# En cada servicio del backend
npm test            # unitarios (Vitest)
npm run test:e2e    # end-to-end (Supertest + MongoDB en memoria)

# Frontend (Vitest + React Testing Library)
cd frontend && npm test
```
| | Unitarios | E2E |
|---|---|---|
| usuarios-service | 20 | 8 |
| solicitudes-service | 31 | 11 |
| resenas-service | 7 | 5 |
| frontend | 14 (componentes) | — |

Casos de la consigna cubiertos: validación al crear entidades, error al duplicar datos únicos (email, DNI, matrícula, nombre de servicio, reseña por solicitud), relación muchos-a-muchos Enfermero ↔ Servicio sin duplicados, y flujos completos (registro → login → uso del token; paciente crea solicitud → enfermero la acepta → chatean).
Con Node 25 los tests del front necesitan `NODE_OPTIONS=--no-experimental-webstorage` (Node 25 trae su propio `localStorage`); con Node 22 no hace falta.

## Decisiones de diseño
- **Un servicio por responsabilidad**, cada uno con su base (`usuarios_db`, `solicitudes_db`, `resenas_db`) en un mismo contenedor MongoDB.
- **Autenticación única:** el JWT lo emite `usuarios-service`; los otros dos lo validan con el mismo `JWT_SECRET`. Guards de NestJS para token y roles (`PACIENTE`, `ENFERMERO`, `ADMIN`).
- **REST y GraphQL:** REST para usuarios, solicitudes y chat; GraphQL para los dos CRUD de la consigna (catálogo de servicios y reseñas).
- **Herencia con discriminators:** `Usuario → Paciente | Enfermero | Admin` en una sola colección.
- **Comunicación entre servicios por HTTP:** solicitudes consulta a usuarios (¿el enfermero existe, está aprobado, disponible y ofrece el servicio?) y reseñas consulta a solicitudes (¿la solicitud es del paciente y está realizada?).
- **Seguridad:** contraseñas con bcrypt, `helmet`, límite de intentos en login y registro, validación de todos los datos de entrada, datos privados fuera de las respuestas públicas.
- **Logging:** cada servicio registra método, ruta, status y tiempo de cada request.
- **Sin pagos:** los precios son solo de referencia.
- **Identidad visual y accesibilidad:** sección 2.11 de [TAREAS_GRUPO.md](TAREAS_GRUPO.md); navegación inferior en celular, foco visible y estados de carga, vacío, error con "Reintentar" y éxito.

## Documentación
- [docs/DOCUMENTO.md](docs/DOCUMENTO.md): documento de la entrega (problemática, solución y microservicios).
- [GUIA_ENFERED.md](GUIA_ENFERED.md): qué es Enfered, en simple.
- [TAREAS_GRUPO.md](TAREAS_GRUPO.md): contrato técnico y división de tareas.
- README de cada servicio en `backend/*/README.md`.
