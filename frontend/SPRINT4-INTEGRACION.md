# Sprint 4 — Contrato pendiente de integración de solicitudes

Este documento describe el contrato al que debe migrarse el flujo PP3; **no indica que
las pantallas de solicitudes y chat ya estén integradas**. Esa adaptación corresponde
a Leo según [TAREAS_GRUPO.md](../TAREAS_GRUPO.md).

La configuración local usa `VITE_USUARIOS_URL`, `VITE_SOLICITUDES_URL` y
`VITE_RESENAS_URL`; los IDs Mongo deben conservarse como strings.

## Flujo de solicitud

1. Consultar el perfil público con `GET /enfermeros/:id` y el catálogo con GraphQL
   en solicitudes-service.
2. Precargar la dirección y el teléfono del paciente desde `GET /auth/me`.
   El perfil puede editarse con `PATCH /perfil`.
3. Enviar `POST /solicitudes` con `{ enfermeroId, servicioId, fecha, hora,
   direccionAtencion, notas? }`. La respuesta del servicio incluye el `id` de la
   solicitud para abrir el comprobante.
4. Los cambios de estado usan `PATCH /solicitudes/:id/aceptar`,
   `/rechazar`, `/cancelar` y `/realizar`, según rol y permisos.

La migración debe tomar `duracionEstimadaMin` del catálogo y `disponibilidad` del
perfil del enfermero para mostrar horarios que permitan completar el servicio. Solo
debe enviarse la dirección de atención: el contrato no recibe coordenadas del paciente.

## Chat

La migración prevista usa `GET /solicitudes/:id/mensajes` y
`POST /solicitudes/:id/mensajes`,
enviando `{ texto }` y leyendo `id`, `autorId`, `autorNombre`, `texto` y `createdAt`.
Solo habilita el envío en estados pendientes o aceptados y consulta mensajes cada
3 segundos. **El backend todavía debe implementar estas rutas y el frontend aún debe
migrar el chat desde su API PP3 para completar la integración de extremo a extremo.**

## Validación del frontend

Desde `frontend/`:

```powershell
npm ci
npm test
npm run lint
npm run build
```

La integración contra servicios reales requiere que MongoDB y los tres servicios
estén levantados y configurados con sus URLs; las pruebas frontend no reemplazan
esa verificación.
