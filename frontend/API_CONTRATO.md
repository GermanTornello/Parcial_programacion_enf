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

## Estado de integración

Autenticación, perfil, administración y los clientes compartidos están adaptados al
contrato NestJS. `Home` carga el perfil con `GET /auth/me` y deriva los horarios del
perfil del enfermero.

La adaptación de las pantallas de búsqueda, solicitudes, chat y reseñas queda pendiente
para Leo. Esas pantallas todavía conservan el flujo PP3/`requestApi` y no se deben
considerar integradas por el hecho de que existan clientes para la API nueva.
El chat tampoco está completo de extremo a extremo: el backend aún debe implementar
`GET/POST /solicitudes/:id/mensajes`. El contrato actual no incluye geocodificación
ni coordenadas del paciente.
