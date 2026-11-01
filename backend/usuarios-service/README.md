# usuarios-service

Registro/login (JWT), perfiles de Paciente y Enfermero (herencia con discriminators), búsqueda geolocalizada y validación de matrículas. Puerto 3001.

**Responsable:** Santiago · Ver contrato en [TAREAS_GRUPO.md](../../TAREAS_GRUPO.md).

## Cómo levantarlo sin Docker

Necesita una MongoDB corriendo en `localhost:27017`.

```bash
cp .env.example .env
npm install
npm run start:dev
```

- API: http://localhost:3001
- Swagger: http://localhost:3001/docs

Al arrancar crea los usuarios de prueba si no existen (contrato, sección 2.8): `admin@enfered.com` / `Admin123!`, `paciente@enfered.com` / `Paciente123!`, `enfermera@enfered.com` / `Enfermera123!` y `enfermero1..4@enfered.com` / `Enfermero123!` (todos los enfermeros, APROBADOS y repartidos por Gran Mendoza).

## Tests

```bash
npm test          # unitarios (Vitest)
npm run test:e2e  # end-to-end (Supertest + MongoDB en memoria)
```

| Tipo | Archivo | Qué prueba |
|---|---|---|
| Unit | `src/auth/dto/registro.dto.spec.ts` | **Validación al crear:** un enfermero sin matrícula, un email inválido o un DNI con puntos no pasan |
| Unit | `src/auth/auth.service.spec.ts` | **Email repetido → `ConflictException`** (también DNI y matrícula); contraseña hasheada; payload del token; login inválido → 401 |
| Unit | `src/usuarios/usuarios.service.spec.ts` | **Muchos-a-muchos Enfermero ↔ Servicio:** no se guardan ids repetidos; cada rol edita solo sus campos; matrícula nueva → vuelve a PENDIENTE |
| E2E | `test/usuarios.e2e-spec.ts` | **Registro → login → con el token** el enfermero carga sus servicios y horarios → el admin lo aprueba → aparece en la búsqueda; **401 sin token y 403 para PACIENTE y ENFERMERO en `/admin`**; validaciones con un mensaje por campo; búsqueda por distancia, filtros y filtros vacíos; límite de intentos (3 → 401, el 4º → 429, en una app aparte) |

Cada test crea sus propios datos: se pueden correr en cualquier orden (`--sequence.shuffle`) o de a uno.

> Sobre el caso "registro → login → crear un recurso": en usuarios-service lo que crea el usuario con su token son sus horarios y servicios ofrecidos. El flujo con una creación de punta a punta (el paciente crea una solicitud) cruza a solicitudes-service y está en sus e2e.

## Endpoints

| Método | Ruta | Rol |
|---|---|---|
| GET | `/` | público (estado) |
| POST | `/auth/register/paciente` | público |
| POST | `/auth/register/enfermero` | público |
| POST | `/auth/login` | público (máx. 5 intentos por minuto) |
| GET | `/auth/me` | logueado |
| PATCH | `/perfil` | logueado |
| GET | `/enfermeros/buscar?lat=&lng=&radioKm=&especialidad=&servicioId=&departamento=&disponible=` | público |
| GET | `/enfermeros/:id` | público |
| GET | `/admin/enfermeros?estado=` | ADMIN |
| PATCH | `/admin/enfermeros/:id/verificacion` | ADMIN |
| GET | `/admin/usuarios?rol=&search=` | ADMIN |
| DELETE | `/admin/usuarios/:id` | ADMIN (responde 204) |

## Decisiones de diseño

- **Herencia con discriminators:** una sola colección `usuarios` y el campo `rol` como clave (`Usuario → Paciente | Enfermero | Admin`). Las clases hijas declaran solo sus campos propios y los comunes los hereda el discriminator.
- **Índices en la colección compartida:** `email` único, `dni` y `matricula` únicos con `sparse` (los usuarios sin ese campo no chocan) y `ubicacion` con `2dsphere` para `$geoNear`. Además de validarlo antes de guardar, el error 11000 de MongoDB también se responde como 409 por si llegan dos registros a la vez.
- **Relación Enfermero ↔ Servicio entre bases:** `serviciosOfrecidos` guarda ids del catálogo, que vive en `solicitudes_db`. Como son bases distintas (una por microservicio), MongoDB no controla que existan; se validan como ObjectId y se guardan sin repetidos.
- **Seguridad:** contraseña con bcrypt (nunca se devuelve: `select: false` y se borra en `toJSON`); el login compara contra un hash de relleno cuando el email no existe para no delatar qué emails están registrados; `helmet`; límite de intentos en login y registro con `@nestjs/throttler` (`LOGIN_LIMITE`); la búsqueda pública y el perfil público no muestran email, domicilio ni motivo de rechazo, y la búsqueda devuelve como máximo 100 resultados.
- **Reglas tomadas de Enfered (PP3):** contraseña de 8 a 72 caracteres (límite de bcrypt, medido en bytes), motivo obligatorio para rechazar una matrícula (10 a 500 caracteres, sin contar espacios de los bordes) y matrícula nueva → vuelve a revisión.
- **Logging:** un middleware (`src/common/logging.middleware.ts`) loguea método, ruta, status y tiempo de cada request; 4xx como `warn` y 5xx como `error`. Es middleware y no interceptor para que también queden registrados los 401/403/429 que cortan los guards.
- **Errores en voseo** y uno por campo (`stopAtFirstError`), porque el front muestra `message` tal cual. Un campo opcional en `null` también se valida (400, no 500). Los filtros vacíos de la query (`?especialidad=`) se toman como "sin filtro".

## Para los otros servicios

Los guards (`src/auth/`) son los mismos que usa solicitudes-service: `JwtAuthGuard`, `RolesGuard`, `@Roles()` y `@UsuarioActual()`. El token lleva `{ sub, email, rol, nombre }` y dura 1 día. El logging está en `src/common/logging.middleware.ts`: para usarlo, copiarlo y agregar `app.use(registrarRequests)` en el `main.ts`.

## Para el front (detalles que conviene saber)

- En un 400 de validación, `message` es una **lista** (un mensaje por campo); en los demás errores es un texto.
- El registro devuelve el usuario creado, **no un token**: después hay que llamar a `/auth/login`.
- `DELETE /admin/usuarios/:id` responde **204 sin cuerpo**.
- Al rechazar una matrícula el motivo es obligatorio (10 a 500 caracteres); al aprobar se ignora.
- La búsqueda sin `lat`/`lng` usa el centro de Mendoza capital; si se manda una, hay que mandar las dos. `radioKm` de 1 a 200 (10 por defecto).
- Login y registro: 5 intentos por minuto por IP (`LOGIN_LIMITE`); en una demo con muchos registros seguidos se puede subir.
- El perfil público y la búsqueda no traen `email`, `direccion` ni `motivoRechazo`.
