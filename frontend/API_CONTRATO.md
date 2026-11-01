# API del frontend

La capa compartida vive en `src/api/`. Cada servicio tiene su propia URL:
`VITE_USUARIOS_URL`, `VITE_SOLICITUDES_URL` y `VITE_RESENAS_URL`.

- `authApi`: login y registro de pacientes/enfermeros en usuarios-service.
- `profileApi`: `GET /auth/me` y `PATCH /perfil`.
- `nursesApi`: `GET /enfermeros/buscar` y `GET /enfermeros/:id`.
- `adminApi`: matrículas y usuarios REST; catálogo GraphQL en solicitudes-service.
- `catalogApi`: consultas GraphQL del catálogo de servicios.
- `requestsApi`: solicitudes y transiciones REST; usa `PATCH /solicitudes/:id/realizar`
  para marcar una atención como realizada. También define los métodos del chat.
- `resenasApi`: consultas, reputación y CRUD GraphQL de reseñas.

Los clientes Axios agregan el token de sesión. Un `401` autenticado cierra la sesión;
los errores GraphQL se extraen de `errors[].message` y los errores REST de `message`.
Los IDs son strings y los estados del backend están en mayúsculas; los adaptadores de
`src/services/solicitudes.js` los presentan con el formato usado por la interfaz.

## Integración en curso

La solicitud de turnos usa el contrato NestJS, conserva los IDs Mongo como texto y
envía `enfermeroId`, `servicioId`, `fecha`, `hora`, `direccionAtencion` y `notas`.
El formulario toma la duración y disponibilidad del servicio/perfil.

El chat usa `GET` y `POST /solicitudes/:id/mensajes` y los campos `id`, `autorId`,
`autorNombre`, `texto` y `createdAt`. **El backend todavía debe implementar esas rutas**
para que la conversación funcione de extremo a extremo.

`Home` carga el perfil con `GET /auth/me` y deriva los horarios del perfil del enfermero.
La migración del resto de las pantallas PP3 no está completa: `ListaEnfermeros`,
`SolicitudesEnfermero`, `EstadoSolicitudes`, `VerPerfiles`, `HistorialServicios` y
`useUbicacion` todavía usan `requestApi` y/o rutas antiguas. La geocodificación,
además, no forma parte del contrato actual.
